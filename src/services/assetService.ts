import { Level, Participant, AudioResources, Viseme, FartType } from '../types';

/* --- PATH UTILITY FUNCTIONS --- */

/**
 * Get the path for a participant face image
 */
export const getFacePath = (participantId: string, expression: string): string => {
  return `src/assets/faces/${participantId}-${expression}.png`;
};

/**
 * Get the path for a dialogue audio file
 */
export const getDialogueAudioPath = (levelId: string, dialogueIndex: number, speakerId: string): string => {
  return `src/assets/dialogue/${levelId}-${dialogueIndex}-${speakerId}.mp3`;
};

/**
 * Get the path for an answer audio file
 */
export const getAnswerAudioPath = (levelId: string, dialogueIndex: number, speakerId: string, answerIndex: number): string => {
  return `src/assets/dialogue/${levelId}-${dialogueIndex}-${speakerId}-answer-${answerIndex}.mp3`;
};

/**
 * Get the path for a feedback audio file
 */
export const getFeedbackAudioPath = (levelId: string, dialogueIndex: number, speakerId: string, isCorrect: boolean): string => {
  return `src/assets/dialogue/${levelId}-${dialogueIndex}-${speakerId}-feedback-${isCorrect ? 'correct' : 'incorrect'}.mp3`;
};

/**
 * Get the path for a fart audio file
 */
export const getFartAudioPath = (fartType: FartType): string => {
  return `src/assets/audio/${fartType}-fart.mp3`;
};

/**
 * Get the path for metadata file
 */
export const getMetadataPath = (levelId: string, dialogueIndex: number, speakerId: string): string => {
  return `src/assets/dialogue/speech_marks/${levelId}-${dialogueIndex}-${speakerId}-metadata.json`;
};

/**
 * Get the path for answer metadata file
 */
export const getAnswerMetadataPath = (levelId: string, dialogueIndex: number, speakerId: string, answerIndex: number): string => {
  return `src/assets/dialogue/speech_marks/${levelId}-${dialogueIndex}-${speakerId}-answer-${answerIndex}-metadata.json`;
};

/**
 * Get the path for feedback metadata file
 */
export const getFeedbackMetadataPath = (levelId: string, dialogueIndex: number, speakerId: string, isCorrect: boolean): string => {
  return `src/assets/dialogue/speech_marks/${levelId}-${dialogueIndex}-${speakerId}-feedback-${isCorrect ? 'correct' : 'incorrect'}-metadata.json`;
};

/* --- METADATA UTILITY FUNCTIONS --- */

/**
 * Get the word visemes for a specific dialogue
 */
export const getWordVisemes = (
  metadata: Viseme[],
  wordIndex: number = 0
): Viseme[] => {
  if (!metadata || !Array.isArray(metadata)) {
    return [];
  }
  
  const wordItems = metadata.filter(item => item.type === 'word');
  
  if (wordItems.length === 0 || wordIndex < 0 || wordIndex >= wordItems.length) {
    return [];
  }
  
  const targetWord = wordItems[wordIndex];
  
  if (!targetWord || targetWord.time === undefined) {
    return [];
  }
  
  const wordStartTime = targetWord.time;
  const wordEndTime = wordIndex < wordItems.length - 1 
    ? (wordItems[wordIndex + 1].time ?? wordStartTime + 500)
    : (metadata[metadata.length - 1]?.time ?? wordStartTime) + 500;
  
  // Get all visemes between the word start and end times
  return metadata.filter(
    item => item.type === 'viseme' && 
           item.time !== undefined && 
           item.time >= wordStartTime && 
           item.time < wordEndTime
  );
};

/**
 * Get the current word text from metadata and dialogue text
 */
export const getCurrentWordText = (
  metadata: Viseme[],
  dialogueText?: string,
  wordIndex: number = 0
): string => {
  if (!metadata || !Array.isArray(metadata) || !dialogueText) {
    return '';
  }
  
  const wordItems = metadata.filter(item => item.type === 'word');
  const targetWord = wordItems[wordIndex];
  
  if (!targetWord || !targetWord.start || !targetWord.end) {
    return '';
  }
  
  try {
    return dialogueText.substring(targetWord.start, targetWord.end + 1);
  } catch (error) {
    console.error("Error extracting word text:", error);
    return '';
  }
};

/**
 * Get all words with their time ranges
 */
export const getAllWords = (
  metadata: Viseme[],
  dialogueText?: string
): { text: string; startTime: number; endTime: number; index: number }[] => {
  if (!metadata || !Array.isArray(metadata) || metadata.length === 0) {
    // If we have no metadata but have dialogue text, split it into words as a fallback
    if (dialogueText) {
      console.log("Creating fallback word items for text:", dialogueText);
      const words = dialogueText.split(/\s+/).filter(w => w.trim().length > 0);
      
      // For player answers, create a more deliberate timing to allow for fart opportunities
      // Space words out more to give player more time to react
      return words.map((word, index) => ({
        text: word,
        startTime: index * 500, // Slower timing for better gameplay (500ms per word)
        endTime: (index + 1) * 500 - 50,
        index
      }));
    }
    return [];
  }
  
  const wordItems = metadata.filter(item => item.type === 'word');
  
  // If there are no word items but we have text, create simple word structure
  if (wordItems.length === 0 && dialogueText) {
    console.log("No word items in metadata, creating simple structure for:", dialogueText);
    const words = dialogueText.split(/\s+/).filter(w => w.trim().length > 0);
    
    // If this appears to be a player answer (longer text), space words out more
    const isLikelyPlayerAnswer = words.length > 3 && dialogueText.length > 15;
    const wordDuration = isLikelyPlayerAnswer ? 500 : 200;
    
    return words.map((word, index) => ({
      text: word,
      startTime: index * wordDuration,
      endTime: (index + 1) * wordDuration - 50,
      index
    }));
  }
  
  // Process regular metadata
  return wordItems.map((wordItem, index) => {
    const startTime = wordItem.time || 0;
    const endTime = index < wordItems.length - 1
      ? (wordItems[index + 1].time || startTime + 500)
      : (metadata[metadata.length - 1]?.time || startTime) + 500;
    
    // Get text from dialogue text if available
    let text = '';
    if (dialogueText && wordItem.start !== undefined && wordItem.end !== undefined) {
      try {
        text = dialogueText.substring(wordItem.start, wordItem.end + 1);
      } catch (error) {
        console.error("Error extracting word text:", error);
      }
    }
    
    // If we couldn't extract text and have wordItems but no text, use index as text
    if (!text && dialogueText) {
      // Try to extract words from dialogueText if no start/end in metadata
      const words = dialogueText.split(/\s+/);
      if (index < words.length) {
        text = words[index];
      }
    }
    
    return { text, startTime, endTime, index };
  });
};

/* --- ASSET LOADING FUNCTIONS --- */

/**
 * Load metadata for a specific file
 */
const loadMetadataFile = async (path: string): Promise<Viseme[]> => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.warn(`Metadata file not found: ${path}`);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to load metadata file ${path}:`, error);
    return [];
  }
};

/**
 * Load metadata for all dialogues in a level
 */
export const loadLevelMetadata = async (level: Level): Promise<{ [key: string]: Viseme[] }> => {
  const result: { [key: string]: Viseme[] } = {};
  const levelId = level.id || 'level1';
  
  for (let i = 0; i < level.dialogues.length; i++) {
    const dialogue = level.dialogues[i];
    const speakerId = dialogue.speaker;
    
    if (!speakerId) continue;
    
    if (dialogue.text) {
      // Regular dialogue
      const key = getMetadataPath(levelId, i, speakerId);
      result[key] = await loadMetadataFile(key);
    } 
    else if (dialogue.answers) {
      // Question with answers
      // Try to load any possible metadata for the dialogue itself
      const dialogueKey = getMetadataPath(levelId, i, speakerId);
      result[dialogueKey] = await loadMetadataFile(dialogueKey);
      
      // Get player character ID
      const playerCharacterId = level.participants.find(p => p.type === 'player')?.id || '';
      
      // Also load player's answer metadata for each possible answer (both for this dialogue and possibly next dialogue)
      for (let j = 0; j < dialogue.answers.length; j++) {
        // For this dialogue (new approach)
        const answerKeyDirect = getAnswerMetadataPath(levelId, i, speakerId, j);
        result[answerKeyDirect] = await loadMetadataFile(answerKeyDirect);
        console.log("Loading answer metadata (direct):", answerKeyDirect);
        
        // For subsequent player dialogue (old approach)
        if (i + 1 < level.dialogues.length && level.dialogues[i + 1].speaker === playerCharacterId) {
          const answerKey = getAnswerMetadataPath(levelId, i + 1, playerCharacterId, j);
          result[answerKey] = await loadMetadataFile(answerKey);
          console.log("Loading answer metadata (separate dialogue):", answerKey);
        }
      }
    }
    else if (dialogue.feedback) {
      // Feedback for answers - load both correct and incorrect possibilities
      result[getFeedbackMetadataPath(levelId, i, speakerId, true)] = 
        await loadMetadataFile(getFeedbackMetadataPath(levelId, i, speakerId, true));
      
      result[getFeedbackMetadataPath(levelId, i, speakerId, false)] = 
        await loadMetadataFile(getFeedbackMetadataPath(levelId, i, speakerId, false));
      
      console.log("Loading feedback metadata:", getFeedbackMetadataPath(levelId, i, speakerId, true));
      console.log("Loading feedback metadata:", getFeedbackMetadataPath(levelId, i, speakerId, false));
    }
  }
  
  // Log loaded metadata keys to help with debugging
  console.log("Loaded metadata for keys:", Object.keys(result));
  
  return result;
};

/**
 * Load audio resources for a level
 */
export const loadAudioResources = async (level: Level): Promise<AudioResources> => {
  const levelId = level.id || 'level1';
  const dialogues: { [key: string]: HTMLAudioElement } = {};
  const farts: { [key in FartType]: HTMLAudioElement } = {
    't': new Audio(getFartAudioPath('t')),
    'p': new Audio(getFartAudioPath('p')),
    'k': new Audio(getFartAudioPath('k')),
    'f': new Audio(getFartAudioPath('f')),
    'r': new Audio(getFartAudioPath('r')),
    'z': new Audio(getFartAudioPath('z')),
  };
  
  const heartbeat = new Audio('src/assets/audio/heartbeat.mp3');
  heartbeat.loop = true;
  
  // Helper function to load and add audio to the dialogues object
  const loadAudio = (path: string, key: string) => {
    try {
      dialogues[key] = new Audio(path);
    } catch (error) {
      console.error(`Failed to load audio: ${path}`, error);
    }
  };
  
  // Process each dialogue
  for (let i = 0; i < level.dialogues.length; i++) {
    const dialogue = level.dialogues[i];
    const speakerId = dialogue.speaker;
    
    if (!speakerId) continue;
    
    if (dialogue.text) {
      // Regular dialogue
      loadAudio(
        getDialogueAudioPath(levelId, i, speakerId),
        `${levelId}-${i}-${speakerId}`
      );
    } 
    else if (dialogue.answers) {
      // Question with answers
      for (let j = 0; j < dialogue.answers.length; j++) {
        loadAudio(
          getAnswerAudioPath(levelId, i, speakerId, j),
          `${levelId}-${i}-${speakerId}-answer-${j}`
        );
      }
    }
    else if (dialogue.feedback) {
      // Feedback for answers
      const correctAudioPath = getFeedbackAudioPath(levelId, i, speakerId, true);
      const incorrectAudioPath = getFeedbackAudioPath(levelId, i, speakerId, false);
      
      const correctAudioKey = `${levelId}-${i}-${speakerId}-feedback-correct`;
      const incorrectAudioKey = `${levelId}-${i}-${speakerId}-feedback-incorrect`;
      
      console.log("Loading feedback audio:", correctAudioPath, "->", correctAudioKey);
      console.log("Loading feedback audio:", incorrectAudioPath, "->", incorrectAudioKey);
      
      loadAudio(correctAudioPath, correctAudioKey);
      loadAudio(incorrectAudioPath, incorrectAudioKey);
    }
  }
  
  // Log loaded audio resources for debugging
  console.log("Loaded dialogue audio keys:", Object.keys(dialogues));
  
  return { dialogues, farts, heartbeat };
};

/**
 * Check if a file exists
 */
export const fileExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};
