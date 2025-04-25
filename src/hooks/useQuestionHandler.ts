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
  }, [setGameState]);
}