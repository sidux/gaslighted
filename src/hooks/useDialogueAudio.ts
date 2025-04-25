import { useEffect } from 'react';
import { GameState, AudioResources } from '../types';
import { playDialogueAudio } from '../services';

export function useDialogueAudio(
  gameState: GameState | null, 
  audioResources: AudioResources | null, 
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
) {
  // Start or resume the current dialogue audio
  useEffect(() => {
    if (!gameState || !audioResources || !gameState.isPlaying || gameState.isGameOver) {
      return;
    }
    
    // Don't start new audio when paused, but allow the effect to run when unpausing
    if (gameState.isPaused) {
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
          return moveToNextDialogueState(prevState);
        });
      };
      
      // Play regular dialogue audio
      console.log("Playing regular dialogue audio for index:", gameState.currentDialogueIndex, 
        "Speaker:", currentDialogue.speaker);
      
      // Get game speed from level rules
      const gameSpeed = gameState.level.rules.game_speed || 1.0;
      
      playDialogueAudio(
        audioResources,
        gameState.level.id || 'level1',
        gameState.currentDialogueIndex,
        currentDialogue.speaker,
        handleDialogueEnded,
        gameSpeed
      );
    }
  }, [gameState?.currentDialogueIndex, gameState?.playbackTime, gameState?.isPlaying, gameState?.isPaused, gameState?.isGameOver, audioResources, setGameState]);
}

// Helper function to move to the next dialogue
function moveToNextDialogue(
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>,
  gameState: GameState
) {
  setGameState(prevState => {
    if (!prevState) return null;
    return moveToNextDialogueState(prevState);
  });
}

// Helper function to create the next dialogue state
function moveToNextDialogueState(prevState: GameState): GameState {
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