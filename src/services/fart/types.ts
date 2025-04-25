import { FartType } from '../../types';

// Map the viseme value to fart type
export const visemeToFartTypeMap: { [key: string]: FartType | null } = {
  // Primary mappings
  'p': 'p', 'k': 'k', 'f': 'f', 't': 't', 'r': 'r', 'z': 'z',
  
  // Extended mappings for similar sounds
  'T': 't', 'd': 't', 'D': 't', 'n': 't', 'th': 't',
  'g': 'k', 'c': 'k', 'q': 'k', 'x': 'k',
  'm': 'p', 'w': 'p', 'b': 'p',
  'v': 'f', 'ph': 'f',
  'j': 'z', 'S': 'z', 's': 'z', 'Z': 'z', 'sh': 'z', 'ch': 'z',
  'l': 'r', 'R': 'r', 'er': 'r', 'ar': 'r', 'or': 'r', 'ur': 'r',
  
  // No fart opportunities for these sounds
  '@': null, 'E': null, 'O': null, 'A': null, 'I': null, 'U': null, 'sil': null
};

/**
 * Helper function to get fart type from viseme value
 */
export const getFartTypeFromViseme = (visemeValue: string): FartType | null => {
  return visemeToFartTypeMap[visemeValue] || null;
};