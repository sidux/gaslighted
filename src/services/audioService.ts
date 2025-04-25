import { AudioResources, FartType, FartResultType } from '../types';

/**
 * Play dialogue audio
 */
export const playDialogueAudio = (
  resources: AudioResources,
  levelId: string,
  dialogueIndex: number,
  speakerId: string,
  onEnded: () => void
): void => {
  const audioKey = `${levelId}-${dialogueIndex}-${speakerId}`;
  playAudio(resources.dialogues[audioKey], onEnded);
};

/**
 * Play fart audio with volume based on result type
 */
export const playFartAudio = (
  resources: AudioResources,
  fartType: FartType,
  resultType: FartResultType
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
  
  // Play the audio
  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch(error => {
      console.error('Audio playback prevented:', error);
    });
  }
  
  // For terrible farts, play additional overlapping sounds
  if (resultType === 'terrible') {
    setTimeout(() => {
      const secondAudio = resources.farts[fartType].cloneNode(true) as HTMLAudioElement;
      secondAudio.volume = 0.8;
      secondAudio.playbackRate = 0.85; // Slightly slower pitch
      secondAudio.play().catch(e => console.error('Error playing terrible fart second sound', e));
      
      setTimeout(() => {
        const thirdAudio = resources.farts[fartType].cloneNode(true) as HTMLAudioElement;
        thirdAudio.volume = 0.6;
        thirdAudio.playbackRate = 1.15; // Slightly higher pitch
        thirdAudio.play().catch(e => console.error('Error playing terrible fart third sound', e));
      }, 100);
    }, 50);
  }
};

/**
 * Play answer audio
 */
export const playAnswerAudio = (
  resources: AudioResources,
  levelId: string,
  dialogueIndex: number,
  speakerId: string,
  answerIndex: number,
  onEnded: () => void
): void => {
  const audioKey = `${levelId}-${dialogueIndex}-${speakerId}-answer-${answerIndex}`;
  playAudio(resources.dialogues[audioKey], onEnded);
};

/**
 * Play feedback audio
 */
export const playFeedbackAudio = (
  resources: AudioResources,
  levelId: string,
  dialogueIndex: number,
  speakerId: string,
  isCorrect: boolean,
  onEnded: () => void
): void => {
  const feedbackType = isCorrect ? 'correct' : 'incorrect';
  const audioKey = `${levelId}-${dialogueIndex}-${speakerId}-feedback-${feedbackType}`;
  
  console.log("Playing feedback audio with key:", audioKey);
  console.log("Available audio keys:", Object.keys(resources.dialogues));
  
  const audio = resources.dialogues[audioKey];
  if (!audio) {
    console.error(`Feedback audio not found for key: ${audioKey}`);
    // If audio not found, move on after a short delay
    setTimeout(onEnded, 500);
    return;
  }
  
  playAudio(audio, onEnded);
};

/**
 * Helper function to play audio with error handling
 */
const playAudio = (audio: HTMLAudioElement | undefined, onEnded?: () => void): void => {
  if (!audio) {
    console.error('Audio not found');
    if (onEnded) setTimeout(onEnded, 100);
    return;
  }
  
  audio.currentTime = 0;
  if (onEnded) audio.onended = onEnded;
  
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
  intensity?: number
): void => {
  const { heartbeat } = resources;
  
  if (!heartbeat) {
    console.error('Heartbeat audio not found');
    return;
  }
  
  if (isPlaying && (shame > 0 || intensity)) {
    // Set volume and rate based on intensity or shame
    if (intensity !== undefined) {
      const normalizedIntensity = Math.min(1.0, Math.max(0.1, intensity / 100));
      heartbeat.volume = normalizedIntensity;
      heartbeat.playbackRate = 1.0 + normalizedIntensity;
    } else {
      heartbeat.volume = 0.1 + (0.9 * (shame / 100));
      heartbeat.playbackRate = 1.0 + ((shame / 100) * 0.5);
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
