import { GameState, Viseme } from '../types';
import { getPlayerCharacterId, isPlayerDialogue } from './playerService';

/**
 * Get metadata for the current dialogue
 */
export const getDialogueMetadata = (state: GameState): Viseme[] => {
  const levelId = state.level.id || 'level1';
  const currentDialogue = state.level.dialogues[state.currentDialogueIndex];
  const speakerId = currentDialogue?.speaker;
  
  if (!speakerId) return [];
  
  if (currentDialogue.text) {
    // Regular dialogue
    const metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${state.currentDialogueIndex}-${speakerId}-metadata.json`;
    return state.dialogueMetadata[metadataKey] || [];
  }
  
  return [];
};

/**
 * Update word and viseme indices based on playback time, adjusted by game speed
 */
export const updateWordAndVisemeIndices = (
  state: GameState, 
  metadata: Viseme[], 
  playbackTime: number
): { newWordIndex: number, newVisemeIndex: number } => {
  let newWordIndex = state.currentWordIndex;
  let newVisemeIndex = state.currentVisemeIndex;
  
  // Get game speed from level rules
  const gameSpeed = state.level.rules.game_speed || 1.0;
  
  // Find current word - apply game speed to metadata time values
  const wordItems = metadata.filter(item => item.type === 'word');
  for (let i = 0; i < wordItems.length; i++) {
    // Scale the metadata time by game speed to match audio playback rate
    const adjustedWordTime = wordItems[i].time * (1.0 / gameSpeed);
    if (playbackTime >= adjustedWordTime) {
      newWordIndex = i;
    } else {
      break;
    }
  }
  
  // Find current viseme - apply game speed to metadata time values
  const visemeItems = metadata.filter(item => item.type === 'viseme');
  for (let i = 0; i < visemeItems.length; i++) {
    // Scale the metadata time by game speed to match audio playback rate
    const adjustedVisemeTime = visemeItems[i].time * (1.0 / gameSpeed);
    if (playbackTime >= adjustedVisemeTime) {
      newVisemeIndex = metadata.findIndex(item => 
        item.type === 'viseme' && item.time === visemeItems[i].time
      );
    } else {
      break;
    }
  }
  
  return { newWordIndex, newVisemeIndex };
};

/**
 * Check if dialogue is complete and handle transition
 */
export const checkDialogueCompletion = (
  state: GameState,
  metadata: Viseme[],
  playbackTime: number
): { 
  newDialogueIndex: number, 
  completedCurrentDialogue: boolean,
  updatedState?: GameState
} => {
  let newDialogueIndex = state.currentDialogueIndex;
  let completedCurrentDialogue = false;
  let updatedState = undefined;
  
  // Get game speed from level rules
  const gameSpeed = state.level.rules.game_speed || 1.0;
  
  // Check if we've reached the end of this dialogue
  const lastItem = metadata[metadata.length - 1];
  if (lastItem && lastItem.time !== undefined) {
    // Scale the metadata time and pause duration by game speed
    const adjustedLastTime = lastItem.time * (1.0 / gameSpeed);
    const adjustedPauseDuration = 1000 * (1.0 / gameSpeed);
    
    if (playbackTime >= adjustedLastTime + adjustedPauseDuration) {
      // Regular dialogue, advance to next
      newDialogueIndex++;
      completedCurrentDialogue = true;
    }
  }
  
  return { newDialogueIndex, completedCurrentDialogue, updatedState };
};



/**
 * Helper function to shuffle array
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
