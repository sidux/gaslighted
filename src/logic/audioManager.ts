import { AudioResources, FartType, FartResultType } from './types';

// Load audio resources
export const loadAudioResources = async (levelId: string, dialogueCount: number): Promise<AudioResources> => {
  const dialogues: { [key: string]: HTMLAudioElement } = {};
  const farts: { [key in FartType]: HTMLAudioElement } = {
    't': new Audio(),
    'p': new Audio(),
    'k': new Audio(),
    'f': new Audio(),
    'r': new Audio(),
    'z': new Audio(),
  };
  const heartbeat = new Audio('src/assets/audio/heartbeat.mp3');
  // Set heartbeat to loop
  heartbeat.loop = true;
  
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
  
  return { dialogues, farts, heartbeat };
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
        audio.volume = 0.01; // Almost silent for perfect farts
        break;
      case 'okay':
        audio.volume = 0.2; // Medium volume for okay farts
        break;
      case 'bad':
        audio.volume = 1.0; // Full volume for bad farts
        break;
      case 'terrible':
        audio.volume = 1.0; // Full volume for terrible farts
        
        // Add distortion/pitch effect for terrible farts (play multiple overlapping sounds)
        // Play twice with a slight delay to create a louder, more chaotic sound
        setTimeout(() => {
          const secondAudio = resources.farts[fartType].cloneNode(true) as HTMLAudioElement;
          secondAudio.volume = 0.8;
          secondAudio.playbackRate = 0.85; // Slightly slower pitch
          secondAudio.play().catch(e => console.error('Error playing terrible fart second sound', e));
          
          // Play a third copy for extra loudness
          setTimeout(() => {
            const thirdAudio = resources.farts[fartType].cloneNode(true) as HTMLAudioElement;
            thirdAudio.volume = 0.6;
            thirdAudio.playbackRate = 1.15; // Slightly higher pitch
            thirdAudio.play().catch(e => console.error('Error playing terrible fart third sound', e));
          }, 100);
        }, 50);
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

// Play heartbeat sound with volume based on shame level
export const playHeartbeatSound = (
  resources: AudioResources,
  shame: number,
  isPlaying: boolean
): void => {
  const { heartbeat } = resources;
  
  if (!heartbeat) {
    console.error('Heartbeat audio not found');
    return;
  }
  
  if (isPlaying && shame > 0) {
    // Calculate volume based on shame level (0.1 to 1.0)
    const baseVolume = 0.1;
    const additionalVolume = 0.9 * (shame / 100);
    heartbeat.volume = baseVolume + additionalVolume;
    
    // Calculate playback rate based on shame level (1.0 to 1.5)
    // Higher shame = faster heartbeat
    heartbeat.playbackRate = 1.0 + (shame / 100) * 0.5;
    
    // Start playing if not already playing
    if (heartbeat.paused) {
      heartbeat.play().catch(error => {
        console.error('Heartbeat audio playback prevented:', error);
      });
    }
  } else {
    // Pause heartbeat if not playing or no shame
    if (!heartbeat.paused) {
      heartbeat.pause();
      heartbeat.currentTime = 0;
    }
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
  
  // Stop heartbeat audio
  resources.heartbeat.pause();
  resources.heartbeat.currentTime = 0;
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
