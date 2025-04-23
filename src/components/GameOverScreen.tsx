import React from 'react';

interface GameOverScreenProps {
  victory: boolean;
  score: number;
  onRestart: () => void;
  onBackToMenu: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ 
  victory, 
  score, 
  onRestart, 
  onBackToMenu 
}) => {
  return (
    <div className="game-over">
      <h1 className="game-over-title">
        {victory ? 'Meeting Survived!' : 'Meeting Disaster!'}
      </h1>
      
      <div className="game-over-score">
        Final Score: {score}
      </div>
      
      <p className="instructions-text">
        {victory 
          ? "You've successfully managed your digestive distress throughout the entire meeting. Corporate survival at its finest!"
          : "Your embarrassment was too much to handle. Better luck in your next job interview!"}
      </p>
      
      <div className="game-over-buttons">
        <button className="game-over-button" onClick={onRestart} style={{ marginRight: '16px' }}>
          Try Again
        </button>
        
        <button className="game-over-button" onClick={onBackToMenu}>
          Back to Menu
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
