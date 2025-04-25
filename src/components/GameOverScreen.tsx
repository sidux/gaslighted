import React, { useEffect, useState } from 'react';
import { getPlayerCharacterId } from '../services';

interface GameOverScreenProps {
  victory: boolean;
  score: number;
  onRestart: () => void;
  onBackToMenu: () => void;
  level?: any; // Add level prop
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ 
  victory, 
  score, 
  onRestart, 
  onBackToMenu,
  level
}) => {
  // Find the player character ID or use a default
  const [playerId, setPlayerId] = useState('default');
  
  useEffect(() => {
    if (level && level.participants) {
      const playerChar = level.participants.find((p: any) => p.type === 'player');
      if (playerChar) {
        setPlayerId(playerChar.id);
      }
    }
  }, [level]);
  return (
    <div className="game-over">
      <div className="game-over-face">
        <img 
          src={require(`../assets/faces/${playerId}-${victory ? 'win' : 'lose'}.png`)}
          alt={victory ? "Victory face" : "Defeat face"}
          className="player-outcome-face"
        />
      </div>
      
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
