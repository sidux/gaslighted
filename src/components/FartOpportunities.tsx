import React from 'react';
import { GameState, FartOpportunity } from '../types';

interface FartOpportunitiesProps {
  gameState: GameState;
  handleFartAnimationEnd: (opp: FartOpportunity) => void;
}

// Function to determine the color of the letter based on timing window and pressed state
const getTimingWindowColor = (
  opportunity: FartOpportunity,
  currentTime: number,
  precisionWindowMs: number
): string => {
  if (opportunity.pressed) return '#9e9e9e';
  const dt = Math.abs(currentTime - opportunity.time);
  if (dt <= precisionWindowMs * 0.75) return '#34a853';
  else if (dt <= precisionWindowMs * 2) return '#fbbc05';
  else return '#ea4335';
};

const getTimingWindowBorderColor = (
  opportunity: FartOpportunity,
  currentTime: number,
  precisionWindowMs: number
): string => {
  if (opportunity.pressed) return '#616161';
  const dt = Math.abs(currentTime - opportunity.time);
  if (dt <= precisionWindowMs * 0.75) return '#0f9d58';
  else if (dt <= precisionWindowMs * 2) return '#fbbc05';
  else return '#c62828';
};

const FartOpportunities: React.FC<FartOpportunitiesProps> = ({ 
  gameState, 
  handleFartAnimationEnd 
}) => {
  // This component is now just a placeholder, we've moved functionality back to KaraokeText
  return null;
};

export default FartOpportunities;