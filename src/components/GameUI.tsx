import React from 'react';
import { GameState, Viseme, FartType } from '../logic/types';
import { getAllWords, getWordVisemes } from '../logic/metadataLoader';

// Function to determine the color of the letter based on timing window
const getTimingWindowColor = (opportunityTime: number, currentTime: number, precisionWindowMs: number): string => {
  const timeDifference = Math.abs(currentTime - opportunityTime);
  
  // Perfect window (green)
  if (timeDifference <= precisionWindowMs * 0.75) {
    return '#34a853'; // Green for perfect timing
  }
  // Okay window (yellow)
  else if (timeDifference <= precisionWindowMs * 2) {
    return '#fbbc05'; // Yellow for okay timing
  }
  // Bad window (red)
  else {
    return '#ea4335'; // Red for bad timing
  }
};

// Function to determine the border color of the letter based on timing window
const getTimingWindowBorderColor = (opportunityTime: number, currentTime: number, precisionWindowMs: number): string => {
  const timeDifference = Math.abs(currentTime - opportunityTime);
  
  // Perfect window (green border)
  if (timeDifference <= precisionWindowMs * 0.75) {
    return '#0f9d58'; // Darker green for perfect timing
  }
  // Okay window (yellow border)
  else if (timeDifference <= precisionWindowMs * 2) {
    return '#e65100'; // Orange for okay timing
  }
  // Bad window (red border)
  else {
    return '#c62828'; // Darker red for bad timing
  }
};

interface GameUIProps {
  gameState: GameState;
  dialogueMetadata: { [key: string]: Viseme[] };
}

const GameUI: React.FC<GameUIProps> = ({ gameState, dialogueMetadata }) => {
  // Don't render UI if not playing
  if (!gameState.isPlaying || gameState.isGameOver) {
    return null;
  }
  
  const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
  
  if (!currentDialogue) {
    return null;
  }
  
  const speakerId = currentDialogue.speakerId;
  const metadataKey = `level1-${gameState.currentDialogueIndex}-${speakerId}-metadata.json`;
  const metadata = dialogueMetadata[metadataKey] || [];
  
  const words = getAllWords(metadata, currentDialogue.text);
  const currentWordIndex = gameState.currentWordIndex;
  
  // Find all active fart opportunities, not just for the current word
  const activeFartOpportunities = gameState.fartOpportunities.filter(
    opp => opp.dialogueIndex === gameState.currentDialogueIndex && 
           opp.active &&
           !opp.handled
  );

  // Create a map of word indices to their fart opportunities
  const wordToFartOpportunityMap = new Map();
  activeFartOpportunities.forEach(opp => {
    wordToFartOpportunityMap.set(opp.wordIndex, opp);
  });
  
  return (
    <div className="game-ui">
      <div className="meters-container">
        <div className="meter">
          <div className="meter-label">Pressure</div>
          <div className="meter-bar">
            <div 
              className={`meter-fill pressure-fill ${gameState.pressure >= 80 ? 'critical' : ''}`} 
              style={{ width: `${Math.min(100, gameState.pressure)}%` }}
            ></div>
          </div>
        </div>
        
        <div className="meter">
          <div className="meter-label">Shame</div>
          <div className="meter-bar">
            <div 
              className="meter-fill shame-fill" 
              style={{ width: `${gameState.shame}%` }}
            ></div>
          </div>
        </div>
        
        {gameState.combo > 0 && (
          <div className="combo-counter">
            Combo: {gameState.combo}x
          </div>
        )}
      </div>
      
      <div className="karaoke-container">
        <div className="karaoke-text">
          {words.map((word, index) => {
            const hasFartOpportunity = wordToFartOpportunityMap.has(index);
            const fartOpportunity = wordToFartOpportunityMap.get(index);
            
            return (
              <span 
                key={index}
                className={`karaoke-word ${index === currentWordIndex ? 'current' : ''} ${
                  hasFartOpportunity ? 'fart-opportunity' : ''
                }`}
              >
                {hasFartOpportunity && (
                  <span 
                    className="fart-key"
                    style={{
                      animationDuration: `${gameState.level.rules.letter_float_duration_ms / gameState.level.rules.letter_float_speed_multiplier}ms`,
                      animationIterationCount: '1',
                      animationFillMode: 'forwards',
                      // Create custom animation keyframes based on level settings
                      '--float-height': `${gameState.level.rules.letter_float_height_px}px`,
                      // Determine color based on timing window
                      backgroundColor: getTimingWindowColor(fartOpportunity.time, gameState.playbackTime, gameState.level.rules.precision_window_ms),
                      borderColor: getTimingWindowBorderColor(fartOpportunity.time, gameState.playbackTime, gameState.level.rules.precision_window_ms)
                    } as React.CSSProperties}
                  >
                    {fartOpportunity.type.toUpperCase()}
                  </span>
                )}
                {word.text}
              </span>
            );
          })}
        </div>
        
        {activeFartOpportunities.length > 0 && (
          <div className="fart-instructions">
            Press the highlighted letters to release pressure!
          </div>
        )}
      </div>
    </div>
  );
};

export default GameUI;
