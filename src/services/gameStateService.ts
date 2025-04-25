import { GameState, Level, Viseme } from '../types';
import { generateFartOpportunities, handleTerribleFart, updateFartOpportunities } from './fartService';
import { getDialogueMetadata, updateWordAndVisemeIndices, checkDialogueCompletion } from './dialogueService';
import { updatePressure, checkGameCompletion } from './scoreService';

/**
 * Initialize the game state with default values
 */
export const initializeGameState = (level: Level, dialogueMetadata: { [key: string]: Viseme[] }): GameState => {
  return {
    level,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    victory: false,
    currentDialogueIndex: 0,
    pressure: 0,
    shame: 0,
    combo: 0,
    score: 0,
    playbackTime: 0,
    currentWordIndex: -1,
    currentVisemeIndex: -1,
    fartOpportunities: generateFartOpportunities(level, dialogueMetadata),
    currentFartOpportunity: null,
    lastFartResult: null,
    dialogueMetadata,
    pausedTimestamp: null,
    screenEffects: {
      heartbeatIntensity: 0,
      pulseEffect: false,
      blurEffect: false
    }
  };
};

/**
 * Reset game state for a new game
 */
export const resetGameState = (state: GameState): GameState => {
  return {
    ...state,
    isPlaying: true,
    isPaused: false,
    isGameOver: false,
    victory: false,
    currentDialogueIndex: 0,
    pressure: 0,
    shame: 0,
    combo: 0,
    score: 0,
    playbackTime: 0,
    currentWordIndex: -1,
    currentVisemeIndex: -1,
    lastFartResult: null,
    pausedTimestamp: null,
    screenEffects: {
      heartbeatIntensity: 0,
      pulseEffect: false,
      blurEffect: false
    }
  };
};

/**
 * Update game state based on elapsed time
 */
export const updateGameState = (state: GameState, elapsedMs: number): GameState => {
  if (!state.isPlaying || state.isGameOver) {
    return state;
  }
  
  // Apply game speed to elapsed time
  const gameSpeed = state.level.rules.game_speed || 1.0; // Default to 1.0 if not specified
  const adjustedElapsedMs = elapsedMs * gameSpeed;
  
  // Update pressure
  let pressureMultiplier = 1;
  const newPressure = updatePressure(state, adjustedElapsedMs * pressureMultiplier);
  
  // Check for auto-fart (pressure max)
  if (newPressure >= 100 && !state.lastFartResult) {
    return handleTerribleFart(state, newPressure);
  }
  
  // Update playback time
  const newPlaybackTime = state.playbackTime + elapsedMs;
  
  // Find current dialogue
  const currentDialogue = state.level.dialogues[state.currentDialogueIndex];
  if (!currentDialogue) return state;
  
  // Get metadata for the current dialogue
  const currentMetadata = getDialogueMetadata(state);
  if (!currentMetadata || currentMetadata.length === 0) return state;
  
  // Update current word and viseme indices
  const { newWordIndex, newVisemeIndex } = updateWordAndVisemeIndices(
    state, 
    currentMetadata, 
    newPlaybackTime
  );
  
  // Check if dialogue is complete
  const { newDialogueIndex, completedCurrentDialogue, updatedState } = 
    checkDialogueCompletion(state, currentMetadata, newPlaybackTime);
  
  if (updatedState) return updatedState;
  
  // Update fart opportunities
  const { newFartOpportunities, currentFartOpportunity } = 
    updateFartOpportunities(state, newPlaybackTime);
  
  // Check for level completion
  const { isGameOver, victory } = checkGameCompletion(state, newDialogueIndex);
  
  // Create updated state
  let result = {
    ...state,
    pressure: newPressure,
    playbackTime: newPlaybackTime,
    currentWordIndex: newWordIndex,
    currentVisemeIndex: newVisemeIndex,
    currentDialogueIndex: newDialogueIndex,
    fartOpportunities: newFartOpportunities,
    currentFartOpportunity,
    isGameOver,
    victory,
  };
  
  // Reset playback time and indices when dialogue completes
  if (completedCurrentDialogue) {
    result = {
      ...result,
      playbackTime: 0,
      currentWordIndex: -1,
      currentVisemeIndex: -1,
      lastFartResult: null,
    };
  }
  
  return result;
};
