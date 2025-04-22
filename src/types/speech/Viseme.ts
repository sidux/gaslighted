/**
 * Enum for different viseme types (mouth shapes)
 */
export enum Viseme {
  A = 'a',      // 'a' as in "car"
  E = 'e',      // 'e' as in "bed"
  I = 'i',      // 'i' as in "kit"
  O = 'o',      // 'o' as in "hot"
  U = 'u',      // 'u' as in "book"
  P = 'p',      // 'p', 'b', 'm' sounds
  F = 'f',      // 'f', 'v' sounds
  T = 't',      // 't', 'd', 'n' sounds
  S = 's',      // 's', 'z' sounds
  K = 'k',      // 'k', 'g' sounds
  R = 'r',      // 'r' sounds
  L = 'l',      // 'l' sounds
  W = 'w',      // 'w' sounds
  SILENCE = ''  // Silence/no specific viseme
}

/**
 * Interface for viseme data used in the rhythm UI
 */
export interface VisemeData {
  /** The viseme type */
  viseme: Viseme;
  
  /** Start time in milliseconds */
  startTime: number;
  
  /** End time in milliseconds */
  endTime: number;
  
  /** Duration in milliseconds */
  duration: number;
  
  /** The key to press for this viseme */
  keyToPress: string;
  
  /** Intensity of the viseme (0-1) */
  intensity: number;
}

/**
 * Convert from VisemeType to Viseme
 * This helps with compatibility between our systems
 */
export const visemeTypeToViseme = (visemeType: string): Viseme => {
  switch (visemeType.toLowerCase()) {
    case 'a': return Viseme.A;
    case 'e': return Viseme.E;
    case 'i': return Viseme.I;
    case 'o': return Viseme.O;
    case 'u': return Viseme.U;
    case 'p': return Viseme.P;
    case 'f': return Viseme.F;
    case 't': return Viseme.T;
    case 's': return Viseme.S;
    case 'k': return Viseme.K;
    case 'r': return Viseme.R;
    case 'l': return Viseme.L;
    case 'w': return Viseme.W;
    default: return Viseme.SILENCE;
  }
};

/**
 * Get the default key to press for a viseme
 */
export const getKeyForViseme = (viseme: Viseme): string => {
  return viseme.toUpperCase();
};
