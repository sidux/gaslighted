import React from 'react';
import { GameState, Answer } from '../types';
import { handleAnswerSelection, parseTimeLimit } from '../services/questionService';
import { getPlayerCharacterId, isPlayerDialogue } from '../services';

interface QuestionOverlayProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
}

const QuestionOverlay: React.FC<QuestionOverlayProps> = ({ gameState, setGameState }) => {
  const { currentQuestion, level } = gameState;
  
  if (!currentQuestion || !currentQuestion.answers) return null;
  
  // Get the current dialogue which contains the question
  const currentDialogue = level.dialogues[gameState.currentDialogueIndex];
  
  const answers = currentQuestion.answers;
  const timeLimit = level.rules.question_time_limit ? 
    parseFloat(level.rules.question_time_limit.replace(/s$/, '')) * 1000 : 10000;
  const timeRemaining = currentQuestion.timeRemaining || 0;
  const timeRatio = timeRemaining / timeLimit;
  
  const handleAnswerClick = (index: number) => {
    // Add animation effect for answer selection
    const answerButtons = document.querySelectorAll('.question-option');
    answerButtons.forEach((button, idx) => {
      if (idx === index) {
        // Add animation class based on whether answer is correct
        const isCorrect = answers[index].correct;
        button.classList.add(isCorrect ? 'correct-answer-animation' : 'incorrect-answer-animation');
      }
    });
    
    // Add a slight delay to allow the animation to be seen
    setTimeout(() => {
      setGameState(prevState => handleAnswerSelection(prevState, index));
    }, 300);
  };
  
  // Determine the speaker name for the question prompt
  const speakerName = currentDialogue && currentDialogue.speaker 
    ? currentDialogue.speaker.charAt(0).toUpperCase() + currentDialogue.speaker.slice(1)
    : '';
  
  // Get the player character ID
  const playerCharacterId = getPlayerCharacterId(level);
  
  // If the question is from a previous dialogue, get that speaker
  const speakerQuestion = currentDialogue && currentDialogue.speaker !== playerCharacterId
    ? `${speakerName} is waiting for your answer...`
    : 'Your response:';
  
  return (
    <div className="question-overlay">
      <div className="question-prompt">
        <div className="question-speaker">{speakerQuestion}</div>
      </div>
      
      <div className="question-options-container">
        {answers.map((answer: Answer, index: number) => (
          <button 
            key={index}
            className={`question-option ${timeRatio < 0.3 ? 'option-urgent' : ''}`}
            onClick={() => handleAnswerClick(index)}
            data-index={index}
          >
            {answer.text}
          </button>
        ))}
      </div>
      
      <div className="question-timer-text">
        <span className="pulse-count">{Math.ceil(timeRemaining / 1000)}</span>
      </div>
    </div>
  );
};

export default QuestionOverlay;