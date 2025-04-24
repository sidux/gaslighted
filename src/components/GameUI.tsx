import React from 'react';
import { GameState, Viseme, FartType, FartOpportunity } from '../logic/types';
import { getAllWords, getWordVisemes } from '../logic/metadataLoader';

interface GameUIProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  dialogueMetadata: { [key: string]: Viseme[] };
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
  else if (dt <= precisionWindowMs * 2) return '#e65100';
  else return '#c62828';
};

const GameUI: React.FC<GameUIProps> = ({ gameState, setGameState, dialogueMetadata }) => {
  // Only render when playing
  if (!gameState.isPlaying || gameState.isGameOver) return null;

  const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
  if (!currentDialogue) return null;

  // Helper functions to get metadata keys (shared with metadataLoader.ts)
  const getRegularDialogueKey = (levelId: string, index: number, speakerId: string): string => {
    return `${levelId}-${index}-${speakerId}-metadata.json`;
  };

  const getFeedbackDialogueKey = (levelId: string, index: number, speakerId: string, isCorrect: boolean): string => {
    return `${levelId}-${index}-${speakerId}-feedback-${isCorrect ? 'correct' : 'incorrect'}-metadata.json`;
  };
  
  // build metadata key and load
  const speakerId = currentDialogue.speaker;
  const levelId = 'level1'; // This could be extracted from level info
  
  // Determine if this is a question, feedback, or regular dialogue
  let metadata: Viseme[] = [];
  
  if (currentDialogue.text) {
    // Regular dialogue
    const metadataKey = getRegularDialogueKey(levelId, gameState.currentDialogueIndex, speakerId);
    metadata = dialogueMetadata[metadataKey] || [];
  } else if (currentDialogue.answers) {
    // This is a question dialogue - no metadata needed for UI
    // Will be handled by QuestionOverlay component
  } else if (currentDialogue.feedback) {
    // This is a feedback dialogue
    // Choose the correct feedback based on the previous answer
    const isCorrect = gameState.currentQuestion?.isCorrect || false;
    const metadataKey = getFeedbackDialogueKey(levelId, gameState.currentDialogueIndex, speakerId, isCorrect);
    metadata = dialogueMetadata[metadataKey] || [];
  }

  // Make sure to pass a valid string to getAllWords
  const dialogueText = currentDialogue.text || '';
  const words = getAllWords(metadata, dialogueText);
  const currentWordIndex = gameState.currentWordIndex;

  // pick out all active, un‐handled opportunities for this dialogue
  const activeFartOpportunities = gameState.fartOpportunities.filter(
    opp =>
      opp.dialogueIndex === gameState.currentDialogueIndex &&
      opp.active &&
      !opp.handled
  );

  // map wordIndex → opportunity
  const wordToFartOpportunityMap = new Map<number, FartOpportunity>();
  activeFartOpportunities.forEach(opp => {
    wordToFartOpportunityMap.set(opp.wordIndex, opp);
  });

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

      <div className="karaoke-container">
        <div className="karaoke-text">
          {words.map((word, index) => {
            const opp = wordToFartOpportunityMap.get(index);
            const hasFart = Boolean(opp);

            return (
              <span
                key={index}
                className={`karaoke-word ${
                  index === currentWordIndex ? 'current' : ''
                } ${hasFart ? 'fart-opportunity' : ''}`}
              >
                {hasFart && opp && (
                  <span
                    key={opp.animationKey ?? `key-${index}-${opp.type}`}
                    className={`fart-key ${
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
                      zIndex: 100
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
                )}
                {word.text + ' '}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameUI;
