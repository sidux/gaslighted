import React from 'react';
import { GameState, Viseme, FartOpportunity } from '../types';
import GameMeters from './GameMeters';
import QuestionOverlay from './QuestionOverlay';
import KaraokeText from './KaraokeText';
import FartOpportunities from './FartOpportunities';
import { parseTimeLimit } from '../services/questionService';

interface GameUIProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  dialogueMetadata: { [key: string]: Viseme[] };
}

const GameUI: React.FC<GameUIProps> = ({ gameState, setGameState, dialogueMetadata }) => {
  // Only render when playing
  if (!gameState.isPlaying || gameState.isGameOver) return null;

  const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
  if (!currentDialogue) return null;

  // Handler called when the float animation finishes
  const handleFartAnimationEnd = (opp: FartOpportunity) => {
    setGameState(gs => ({
      ...gs,
      fartOpportunities: gs.fartOpportunities.map(o =>
        o === opp
          ? { ...o, handled: true, active: false }
          : o
      )
    }));
  };

  return (
    <div className="game-ui">
      <GameMeters gameState={gameState} />

      {/* All non-question dialogues (regular, answer, and feedback) */}
      {!gameState.showingQuestion && (
        <div className="karaoke-container">
          <KaraokeText 
            gameState={gameState} 
            dialogueMetadata={dialogueMetadata}
            handleFartAnimationEnd={handleFartAnimationEnd}
          />
        </div>
      )}
      
      {/* Show the question overlay when a question is active */}
      {gameState.showingQuestion && (
        <div className="karaoke-container">
          <div className="question-timer-container">
            <div 
              className={`question-timer ${
                gameState.currentQuestion && gameState.currentQuestion.timeRemaining 
                  ? (gameState.currentQuestion.timeRemaining / parseTimeLimit(gameState.level.rules.question_time_limit || "10s") < 0.3 
                      ? 'timer-critical pulse' 
                      : gameState.currentQuestion.timeRemaining / parseTimeLimit(gameState.level.rules.question_time_limit || "10s") < 0.6 
                        ? 'timer-warning' 
                        : '')
                  : ''
              }`}
              style={{ 
                width: `${gameState.currentQuestion 
                  ? (gameState.currentQuestion.timeRemaining / parseTimeLimit(gameState.level.rules.question_time_limit || "10s") * 100)
                  : 100}%` 
              }}
            />
          </div>
          
          <QuestionOverlay 
            gameState={gameState}
            setGameState={setGameState}
          />
        </div>
      )}
    </div>
  );
};

export default GameUI;