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
 * Get the path for feedback audio file
 */
export const getFeedbackAudioPath = (levelId: string, dialogueIndex: number, speakerId: string, correct: boolean): string => {
  return `src/assets/dialogue/${levelId}-${dialogueIndex}-${speakerId}-feedback-${correct ? 'correct' : 'incorrect'}.mp3`;
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
 * @param gameSpeed Optional parameter for game speed (default 1.0)
 */
export const getAllWords = (
  metadata: Viseme[],
  dialogueText?: string,
  gameSpeed: number = 1.0
): { text: string; startTime: number; endTime: number; index: number }[] => {
  if (!metadata || !Array.isArray(metadata) || metadata.length === 0) {
    // If we have no metadata but have dialogue text, split it into words as a fallback
    if (dialogueText) {
      ;
      const words = dialogueText.split(/\s+/).filter(w => w.trim().length > 0);
      
      // Create timing to allow for fart opportunities
      // Apply game speed to word timing
      const baseWordDuration = 500; // Base word duration in ms
      const adjustedWordDuration = baseWordDuration / gameSpeed;
      
      return words.map((word, index) => ({
        text: word,
        startTime: index * adjustedWordDuration,
        endTime: (index + 1) * adjustedWordDuration - (50 / gameSpeed),
        index
      }));
    }
    return [];
  }
  
  const wordItems = metadata.filter(item => item.type === 'word');
  
  // If there are no word items but we have text, create simple word structure
  if (wordItems.length === 0 && dialogueText) {
    
    
    // Split text properly by whitespace to get natural word boundaries
    const words = dialogueText.split(/\s+/).filter(w => w.trim().length > 0);
    
    // Space words based on length
    const baseWordDuration = 300;
    const adjustedWordDuration = baseWordDuration / gameSpeed; // Apply game speed
    
    return words.map((word, index) => ({
      text: word,
      startTime: index * adjustedWordDuration,
      endTime: (index + 1) * adjustedWordDuration - (50 / gameSpeed),
      index
    }));
  }
  
  // When we have both metadata and dialogue text, but the metadata's word boundaries may not be accurate
  if (dialogueText && wordItems.length > 0) {
    // Instead of relying on metadata's start/end indices which might be wrong,
    // split the text properly into words and match them with timing from metadata
    const words = dialogueText.split(/\s+/).filter(w => w.trim().length > 0);
    
    // If we have a big mismatch in word count, fallback to simpler approach
    if (Math.abs(words.length - wordItems.length) > words.length * 0.25) {
      
      return words.map((word, index) => {
        // Use metadata timing if available, otherwise fallback to calculated timing
        // Apply game speed to timing calculations
        const baseInterval = 500;
        const adjustedInterval = baseInterval / gameSpeed;
        
        const startTime = index < wordItems.length 
          ? (wordItems[index].time || index * adjustedInterval) 
          : index * adjustedInterval;
          
        const endTime = (index + 1) < wordItems.length 
          ? (wordItems[index + 1].time || (index + 1) * adjustedInterval - (50 / gameSpeed)) 
          : (index + 1) * adjustedInterval - (50 / gameSpeed);
          
        return { text: word, startTime, endTime, index };
      });
    }
    
    // Try to match words with metadata (improved approach)
    return wordItems.map((wordItem, index) => {
      const startTime = wordItem.time || 0;
      const endTime = index < wordItems.length - 1
        ? (wordItems[index + 1].time || startTime + 500)
        : (metadata[metadata.length - 1]?.time || startTime) + 500;
      
      // Get text from natural word boundaries if possible
      let text = '';
      if (index < words.length) {
        text = words[index];
      } else if (dialogueText && wordItem.start !== undefined && wordItem.end !== undefined) {
        // Fallback to the old approach if needed
        try {
          text = dialogueText.substring(wordItem.start, wordItem.end + 1);
        } catch (error) {
          console.error("Error extracting word text:", error);
        }
      }
      
      return { text, startTime, endTime, index };
    });
  }
  
  // Process regular metadata without text (should rarely happen)
  return wordItems.map((wordItem, index) => {
    const startTime = wordItem.time || 0;
    const endTime = index < wordItems.length - 1
      ? (wordItems[index + 1].time || startTime + 500)
      : (metadata[metadata.length - 1]?.time || startTime) + 500;
    
    // No text available, use placeholder
    const text = `word${index}`;
    
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
    } else if (dialogue.answers) {
      // For dialogue with answers, check if there are metadata for each answer
      if (dialogue.answers && dialogue.answers.length > 0) {
        // Try to load metadata for each answer
        for (let j = 0; j < dialogue.answers.length; j++) {
          const answerMetadataPath = `src/assets/dialogue/speech_marks/${levelId}-${i}-${speakerId}-answer-${j}-metadata.json`;
          const answerMetadata = await loadMetadataFile(answerMetadataPath);
          if (answerMetadata.length > 0) {
            result[answerMetadataPath] = answerMetadata;
          }
        }
      }
    } else if (dialogue.feedback) {
      // For feedback dialogue, try to load both correct and incorrect metadata
      const correctMetadataPath = `src/assets/dialogue/speech_marks/${levelId}-${i}-${speakerId}-feedback-correct-metadata.json`;
      const incorrectMetadataPath = `src/assets/dialogue/speech_marks/${levelId}-${i}-${speakerId}-feedback-incorrect-metadata.json`;
      
      const correctMetadata = await loadMetadataFile(correctMetadataPath);
      if (correctMetadata.length > 0) {
        result[correctMetadataPath] = correctMetadata;
      }
      
      const incorrectMetadata = await loadMetadataFile(incorrectMetadataPath);
      if (incorrectMetadata.length > 0) {
        result[incorrectMetadataPath] = incorrectMetadata;
      }
    }
  }
  
  // Log loaded metadata keys to help with debugging
  
  
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
    } else if (dialogue.answers && dialogue.answers.length > 0) {
      // For dialogues with answer options, load all answer audio files
      dialogue.answers.forEach((answer, answerIndex) => {
        loadAudio(
          getAnswerAudioPath(levelId, i, speakerId, answerIndex),
          `${levelId}-${i}-${speakerId}-answer-${answerIndex}`
        );
      });
    } else if (dialogue.feedback && dialogue.feedback.length > 0) {
      // For feedback dialogues, load correct and incorrect feedback audio
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
  
  // Log loaded audio resources for debugging
  
  
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
