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
  precisionWindowMs: number,
  gameSpeed: number = 1.0
): string => {
  if (opportunity.pressed) return '#9e9e9e';
  
  // Adjust opportunity time and precision window for game speed
  const adjustedOpportunityTime = opportunity.time * (1.0 / gameSpeed);
  const adjustedPrecisionWindow = precisionWindowMs / gameSpeed;
  
  const dt = Math.abs(currentTime - adjustedOpportunityTime);
  
  if (dt <= adjustedPrecisionWindow * 0.75) return '#34a853'; // Green - perfect
  else if (dt <= adjustedPrecisionWindow * 2) return '#fbbc05'; // Yellow - okay
  else return '#ea4335'; // Red - bad
};

const getTimingWindowBorderColor = (
  opportunity: FartOpportunity,
  currentTime: number,
  precisionWindowMs: number,
  gameSpeed: number = 1.0
): string => {
  if (opportunity.pressed) return '#616161';
  
  // Adjust opportunity time and precision window for game speed
  const adjustedOpportunityTime = opportunity.time * (1.0 / gameSpeed);
  const adjustedPrecisionWindow = precisionWindowMs / gameSpeed;
  
  const dt = Math.abs(currentTime - adjustedOpportunityTime);
  
  if (dt <= adjustedPrecisionWindow * 0.75) return '#0f9d58'; // Green - perfect
  else if (dt <= adjustedPrecisionWindow * 2) return '#fbbc05'; // Yellow - okay
  else return '#c62828'; // Red - bad
};

const FartOpportunities: React.FC<FartOpportunitiesProps> = ({ 
  gameState, 
  handleFartAnimationEnd 
}) => {
  // This component is now just a placeholder, we've moved functionality back to KaraokeText
  return null;
};

export default FartOpportunities;