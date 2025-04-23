import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import MeetingArea from './MeetingArea';
import ControlBar from './ControlBar';
import GameUI from './GameUI';
import GameOverScreen from './GameOverScreen';
import { Level, GameState, Viseme, AudioResources, FartResult, FartType } from '../logic/types';
import { initializeGameState, updateGameState, checkFartKeyPress, applyFartResult, getFinalScore } from '../logic/gameLogic';
import { loadLevelMetadata } from '../logic/metadataLoader';
import { loadAudioResources, playDialogueAudio, playFartAudio, stopAllAudio } from '../logic/audioManager';

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
        
        // Update game state
        return updateGameState(prevState, deltaTime);
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
        // If there's an active fart opportunity
        if (gameState.currentFartOpportunity) {
          const result = checkFartKeyPress(
            key,
            gameState.currentFartOpportunity,
            gameState.playbackTime,
            gameState.level.rules.precision_window_ms
          );
          
          if (result && audioResources) {
            // Play fart sound
            playFartAudio(audioResources, result.fartType, result.type);
            
            // Apply result to game state
            setGameState(prevState => {
              if (!prevState) return null;
              
              // Mark the opportunity as handled
              const updatedOpportunities = prevState.fartOpportunities.map(opp => {
                if (opp === prevState.currentFartOpportunity) {
                  return { ...opp, handled: true, active: false };
                }
                return opp;
              });
              
              // Apply fart result
              const newState = applyFartResult({
                ...prevState,
                fartOpportunities: updatedOpportunities,
                currentFartOpportunity: null,
              }, result);
              
              return newState;
            });
          }
        } else {
          // If there's no active fart opportunity, trigger a bad fart
          if (audioResources) {
            // Play a bad fart sound with random fart type
            const randomFartType = validFartKeys[Math.floor(Math.random() * validFartKeys.length)] as FartType;
            playFartAudio(audioResources, randomFartType, 'bad');
            
            // Create a bad fart result
            const badFartResult: FartResult = {
              type: 'bad',
              fartType: randomFartType,
              timestamp: gameState.playbackTime,
              wordIndex: gameState.currentWordIndex,
            };
            
            // Apply the bad fart to the game state
            setGameState(prevState => {
              if (!prevState) return null;
              
              // Apply fart result
              return applyFartResult(prevState, badFartResult);
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
      <Header title={level.title} onLeave={handleLeaveMeeting} />
      
      <MeetingArea 
        gameState={gameState} 
        participants={level.participants}
      />
      
      <ControlBar />
      
      <GameUI 
        gameState={gameState}
        dialogueMetadata={dialogueMetadata}
      />
      
      {!gameState.isPlaying && !gameState.isGameOver && (
        <div className="game-start-overlay">
          <button className="main-menu-button" onClick={handleStartGame}>
            Start Meeting
          </button>
        </div>
      )}
      
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
