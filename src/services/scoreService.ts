import { GameState } from '../types';

/**
 * Get the final score when the game is over
 */
export const getFinalScore = (state: GameState): number => {
  if (state.victory) {
    // Final score is the negative pressure plus accumulated score
    return Math.max(0, -state.pressure + state.score);
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
  
  const pressureIncrease = (elapsedMs / 1000) * 
    state.level.rules.pressure_buildup_speed * 
    pressureMultiplier;
  
  return state.pressure + pressureIncrease;
};
