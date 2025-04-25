import { GameState, DialogueItem } from '../types';
import { playAnswerAudio } from './audioService';
import { getPlayerCharacterId } from './playerService';

/**
 * Convert time string to milliseconds (e.g., "10s" to 10000)
 */
export const parseTimeLimit = (timeLimit: string): number => {
  if (!timeLimit) return 10000; // Default to 10 seconds
  
  const match = timeLimit.match(/^(\d+)(m?s)$/);
  if (!match) return 10000;
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  return unit === 'ms' ? value : value * 1000;
};

/**
 * Handle answer selection for questions
 */
export const handleAnswerSelection = (state: GameState, answerIndex: number): GameState => {
  if (!state.showingQuestion || !state.currentQuestion) {
    return state;
  }
  
  // Validate answer selection
  if (!state.currentQuestion.answers || 
      !Array.isArray(state.currentQuestion.answers) || 
      answerIndex < 0 || 
      answerIndex >= state.currentQuestion.answers.length) {
    console.error("Invalid answer selection:", answerIndex, state.currentQuestion);
    return {
      ...state,
      showingQuestion: false
    };
  }
  
  const selectedAnswer = state.currentQuestion.answers[answerIndex];
  const isCorrect = selectedAnswer ? selectedAnswer.correct : false;
  
  // Get question effects from rules
  const effects = state.level.rules.question_effects || {
    correct_shame_change: -10,
    incorrect_shame_change: 15,
    heartbeat_intensity: 70
  };
  
  // Update shame based on answer correctness
  let newShame = state.shame;
  if (isCorrect) {
    newShame = Math.max(0, newShame + effects.correct_shame_change);
  } else {
    newShame = Math.min(100, newShame + effects.incorrect_shame_change);
  }
  
  // Update screen effects
  const screenEffects = {
    heartbeatIntensity: isCorrect ? 10 : effects.heartbeat_intensity,
    pulseEffect: !isCorrect,
    blurEffect: newShame > 70
  };
  

  
  // Create a deep copy of the level with the answer text directly added to the player's answer dialogue
  // This ensures the answer text is available even if currentQuestion gets cleared
  const modifiedLevel = JSON.parse(JSON.stringify(state.level));
  const selectedAnswerText = state.currentQuestion.answers[answerIndex].text;
  const playerCharacterId = getPlayerCharacterId(state.level);
  
  console.log("Selected answer text:", selectedAnswerText);
  
  // Instead of searching for a separate player answer dialogue, use the current dialogue
  // that already contains the answers - just add the selected text
  const currentDialogue = modifiedLevel.dialogues[state.currentDialogueIndex];
  
  // Add the selectedAnswerText directly to the current dialogue
  if (currentDialogue && currentDialogue.speaker === playerCharacterId && currentDialogue.answers) {
    // Store the selected answer text for display
    currentDialogue.text = selectedAnswerText;
    // Keep the answers array for reference, but we'll now use the text property for display
    console.log(`Added answer text to current ${playerCharacterId} dialogue:`, selectedAnswerText);
  } else {
    console.error(`Current dialogue is not a ${playerCharacterId} answer dialogue:`, state.currentDialogueIndex);
    console.log("Dialogues:", modifiedLevel.dialogues.map((d: DialogueItem, i: number) => ({
      index: i,
      speaker: d.speaker,
      hasText: !!d.text,
      hasAnswers: !!d.answers,
      hasFeedback: !!d.feedback
    })));
  }
  
  // Create the updated state with answer selection and affect pressure based on answer correctness
  const updatedState = {
    ...state,
    level: modifiedLevel, // Use our modified level with added answer text
    showingQuestion: false,
    shame: newShame,
    // Increase pressure if answer is incorrect, slightly decrease if correct
    pressure: isCorrect 
      ? Math.max(0, state.pressure - 10) // Decrease pressure for correct answers (relief)
      : Math.min(100, state.pressure + 20), // Increase pressure for wrong answers
    currentQuestion: {
      ...state.currentQuestion,
      selectedAnswer: answerIndex,
      isCorrect,
      timeRemaining: 0
    },
    screenEffects,
    pausedTimestamp: Date.now(), // Important: Pause the game while playing the answer
    currentWordIndex: 0 // Reset word index for the answer/feedback text
  };
  
  // Animation effects will be added when the question UI is replaced with answer dialogue
  
  // This section was redundant and already handled above
  
  // Play the answer audio if resources exist
  if (state.audioResources) {
    const levelId = state.level.id || 'level1';
    const dialogueIndex = state.currentDialogueIndex;
    const speakerId = getPlayerCharacterId(state.level); // Get player character ID dynamically
    
    // Add visual feedback for correct/incorrect answer - using setTimeout to ensure the effect happens
    // after the question UI has been replaced with the answer UI
    setTimeout(() => {
      const karaokeContainer = document.querySelector('.karaoke-container');
      if (karaokeContainer) {
        karaokeContainer.classList.add(isCorrect ? 'answer-feedback-correct' : 'answer-feedback-incorrect');
        setTimeout(() => {
          karaokeContainer.classList.remove('answer-feedback-correct', 'answer-feedback-incorrect');
        }, 800); // Keep the effect a bit longer (800ms)
      }
    }, 300); // Delay to ensure the DOM has updated and animation is visible
    
    // This will play the player's answer as a dialogue
    try {
      playAnswerAudio(
        state.audioResources,
        levelId,
        dialogueIndex,
        speakerId,
        answerIndex,
        () => {
          // When answer audio finishes, wait a bit longer to show the answer text
          // then move to the next dialogue (feedback)
          console.log("Answer audio finished playing");
          setTimeout(() => {
            // Resume after a brief pause to show the answer text
            if (document.visibilityState !== 'hidden') {
              const event = new CustomEvent('answer-complete', {
                detail: { dialogueIndex: state.currentDialogueIndex, answerIndex }
              });
              document.dispatchEvent(event);
            }
          }, 2000); // Wait longer before showing feedback (2 seconds)
        }
      );
    } catch (error) {
      console.error("Error playing answer audio:", error);
      // If there was an error playing the audio, still trigger the event
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          const event = new CustomEvent('answer-complete', {
            detail: { dialogueIndex: state.currentDialogueIndex, answerIndex }
          });
          document.dispatchEvent(event);
        }
      }, 2000);
    }
  } else {
    // If no audio resources, still trigger the event after a short delay
    setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
        const event = new CustomEvent('answer-complete', {
          detail: { dialogueIndex: state.currentDialogueIndex, answerIndex }
        });
        document.dispatchEvent(event);
      }
    }, 2000); // Give more time to read the answer (2 seconds)
  }
  
  return updatedState;
};

/**
 * Update question state with timer and effects
 */
export const updateQuestionState = (state: GameState): GameState => {
  if (!state.currentQuestion) {
    return state;
  }
  
  const timeLimit = parseTimeLimit(state.level.rules.question_time_limit || "10s");
  
  // Initialize startTime if missing
  if (state.currentQuestion.startTime === undefined) {
    return {
      ...state,
      currentQuestion: {
        ...state.currentQuestion,
        startTime: Date.now(),
        timeRemaining: timeLimit
      }
    };
  }
  
  const timeElapsed = Date.now() - (state.currentQuestion.startTime || Date.now());
  const timeRemaining = Math.max(0, timeLimit - timeElapsed);
  
  // Update heartbeat intensity based on time remaining
  const timeRatio = timeRemaining / timeLimit;
  const heartbeatIntensity = timeRatio < 0.2 ? 80 : timeRatio < 0.5 ? 40 : 20;
  
  // Time's up - select a wrong answer automatically
  if (timeRemaining <= 0) {
    const answers = state.currentQuestion.answers;
    if (answers && answers.length > 0) {
      const wrongAnswerIndex = answers.findIndex(a => !a.correct);
      return handleAnswerSelection(state, wrongAnswerIndex >= 0 ? wrongAnswerIndex : 0);
    } else {
      return {
        ...state,
        showingQuestion: false
      };
    }
  }
  
  return {
    ...state,
    currentQuestion: {
      ...state.currentQuestion,
      timeRemaining
    },
    screenEffects: {
      ...state.screenEffects,
      heartbeatIntensity,
      pulseEffect: timeRatio < 0.2
    }
  };
};

/**
 * Show a question
 */
export const showQuestion = (state: GameState): GameState => {
  const currentDialogue = state.level.dialogues[state.currentDialogueIndex];
  
  if (!currentDialogue || !currentDialogue.answers || currentDialogue.answers.length === 0) {
    return state;
  }
  
  const shuffledAnswers = [...currentDialogue.answers];
  const currentTimestamp = Date.now();
  
  return {
    ...state,
    showingQuestion: true,
    pausedTimestamp: currentTimestamp,
    currentQuestion: {
      answers: shuffledAnswers,
      timeRemaining: parseTimeLimit(state.level.rules.question_time_limit || "10s"),
      startTime: currentTimestamp
    },
    screenEffects: {
      ...state.screenEffects,
      heartbeatIntensity: 20,
      pulseEffect: false
    }
  };
};
