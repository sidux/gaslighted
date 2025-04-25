import { 
  FartType, 
  FartOpportunity,
  Level,
  Viseme
} from '../../types';
import { getFartTypeFromViseme } from './types';
import { getPlayerCharacterId, isPlayerDialogue } from '../playerService';

/**
 * Helper function to determine if a dialogue is an answer dialogue
 */
const isAnswerDialogue = (dialogue: any, level: Level): boolean => {
  const playerCharacterId = getPlayerCharacterId(level);
  // Check for a player dialogue that has text but no answers/feedback
  // OR an empty player dialogue with no properties (backward compatibility)
  return (dialogue.speaker === playerCharacterId && 
         (dialogue.text && !dialogue.answers && !dialogue.feedback) ||
         (dialogue.speaker === playerCharacterId && !dialogue.text && !dialogue.answers && !dialogue.feedback));
};

/**
 * Helper function to get dialogue display text (for debugging)
 */
const getDialogueDisplayText = (dialogue: any, gameState: any = null): string => {
  if (dialogue.text) {
    return dialogue.text;
  } else if (isPlayerDialogue(dialogue.speaker, gameState.level) && gameState?.currentQuestion?.selectedAnswer !== undefined) {
    // Player answer
    return gameState.currentQuestion.answers[gameState.currentQuestion.selectedAnswer].text || 'Selected answer';
  } else if (dialogue.feedback && gameState?.currentQuestion?.isCorrect !== undefined) {
    // Feedback
    const feedback = dialogue.feedback.find((f: any) => f.correct === gameState.currentQuestion.isCorrect);
    return feedback?.text || 'Feedback';
  }
  return 'No text';
};

/**
 * Helper function to determine if a dialogue is a feedback dialogue
 */
const isFeedbackDialogue = (dialogue: any): boolean => {
  return dialogue.feedback !== undefined;
};

/**
 * Generate fart opportunities for the level
 */
export const generateFartOpportunities = (
  level: Level, 
  dialogueMetadata: { [key: string]: Viseme[] }
): FartOpportunity[] => {
  const opportunities: FartOpportunity[] = [];
  const levelId = level.id || 'level1';
  const playerCharacterId = getPlayerCharacterId(level);
  
  // Process each dialogue
  level.dialogues.forEach((dialogue, dialogueIndex) => {
    // Skip dialogues with no speaker
    if (!dialogue.speaker) return;
    
    // For each dialogue, determine the metadata key to use
    let metadataKey = '';
    
    if (dialogue.text) {
      // Regular dialogue
      metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${dialogueIndex}-${dialogue.speaker}-metadata.json`;
    } 
    else if (isAnswerDialogue(dialogue, level)) {
      // Player answer dialogue - use both answer possibilities since we don't know which will be selected
      // We'll generate generic opportunities for now, and they'll be filtered at runtime
      metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${dialogueIndex}-${dialogue.speaker}-answer-0-metadata.json`;
    }
    else if (isFeedbackDialogue(dialogue)) {
      // Feedback dialogue - use the correct feedback metadata as default
      metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${dialogueIndex}-${dialogue.speaker}-feedback-correct-metadata.json`;
    }
    else {
      // Question dialogue or other special case
      metadataKey = '';
    }
    
    // Get metadata based on the key we determined
    const metadata = dialogueMetadata[metadataKey];
    
    // Check if we have any metadata
    if (!metadata || metadata.length === 0) {
      // For answer/feedback dialogues with no metadata, or player dialogues with answers+text, generate basic opportunities
      if (isAnswerDialogue(dialogue, level) || isFeedbackDialogue(dialogue) ||
          (dialogue.speaker === playerCharacterId && dialogue.answers && dialogue.text)) {
        console.log(`Generating basic fart opportunities for ${dialogue.speaker} dialogue at index ${dialogueIndex}`);
        
        // Number of opportunities to generate
        const numOpportunities = 3;
        
        // Create evenly spaced opportunities
        for (let i = 0; i < numOpportunities; i++) {
          // Calculate time based on position (early, middle, late)
          const fartTime = 500 + (i * 1500); // 500ms, 2000ms, 3500ms
          
          // Choose a random fart type
          const fartTypes: FartType[] = ['t', 'p', 'k', 'f', 'r', 'z'];
          const randomIndex = Math.floor(Math.random() * fartTypes.length);
          const fartType = fartTypes[randomIndex];
          
          opportunities.push({
            dialogueIndex,
            wordIndex: i,
            visemeIndex: i,
            time: fartTime,
            type: fartType,
            active: false,
            handled: false,
            pressed: false,
            pressedTime: 0,
            animationKey: ''
          });
        }
        
        return; // Skip the regular metadata processing
      }
      
      // No metadata and not a special dialogue type, so skip
      return;
    }
    
    // Group visemes by word for metadata-based dialogues
    const wordVisemes: { [wordIndex: number]: Viseme[] } = {};
    let currentWordIndex = -1;
    
    metadata.forEach((item) => {
      if (item.type === 'word') {
        currentWordIndex++;
        wordVisemes[currentWordIndex] = [];
      } else if (item.type === 'viseme' && currentWordIndex >= 0) {
        wordVisemes[currentWordIndex].push(item);
      }
    });
    
    // Generate opportunities for each word
    Object.entries(wordVisemes).forEach(([wordIndexStr, visemes]) => {
      const wordIndex = parseInt(wordIndexStr);
      let maxOpportunitiesForWord = Math.min(
        level.rules.max_possible_farts_by_word,
        visemes.length
      );
      
      // Get valid visemes that map to fart types
      const validVisemes = visemes.filter(viseme => getFartTypeFromViseme(viseme.value) !== null);
      
      if (validVisemes.length > 0) {
        // Try to select one of each fart type, up to max opportunities
        const fartTypes = new Set<FartType>();
        const selectedVisemes: Viseme[] = [];
        
        validVisemes.forEach(viseme => {
          const fartType = getFartTypeFromViseme(viseme.value);
          if (fartType && !fartTypes.has(fartType) && selectedVisemes.length < maxOpportunitiesForWord) {
            fartTypes.add(fartType);
            selectedVisemes.push(viseme);
          }
        });
        
        // Sort by time and create opportunities
        selectedVisemes.sort((a, b) => a.time - b.time);
        
        selectedVisemes.forEach((viseme) => {
          const fartType = getFartTypeFromViseme(viseme.value);
          if (fartType) {
            const visemeIndex = metadata.findIndex(
              (item) => item.type === 'viseme' && item.time === viseme.time
            );
            
            opportunities.push({
              dialogueIndex,
              wordIndex,
              visemeIndex,
              time: viseme.time,
              type: fartType,
              active: false,
              handled: false,
              pressed: false,
              pressedTime: 0,
              animationKey: ''
            });
          }
        });
      }
    });
  });
  
  return opportunities;
};

/**
 * Update fart opportunities based on current playback time
 */
export const updateFartOpportunities = (
  state: any,
  playbackTime: number
): { 
  newFartOpportunities: FartOpportunity[], 
  currentFartOpportunity: FartOpportunity | null 
} => {
  // Get game speed from level rules
  const gameSpeed = state.level.rules.game_speed || 1.0;
  
  // Update basic active/handled status based on timing
  const fartOpportunities = state.fartOpportunities.map((opportunity: FartOpportunity) => {
    if (opportunity.dialogueIndex === state.currentDialogueIndex) {
      if (opportunity.handled || opportunity.pressed) {
        return opportunity;
      }
      
      // Adjust opportunity timing based on game speed
      const adjustedTime = opportunity.time * (1.0 / gameSpeed);
      const startTime = adjustedTime - (state.level.rules.precision_window_ms * 2.5 / gameSpeed);
      const endTime = adjustedTime + (state.level.rules.letter_visible_duration_ms / gameSpeed);
      
      const isActive = playbackTime >= startTime && playbackTime <= endTime && !opportunity.handled;
      const handled = opportunity.handled || (playbackTime > endTime && !opportunity.pressed);
      
      return { ...opportunity, active: isActive, handled };
    }
    return opportunity;
  });
  
  // Apply "only one instance of each letter" rule
  const activeByType: { [key: string]: FartOpportunity[] } = {};
  fartOpportunities
    .filter((opp: FartOpportunity) => opp.active && !opp.handled)
    .forEach((opp: FartOpportunity) => {
      if (!activeByType[opp.type]) {
        activeByType[opp.type] = [];
      }
      activeByType[opp.type].push(opp);
    });
  
  // Keep only the most recent letter of each type
  Object.keys(activeByType).forEach(letterType => {
    if (activeByType[letterType].length > 1) {
      activeByType[letterType].sort((a: FartOpportunity, b: FartOpportunity) => b.time - a.time);
      
      for (let i = 1; i < activeByType[letterType].length; i++) {
        const oppIndex = fartOpportunities.findIndex((o: FartOpportunity) => o === activeByType[letterType][i]);
        if (oppIndex !== -1) {
          fartOpportunities[oppIndex] = {
            ...fartOpportunities[oppIndex],
            active: false,
            handled: true
          };
        }
      }
    }
  });
  
  // Limit the total active letters to max_simultaneous_letters
  const activeOpportunities = fartOpportunities.filter((opp: FartOpportunity) => opp.active && !opp.handled);
  if (activeOpportunities.length > state.level.rules.max_simultaneous_letters) {
    activeOpportunities.sort((a: FartOpportunity, b: FartOpportunity) => a.time - b.time);
    
    for (let i = state.level.rules.max_simultaneous_letters; i < activeOpportunities.length; i++) {
      const oppIndex = fartOpportunities.findIndex((o: FartOpportunity) => o === activeOpportunities[i]);
      if (oppIndex !== -1) {
        fartOpportunities[oppIndex] = {
          ...fartOpportunities[oppIndex],
          active: false
        };
      }
    }
  }
  
  // Get the current opportunity for key press handling
  const currentFartOpportunity = fartOpportunities.find(
    (opportunity: FartOpportunity) => opportunity.active && !opportunity.handled
  ) || null;
  
  return { newFartOpportunities: fartOpportunities, currentFartOpportunity };
};
