import { AudioResources, FartType, FartResultType } from '../types';

/**
 * Play dialogue audio
 */
export const playDialogueAudio = (
  resources: AudioResources,
  levelId: string,
  dialogueIndex: number,
  speakerId: string,
  onEnded: () => void,
  gameSpeed?: number
): void => {
  const audioKey = `${levelId}-${dialogueIndex}-${speakerId}`;
  playAudio(resources.dialogues[audioKey], onEnded, gameSpeed);
};

/**
 * Play fart audio with volume based on result type
 */
export const playFartAudio = (
  resources: AudioResources,
  fartType: FartType,
  resultType: FartResultType,
  gameSpeed?: number
): void => {
  const audio = resources.farts[fartType];
  
  if (!audio) {
    console.error(`Fart audio not found for type: ${fartType}`);
    return;
  }
  
  // Set volume based on result type
  switch (resultType) {
    case 'perfect':
      audio.volume = 0.01; // Almost silent
      break;
    case 'okay':
      audio.volume = 0.2; // Medium volume
      break;
    case 'bad':
    case 'terrible':
      audio.volume = 1.0; // Full volume
      break;
    default:
      audio.volume = 0.7;
  }
  
  audio.currentTime = 0;
  
  // Apply game speed to playback rate if provided
  if (gameSpeed !== undefined) {
    audio.playbackRate = gameSpeed;
  }
  
  // Play the audio
  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch(error => {
      console.error('Audio playback prevented:', error);
    });
  }
  
  // For terrible farts, play additional overlapping sounds
  if (resultType === 'terrible') {
    const basePlaybackRate = gameSpeed !== undefined ? gameSpeed : 1.0;
    
    setTimeout(() => {
      const secondAudio = resources.farts[fartType].cloneNode(true) as HTMLAudioElement;
      secondAudio.volume = 0.8;
      secondAudio.playbackRate = basePlaybackRate * 0.85; // Slightly slower pitch
      secondAudio.play().catch(e => console.error('Error playing terrible fart second sound', e));
      
      setTimeout(() => {
        const thirdAudio = resources.farts[fartType].cloneNode(true) as HTMLAudioElement;
        thirdAudio.volume = 0.6;
        thirdAudio.playbackRate = basePlaybackRate * 1.15; // Slightly higher pitch
        thirdAudio.play().catch(e => console.error('Error playing terrible fart third sound', e));
      }, 100 / (gameSpeed || 1.0)); // Adjust timing based on game speed
    }, 50 / (gameSpeed || 1.0)); // Adjust timing based on game speed
  }
};



/**
 * Helper function to play audio with error handling
 */
const playAudio = (audio: HTMLAudioElement | undefined, onEnded?: () => void, gameSpeed?: number): void => {
  if (!audio) {
    console.error('Audio not found');
    if (onEnded) setTimeout(onEnded, 100);
    return;
  }
  
  audio.currentTime = 0;
  if (onEnded) audio.onended = onEnded;
  
  // Set playback rate based on game speed if provided
  if (gameSpeed !== undefined) {
    audio.playbackRate = gameSpeed;
  }
  
  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch(error => {
      console.error('Audio playback prevented:', error);
      if (onEnded) onEnded();
    });
  }
};

/**
 * Play heartbeat sound with dynamic volume and rate
 */
export const playHeartbeatSound = (
  resources: AudioResources,
  shame: number,
  isPlaying: boolean,
  intensity?: number,
  gameSpeed?: number
): void => {
  const { heartbeat } = resources;
  
  if (!heartbeat) {
    console.error('Heartbeat audio not found');
    return;
  }
  
  if (isPlaying && (shame > 0 || intensity)) {
    // Get base game speed multiplier
    const speedMultiplier = gameSpeed !== undefined ? gameSpeed : 1.0;
    
    // Set volume and rate based on intensity or shame
    if (intensity !== undefined) {
      const normalizedIntensity = Math.min(1.0, Math.max(0.1, intensity / 100));
      heartbeat.volume = normalizedIntensity;
      heartbeat.playbackRate = (1.0 + normalizedIntensity) * speedMultiplier;
    } else {
      heartbeat.volume = 0.1 + (0.9 * (shame / 100));
      heartbeat.playbackRate = (1.0 + ((shame / 100) * 0.5)) * speedMultiplier;
    }
    
    // Start playing if not already
    if (heartbeat.paused) {
      heartbeat.play().catch(error => {
        console.error('Heartbeat audio playback prevented:', error);
      });
    }
  } else if (!heartbeat.paused) {
    // Stop if not playing or no shame/intensity
    heartbeat.pause();
    heartbeat.currentTime = 0;
  }
};

/**
 * Pause all game audio without resetting
 */
export const pauseAllAudio = (resources: AudioResources): void => {
  // Pause all dialogue audio
  Object.values(resources.dialogues).forEach(audio => audio.pause());
  
  // Pause all fart audio
  Object.values(resources.farts).forEach(audio => audio.pause());
  
  // Pause heartbeat
  resources.heartbeat.pause();
};

/**
 * Resume all game audio
 */
export const resumeAllAudio = (resources: AudioResources): void => {
  // Resume dialogue audio (but only the one that was playing before)
  Object.values(resources.dialogues).forEach(audio => {
    // Only resume if it IS paused and has playback position (was playing before)
    if (audio.paused && audio.currentTime > 0 && audio.currentTime < audio.duration) {
      audio.play().catch(error => {
        console.error('Failed to resume audio:', error);
      });
    }
  });
  
  // Resume any fart audio that was playing
  Object.values(resources.farts).forEach(audio => {
    if (audio.paused && audio.currentTime > 0 && audio.currentTime < audio.duration) {
      audio.play().catch(error => {
        console.error('Failed to resume fart audio:', error);
      });
    }
  });
  
  // Heartbeat will be resumed by the heartbeat hook
};

/**
 * Stop all audio
 */
export const stopAllAudio = (resources: AudioResources): void => {
  // Stop all dialogue audio
  Object.values(resources.dialogues).forEach(pauseAudio);
  
  // Stop all fart audio
  Object.values(resources.farts).forEach(pauseAudio);
  
  // Stop heartbeat
  pauseAudio(resources.heartbeat);
};

/**
 * Helper to pause and reset audio
 */
const pauseAudio = (audio: HTMLAudioElement): void => {
  audio.pause();
  audio.currentTime = 0;
};
