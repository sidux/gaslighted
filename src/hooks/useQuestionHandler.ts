import { useEffect } from 'react';
import { GameState } from '../types';
import { handleAnswerCompletion } from '../services/questionService';

export function useQuestionHandler(
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
) {
  // Listen for answer completed events
  useEffect(() => {
    const handleAnswerCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{
        dialogueIndex: number,
        answerIndex: number,
        isCorrect: boolean
      }>;
      
      setGameState(prevState => {
        if (!prevState) return null;
        
        // Only process if we're still on the same dialogue
        if (prevState.currentDialogueIndex !== customEvent.detail.dialogueIndex) {
          return prevState;
        }
        
        // Handle the completion by moving to feedback or next dialogue
        return handleAnswerCompletion(prevState);
      });
    };
    
    // Add event listener
    document.addEventListener('answer-completed', handleAnswerCompleted);
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('answer-completed', handleAnswerCompleted);
    };
  }, [setGameState]);
  
  // Handle dialogue transitions that should trigger questions
  useEffect(() => {
    const handleDialogueComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{ dialogueIndex: number }>;
      
      setGameState(prevState => {
        if (!prevState) return null;
        
        // Get the next dialogue
        const nextDialogueIndex = customEvent.detail.dialogueIndex + 1;
        
        // If we're out of dialogues, end the level
        if (nextDialogueIndex >= prevState.level.dialogues.length) {
          return {
            ...prevState,
            victory: prevState.shame < 100,
            isGameOver: true,
            currentDialogueIndex: nextDialogueIndex
          };
        }
        
        // Get the next dialogue
        const nextDialogue = prevState.level.dialogues[nextDialogueIndex];
        
        // If the next dialogue has a question (answers), show it in the next update
        // This will be picked up by the game loop to show the question
        if (nextDialogue.answers && nextDialogue.answers.length > 0) {
          return {
            ...prevState,
            currentDialogueIndex: nextDialogueIndex,
            showQuestion: true, // Flag to show question on next update
            playbackTime: 0,
            currentWordIndex: 0,
            currentVisemeIndex: -1
          };
        }
        
        // Otherwise, just move to the next dialogue as normal
        return {
          ...prevState,
          currentDialogueIndex: nextDialogueIndex,
          playbackTime: 0,
          currentWordIndex: 0,
          currentVisemeIndex: -1
        };
      });
    };
    
    // Add event listener
    document.addEventListener('dialogue-complete', handleDialogueComplete);
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('dialogue-complete', handleDialogueComplete);
    };
  }, [setGameState]);
}