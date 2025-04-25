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
        moveToNextDialogue(setGameState, gameState);
        return;
      }
      
      // Play feedback audio directly since we're already in the right place
      const handleFeedbackEnded = () => {
        moveToNextDialogue(setGameState, gameState);
      };
      
      // Play the feedback audio directly
      import('../services/audioService').then(({ playFeedbackAudio }) => {
        console.log("Playing feedback audio for dialogue index:", gameState.currentDialogueIndex, 
          "Speaker:", currentDialogue.speaker, "Is Correct:", isCorrect);
        
        playFeedbackAudio(
          audioResources,
          gameState.level.id || 'level1',
          gameState.currentDialogueIndex,
          currentDialogue.speaker,
          isCorrect,
          handleFeedbackEnded
        );
      }).catch(error => {
        console.error("Error importing playFeedbackAudio:", error);
        // Even if there's an error, move to the next dialogue
        handleFeedbackEnded();
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
            return moveToNextDialogueState(prevState);
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
            gameState.level.id || 'level1',
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
        console.log("Playing regular dialogue audio for index:", gameState.currentDialogueIndex, 
          "Speaker:", currentDialogue.speaker);
        
        playDialogueAudio(
          audioResources,
          gameState.level.id || 'level1',
          gameState.currentDialogueIndex,
          currentDialogue.speaker,
          handleDialogueEnded
        );
      }
    }
  }, [gameState?.currentDialogueIndex, gameState?.playbackTime, gameState?.isPlaying, gameState?.isGameOver, audioResources, setGameState]);
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