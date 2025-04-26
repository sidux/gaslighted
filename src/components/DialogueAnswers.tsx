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

  // Shuffle answers when dialogue changes
  useEffect(() => {
    if (dialogue.answers && dialogue.answers.length > 0) {
      // Keep track of original indices when shuffling
      const answersWithIndices = dialogue.answers.map((answer, index) => ({
        ...answer,
        originalIndex: index
      }));
      
      setShuffledAnswers(shuffleArray(answersWithIndices));
      
      // Use setTimeout to create a staggered animation effect
      setTimeout(() => {
        setExpanded(true);
      }, 1000); // Wait for dialogue text to finish before expanding
    }
  }, [dialogue]);

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
            showingAnswer: false
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
    if (gameState.setGameState) {
      gameState.setGameState(prevState => {
        if (!prevState) return null;
        
        // Check if the current dialogue has feedback
        const hasFeedback = 
          prevState.currentDialogueIndex < prevState.level.dialogues.length &&
          prevState.level.dialogues[prevState.currentDialogueIndex].feedback;
        
        // If this was a feedback dialogue, we need to advance by 1, otherwise by 1
        const currentIndex = prevState.currentDialogueIndex + 1;
        const isLevelComplete = currentIndex >= prevState.level.dialogues.length;
        
        
        
        return {
          ...prevState,
          currentDialogueIndex: currentIndex,
          playbackTime: 0,
          currentWordIndex: -1,
          currentVisemeIndex: -1,
          lastFartResult: null,
          victory: isLevelComplete && prevState.shame < 100,
          isGameOver: isLevelComplete || prevState.shame >= 100,
          // Reset answer and feedback states
          selectedAnswerIndex: undefined,
          showingAnswer: false,
          feedbackCorrect: undefined,
          showingFeedback: false
        };
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
