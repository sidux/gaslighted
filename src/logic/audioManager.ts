import { AudioResources, FartType, FartResultType } from './types';

// Load audio resources
export const loadAudioResources = async (levelId: string, dialogueCount: number): Promise<AudioResources> => {
  const dialogues: { [key: string]: HTMLAudioElement } = {};
  const farts: { [key in FartType]: HTMLAudioElement } = {
    't': new Audio(),
    'p': new Audio(),
    'b': new Audio(),
    'f': new Audio(),
    'r': new Audio(),
    'z': new Audio(),
  };
  
  // Load dialogue audio
  const participants = ['boomer', 'karen', 'zoomer'];
  for (let i = 0; i < dialogueCount; i++) {
    for (const participant of participants) {
      const audioKey = `level${levelId}-${i}-${participant}`;
      const audioPath = `src/assets/dialogue/${audioKey}.mp3`;
      try {
        const audio = new Audio(audioPath);
        dialogues[audioKey] = audio;
      } catch (error) {
        console.error(`Failed to load audio: ${audioPath}`, error);
      }
    }
  }
  
  // Load fart audio
  for (const fartType of Object.keys(farts) as FartType[]) {
    const audioPath = `src/assets/audio/${fartType}-fart.mp3`;
    try {
      farts[fartType] = new Audio(audioPath);
    } catch (error) {
      console.error(`Failed to load audio: ${audioPath}`, error);
    }
  }
  
  return { dialogues, farts };
};

// Play dialogue audio
export const playDialogueAudio = (
  resources: AudioResources,
  levelId: string,
  dialogueIndex: number,
  speakerId: string,
  onEnded: () => void
): void => {
  const audioKey = `level${levelId}-${dialogueIndex}-${speakerId}`;
  const audio = resources.dialogues[audioKey];
  
  if (audio) {
    audio.currentTime = 0;
    audio.onended = onEnded;
    
    // Try to play, handle potential browser autoplay restrictions
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Audio playback prevented:', error);
      });
    }
  } else {
    console.error(`Audio not found: ${audioKey}`);
    // Call onEnded anyway to prevent game from getting stuck
    setTimeout(onEnded, 100);
  }
};

// Play fart audio with volume based on result type
export const playFartAudio = (
  resources: AudioResources,
  fartType: FartType,
  resultType: FartResultType
): void => {
  const audio = resources.farts[fartType];
  
  if (audio) {
    // Set volume based on result type
    switch (resultType) {
      case 'perfect':
        audio.volume = 0.1; // Almost silent for perfect farts
        break;
      case 'okay':
        audio.volume = 0.5; // Medium volume for okay farts
        break;
      case 'bad':
        audio.volume = 1.0; // Full volume for bad farts
        break;
      default:
        audio.volume = 0.7;
    }
    
    audio.currentTime = 0;
    
    // Try to play, handle potential browser autoplay restrictions
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Audio playback prevented:', error);
      });
    }
  } else {
    console.error(`Fart audio not found for type: ${fartType}`);
  }
};

// Stop all audio
export const stopAllAudio = (resources: AudioResources): void => {
  // Stop dialogue audio
  Object.values(resources.dialogues).forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
  
  // Stop fart audio
  Object.values(resources.farts).forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
};

// Preload all audio files
export const preloadAudio = (resources: AudioResources): void => {
  // Preload dialogue audio
  Object.values(resources.dialogues).forEach(audio => {
    audio.load();
  });
  
  // Preload fart audio
  Object.values(resources.farts).forEach(audio => {
    audio.load();
  });
};
