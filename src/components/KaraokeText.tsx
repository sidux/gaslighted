import React, { useState } from 'react';
import { GameState, FartOpportunity, Viseme } from '../types';
import { getAllWords, getPlayerCharacterId, isPlayerDialogue } from '../services';
import DialogueAnswers from './DialogueAnswers';

interface KaraokeTextProps {
  gameState: GameState;
  dialogueMetadata: { [key: string]: Viseme[] };
  handleFartAnimationEnd: (opp: FartOpportunity) => void;
  onAnswerSelected?: (wasCorrect: boolean) => void;
}

// Helper function to create fallback metadata for karaoke
const createFallbackMetadata = (text: string, gameSpeed: number = 1.0): Viseme[] => {
  const fallbackMetadata: Viseme[] = [];
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
  // Base timing (adjust as needed)
  const wordDuration = 500; // ms per word
  const adjustedWordDuration = wordDuration / gameSpeed;
  
  // Add word and viseme markers
  words.forEach((word, index) => {
    // Add word marker
    fallbackMetadata.push({
      time: index * adjustedWordDuration,
      type: 'word',
      value: word,
      start: text.indexOf(word),
      end: text.indexOf(word) + word.length - 1
    });
    
    // Add a viseme in the middle of each word for fart opportunity
    // Choose one of the available fart types
    const fartTypes = ['p', 't', 'k', 'f', 'r', 'z'];
    const randomType = fartTypes[Math.floor(Math.random() * fartTypes.length)];
    
    fallbackMetadata.push({
      time: index * adjustedWordDuration + (adjustedWordDuration / 2),
      type: 'viseme',
      value: randomType
    });
  });
  
  return fallbackMetadata;
};

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
  handleFartAnimationEnd,
  onAnswerSelected 
}) => {
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  
  const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
  if (!currentDialogue) return null;

  // Build metadata key and load
  const speakerId = currentDialogue.speaker;
  const levelId = gameState.level.id || 'level1';
  
  // Get game speed from level rules (moved up to be available for all uses)
  const gameSpeed = gameState.level.rules.game_speed || 1.0;

  // Get text to display based on type of dialogue
  let displayText = '';
  let metadataKey = '';
  
  // Check if there's an active selected answer
  const isShowingAnswer = showingFeedback || gameState.selectedAnswerIndex !== undefined;
  const isShowingFeedback = showingFeedback || gameState.showingFeedback;
  
  if (currentDialogue.text) {
    // Regular dialogue with text
    displayText = currentDialogue.text;
    metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${gameState.currentDialogueIndex}-${speakerId}-metadata.json`;
    
  } else if (currentDialogue.answers && gameState.selectedAnswerIndex !== undefined) {
    // This is an answer dialogue with a selected answer
    const selectedAnswer = currentDialogue.answers[gameState.selectedAnswerIndex];
    if (selectedAnswer) {
      displayText = selectedAnswer.text;
      metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${gameState.currentDialogueIndex}-${speakerId}-answer-${gameState.selectedAnswerIndex}-metadata.json`;
      
    }
  } else if (currentDialogue.feedback && gameState.feedbackCorrect !== undefined) {
    // This is a feedback dialogue
    const feedback = currentDialogue.feedback.find(f => f.correct === gameState.feedbackCorrect);
    if (feedback) {
      displayText = feedback.text;
      const feedbackType = gameState.feedbackCorrect ? 'correct' : 'incorrect';
      metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${gameState.currentDialogueIndex}-${speakerId}-feedback-${feedbackType}-metadata.json`;
      
    }
  } else if (currentDialogue.answers) {
    // Answer dialogue but no selection yet - show prompt text
    displayText = "What do you think?";
    
  }

  // Try to get metadata from the loaded resources
  let metadata = dialogueMetadata[metadataKey] || [];
  
  // If we don't have metadata but we have display text, create fallback metadata for karaoke
  if (metadata.length === 0 && displayText) {
    console.log("Creating fallback metadata for dialogue");
    metadata = createFallbackMetadata(displayText, gameSpeed);
    
    // Add to dialogueMetadata for potential reuse
    if (gameState.setGameState && metadataKey) {
      gameState.setGameState(prevState => {
        if (!prevState) return null;
        
        // Create a new dialogueMetadata object with our fallback metadata
        const newDialogueMetadata = {
          ...prevState.dialogueMetadata,
          [metadataKey]: metadata
        };
        
        // Check if we need to generate new fart opportunities
        const dialogueOpportunities = prevState.fartOpportunities.filter(
          opp => opp.dialogueIndex === prevState.currentDialogueIndex
        );
        
        let newFartOpportunities = prevState.fartOpportunities;
        
        // If we don't have opportunities for this dialogue, generate them from the fallback metadata
        if (dialogueOpportunities.length === 0) {
          console.log("Generating fart opportunities from fallback metadata");
          
          // Generate opportunities from the visemes in our fallback metadata
          const newOpportunities = metadata
            .filter(item => item.type === 'viseme')
            .map((viseme, index) => {
              // Find the word index for this viseme
              const wordIndex = metadata
                .filter(item => item.type === 'word')
                .findIndex(wordItem => wordItem.time < viseme.time);
              
              return {
                dialogueIndex: prevState.currentDialogueIndex,
                wordIndex: Math.max(0, wordIndex),
                visemeIndex: metadata.findIndex(item => item === viseme),
                time: viseme.time,
                type: viseme.value as any, // This should be a valid FartType
                active: false,
                handled: false,
                pressed: false,
                pressedTime: 0,
                animationKey: `fallback-${prevState.currentDialogueIndex}-${index}`
              };
            });
          
          // Add the new opportunities to the existing ones
          newFartOpportunities = [...prevState.fartOpportunities, ...newOpportunities];
        }
        
        return {
          ...prevState,
          dialogueMetadata: newDialogueMetadata,
          fartOpportunities: newFartOpportunities
        };
      });
    }
  }
  // Process the words from metadata, applying game speed
  const words = getAllWords(metadata, displayText, gameSpeed);
  
  const currentWordIndex = gameState.currentWordIndex;

  // Log metadata information for debugging
  console.log("Current dialogue type:", 
              currentDialogue.text ? "regular" : 
              currentDialogue.answers ? "answers" : 
              currentDialogue.feedback ? "feedback" : "unknown");
  console.log("Display text:", displayText);
  console.log("Metadata key:", metadataKey);
  console.log("Metadata found:", metadata.length > 0);
  console.log("Words count:", words.length);
  
  // Debugging fart opportunities
  const allOpportunitiesForThisDialogue = gameState.fartOpportunities.filter(
    opp => opp.dialogueIndex === gameState.currentDialogueIndex
  );
  console.log("Total opportunities for this dialogue:", allOpportunitiesForThisDialogue.length);
  
  // Pick out all active, un‐handled opportunities for this dialogue
  const activeFartOpportunities = gameState.fartOpportunities.filter(
    opp =>
      opp.dialogueIndex === gameState.currentDialogueIndex &&
      opp.active &&
      !opp.handled
  );
  console.log("Active opportunities count:", activeFartOpportunities.length);
  
  // Check for any inactive opportunities that are in the current time window
  const currentTime = gameState.playbackTime;
  // Using gameSpeed defined above
  const inactiveButInTimeWindow = allOpportunitiesForThisDialogue.filter(opp => {
    const adjustedTime = opp.time * (1.0 / gameSpeed);
    const startTime = adjustedTime - (gameState.level.rules.precision_window_ms * 2.5 / gameSpeed);
    const endTime = adjustedTime + (gameState.level.rules.letter_visible_duration_ms / gameSpeed);
    
    return !opp.active && !opp.handled && currentTime >= startTime && currentTime <= endTime;
  });
  
  if (inactiveButInTimeWindow.length > 0) {
    console.log("Found inactive opportunities that should be active:", inactiveButInTimeWindow);
  }

  // Map wordIndex → opportunity
  const wordToFartOpportunityMap = new Map<number, FartOpportunity>();
  activeFartOpportunities.forEach(opp => {
    wordToFartOpportunityMap.set(opp.wordIndex, opp);
  });

  // Handle answer selection
  const handleAnswerSelect = (wasCorrect: boolean, answerIndex: number) => {
    
    
    // Adjust shame based on answer correctness
    const shameChange = wasCorrect 
      ? gameState.level.rules.question?.correct_answer_shame_change || -10
      : gameState.level.rules.question?.incorrect_answer_shame_change || 15;
    
    // Call parent handler if provided
    if (onAnswerSelected) {
      onAnswerSelected(wasCorrect);
    }
    
    // After answering, we need to advance to the feedback dialogue after the answer audio ends
    const nextDialogueIndex = gameState.currentDialogueIndex + 1;
    
    // Check if the next dialogue has feedback
    const hasFeedback = 
      nextDialogueIndex < gameState.level.dialogues.length &&
      gameState.level.dialogues[nextDialogueIndex].feedback;
      
    
    
    if (hasFeedback) {
      // Only show feedback UI after the answer audio has completed
      // The actual dialogue advancement to feedback happens in DialogueAnswers component
      // after answer audio finishes
      setShowingFeedback(true);
      setFeedbackCorrect(wasCorrect);
    } else {
      // If there's no feedback dialogue, manually advance to the next dialogue after the answer audio
      // Audio advancement is handled in DialogueAnswers component
      
    }
  };

  // Render text or answers
  const hasAnswers = currentDialogue.answers && currentDialogue.answers.length > 0;
  const hasFeedback = currentDialogue.feedback && currentDialogue.feedback.length > 0;

  return (
    <div className={`karaoke-text ${hasAnswers ? 'has-answers' : ''}`}>
      {/* Karaoke text for all dialogue types - regular, answers, and feedback */}
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
      
      {/* Show answers if available */}
      {hasAnswers && !showingFeedback && (
        <div className="dialogue-answer-container">
          <DialogueAnswers 
            dialogue={currentDialogue}
            dialogueIndex={gameState.currentDialogueIndex}
            gameState={gameState}
            onAnswerSelected={handleAnswerSelect}
            isGamePaused={gameState.isPaused}
          />
        </div>
      )}
      
      {/* Show feedback if we just answered */}
      {showingFeedback && hasFeedback && (
        <div className={`dialogue-feedback ${feedbackCorrect ? 'correct' : 'incorrect'}`}>
          {currentDialogue.feedback?.find(f => f.correct === feedbackCorrect)?.text || ''}
        </div>
      )}
    </div>
  );
};

export default KaraokeText;
