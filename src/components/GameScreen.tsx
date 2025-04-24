import React, { useState, useEffect, useRef } from 'react';
import MeetingArea from './MeetingArea';
import ControlBar from './ControlBar';
import GameUI from './GameUI';
import GameOverScreen from './GameOverScreen';
import { Level, GameState, Viseme, AudioResources, FartResult, FartType } from '../types';
import { 
  initializeGameState, 
  updateGameState, 
  resetGameState,
  loadLevelMetadata, 
  loadAudioResources,
  playDialogueAudio, 
  playFartAudio, 
  playHeartbeatSound, 
  stopAllAudio,
  checkFartKeyPress,
  applyFartResult,
  getFinalScore
} from '../services';
import { getDialogueMetadata } from '../services/dialogueService';

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
        const audio = await loadAudioResources(level);
        setAudioResources(audio);
        
        // Initialize game state
        const initialState = initializeGameState(level, metadata);
        // Add audio resources to the game state for access in other components
        initialState.audioResources = audio;
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
        
        // Handle paused state or showing question
        if (prevState.pausedTimestamp !== null || prevState.showingQuestion) {
          // If showing a question, we need to update the question timer
          if (prevState.showingQuestion && prevState.currentQuestion) {
            return updateGameState(prevState, deltaTime);
          }
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
    
    // Skip audio playback for question dialogues - they don't have audio initially
    if (currentDialogue.answers && !currentDialogue.text) {
      // If this is a question dialogue with no text, show the question
      if (!gameState.showingQuestion && gameState.playbackTime === 0) {
        console.log("Showing question at dialogue index:", gameState.currentDialogueIndex);
        // Import the showQuestion function
        import('../services/questionService').then(({ showQuestion }) => {
          setGameState(prevState => {
            if (!prevState) return null;
            return showQuestion(prevState);
          });
        });
      }
      return;
    }
    
    // Handle feedback dialogue after an answer
    if (currentDialogue.feedback && gameState.currentQuestion?.selectedAnswer !== undefined && gameState.playbackTime === 0) {
      // Choose the correct feedback based on the previous answer
      const isCorrect = gameState.currentQuestion.isCorrect || false;
      const feedback = currentDialogue.feedback.find(f => f.correct === isCorrect);
      
      if (!feedback) {
        // No matching feedback found, move to next dialogue
        setGameState(prevState => {
          if (!prevState) return null;
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
        return;
      }
      
      // Play feedback audio directly since we're already in the right place
      const handleFeedbackEnded = () => {
        setGameState(prevState => {
          if (!prevState) return null;
          
          // Move to the next dialogue after feedback
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
      
      // Play the feedback audio directly
      import('../services/audioService').then(({ playFeedbackAudio }) => {
        playFeedbackAudio(
          audioResources,
          level.id || 'level1',
          gameState.currentDialogueIndex,
          currentDialogue.speaker,
          isCorrect,
          handleFeedbackEnded
        );
      });
      
      return; // Skip the regular dialogue audio playback below
    }
    
    // Play dialogue audio if it's not already playing
    if (gameState.playbackTime === 0) {
      const handleDialogueEnded = () => {
        setGameState(prevState => {
          if (!prevState) return null;
          
          // Check if current dialogue has a question at the end
          if (currentDialogue.answers && !prevState.showingQuestion) {
            // This is a dialogue with a question - don't advance yet, show the question
            import('../services/questionService').then(({ showQuestion }) => {
              setGameState(state => {
                if (!state) return null;
                return showQuestion(state);
              });
            });
            return prevState;
          } else {
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
          }
        });
      };
      
      // Play feedback audio if it's a feedback dialogue
      if (currentDialogue.feedback && gameState.currentQuestion?.selectedAnswer !== undefined) {
        const isCorrect = gameState.currentQuestion.isCorrect || false;
        
        // Import and use playFeedbackAudio
        import('../services/audioService').then(({ playFeedbackAudio }) => {
          playFeedbackAudio(
            audioResources,
            level.id || 'level1',
            gameState.currentDialogueIndex,
            currentDialogue.speaker,
            isCorrect,
            handleDialogueEnded
          );
        }).catch(importError => {
          console.error("Import of playFeedbackAudio failed:", importError);
          // Fallback: at least continue with the game
          handleDialogueEnded();
        });
      } else {
        // Play regular dialogue audio
        playDialogueAudio(
          audioResources,
          level.id || 'level1',
          gameState.currentDialogueIndex,
          currentDialogue.speaker,
          handleDialogueEnded
        );
      }
    }
  }, [gameState?.currentDialogueIndex, gameState?.playbackTime, gameState?.isPlaying, gameState?.isGameOver, audioResources]);
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState || !gameState.isPlaying || gameState.isGameOver) {
        return;
      }
      
      // Don't process fart keys if showing a question (allow for answer selection)
      if (gameState.showingQuestion) {
        return;
      }
      
      const key = event.key.toLowerCase();
      const validFartKeys = ['t', 'p', 'k', 'f', 'r', 'z'];
      
      if (validFartKeys.includes(key)) {
        console.log(`Processing fart key: ${key}`); // Debug
        
        // Find all active opportunities of the pressed key type
        const activeOpportunities = gameState.fartOpportunities.filter(
          opp => opp.active && !opp.handled && !opp.pressed && opp.type === key
        );

        // Log the number of active opportunities
        console.log(`Active opportunities for ${key}: ${activeOpportunities.length}`);

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
            console.log(`Played fart of type: ${result.type}`); // Debug
            
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
              
              // Don't pause if it's already paused (e.g., during answer/feedback)
              const newPausedTimestamp = shouldPause && !prevState.pausedTimestamp 
                ? Date.now() 
                : prevState.pausedTimestamp;
              
              // Apply fart result
              const newState = applyFartResult({
                ...prevState,
                fartOpportunities: updatedOpportunities,
                currentFartOpportunity: prevState.currentFartOpportunity === opportunity ? null : prevState.currentFartOpportunity,
                // If it's a bad fart, set the pausedTimestamp to now (only if not already paused)
                pausedTimestamp: newPausedTimestamp
              }, result);
              
              // For bad farts, set a timeout to unpause after 1 second (only if we newly paused)
              if (shouldPause && newPausedTimestamp !== prevState.pausedTimestamp) {
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
            console.log("No active opportunity - doing bad fart"); // Debug
            
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
              
              // Don't pause if it's already paused (e.g., during answer/feedback)
              const newPausedTimestamp = !prevState.pausedTimestamp 
                ? Date.now() 
                : prevState.pausedTimestamp;
              
              // Apply fart result
              const newState = applyFartResult({
                ...prevState,
                pausedTimestamp: newPausedTimestamp
              }, badFartResult);
              
              // Set a timeout to unpause after 1 second (only if we newly paused)
              if (newPausedTimestamp !== prevState.pausedTimestamp) {
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
      const resetState = resetGameState(prevState);
      // Preserve audio resources
      resetState.audioResources = prevState.audioResources;
      return resetState;
    });
    lastUpdateTimeRef.current = null;
  };
  
  // Handle answer completion event
  useEffect(() => {
    const handleAnswerComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{ dialogueIndex: number, answerIndex: number }>;
      const { dialogueIndex } = customEvent.detail;
      
      setGameState(prevState => {
        if (!prevState) return null;
        
        // Check if we're still on the same dialogue
        if (prevState.currentDialogueIndex !== dialogueIndex) {
          return prevState;
        }
        
        // Get the feedback dialogue
        const nextDialogue = prevState.level.dialogues[dialogueIndex + 1];
        
        // Only move to next dialogue if it exists and it's a feedback dialogue
        if (nextDialogue && nextDialogue.feedback) {
          // Move to the next dialogue (feedback)
          return {
            ...prevState,
            currentDialogueIndex: dialogueIndex + 1,
            playbackTime: 0,
            currentWordIndex: -1,
            currentVisemeIndex: -1,
            pausedTimestamp: null // Resume the game
          };
        } else {
          // If there's no feedback dialogue after the question,
          // move to the next regular dialogue
          const newDialogueIndex = dialogueIndex + 1;
          const isLevelComplete = newDialogueIndex >= prevState.level.dialogues.length;
          
          return {
            ...prevState,
            currentDialogueIndex: newDialogueIndex,
            playbackTime: 0,
            currentWordIndex: -1,
            currentVisemeIndex: -1,
            lastFartResult: null,
            pausedTimestamp: null,
            victory: isLevelComplete && prevState.shame < 100,
            isGameOver: isLevelComplete || prevState.shame >= 100,
          };
        }
      });
    };
    
    document.addEventListener('answer-complete', handleAnswerComplete);
    
    return () => {
      document.removeEventListener('answer-complete', handleAnswerComplete);
    };
  }, []);
  
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
      const newState = initializeGameState(level, dialogueMetadata);
      // Preserve audio resources
      newState.audioResources = audioResources;
      return newState;
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

  // Get screen effect classes based on current state
  const getScreenEffectClasses = () => {
    if (!gameState.screenEffects) return '';
    
    const classes = [];
    
    if (gameState.screenEffects.pulseEffect) {
      classes.push('pulse-effect');
    }
    
    if (gameState.screenEffects.blurEffect) {
      classes.push('blur-effect');
    }
    
    if (gameState.pressure >= 80) {
      classes.push('pressure-critical');
    }
    
    return classes.join(' ');
  };
  
  return (
    <div className={`game-screen ${getScreenEffectClasses()}`}>
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
