import { 
  FartType, 
  FartOpportunity,
  Level,
  Viseme
} from '../../types';
import { getFartTypeFromViseme } from './types';
import { getPlayerCharacterId, isPlayerDialogue } from '../playerService';



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
    else {
      // Other cases
      metadataKey = '';
    }
    
    // Get metadata based on the key we determined
    const metadata = dialogueMetadata[metadataKey];
    
    // Check if we have any metadata
    if (!metadata || metadata.length === 0) {
      // No metadata, so skip
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
