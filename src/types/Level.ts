import { Dialogue } from './Dialogue';
import { Participant } from './Participant';

/**
 * Represents a game level configuration
 */
export interface Level {
  /** Unique identifier for this level */
  id: string;
  
  /** Display title for the level */
  title: string;
  
  /** Detailed description of the level */
  description?: string;
  
  /** Difficulty level (1-3) */
  difficulty: number;
  
  /** Duration of the level in seconds */
  duration: number;
  
  /** Characters participating in the level */
  participants: Participant[];
  
  /** Dialogue sequences for the level */
  dialogues: Dialogue[];
  
  /** Whether any mistake results in immediate failure */
  zeroMistakesAllowed: boolean;
}
