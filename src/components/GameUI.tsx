import React from 'react';
import { GameState, Viseme, FartOpportunity, Answer } from '../types';
import { getAllWords } from '../services/assetService';
import { getMetadataPath, getFeedbackMetadataPath } from '../services/assetService';
import { handleAnswerSelection, parseTimeLimit } from '../services/questionService';

interface GameUIProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  dialogueMetadata: { [key: string]: Viseme[] };
}

// QuestionOverlay component
interface QuestionOverlayProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const QuestionOverlay: React.FC<QuestionOverlayProps> = ({ gameState, setGameState }) => {
  const { currentQuestion, level } = gameState;
  
  if (!currentQuestion || !currentQuestion.answers) return null;
  
  // Get the current dialogue which contains the question
  const currentDialogue = level.dialogues[gameState.currentDialogueIndex];
  
  const answers = currentQuestion.answers;
  const timeLimit = level.rules.question_time_limit ? 
    parseFloat(level.rules.question_time_limit.replace(/s$/, '')) * 1000 : 10000;
  const timeRemaining = currentQuestion.timeRemaining || 0;
  const timeRatio = timeRemaining / timeLimit;
  
  const handleAnswerClick = (index: number) => {
    setGameState(prevState => handleAnswerSelection(prevState, index));
  };
  
  // Determine the speaker name for the question prompt
  const speakerName = currentDialogue && currentDialogue.speaker 
    ? currentDialogue.speaker.charAt(0).toUpperCase() + currentDialogue.speaker.slice(1)
    : '';
  
  // If the question is from a previous dialogue, get that speaker
  const speakerQuestion = currentDialogue && currentDialogue.speaker !== 'wojak'
    ? `${speakerName} is waiting for your answer...`
    : 'Your response:';
  
  return (
    <div className="karaoke-container question-container">
      <div className="question-prompt">
        <div className="question-speaker">{speakerQuestion}</div>
      </div>
      
      <div className="question-timer-container">
        <div 
          className={`question-timer ${timeRatio < 0.3 ? 'timer-critical pulse' : 
            timeRatio < 0.6 ? 'timer-warning' : ''}`}
          style={{ width: `${timeRatio * 100}%` }}
        />
      </div>
      
      <div className="question-options-container">
        {answers.map((answer: Answer, index: number) => (
          <button 
            key={index}
            className={`question-option ${timeRatio < 0.3 ? 'option-urgent' : ''}`}
            onClick={() => handleAnswerClick(index)}
            data-index={index}
          >
            {answer.text}
          </button>
        ))}
      </div>
      
      <div className="question-timer-text">
        <span className="pulse-count">{Math.ceil(timeRemaining / 1000)}</span>
      </div>
    </div>
  );
};

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

  // build metadata key and load
  const speakerId = currentDialogue.speaker;
  const levelId = gameState.level.id || 'level1'; // Get level ID dynamically
  
  // Determine if this is a question, feedback, or regular dialogue
  let metadata: Viseme[] = [];
  
  if (currentDialogue.text) {
    // Regular dialogue
    const metadataKey = getMetadataPath(levelId, gameState.currentDialogueIndex, speakerId);
    metadata = dialogueMetadata[metadataKey] || [];
  } else if (currentDialogue.answers) {
    // This is a question dialogue - no metadata needed for UI
    // Will be handled by QuestionOverlay component
  } else if (currentDialogue.feedback) {
    // This is a feedback dialogue
    // Choose the correct feedback based on the previous answer
    const isCorrect = gameState.currentQuestion?.isCorrect || false;
    const metadataKey = getFeedbackMetadataPath(levelId, gameState.currentDialogueIndex, speakerId, isCorrect);
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

      {/* All non-question dialogues (regular, answer, and feedback) */}
      {!gameState.showingQuestion && (
        <div className="karaoke-container">
          <div className="karaoke-text">
            {/* For regular dialogue, player answer, or feedback with words and fart opportunities */}
            {isPlayerAnswer ? (
              <div className="answer-text">{selectedAnswerText}</div>
            ) : isFeedbackDialogue ? (
              <div className={gameState.currentQuestion?.isCorrect ? 'correct-feedback' : 'incorrect-feedback'}>
                {feedbackText}
              </div>
            ) : (
              words.map((word, index) => {
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
              })
            )}
          </div>
          
          {/* Always show active fart opportunities in a second layer, regardless of dialogue type */}
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
        </div>
      )}
      
      {/* Show the question overlay when a question is active */}
      {gameState.showingQuestion && (
        <div className="karaoke-container">
          <div className="question-timer-container">
            <div 
              className={`question-timer ${
                gameState.currentQuestion && gameState.currentQuestion.timeRemaining 
                  ? (gameState.currentQuestion.timeRemaining / parseTimeLimit(gameState.level.rules.question_time_limit || "10s") < 0.3 
                      ? 'timer-critical pulse' 
                      : gameState.currentQuestion.timeRemaining / parseTimeLimit(gameState.level.rules.question_time_limit || "10s") < 0.6 
                        ? 'timer-warning' 
                        : '')
                  : ''
              }`}
              style={{ 
                width: `${gameState.currentQuestion 
                  ? (gameState.currentQuestion.timeRemaining / parseTimeLimit(gameState.level.rules.question_time_limit || "10s") * 100)
                  : 100}%` 
              }}
            />
          </div>
          
          <div className="karaoke-text question-text">
            <div className="question-options-container">
              {gameState.currentQuestion?.answers.map((answer, index) => (
                <button 
                  key={index}
                  className={`question-option ${
                    gameState.currentQuestion && gameState.currentQuestion.timeRemaining 
                      ? (gameState.currentQuestion.timeRemaining / parseTimeLimit(gameState.level.rules.question_time_limit || "10s") < 0.3 
                        ? 'option-urgent' : '')
                      : ''
                  }`}
                  onClick={() => setGameState(prevState => handleAnswerSelection(prevState, index))}
                >
                  {answer.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameUI;
