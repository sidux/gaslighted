import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import MeetingArea from './MeetingArea';
import ControlBar from './ControlBar';
import GameUI from './GameUI';
import GameOverScreen from './GameOverScreen';
import { Level, GameState, Viseme, AudioResources, FartResult, FartType } from '../logic/types';
import { initializeGameState, updateGameState, checkFartKeyPress, applyFartResult, getFinalScore } from '../logic/gameLogic';
import { loadLevelMetadata } from '../logic/metadataLoader';
import { loadAudioResources, playDialogueAudio, playFartAudio, playHeartbeatSound, stopAllAudio } from '../logic/audioManager';

interface GameScreenProps {
  level: Level;
  onBackToMenu: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ level, onBackToMenu }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [dialogueMetadata, setDialogueMetadata] = useState<{ [key: string]: Viseme[] }>({});
  const [audioResources, setAudioResources] = useState<AudioResources | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const lastUpdateTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Load metadata and audio resources on component mount
  useEffect(() => {
    const init = async () => {
      try {
        // Load metadata for all dialogues
        const metadata = await loadLevelMetadata(level);
        setDialogueMetadata(metadata);
        
        // Load audio resources
        const audio = await loadAudioResources('1', level.dialogues.length);
        setAudioResources(audio);
        
        // Initialize game state
        const initialState = initializeGameState(level, metadata);
        setGameState(initialState);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    };
    
    init();
    
    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioResources) {
        stopAllAudio(audioResources);
      }
    };
  }, [level]);
  
  // Game loop
  useEffect(() => {
    if (!gameState || !gameState.isPlaying || isLoading) {
      return;
    }
    
    const gameLoop = (timestamp: number) => {
      if (lastUpdateTimeRef.current === null) {
        lastUpdateTimeRef.current = timestamp;
      }
      
      const deltaTime = timestamp - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = timestamp;
      
      setGameState(prevState => {
        if (!prevState) return null;
        
        // Handle paused state
        if (prevState.pausedTimestamp !== null) {
          return prevState;
        }
        
        // Store previous state's lastFartResult to detect new auto-farts
        const prevLastFartResult = prevState.lastFartResult;
        
        // Update game state
        const newState = updateGameState(prevState, deltaTime);
        
        // Check if a new terrible auto-fart just happened
        if (newState.lastFartResult && 
            newState.lastFartResult.type === 'terrible' && 
            (!prevLastFartResult || prevLastFartResult !== newState.lastFartResult)) {
          
          // Play the terrible fart sound manually when auto-fart occurs
          if (audioResources) {
            playFartAudio(
              audioResources,
              newState.lastFartResult.fartType,
              'terrible'
            );
            
            // Pause the speaker for a short time on terrible farts
            newState.pausedTimestamp = Date.now();
            
            // Set a timeout to unpause after 1.5 seconds (longer than bad farts)
            setTimeout(() => {
              setGameState(state => {
                if (!state) return null;
                return {
                  ...state,
                  pausedTimestamp: null
                };
              });
            }, 1500);
          }
        }
        
        return newState;
      });
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gameState?.isPlaying, isLoading]);
  
  // Start or resume the current dialogue audio
  useEffect(() => {
    if (!gameState || !audioResources || !gameState.isPlaying || gameState.isGameOver) {
      return;
    }
    
    const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
    if (!currentDialogue) {
      return;
    }
    
    // Play dialogue audio if it's not already playing
    if (gameState.playbackTime === 0) {
      const handleDialogueEnded = () => {
        setGameState(prevState => {
          if (!prevState) return null;
          
          // Move to the next dialogue
          const newDialogueIndex = prevState.currentDialogueIndex + 1;
          const isLevelComplete = newDialogueIndex >= prevState.level.dialogues.length;
          
          return {
            ...prevState,
            currentDialogueIndex: newDialogueIndex,
            playbackTime: 0,
            currentWordIndex: -1,
            currentVisemeIndex: -1,
            lastFartResult: null,
            victory: isLevelComplete && prevState.shame < 100,
            isGameOver: isLevelComplete || prevState.shame >= 100,
          };
        });
      };
      
      playDialogueAudio(
        audioResources,
        '1',
        gameState.currentDialogueIndex,
        currentDialogue.speakerId,
        handleDialogueEnded
      );
    }
  }, [gameState?.currentDialogueIndex, gameState?.playbackTime, gameState?.isPlaying, gameState?.isGameOver, audioResources]);
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState || !gameState.isPlaying || gameState.isGameOver) {
        return;
      }
      
      const key = event.key.toLowerCase();
      const validFartKeys = ['t', 'p', 'b', 'f', 'r', 'z'];
      
      if (validFartKeys.includes(key)) {
        // Find all active opportunities of the pressed key type
        const activeOpportunities = gameState.fartOpportunities.filter(
          opp => opp.active && !opp.handled && !opp.pressed && opp.type === key
        );

        // If there are active opportunities of this type
        if (activeOpportunities.length > 0) {
          // Sort by time to get the earliest one
          activeOpportunities.sort((a, b) => a.time - b.time);
          const opportunity = activeOpportunities[0];
          
          const result = checkFartKeyPress(
            key,
            opportunity,
            gameState.playbackTime,
            gameState.level.rules.precision_window_ms
          );
          
          if (result && audioResources) {
            // Play fart sound
            playFartAudio(audioResources, result.fartType, result.type);
            
            // Apply result to game state
            setGameState(prevState => {
              if (!prevState) return null;
              
              // Create a unique key for this press to force animation refresh
              const animationKey = `${Date.now()}-${Math.random()}`;
              
              // Mark the opportunity as pressed but NOT handled yet - this will let the animation play
              const updatedOpportunities = prevState.fartOpportunities.map(opp => {
                if (opp === opportunity) {
                  return { 
                    ...opp, 
                    handled: false,               // Don't mark as handled yet so letter stays visible
                    pressed: true,                // Mark as pressed for animation
                    pressedTime: prevState.playbackTime,  // Record when it was pressed
                    resultType: result.type,      // Store the result type for visual feedback
                    animationKey: animationKey    // Add unique key to force animation refresh
                  };
                }
                return opp;
              });
              
              // Set a timeout to mark the opportunity as handled after the animation completes
              setTimeout(() => {
                setGameState(latestState => {
                  if (!latestState) return null;
                  
                  const finalOpportunities = latestState.fartOpportunities.map(opp => {
                    if (opp === opportunity) {
                      return {
                        ...opp,
                        handled: true // Now mark as handled after animation
                      };
                    }
                    return opp;
                  });
                  
                  return {
                    ...latestState,
                    fartOpportunities: finalOpportunities
                  };
                });
              }, 1000); // Increased to 1 second to match animation duration
              
              // For bad farts, pause the speaker for a short time
              const shouldPause = result.type === 'bad';
              
              // Apply fart result
              const newState = applyFartResult({
                ...prevState,
                fartOpportunities: updatedOpportunities,
                currentFartOpportunity: prevState.currentFartOpportunity === opportunity ? null : prevState.currentFartOpportunity,
                // If it's a bad fart, set the pausedTimestamp to now
                pausedTimestamp: shouldPause ? Date.now() : prevState.pausedTimestamp
              }, result);
              
              // For bad farts, set a timeout to unpause after 1 second
              if (shouldPause) {
                setTimeout(() => {
                  setGameState(state => {
                    if (!state) return null;
                    return {
                      ...state,
                      pausedTimestamp: null
                    };
                  });
                }, 1000); // Pause for 1 second
              }
              
              return newState;
            });
          }
        } else {
          // If there's no active fart opportunity of this type, trigger a bad fart
          if (audioResources) {
            // Play a bad fart sound with the pressed key type
            playFartAudio(audioResources, key as FartType, 'bad');
            
            // Create a bad fart result
            const badFartResult: FartResult = {
              type: 'bad',
              fartType: key as FartType,
              timestamp: gameState.playbackTime,
              wordIndex: gameState.currentWordIndex,
            };
            
            // Apply the bad fart to the game state
            setGameState(prevState => {
              if (!prevState) return null;
              
              // For bad farts, pause the speaker for a short time
              const pausedTimestamp = Date.now();
              
              // Apply fart result
              const newState = applyFartResult({
                ...prevState,
                pausedTimestamp
              }, badFartResult);
              
              // Set a timeout to unpause after 1 second
              setTimeout(() => {
                setGameState(state => {
                  if (!state) return null;
                  return {
                    ...state,
                    pausedTimestamp: null
                  };
                });
              }, 1000); // Pause for 1 second
              
              return newState;
            });
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, audioResources]);
  
  // Handle start game
  const handleStartGame = () => {
    setGameState(prevState => {
      if (!prevState) return null;
      
      return {
        ...prevState,
        isPlaying: true,
        isGameOver: false,
        victory: false,
        currentDialogueIndex: 0,
        pressure: 0,
        shame: 0,
        combo: 0,
        score: 0,
        playbackTime: 0,
        currentWordIndex: -1,
        currentVisemeIndex: -1,
        lastFartResult: null,
        pausedTimestamp: null,
      };
    });
    lastUpdateTimeRef.current = null;
  };
  
  // Update heartbeat sound based on shame meter
  useEffect(() => {
    if (!gameState || !audioResources) {
      return;
    }
    
    // Update heartbeat volume and rate based on shame level
    playHeartbeatSound(
      audioResources,
      gameState.shame,
      gameState.isPlaying && !gameState.isGameOver
    );
    
  }, [gameState?.shame, gameState?.isPlaying, gameState?.isGameOver, audioResources]);

  // Handle leave meeting (go back to menu)
  const handleLeaveMeeting = () => {
    if (audioResources) {
      stopAllAudio(audioResources);
    }
    onBackToMenu();
  };
  
  // Handle restart game
  const handleRestartGame = () => {
    if (audioResources) {
      stopAllAudio(audioResources);
    }
    
    setGameState(prevState => {
      if (!prevState) return null;
      
      return initializeGameState(level, dialogueMetadata);
    });
    
    lastUpdateTimeRef.current = null;
    
    setTimeout(handleStartGame, 100);
  };
  
  // Render loading screen
  if (isLoading || !gameState) {
    return (
      <div className="loading-screen">
        <h1>Loading...</h1>
      </div>
    );
  }
  
  return (
    <div className="game-screen">
      <MeetingArea 
        gameState={gameState} 
        participants={level.participants}
      />
      
      <ControlBar 
        onBackToMenu={handleLeaveMeeting} 
        onStartGame={!gameState.isPlaying && !gameState.isGameOver ? handleStartGame : undefined}
        isGameInProgress={gameState.isPlaying}
      />
      
      <GameUI 
        gameState={gameState}
        setGameState={setGameState}
        dialogueMetadata={dialogueMetadata}
      />
      
      {gameState.isGameOver && (
        <GameOverScreen 
          victory={gameState.victory}
          score={getFinalScore(gameState)}
          onRestart={handleRestartGame}
          onBackToMenu={handleLeaveMeeting}
        />
      )}
    </div>
  );
};

export default GameScreen;
