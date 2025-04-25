import React from 'react';
import { GameState, FartOpportunity, Viseme } from '../types';
import { getAllWords } from '../services/assetService';

interface KaraokeTextProps {
  gameState: GameState;
  dialogueMetadata: { [key: string]: Viseme[] };
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
  else if (dt <= precisionWindowMs * 2) return '#e65100';
  else return '#c62828';
};

const KaraokeText: React.FC<KaraokeTextProps> = ({ 
  gameState, 
  dialogueMetadata,
  handleFartAnimationEnd 
}) => {
  const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
  if (!currentDialogue) return null;

  // build metadata key and load
  const speakerId = currentDialogue.speaker;
  const levelId = gameState.level.id || 'level1';

  // Check if this is specifically a user answer or feedback dialogue
  const isPlayerAnswer = currentDialogue?.speaker === 'wojak' && 
                          gameState.currentQuestion?.selectedAnswer !== undefined;
  
  // For feedback dialogue
  const isFeedbackDialogue = currentDialogue?.feedback !== undefined;
  
  // For feedback, find the correct feedback text based on the player's previous answer
  const feedbackText = isFeedbackDialogue && gameState.currentQuestion?.isCorrect !== undefined
    ? currentDialogue?.feedback?.find(f => f.correct === gameState.currentQuestion?.isCorrect)?.text || ''
    : '';
  
  // Get the selected answer text if applicable
  const selectedAnswerText = isPlayerAnswer && gameState.currentQuestion?.selectedAnswer !== undefined 
    ? gameState.currentQuestion.answers[gameState.currentQuestion.selectedAnswer].text 
    : '';

  // If this is an answer or feedback dialogue, we display it differently
  if (isPlayerAnswer) {
    return (
      <div className="answer-text">{selectedAnswerText}</div>
    );
  }
  
  if (isFeedbackDialogue) {
    return (
      <div className={gameState.currentQuestion?.isCorrect ? 'correct-feedback' : 'incorrect-feedback'}>
        {feedbackText}
      </div>
    );
  }

  // Regular dialogue with text and fart opportunities
  // Make sure to pass a valid string to getAllWords
  const dialogueText = currentDialogue.text || '';
  
  // Determine the metadata to use
  let metadataKey = '';
  if (currentDialogue.text) {
    metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${gameState.currentDialogueIndex}-${speakerId}-metadata.json`;
  } else if (currentDialogue.feedback) {
    const isCorrect = gameState.currentQuestion?.isCorrect || false;
    metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${gameState.currentDialogueIndex}-${speakerId}-feedback-${isCorrect ? 'correct' : 'incorrect'}-metadata.json`;
  }
  
  const metadata = dialogueMetadata[metadataKey] || [];
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

  return (
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
  );
};

export default KaraokeText;