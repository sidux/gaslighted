import React from 'react';
import { GameState, Answer } from '../types';
import { handleAnswerSelection, parseTimeLimit } from '../services/questionService';

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
    setGameState(prevState => handleAnswerSelection(prevState, index));
  };
  
  // Determine the speaker name for the question prompt
  const speakerName = currentDialogue && currentDialogue.speaker 
    ? currentDialogue.speaker.charAt(0).toUpperCase() + currentDialogue.speaker.slice(1)
    : '';
  
  // If the question is from a previous dialogue, get that speaker
  const speakerQuestion = currentDialogue && currentDialogue.speaker !== 'wojak'
    ? `${speakerName} is waiting for your answer...`
    : 'Your response:';
  
  return (
    <div className="karaoke-container question-container">
      <div className="question-prompt">
        <div className="question-speaker">{speakerQuestion}</div>
      </div>
      
      <div className="question-timer-container">
        <div 
          className={`question-timer ${timeRatio < 0.3 ? 'timer-critical pulse' : 
            timeRatio < 0.6 ? 'timer-warning' : ''}`}
          style={{ width: `${timeRatio * 100}%` }}
        />
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