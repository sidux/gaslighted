import React, { useEffect, useRef, useState } from 'react';
import { GameState } from '../types';

interface GameMetersProps {
  gameState: GameState;
}

const GameMeters: React.FC<GameMetersProps> = ({ gameState }) => {
  // Format pressure for display - show positive numbers only
  const displayPressure = Math.max(0, Math.round(gameState.pressure));
  const pressureRef = useRef<HTMLDivElement>(null);
  const lastPressureRef = useRef<number>(0);
  const [highlight, setHighlight] = useState(false);
  
  // Direct update with highlight effect
  useEffect(() => {
    // Track significant pressure changes
    const prevPressure = lastPressureRef.current;
    const targetPressure = Math.max(0, Math.min(100, gameState.pressure));
    const pressureChanged = Math.abs(targetPressure - prevPressure) > 1;
    
    if (pressureRef.current) {
      // Update the bar width
      pressureRef.current.style.setProperty('--pressure-width', `${targetPressure}%`);
      
      // Update critical state
      if (targetPressure >= 80) {
        pressureRef.current.classList.add('critical');
      } else {
        pressureRef.current.classList.remove('critical');
      }
      
      // Add highlight effect on significant changes
      if (pressureChanged) {
        setHighlight(true);
        setTimeout(() => setHighlight(false), 300);
      }
      
      // Store for next comparison
      lastPressureRef.current = targetPressure;
    }
  }, [gameState.pressure]);
  
  return (
    <div className="meters-container">
      {/* Pressure meter */}
      <div className="meter">
        <div className={`meter-label ${highlight ? 'highlight' : ''}`}>
          Pressure <span className="meter-value">{displayPressure}%</span>
        </div>
        <div className={`meter-bar ${highlight ? 'highlight' : ''}`}>
          <div
            ref={pressureRef}
            className={`meter-fill pressure-fill animated ${
              gameState.pressure >= 80 ? 'critical' : ''
            }`}
          />
        </div>
      </div>
      
      {/* Shame meter */}
      <div className="meter">
        <div className="meter-label">
          Shame <span className="meter-value">{Math.round(gameState.shame)}%</span>
        </div>
        <div className="meter-bar">
          <div
            className="meter-fill shame-fill animated"
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