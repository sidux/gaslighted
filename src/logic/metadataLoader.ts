import { Viseme, Level } from './types';

// Load metadata for all dialogues in a level
export const loadLevelMetadata = async (level: Level): Promise<{ [key: string]: Viseme[] }> => {
  const result: { [key: string]: Viseme[] } = {};
  
  // Load metadata for each dialogue
  for (let i = 0; i < level.dialogues.length; i++) {
    const dialogue = level.dialogues[i];
    const speakerId = dialogue.speakerId;
    const metadataKey = `level1-${i}-${speakerId}-metadata.json`;
    
    try {
      const metadataPath = `src/assets/dialogue/speech_marks/${metadataKey}`;
      const response = await fetch(metadataPath);
      if (!response.ok) {
        throw new Error(`Failed to load metadata: ${response.statusText}`);
      }
      
      const metadata: Viseme[] = await response.json();
      result[metadataKey] = metadata;
    } catch (error) {
      console.error(`Failed to load metadata for dialogue ${i}:`, error);
      // Create empty metadata to prevent errors
      result[metadataKey] = [];
    }
  }
  
  return result;
};

// Get the word visemes for a specific dialogue
export const getWordVisemes = (
  metadata: Viseme[],
  wordIndex: number
): Viseme[] => {
  const wordItems = metadata.filter(item => item.type === 'word');
  const targetWord = wordItems[wordIndex];
  
  if (!targetWord) {
    return [];
  }
  
  const wordStartTime = targetWord.time;
  let wordEndTime: number;
  
  if (wordIndex < wordItems.length - 1) {
    wordEndTime = wordItems[wordIndex + 1].time;
  } else {
    // Last word, use the end of the metadata or a reasonable buffer
    const lastItem = metadata[metadata.length - 1];
    wordEndTime = lastItem.time + 500;
  }
  
  // Get all visemes between the word start and end times
  return metadata.filter(
    item => item.type === 'viseme' && item.time >= wordStartTime && item.time < wordEndTime
  );
};

// Get the current word text from metadata and dialogue text
export const getCurrentWordText = (
  metadata: Viseme[],
  dialogueText: string,
  wordIndex: number
): string => {
  const wordItems = metadata.filter(item => item.type === 'word');
  const targetWord = wordItems[wordIndex];
  
  if (!targetWord || !targetWord.start || !targetWord.end) {
    return '';
  }
  
  return dialogueText.substring(targetWord.start, targetWord.end + 1);
};

// Get all words with their time ranges
export const getAllWords = (
  metadata: Viseme[],
  dialogueText: string
): { text: string; startTime: number; endTime: number; index: number }[] => {
  const wordItems = metadata.filter(item => item.type === 'word');
  
  return wordItems.map((wordItem, index) => {
    const startTime = wordItem.time;
    let endTime: number;
    
    if (index < wordItems.length - 1) {
      endTime = wordItems[index + 1].time;
    } else {
      // Last word, use the end of the metadata or a reasonable buffer
      const lastItem = metadata[metadata.length - 1];
      endTime = lastItem.time + 500;
    }
    
    const text = wordItem.start !== undefined && wordItem.end !== undefined
      ? dialogueText.substring(wordItem.start, wordItem.end + 1)
      : '';
    
    return { text, startTime, endTime, index };
  });
};
