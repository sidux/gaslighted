import { Level, Participant } from '../types';

/**
 * Get the player character ID from level participants
 */
export const getPlayerCharacterId = (level: Level): string => {
  const playerParticipant = level.participants.find(
    (participant) => participant.type === 'player'
  );
  
  if (!playerParticipant) {
    console.error('No player character found in level participants');
    return ''; // Return empty string as fallback
  }
  
  return playerParticipant.id;
};

/**
 * Check if a dialogue is spoken by the player character
 */
export const isPlayerDialogue = (speakerId: string, level: Level): boolean => {
  const playerCharacterId = getPlayerCharacterId(level);
  return speakerId === playerCharacterId;
};

/**
 * Check if a dialogue is an answer dialogue from the player
 */
export const isPlayerAnswerDialogue = (dialogue: any, level: Level): boolean => {
  const playerCharacterId = getPlayerCharacterId(level);
  return dialogue.speaker === playerCharacterId && 
         !dialogue.text && 
         !dialogue.answers && 
         !dialogue.feedback;
};
