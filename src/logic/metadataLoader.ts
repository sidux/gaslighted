import { Viseme, Level } from './types';

// Helper functions to generate metadata keys
const getRegularDialogueKey = (levelId: string, index: number, speakerId: string): string => {
  return `${levelId}-${index}-${speakerId}-metadata.json`;
};

const getAnswerDialogueKey = (levelId: string, index: number, speakerId: string, answerIndex: number): string => {
  return `${levelId}-${index}-${speakerId}-answer-${answerIndex}-metadata.json`;
};

const getFeedbackDialogueKey = (levelId: string, index: number, speakerId: string, isCorrect: boolean): string => {
  return `${levelId}-${index}-${speakerId}-feedback-${isCorrect ? 'correct' : 'incorrect'}-metadata.json`;
};

// Load metadata for a specific file
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

// Load metadata for all dialogues in a level
export const loadLevelMetadata = async (level: Level): Promise<{ [key: string]: Viseme[] }> => {
  const result: { [key: string]: Viseme[] } = {};
  const levelId = 'level1'; // This could be passed in or determined from level
  
  // Process each dialogue based on its type
  for (let i = 0; i < level.dialogues.length; i++) {
    const dialogue = level.dialogues[i];
    const speakerId = dialogue.speaker;
    
    if (speakerId === undefined) {
      console.log(`Skipping dialogue ${i} - no speaker ID`);
      continue;
    }
    
    // Regular dialogue
    if (dialogue.text) {
      const key = getRegularDialogueKey(levelId, i, speakerId);
      const path = `src/assets/dialogue/speech_marks/${key}`;
      result[key] = await loadMetadataFile(path);
    }
    // Question (with answers)
    else if (dialogue.answers) {
      // For questions, we need to load metadata for each answer option
      for (let j = 0; j < dialogue.answers.length; j++) {
        const key = getAnswerDialogueKey(levelId, i, speakerId, j);
        const path = `src/assets/dialogue/speech_marks/${key}`;
        result[key] = await loadMetadataFile(path);
      }
    }
    // Feedback
    else if (dialogue.feedback) {
      // For feedback, load both correct and incorrect versions
      const correctKey = getFeedbackDialogueKey(levelId, i, speakerId, true);
      const incorrectKey = getFeedbackDialogueKey(levelId, i, speakerId, false);
      
      result[correctKey] = await loadMetadataFile(`src/assets/dialogue/speech_marks/${correctKey}`);
      result[incorrectKey] = await loadMetadataFile(`src/assets/dialogue/speech_marks/${incorrectKey}`);
    }
  }
  
  return result;
};

// Get the word visemes for a specific dialogue
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
  let wordEndTime: number;
  
  if (wordIndex < wordItems.length - 1) {
    const nextWord = wordItems[wordIndex + 1];
    wordEndTime = (nextWord && nextWord.time !== undefined) ? nextWord.time : wordStartTime + 500;
  } else {
    // Last word, use the end of the metadata or a reasonable buffer
    if (metadata.length > 0) {
      const lastItem = metadata[metadata.length - 1];
      wordEndTime = (lastItem && lastItem.time !== undefined) ? lastItem.time + 500 : wordStartTime + 500;
    } else {
      wordEndTime = wordStartTime + 500; // Default if no last item
    }
  }
  
  // Get all visemes between the word start and end times
  try {
    return metadata.filter(
      item => item.type === 'viseme' && 
             item.time !== undefined && 
             wordStartTime !== undefined &&
             wordEndTime !== undefined &&
             item.time >= wordStartTime && 
             item.time < wordEndTime
    );
  } catch (error) {
    console.error("Error filtering visemes:", error);
    return [];
  }
};

// Get the current word text from metadata and dialogue text
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

// Get all words with their time ranges
export const getAllWords = (
  metadata: Viseme[],
  dialogueText?: string
): { text: string; startTime: number; endTime: number; index: number }[] => {
  if (!metadata || !Array.isArray(metadata)) {
    return [];
  }
  
  const wordItems = metadata.filter(item => item.type === 'word');
  
  return wordItems.map((wordItem, index) => {
    // Handle potentially undefined time properties
    const startTime = wordItem.time || 0;
    let endTime: number;
    
    if (index < wordItems.length - 1) {
      const nextWord = wordItems[index + 1];
      endTime = (nextWord && nextWord.time) || startTime + 500;
    } else {
      // Last word, use the end of the metadata or a reasonable buffer
      const lastItem = metadata[metadata.length - 1];
      endTime = (lastItem && lastItem.time) ? lastItem.time + 500 : startTime + 500;
    }
    
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
