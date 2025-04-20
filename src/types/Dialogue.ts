/**
 * Represents a dialogue entry in a level
 */
export interface Dialogue {
  /** ID of the speaking character */
  speakerId: string;
  
  /** Text content of the dialogue */
  text: string;
  
  /** Delay in milliseconds before this dialogue starts */
  delay: number;
  
  /** Duration in milliseconds that the dialogue lasts */
  duration: number;
  
  /** Safety status for farting during this dialogue */
  safetyStatus: 'safe' | 'neutral' | 'danger';
}
