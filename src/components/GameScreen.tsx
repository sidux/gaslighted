import React from 'react';
import MeetingArea from './MeetingArea';
import ControlBar from './ControlBar';
import GameUI from './GameUI';
import GameOverScreen from './GameOverScreen';
import GameScreenEffects from './GameScreenEffects';
import PauseOverlay from './PauseOverlay';
import { Level } from '../types';
import { 
  resetGameState,
  stopAllAudio,
  getFinalScore
} from '../services';

import { 
  useGameInitialization,
  useGameLoop,
  useDialogueAudio,
  useKeyboardHandler,
  useHeartbeatSound
} from '../hooks';

interface GameScreenProps {
  level: Level;
  onBackToMenu: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ level, onBackToMenu }) => {
  // Use custom hooks to handle different aspects of the game
  const { 
    gameState, 
    setGameState, 
    dialogueMetadata, 
    audioResources, 
    isLoading 
  } = useGameInitialization(level);
  
  const { lastUpdateTimeRef } = useGameLoop(gameState, setGameState, isLoading);
  
  // Hook for handling dialogue audio
  useDialogueAudio(gameState, audioResources, setGameState);
  
  // Hook for handling keyboard input
  useKeyboardHandler(gameState, audioResources, setGameState);
  
  // Hook for handling heartbeat sound
  useHeartbeatSound(gameState, audioResources);
  
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

  // Handle toggle pause game
  const handleTogglePause = () => {
    setGameState(prevState => {
      if (!prevState) return null;
      
      // Toggle isPaused state
      const newIsPaused = !prevState.isPaused;
      
      // Pause or resume audio
      if (prevState.audioResources) {
        if (newIsPaused) {
          // Import and use pauseAllAudio when pausing
          import('../services/audioService').then(({ pauseAllAudio }) => {
            pauseAllAudio(prevState.audioResources!);
          });
        } else {
          // Import and use resumeAllAudio when unpausing
          import('../services/audioService').then(({ resumeAllAudio }) => {
            resumeAllAudio(prevState.audioResources!);
          });
        }
      }
      
      // Update game state with new isPaused value
      return {
        ...prevState,
        isPaused: newIsPaused,
        // Reset lastUpdateTimeRef to prevent large time jumps when resuming
        pausedTimestamp: newIsPaused ? Date.now() : null
      };
    });
    
    // Reset animation frame timer reference when resuming
    if (gameState && gameState.isPaused) {
      lastUpdateTimeRef.current = null;
    }
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
      const newState = resetGameState(prevState);
      // Preserve audio resources
      newState.audioResources = audioResources;
      // Set to playing state
      newState.isPlaying = true;
      return newState;
    });
    
    lastUpdateTimeRef.current = null;
  };
  
  // Render loading screen
  if (isLoading || !gameState) {
    return (
      <div className="loading-screen">
        <div className="loading-container">
          <div className="loading-header">
            <h1 className="loading-title">Gaslighted</h1>
            <div className="loading-title-underline"></div>
          </div>
          
          <div className="loading-animation">
            {level.participants.find(p => p.type === 'player') ? (
              <img 
                src={require(`../assets/faces/${level.participants.find(p => p.type === 'player')?.id || 'default'}-talking1.png`)} 
                alt="Loading" 
                className="loading-character-image"
              />
            ) : (
              <div className="loading-character-placeholder"></div>
            )}
            <div className="loading-meet-ui">
              <div className="loading-progress-bar">
                <div className="loading-progress-fill"></div>
              </div>
              <div className="loading-text">Starting the meeting...</div>
            </div>
          </div>
          
          <div className="loading-tips-container">
            <div className="loading-tip">
              <span className="loading-tip-title">REMEMBER:</span> 
              <span className="loading-tip-text">Perfect timing gets you a silent fart! Bad timing might get you caught!</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GameScreenEffects gameState={gameState}>
      <MeetingArea 
        gameState={gameState} 
        participants={level.participants}
      />
      
      <ControlBar 
        onBackToMenu={handleLeaveMeeting} 
        onStartGame={!gameState.isPlaying && !gameState.isGameOver ? handleStartGame : undefined}
        onTogglePause={gameState.isPlaying && !gameState.isGameOver ? handleTogglePause : undefined}
        isGameInProgress={gameState.isPlaying}
        isPaused={gameState.isPaused}
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
          level={level}
        />
      )}

      {gameState.isPaused && !gameState.isGameOver && (
        <PauseOverlay onResume={handleTogglePause} />
      )}
    </GameScreenEffects>
  );
};

export default GameScreen;
