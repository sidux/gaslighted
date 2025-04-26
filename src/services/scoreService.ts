import { GameState } from '../types';

/**
 * Get the final score when the game is over
 */
export const getFinalScore = (state: GameState): number => {
  if (state.victory) {
    // Final score is just the accumulated score since pressure can't be negative
    return state.score;
  } else {
    // Failed, score is just the accumulated score
    return state.score;
  }
};

/**
 * Check if the player has won or lost the game
 */
export const checkGameCompletion = (state: GameState, dialogueIndex: number): { 
  isGameOver: boolean;
  victory: boolean;
} => {
  const isLevelComplete = dialogueIndex >= state.level.dialogues.length;
  const isShameMaxed = state.shame >= 100;
  
  return {
    isGameOver: isLevelComplete || isShameMaxed,
    victory: isLevelComplete && !isShameMaxed
  };
};

/**
 * Update pressure based on elapsed time
 */
export const updatePressure = (
  state: GameState, 
  elapsedMs: number
): number => {
  // If pressure_buildup_speed is 0, return current pressure without increasing
  if (state.level.rules.pressure_buildup_speed === 0) {
    return state.pressure;
  }
  
  // Check if a question is active
  const currentDialogue = state.level.dialogues[state.currentDialogueIndex];
  const isQuestionActive = currentDialogue && 
                           currentDialogue.answers && 
                           currentDialogue.answers.length > 0 &&
                           !state.showingAnswer && 
                           !state.showingFeedback && 
                           state.selectedAnswerIndex === undefined;
  
  // Apply question pressure multiplier if a question is active
  const pressureMultiplier = isQuestionActive 
    ? (state.level.rules.question?.pressure_multiplier || 1.0)
    : 1.0;
  
  // Calculate pressure increase - ensure consistent rate regardless of frame rate
  // Cap elapsed time to prevent huge jumps
  const cappedElapsedMs = Math.min(elapsedMs, 100);
  
  // Calculate pressure increase based on elapsed time and level configuration
  const pressureIncrease = (cappedElapsedMs / 1000) * 
    state.level.rules.pressure_buildup_speed * 
    pressureMultiplier;
  
  // Only apply a small minimum increase to ensure visible movement when needed
  const minimumIncrease = 0.02;
  
  // Use the actual calculated pressure increase instead of forcing a minimum
  // This respects the level configuration more accurately
  // Also ensure pressure never goes below 0
  return Math.max(0, state.pressure + (pressureIncrease > 0 ? Math.max(minimumIncrease, pressureIncrease) : pressureIncrease));
};
