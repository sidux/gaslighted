import React, { ReactNode } from 'react';
import { GameState } from '../types';

interface GameScreenEffectsProps {
  gameState: GameState;
  children: ReactNode;
}

const GameScreenEffects: React.FC<GameScreenEffectsProps> = ({ gameState, children }) => {
  // Get screen effect classes based on current state
  const getScreenEffectClasses = () => {
    if (!gameState.screenEffects) return '';
    
    const classes = [];
    
    if (gameState.screenEffects.pulseEffect) {
      classes.push('pulse-effect');
    }
    
    if (gameState.screenEffects.blurEffect) {
      classes.push('blur-effect');
    }
    
    if (gameState.pressure >= 80) {
      classes.push('pressure-critical');
    }
    
    return classes.join(' ');
  };

  return (
    <div className={`game-screen ${getScreenEffectClasses()}`}>
      {children}
    </div>
  );
};

export default GameScreenEffects;