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
      // Check if this is a dialogue with answers or feedback
      const hasAnswers = currentDialogue.answers && currentDialogue.answers.length > 0;
      const hasFeedback = currentDialogue.feedback && currentDialogue.feedback.length > 0;
      
      // For dialogues with answers, don't auto-advance when audio ends
      const handleDialogueEnded = () => {
        // Only auto-advance for regular dialogue (not answers or feedback)
        if (!hasAnswers && !hasFeedback) {
          setGameState(prevState => {
            if (!prevState) return null;
            
            // Move to the next dialogue
            return moveToNextDialogueState(prevState);
          });
        } else {
          
        }
      };
      
      // Handle different types of dialogue
      if (currentDialogue.text) {
        // Regular dialogue with text
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
      } else if (hasAnswers && gameState.selectedAnswerIndex !== undefined) {
        // This is an answer dialogue with a selected answer - play the answer audio
        console.log("Playing selected answer audio for index:", gameState.currentDialogueIndex,
          "Speaker:", currentDialogue.speaker,
          "Answer index:", gameState.selectedAnswerIndex);
        
        // Get game speed from level rules
        const gameSpeed = gameState.level.rules.game_speed || 1.0;
        
        // Import and use playAnswerAudio
        import('../services/audioService').then(({ playAnswerAudio }) => {
          playAnswerAudio(
            audioResources,
            gameState.level.id || 'level1',
            gameState.currentDialogueIndex,
            currentDialogue.speaker,
            gameState.selectedAnswerIndex!,
            () => {
              // After answer audio is done, we'll advance to feedback in DialogueAnswers component
              
            },
            gameSpeed
          );
        });
      } else if (hasFeedback && gameState.feedbackCorrect !== undefined) {
        // This is a feedback dialogue - play the feedback audio
        console.log("Playing feedback audio for index:", gameState.currentDialogueIndex,
          "Speaker:", currentDialogue.speaker,
          "Feedback correct:", gameState.feedbackCorrect);
        
        // Get game speed from level rules
        const gameSpeed = gameState.level.rules.game_speed || 1.0;
        
        // Import and use playFeedbackAudio
        import('../services/audioService').then(({ playFeedbackAudio }) => {
          playFeedbackAudio(
            audioResources,
            gameState.level.id || 'level1',
            gameState.currentDialogueIndex,
            currentDialogue.speaker,
            gameState.feedbackCorrect!,
            () => {
              // After feedback audio is done, we'll advance to next dialogue in DialogueAnswers component
              
            },
            gameSpeed
          );
        });
      } else if (hasAnswers) {
        
        // For answers dialogue without selection, we don't play audio immediately
        // Audio will be played when an answer is selected
      }
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
