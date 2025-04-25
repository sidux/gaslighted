import React from 'react';
import MeetingArea from './MeetingArea';
import ControlBar from './ControlBar';
import GameUI from './GameUI';
import GameOverScreen from './GameOverScreen';
import GameScreenEffects from './GameScreenEffects';
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
  useQuestionHandler,
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
  
  // Hook for handling question responses
  useQuestionHandler(setGameState);
  
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
        <h1>Loading...</h1>
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
    </GameScreenEffects>
  );
};

export default GameScreen;