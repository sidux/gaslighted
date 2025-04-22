/**
 * Interface representing a single speech mark from neural TTS
 */
export interface SpeechMark {
  /** Time in milliseconds when this marker occurs */
  time: number;
  
  /** Type of speech mark (sentence, word, viseme, ssml) */
  type: 'sentence' | 'word' | 'viseme' | 'ssml';
  
  /** Start position in the original text */
  start: number;
  
  /** End position in the original text */
  end: number;
  
  /** The actual value of this speech mark */
  value: string;
}

/**
 * Viseme types mapped to keyboard letters
 * Visemes represent mouth shapes during speech
 */
export enum VisemeType {
  // Vowels
  A = 'a',  // 'a' as in "car"
  E = 'e',  // 'e' as in "bed"
  I = 'i',  // 'i' as in "kit"
  O = 'o',  // 'o' as in "hot"
  U = 'u',  // 'u' as in "book"
  
  // Consonants
  P = 'p',  // 'p', 'b', 'm' sounds
  F = 'f',  // 'f', 'v' sounds
  T = 't',  // 't', 'd', 'n' sounds
  S = 's',  // 's', 'z' sounds
  K = 'k',  // 'k', 'g' sounds
  
  // Special cases
  R = 'r',  // 'r' sounds
  L = 'l',  // 'l' sounds
  W = 'w',  // 'w' sounds
  
  // Default/silence
  NONE = ' '  // Silence/no specific viseme
}

/**
 * Maps Amazon Polly/neural TTS viseme values to our game viseme types
 */
export const visemeMapping: Record<string, VisemeType> = {
  // Vowels
  'a': VisemeType.A,
  'e': VisemeType.E,
  'i': VisemeType.I,
  'o': VisemeType.O,
  'u': VisemeType.U,
  
  // Consonants
  'p': VisemeType.P,
  'b': VisemeType.P,
  'm': VisemeType.P,
  
  'f': VisemeType.F,
  'v': VisemeType.F,
  
  't': VisemeType.T,
  'd': VisemeType.T,
  'n': VisemeType.T,
  
  's': VisemeType.S,
  'z': VisemeType.S,
  
  'k': VisemeType.K,
  'g': VisemeType.K,
  
  // Special cases
  'r': VisemeType.R,
  'l': VisemeType.L,
  'w': VisemeType.W,
  
  // Default
  'sil': VisemeType.NONE
};

/**
 * Interface for viseme information extracted from speech marks
 */
export interface VisemeInfo {
  /** The letter representing this viseme for gameplay */
  letter: string;
  
  /** Start time in milliseconds */
  startTime: number;
  
  /** End time in milliseconds (or estimated) */
  endTime: number;
  
  /** Duration of this viseme in milliseconds */
  duration: number;
  
  /** The original viseme or phoneme value */
  visemeValue: string;
}

/**
 * Represents a safe zone for farting based on speech patterns
 */
export interface SafeZone {
  /** Start time of the safe zone in milliseconds */
  startTime: number;
  
  /** End time of the safe zone in milliseconds */
  endTime: number;
  
  /** Confidence level (0-1) of this being a good time to release */
  confidence: number;
  
  /** The viseme type required for this safe zone */
  visemeType: VisemeType;
  
  /** The key to press for this viseme */
  keyToPress: string;
}

/**
 * Represents the word being spoken at a specific time
 */
export interface SpeechSegment {
  /** The word being spoken */
  word: string;
  
  /** Start time in milliseconds */
  startTime: number;
  
  /** End time in milliseconds */
  endTime: number;
  
  /** Whether this is a safe time to release */
  isSafe: boolean;
}

/**
 * Represents a viseme (mouth position) at a specific time
 */
export interface VisemeSegment {
  /** The viseme type */
  visemeType: VisemeType;
  
  /** The key to press */
  keyToPress: string;
  
  /** Start time in milliseconds */
  startTime: number;
  
  /** Duration in milliseconds */
  duration: number;
  
  /** End time in milliseconds */
  endTime: number;
  
  /** Intensity of the viseme (0-1) */
  intensity: number;
}

/**
 * Represents the timing accuracy for safety status
 */
export interface TimingAccuracy {
  /** Perfect timing threshold in ms */
  perfect: number;
  
  /** Good timing threshold in ms */
  good: number;
  
  /** Acceptable timing threshold in ms */
  acceptable: number;
}

/**
 * Default timing accuracy thresholds
 */
export const DEFAULT_TIMING_ACCURACY: TimingAccuracy = {
  perfect: 300,    // Within 300ms = perfect timing (safe) - was 100ms
  good: 500,       // Within 500ms = good timing (safe) - was 250ms
  acceptable: 800  // Within 800ms = acceptable timing (neutral) - was 500ms
  // Beyond 800ms = bad timing (danger)
};
