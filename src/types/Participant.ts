/**
 * Represents a participant in a meeting (player or NPC)
 */
export interface Participant {
  /** Unique identifier for the participant */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Voice type to use for TTS */
  voiceType: string;
}
