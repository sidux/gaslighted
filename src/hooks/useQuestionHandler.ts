import { useEffect } from 'react';
import { GameState } from '../types';

export function useQuestionHandler(
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
) {
  // Handle answer completion event
  useEffect(() => {
    const handleAnswerComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{ dialogueIndex: number, answerIndex: number }>;
      const { dialogueIndex } = customEvent.detail;
      
      console.log("Answer complete event received for dialogue:", dialogueIndex);
      
      setGameState(prevState => {
        if (!prevState) return null;
        
        // Check if we're still on the same dialogue
        if (prevState.currentDialogueIndex !== dialogueIndex) {
          return prevState;
        }
        
        // Reset state for proper fart opportunities with new text
        const updatedState: GameState = {
          ...prevState,
          pausedTimestamp: null, // Resume the game
          currentWordIndex: 0     // Start from first word of answer text
        };
        
        // Get the feedback dialogue
        const nextDialogue = prevState.level.dialogues[dialogueIndex + 1];
        
        // Only move to next dialogue if it exists and it's a feedback dialogue
        if (nextDialogue && nextDialogue.feedback) {
          // Move to the next dialogue (feedback)
          return {
            ...updatedState,
            currentDialogueIndex: dialogueIndex + 1,
            playbackTime: 0,
            currentWordIndex: 0,  // Start from first word
            currentVisemeIndex: -1
          };
        } else {
          // If there's no feedback dialogue after the question,
          // move to the next regular dialogue
          const newDialogueIndex = dialogueIndex + 1;
          const isLevelComplete = newDialogueIndex >= prevState.level.dialogues.length;
          
          return {
            ...updatedState,
            currentDialogueIndex: newDialogueIndex,
            playbackTime: 0,
            currentWordIndex: 0,  // Start from first word
            currentVisemeIndex: -1,
            lastFartResult: null,
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
  }, [setGameState]);
}