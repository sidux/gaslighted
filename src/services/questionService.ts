import { GameState } from '../types';

/**
 * Show a question based on current dialogue
 */
export const showQuestion = (state: GameState): GameState => {
  const currentDialogue = state.level.dialogues[state.currentDialogueIndex];
  
  // If there's no dialogue or no answers to show, return unchanged state
  if (!currentDialogue || !currentDialogue.answers || currentDialogue.answers.length === 0) {
    return state;
  }
  
  // Get the time limit from rules
  const timeLimit = typeof state.level.rules.question_time_limit === 'string'
    ? parseFloat(state.level.rules.question_time_limit.replace(/s$/, '')) * 1000
    : 10000;
  
  const currentTimestamp = Date.now();
  
  // Create a question state with the answers from the current dialogue
  return {
    ...state,
    showingQuestion: true,
    pausedTimestamp: currentTimestamp, // Pause game while showing question
    currentQuestion: {
      answers: [...currentDialogue.answers], // Use answers from current dialogue
      timeRemaining: timeLimit,
      startTime: currentTimestamp
    },
    screenEffects: {
      ...state.screenEffects,
      heartbeatIntensity: 20,
      pulseEffect: false
    }
  };
};

/**
 * Move to feedback or next dialogue based on answer
 */
export const handleAnswerCompletion = (state: GameState): GameState => {
  if (!state.currentQuestion) {
    return state;
  }

  // Check if there's a feedback dialogue after the current dialogue
  const nextDialogueIndex = state.currentDialogueIndex + 1;
  const nextDialogue = state.level.dialogues[nextDialogueIndex];
  const hasFeedback = nextDialogue && nextDialogue.feedback;
  
  // If next dialogue has feedback, show the appropriate feedback
  // based on whether the answer was correct or not
  if (hasFeedback && nextDialogue.feedback && state.currentQuestion.isCorrect !== undefined) {
    const feedbackIndex = state.currentQuestion.isCorrect ? 0 : 1;
    const feedbackDialogue = {
      ...nextDialogue,
      text: nextDialogue.feedback[feedbackIndex]?.text || ""
    };
    
    // Update the next dialogue with the feedback text
    const updatedDialogues = [...state.level.dialogues];
    updatedDialogues[nextDialogueIndex] = feedbackDialogue;
    
    // Move to the feedback dialogue
    return {
      ...state,
      level: {
        ...state.level,
        dialogues: updatedDialogues
      },
      showingQuestion: false,
      pausedTimestamp: null, // Resume the game
      currentQuestion: undefined,
      currentDialogueIndex: nextDialogueIndex,
      playbackTime: 0,
      currentWordIndex: 0,
      currentVisemeIndex: -1
    };
  }
  
  // If no feedback, move to the next regular dialogue
  const isLevelComplete = nextDialogueIndex >= state.level.dialogues.length;
  
  return {
    ...state,
    showingQuestion: false,
    pausedTimestamp: null, // Resume the game
    currentQuestion: undefined,
    currentDialogueIndex: nextDialogueIndex,
    playbackTime: 0,
    currentWordIndex: 0,
    currentVisemeIndex: -1,
    victory: isLevelComplete && state.shame < 100,
    isGameOver: isLevelComplete || state.shame >= 100,
  };
};

/**
 * Update question timer and effects
 */
export const updateQuestionTimer = (state: GameState, gameSpeed: number = 1.0): GameState => {
  if (!state.currentQuestion || !state.showingQuestion) {
    return state;
  }
  
  // Parse time limit from rules
  const timeLimit = typeof state.level.rules.question_time_limit === 'string'
    ? parseFloat(state.level.rules.question_time_limit.replace(/s$/, '')) * 1000
    : 10000;
  
  // Initialize startTime if not set
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
  
  // Calculate time remaining with game speed factor
  const timeElapsed = (Date.now() - state.currentQuestion.startTime) * gameSpeed;
  const timeRemaining = Math.max(0, timeLimit - timeElapsed);
  
  // Update heartbeat and pulse effects based on time remaining
  const timeRatio = timeRemaining / timeLimit;
  const heartbeatIntensity = timeRatio < 0.2 ? 80 : timeRatio < 0.5 ? 40 : 20;
  const pulseEffect = timeRatio < 0.3;
  
  // If time's up, automatically select an incorrect answer
  if (timeRemaining <= 0 && !state.currentQuestion.selectedAnswer) {
    // Find the first incorrect answer
    const answers = state.currentQuestion.answers;
    const wrongAnswerIndex = answers.findIndex(a => !a.correct);
    
    // Create timeout event to trigger answer selection
    setTimeout(() => {
      const answerCompletedEvent = new CustomEvent('answer-completed', {
        detail: {
          dialogueIndex: state.currentDialogueIndex,
          answerIndex: wrongAnswerIndex >= 0 ? wrongAnswerIndex : 0,
          isCorrect: false
        }
      });
      document.dispatchEvent(answerCompletedEvent);
    }, 0);
    
    // Update state with selected wrong answer
    return {
      ...state,
      currentQuestion: {
        ...state.currentQuestion,
        selectedAnswer: wrongAnswerIndex >= 0 ? wrongAnswerIndex : 0,
        isCorrect: false,
        timeRemaining: 0
      },
      screenEffects: {
        ...state.screenEffects,
        heartbeatIntensity,
        pulseEffect
      }
    };
  }
  
  // Normal timer update
  return {
    ...state,
    currentQuestion: {
      ...state.currentQuestion,
      timeRemaining
    },
    screenEffects: {
      ...state.screenEffects,
      heartbeatIntensity,
      pulseEffect
    }
  };
};