import { GameState, Viseme } from '../types';
import { showQuestion } from './questionService';
import { getPlayerCharacterId, isPlayerDialogue } from './playerService';

/**
 * Get metadata for the current dialogue
 */
export const getDialogueMetadata = (state: GameState): Viseme[] => {
  const levelId = state.level.id || 'level1';
  const currentDialogue = state.level.dialogues[state.currentDialogueIndex];
  const speakerId = currentDialogue?.speaker;
  
  if (!speakerId) return [];
  
  // Get player character ID
  const playerCharacterId = getPlayerCharacterId(state.level);
  
  // Check if this is a player answer dialogue
  const isPlayerAnswer = speakerId === playerCharacterId && 
                         (state.currentQuestion?.selectedAnswer !== undefined || 
                          (currentDialogue.answers && currentDialogue.text));
                         
  if (isPlayerAnswer) {
    // If this is a player dialogue with answers array and text property,
    // this is using our new approach where we added text directly to the answers dialogue
    if (currentDialogue.answers && currentDialogue.text) {
      const metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${state.currentDialogueIndex}-${speakerId}-metadata.json`;
      const metadata = state.dialogueMetadata[metadataKey];
      if (metadata && metadata.length > 0) {
        return metadata;
      }
      
      // If no direct metadata exists for this dialogue, try to find the answer metadata
      // for the selected answer (fallback to old approach)
      const answerIndex = state.currentQuestion?.selectedAnswer || 0;
      const answerMetadataKey = `src/assets/dialogue/speech_marks/${levelId}-${state.currentDialogueIndex}-${speakerId}-answer-${answerIndex}-metadata.json`;
      return state.dialogueMetadata[answerMetadataKey] || [];
    } else {
      // Legacy approach - separate answer dialogue
      const answerIndex = state.currentQuestion?.selectedAnswer || 0;
      const metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${state.currentDialogueIndex}-${speakerId}-answer-${answerIndex}-metadata.json`;
      return state.dialogueMetadata[metadataKey] || [];
    }
  }
  else if (currentDialogue.text) {
    // Regular dialogue
    const metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${state.currentDialogueIndex}-${speakerId}-metadata.json`;
    return state.dialogueMetadata[metadataKey] || [];
  } 
  else if (currentDialogue.feedback) {
    // Feedback dialogue
    const isCorrect = state.currentQuestion?.isCorrect || false;
    const metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${state.currentDialogueIndex}-${speakerId}-feedback-${isCorrect ? 'correct' : 'incorrect'}-metadata.json`;
    return state.dialogueMetadata[metadataKey] || [];
  }
  
  return [];
};

/**
 * Update word and viseme indices based on playback time
 */
export const updateWordAndVisemeIndices = (
  state: GameState, 
  metadata: Viseme[], 
  playbackTime: number
): { newWordIndex: number, newVisemeIndex: number } => {
  let newWordIndex = state.currentWordIndex;
  let newVisemeIndex = state.currentVisemeIndex;
  
  // Find current word
  const wordItems = metadata.filter(item => item.type === 'word');
  for (let i = 0; i < wordItems.length; i++) {
    if (playbackTime >= wordItems[i].time) {
      newWordIndex = i;
    } else {
      break;
    }
  }
  
  // Find current viseme
  const visemeItems = metadata.filter(item => item.type === 'viseme');
  for (let i = 0; i < visemeItems.length; i++) {
    if (playbackTime >= visemeItems[i].time) {
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
  
  // Check if we've reached the end of this dialogue
  const lastItem = metadata[metadata.length - 1];
  if (lastItem && lastItem.time !== undefined && playbackTime >= lastItem.time + 1000) {
    const currentDialogue = state.level.dialogues[state.currentDialogueIndex];
    
    if (currentDialogue.answers && Array.isArray(currentDialogue.answers) && !state.showingQuestion) {
      // Show question instead of advancing
      updatedState = showQuestion(state);
    } 
    else if (currentDialogue.feedback) {
      // Previous dialogue was a question, now show feedback
      if (state.currentQuestion && state.currentQuestion.selectedAnswer !== undefined) {
        // Move to next dialogue after feedback
        newDialogueIndex++;
        completedCurrentDialogue = true;
      } else {
        // Skip feedback if no answer was selected
        newDialogueIndex++;
        completedCurrentDialogue = true;
      }
    } else {
      // Regular dialogue, advance to next
      newDialogueIndex++;
      completedCurrentDialogue = true;
    }
  }
  
  return { newDialogueIndex, completedCurrentDialogue, updatedState };
};

/**
 * Check if the current dialogue is a question
 */
export const isQuestionDialogue = (state: GameState): boolean => {
  const currentDialogue = state.level.dialogues[state.currentDialogueIndex];
  return Boolean(currentDialogue && currentDialogue.answers);
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
