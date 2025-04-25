import {DialogueItem, GameState} from '../types';
import {getPlayerCharacterId} from './playerService';

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

  // Create a deep copy of the level with the answer text directly added to the player's answer dialogue
  // This ensures the answer text is available even if currentQuestion gets cleared
  const selectedAnswerText = state.currentQuestion.answers[answerIndex].text;

};

/**
 * Update question state with timer and effects
 */
export const updateQuestionState = (state: GameState, gameSpeed: number = 1.0): GameState => {
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
  
  // Apply game speed to time elapsed calculation
  const timeElapsed = (Date.now() - (state.currentQuestion.startTime || Date.now())) * gameSpeed;
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
