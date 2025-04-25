import React from 'react';
import { GameState } from '../types';

interface GameMetersProps {
  gameState: GameState;
}

const GameMeters: React.FC<GameMetersProps> = ({ gameState }) => {
  return (
    <div className="meters-container">
      {/* Pressure meter */}
      <div className="meter">
        <div className="meter-label">Pressure</div>
        <div className="meter-bar">
          <div
            className={`meter-fill pressure-fill ${
              gameState.pressure >= 80 ? 'critical' : ''
            }`}
            style={{ width: `${Math.min(100, gameState.pressure)}%` }}
          />
        </div>
      </div>
      
      {/* Shame meter */}
      <div className="meter">
        <div className="meter-label">Shame</div>
        <div className="meter-bar">
          <div
            className="meter-fill shame-fill"
            style={{ width: `${gameState.shame}%` }}
          />
        </div>
      </div>
      
      {/* Combo */}
      {gameState.combo > 0 && (
        <div className="combo-counter" data-combo={gameState.combo}>
          <span className="combo-text">Combo:</span>{' '}
          <span className="combo-value">{gameState.combo}x</span>
        </div>
      )}
    </div>
  );
};

export default GameMeters;