import React from 'react';
import { GameState, FartOpportunity, Viseme } from '../types';
import { getAllWords, getPlayerCharacterId, isPlayerDialogue } from '../services';

interface KaraokeTextProps {
  gameState: GameState;
  dialogueMetadata: { [key: string]: Viseme[] };
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
  
  // Debug the timing window calculations
  console.log(`Color timing: dt=${dt}, window=${adjustedPrecisionWindow}, adjusted opp time=${adjustedOpportunityTime}, current=${currentTime}`);
  
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
  else if (dt <= adjustedPrecisionWindow * 2) return '#e65100'; // Orange - okay
  else return '#c62828'; // Red - bad
};

const KaraokeText: React.FC<KaraokeTextProps> = ({ 
  gameState, 
  dialogueMetadata,
  handleFartAnimationEnd 
}) => {
  const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
  if (!currentDialogue) return null;

  // Build metadata key and load
  const speakerId = currentDialogue.speaker;
  const levelId = gameState.level.id || 'level1';

  // For feedback dialogue
  const isFeedbackDialogue = currentDialogue?.feedback !== undefined;
  
  // Get text to display based on type of dialogue
  let displayText = '';
  
  if (isFeedbackDialogue && gameState.currentQuestion?.isCorrect !== undefined) {
    // For feedback dialogue, use the appropriate feedback text based on answer correctness
    const feedbackText = currentDialogue.feedback?.find(f => f.correct === gameState.currentQuestion?.isCorrect)?.text || '';
    displayText = feedbackText;
    console.log("Feedback text:", displayText);
  } else if (isPlayerDialogue(currentDialogue.speaker, gameState.level) && currentDialogue.answers) {
    // This is an answer dialogue with answers array - use the text property (added when answer was selected)
    // or fallback to empty string if no answer selected yet
    displayText = currentDialogue.text || '';
    console.log("Player answer dialogue text:", displayText);
  } else if (isPlayerDialogue(currentDialogue.speaker, gameState.level) && !currentDialogue.answers && !currentDialogue.feedback && currentDialogue.text === undefined) {
    // Legacy format for backward compatibility: empty player dialogue
    if (gameState.currentDialogueIndex > 0 && gameState.level.dialogues[gameState.currentDialogueIndex - 1].answers) {
      const prevDialogue = gameState.level.dialogues[gameState.currentDialogueIndex - 1];
      if (prevDialogue.answers && gameState.currentQuestion?.selectedAnswer !== undefined) {
        displayText = prevDialogue.answers[gameState.currentQuestion.selectedAnswer].text || '';
        console.log("Legacy answer dialogue text:", displayText);
      }
    }
  } else {
    // For all other dialogues, use the text property
    displayText = currentDialogue.text || '';
    console.log("Dialogue text:", displayText, "for speaker:", currentDialogue.speaker);
  }
  
  // Determine the metadata to use based on dialogue type
  let metadataKey = '';
  
  if (isFeedbackDialogue && gameState.currentQuestion?.isCorrect !== undefined) {
    // For feedback, use the correct/incorrect feedback metadata
    const isCorrect = gameState.currentQuestion.isCorrect;
    metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${gameState.currentDialogueIndex}-${speakerId}-feedback-${isCorrect ? 'correct' : 'incorrect'}-metadata.json`;
  } else if (isPlayerDialogue(currentDialogue.speaker, gameState.level) && currentDialogue.answers) {
    metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${gameState.currentDialogueIndex}-${speakerId}-answer-${gameState.currentQuestion?.selectedAnswer ?? 0}-metadata.json`;
  } else {
    // Regular dialogue (including answers)
    metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${gameState.currentDialogueIndex}-${speakerId}-metadata.json`;
  }
  
  console.log("Using metadata key:", metadataKey);
  const metadata = dialogueMetadata[metadataKey] || [];
  console.log("Metadata found:", metadata.length > 0);
  
  // Get game speed from level rules
  const gameSpeed = gameState.level.rules.game_speed || 1.0;
  
  // Process the words from metadata, applying game speed
  const words = getAllWords(metadata, displayText, gameSpeed);
  
  const currentWordIndex = gameState.currentWordIndex;
  
  // For debugging
  console.log(`Playing at speed: ${gameSpeed}, Word index: ${currentWordIndex}, Playback time: ${gameState.playbackTime}`);

  // Pick out all active, un‐handled opportunities for this dialogue
  const activeFartOpportunities = gameState.fartOpportunities.filter(
    opp =>
      opp.dialogueIndex === gameState.currentDialogueIndex &&
      opp.active &&
      !opp.handled
  );

  // Map wordIndex → opportunity
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
                    : `${(gameState.level.rules.letter_float_duration_ms / 
                        gameState.level.rules.letter_float_speed_multiplier) / 
                        (gameState.level.rules.game_speed || 1.0)
                      }ms`,
                  animationIterationCount: '1',
                  animationFillMode: 'forwards',
                  '--float-height': `${gameState.level.rules.letter_float_height_px}px`,
                  backgroundColor: opp.pressed
                    ? undefined
                    : getTimingWindowColor(
                        opp,
                        gameState.playbackTime,
                        gameState.level.rules.precision_window_ms,
                        gameSpeed
                      ),
                  borderColor: opp.pressed
                    ? undefined
                    : getTimingWindowBorderColor(
                        opp,
                        gameState.playbackTime,
                        gameState.level.rules.precision_window_ms,
                        gameSpeed
                      ),
                  animation: opp.pressed
                    ? undefined
                    : `float-key ${(gameState.level.rules.letter_float_duration_ms / 
                        gameState.level.rules.letter_float_speed_multiplier) / 
                        (gameState.level.rules.game_speed || 1.0)
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
            {word.text}
            {' '}
          </span>
        );
      })}
    </div>
  );
};

export default KaraokeText;
