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
  // Get active fart opportunities for the current dialogue
  const activeFartOpportunities = gameState.fartOpportunities.filter(
    opp =>
      opp.dialogueIndex === gameState.currentDialogueIndex &&
      opp.active &&
      !opp.handled
  );

  return (
    <div className="fart-opportunities-layer">
      {activeFartOpportunities.map((opp, index) => {
        return (
          <span
            key={opp.animationKey ?? `floating-${index}-${opp.type}`}
            className={`fart-key floating-fart-key ${
              opp.pressed
                ? `${opp.resultType}-pressed pressed-animation`
                : ''
            }`}
            style={{
              animationDuration: opp.pressed
                ? undefined
                : `${gameState.level.rules.letter_float_duration_ms /
                    gameState.level.rules.letter_float_speed_multiplier
                  }ms`,
              animationIterationCount: '1',
              animationFillMode: 'forwards',
              '--float-height': `${gameState.level.rules.letter_float_height_px}px`,
              backgroundColor: opp.pressed
                ? undefined
                : getTimingWindowColor(
                    opp,
                    gameState.playbackTime,
                    gameState.level.rules.precision_window_ms
                  ),
              borderColor: opp.pressed
                ? undefined
                : getTimingWindowBorderColor(
                    opp,
                    gameState.playbackTime,
                    gameState.level.rules.precision_window_ms
                  ),
              animation: opp.pressed
                ? undefined
                : `float-key ${gameState.level.rules.letter_float_duration_ms /
                    gameState.level.rules.letter_float_speed_multiplier
                  }ms forwards`,
              opacity: opp.pressed ? undefined : 1,
              visibility: 'visible',
              display: 'block',
              zIndex: 100,
              position: 'relative',
              margin: '0 10px'
            } as React.CSSProperties}
            aria-label={`Press ${opp.type.toUpperCase()} key to fart`}
            data-letter={opp.type.toUpperCase()}
            data-pressed={opp.pressed ? 'true' : 'false'}
            data-result={opp.resultType ?? ''}
            onAnimationEnd={() => handleFartAnimationEnd(opp)}
          >
            {opp.type.toUpperCase()}

            {opp.pressed && opp.resultType === 'perfect' && (
              <>
                {/* particles */}
                <div className="particle" style={{ '--x': '30px', '--y': '-30px' } as React.CSSProperties} />
                <div className="particle" style={{ '--x': '40px', '--y': '-10px' } as React.CSSProperties} />
                <div className="particle" style={{ '--x': '35px', '--y': '20px' } as React.CSSProperties} />
                <div className="particle" style={{ '--x': '-5px', '--y': '30px' } as React.CSSProperties} />
                <div className="particle" style={{ '--x': '-30px', '--y': '15px' } as React.CSSProperties} />
                <div className="particle" style={{ '--x': '-35px', '--y': '-25px' } as React.CSSProperties} />
              </>
            )}
          </span>
        );
      })}
    </div>
  );
};

export default FartOpportunities;
