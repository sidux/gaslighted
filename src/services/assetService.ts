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
  if (!metadata || !Array.isArray(metadata)) {
    return [];
  }
  
  const wordItems = metadata.filter(item => item.type === 'word');
  
  return wordItems.map((wordItem, index) => {
    const startTime = wordItem.time || 0;
    const endTime = index < wordItems.length - 1
      ? (wordItems[index + 1].time || startTime + 500)
      : (metadata[metadata.length - 1]?.time || startTime) + 500;
    
    // Safely handle undefined dialogueText
    let text = '';
    if (dialogueText && wordItem.start !== undefined && wordItem.end !== undefined) {
      try {
        text = dialogueText.substring(wordItem.start, wordItem.end + 1);
      } catch (error) {
        console.error("Error extracting word text:", error);
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
      for (let j = 0; j < dialogue.answers.length; j++) {
        const key = getAnswerMetadataPath(levelId, i, speakerId, j);
        result[key] = await loadMetadataFile(key);
      }
    }
    else if (dialogue.feedback) {
      // Feedback for answers
      result[getFeedbackMetadataPath(levelId, i, speakerId, true)] = 
        await loadMetadataFile(getFeedbackMetadataPath(levelId, i, speakerId, true));
      
      result[getFeedbackMetadataPath(levelId, i, speakerId, false)] = 
        await loadMetadataFile(getFeedbackMetadataPath(levelId, i, speakerId, false));
    }
  }
  
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
      loadAudio(
        getFeedbackAudioPath(levelId, i, speakerId, true),
        `${levelId}-${i}-${speakerId}-feedback-correct`
      );
      
      loadAudio(
        getFeedbackAudioPath(levelId, i, speakerId, false),
        `${levelId}-${i}-${speakerId}-feedback-incorrect`
      );
    }
  }
  
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
