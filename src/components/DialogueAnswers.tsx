import React, { useState, useEffect } from 'react';
import { DialogueItem, GameState, Level } from '../types';
import { shuffleArray } from '../services/dialogueService';
import { playAnswerAudio } from '../services/audioService';

interface DialogueAnswersProps {
  dialogue: DialogueItem;
  dialogueIndex: number;
  gameState: GameState;
  onAnswerSelected: (wasCorrect: boolean, answerIndex: number) => void;
  isGamePaused: boolean;
}

const DialogueAnswers: React.FC<DialogueAnswersProps> = ({ 
  dialogue, 
  dialogueIndex,
  gameState,
  onAnswerSelected,
  isGamePaused
}) => {
  const [shuffledAnswers, setShuffledAnswers] = useState<{ text: string; correct: boolean; originalIndex: number }[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Shuffle answers when dialogue changes and reset state
  useEffect(() => {
    if (dialogue.answers && dialogue.answers.length > 0) {
      // Keep track of original indices when shuffling
      const answersWithIndices = dialogue.answers.map((answer, index) => ({
        ...answer,
        originalIndex: index
      }));
      
      // Reset selected answer when dialogue changes
      setSelectedAnswer(null);
      
      setShuffledAnswers(shuffleArray(answersWithIndices));
      
      // Use setTimeout to create a staggered animation effect
      setTimeout(() => {
        setExpanded(true);
      }, 200); // Reduced delay for answers to appear
    }
  }, [dialogue, dialogueIndex]);

  const handleAnswerClick = (answer: { text: string; correct: boolean; originalIndex: number }) => {
    if (isGamePaused || selectedAnswer) return;
    
    setSelectedAnswer(answer.text);
    
    // Update the game state with the selected answer and reset playback to beginning
    if (gameState.setGameState) {
      gameState.setGameState(prevState => {
        if (!prevState) return null;
        return {
          ...prevState,
          selectedAnswerIndex: answer.originalIndex,
          showingAnswer: true,
          // Reset playback to beginning to start the answer dialogue
          playbackTime: 0,
          currentWordIndex: -1,
          currentVisemeIndex: -1
        };
      });
    }
    
    // Directly resize the karaoke container when an answer is selected
    const karaokeContainer = document.querySelector('.karaoke-container');
    if (karaokeContainer) {
      // First remove any previous classes
      karaokeContainer.classList.remove('answer-selected');
      
      // Force a reflow to ensure the transition animation works properly
      void (karaokeContainer as HTMLElement).offsetWidth;
      
      // Add the class for proper styling
      karaokeContainer.classList.add('answer-selected');
      
      // Also force the container to fit the content directly
      requestAnimationFrame(() => {
        const karaokeText = karaokeContainer.querySelector('.karaoke-text');
        if (karaokeText) {
          const textHeight = (karaokeText as HTMLElement).scrollHeight;
          (karaokeContainer as HTMLElement).style.height = `${textHeight + 30}px`; // Add some padding
        }
      });
    }
    
    // Call the callback to update the UI first
    onAnswerSelected(answer.correct, answer.originalIndex);
    
    // Play answer audio (this will show the karaoke text with fart opportunities)
    if (gameState.audioResources) {
      const levelId = gameState.level.id || 'level1';
      const speakerId = dialogue.speaker;
      
      

      // Play the selected answer audio
      playAnswerAudio(
        gameState.audioResources,
        levelId,
        dialogueIndex,
        speakerId,
        answer.originalIndex,
        () => {
          
          
          // After answer audio finishes, check if we should advance to feedback dialogue or next regular dialogue
          const nextDialogueIndex = dialogueIndex + 1;
          const hasFeedback = 
            nextDialogueIndex < gameState.level.dialogues.length &&
            gameState.level.dialogues[nextDialogueIndex].feedback;
            
          if (hasFeedback) {
            // Advance to feedback dialogue
            
            advanceToFeedbackDialogue(gameState, answer.correct);
          } else {
            // No feedback dialogue, just advance to next regular dialogue
            
            advanceToNextDialogue(gameState);
          }
        },
        gameState.level.rules.game_speed
      );
    } else {
      // If no audio, handle dialogue advancement after a delay
      setTimeout(() => {
        const nextDialogueIndex = dialogueIndex + 1;
        const hasFeedback = 
          nextDialogueIndex < gameState.level.dialogues.length &&
          gameState.level.dialogues[nextDialogueIndex].feedback;
          
        if (hasFeedback) {
          advanceToFeedbackDialogue(gameState, answer.correct);
        } else {
          advanceToNextDialogue(gameState);
        }
      }, 1000);
    }
  };
  
  // Helper function to advance to feedback dialogue
  const advanceToFeedbackDialogue = (gameState: GameState, wasCorrect: boolean) => {
    const nextDialogueIndex = dialogueIndex + 1;
    
    // Reset the karaoke container when advancing to feedback
    const karaokeContainer = document.querySelector('.karaoke-container');
    if (karaokeContainer) {
      karaokeContainer.classList.remove('answer-selected');
      if (karaokeContainer instanceof HTMLElement) {
        karaokeContainer.style.height = '';
        karaokeContainer.style.minHeight = '';
      }
    }
    
    if (gameState.audioResources) {
      const levelId = gameState.level.id || 'level1';
      const feedbackSpeakerId = gameState.level.dialogues[nextDialogueIndex].speaker;
      
      // First advance to feedback dialogue and set up for karaoke display
      if (gameState.setGameState) {
        gameState.setGameState(prevState => {
          if (!prevState) return null;
          return {
            ...prevState,
            currentDialogueIndex: nextDialogueIndex,
            playbackTime: 0,
            currentWordIndex: -1,
            currentVisemeIndex: -1,
            feedbackCorrect: wasCorrect,
            showingFeedback: true,
            // Reset the answer state since we're moving to feedback
            showingAnswer: false,
            // Clear selected answer to allow new selections later
            selectedAnswerIndex: undefined
          };
        });
      }
      
      // Then play feedback audio - this will display with karaoke text and fart opportunities
      import('../services/audioService').then(({ playFeedbackAudio }) => {
        playFeedbackAudio(
          gameState.audioResources!,
          levelId,
          nextDialogueIndex,
          feedbackSpeakerId,
          wasCorrect,
          () => {
            // After feedback audio finishes, advance to the next dialogue
            advanceToNextDialogue(gameState);
          },
          gameState.level.rules.game_speed
        );
      });
    }
  };
  
  // Helper function to advance to next regular dialogue
  const advanceToNextDialogue = (gameState: GameState) => {
    // Reset the karaoke container when advancing to next dialogue
    const karaokeContainer = document.querySelector('.karaoke-container');
    if (karaokeContainer) {
      karaokeContainer.classList.remove('answer-selected');
      if (karaokeContainer instanceof HTMLElement) {
        karaokeContainer.style.height = '';
        karaokeContainer.style.minHeight = '';
      }
    }
    
    if (gameState.setGameState) {
      gameState.setGameState(prevState => {
        if (!prevState) return null;
        
        // Get current dialogue index
        const currentDialogueIndex = prevState.currentDialogueIndex;
        console.log("Current dialogue index:", currentDialogueIndex);
        
        // Calculate next dialogue index (move to the next dialogue)
        const nextDialogueIndex = currentDialogueIndex + 1;
        console.log("Next dialogue index:", nextDialogueIndex);
        
        const isLevelComplete = nextDialogueIndex >= prevState.level.dialogues.length;
        console.log("Is level complete:", isLevelComplete);

        // Reset state for the next dialogue
        const newState = {
          ...prevState,
          currentDialogueIndex: nextDialogueIndex,
          playbackTime: 0,
          currentWordIndex: -1,
          currentVisemeIndex: -1,
          lastFartResult: null as any,
          victory: isLevelComplete && prevState.shame < 100,
          isGameOver: isLevelComplete || prevState.shame >= 100,
          // Reset answer and feedback states
          selectedAnswerIndex: undefined as any,
          showingAnswer: false,
          feedbackCorrect: undefined as any,
          showingFeedback: false
        };
        
        // Check if we're advancing to another question
        if (!isLevelComplete && nextDialogueIndex < prevState.level.dialogues.length) {
          console.log("Next dialogue:", prevState.level.dialogues[nextDialogueIndex]);
          
          // Force clean slate for next question
          if (prevState.level.dialogues[nextDialogueIndex].answers) {
            console.log("Advancing to another question dialogue!");
            // Ensure we reset all the related state variables
            newState.selectedAnswerIndex = undefined as any;
            newState.showingAnswer = false;
            newState.feedbackCorrect = undefined as any;
            newState.showingFeedback = false;
          }
        }
        
        return newState;
      });
    }
  };

  if (!dialogue.answers || dialogue.answers.length === 0) {
    return null;
  }

  return (
    <div className={`dialogue-answers ${expanded ? 'expanded' : ''}`}>
      {shuffledAnswers.map((answer, index) => (
        <div 
          key={index} 
          className={`answer-option ${selectedAnswer === answer.text ? 'selected' : ''}`}
          onClick={() => handleAnswerClick(answer)}
        >
          {answer.text}
        </div>
      ))}
    </div>
  );
};

export default DialogueAnswers;
