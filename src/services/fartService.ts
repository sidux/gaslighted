import { 
  FartType, 
  FartResult, 
  FartResultType, 
  FartOpportunity,
  Level,
  Viseme,
  GameState
} from '../types';

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

/**
 * Generate fart opportunities for the level
 */
export const generateFartOpportunities = (
  level: Level, 
  dialogueMetadata: { [key: string]: Viseme[] }
): FartOpportunity[] => {
  const opportunities: FartOpportunity[] = [];
  const levelId = level.id || 'level1';
  
  // Process each dialogue
  level.dialogues.forEach((dialogue, dialogueIndex) => {
    // For answer and feedback dialogues, generate random fart opportunities
    if ((!dialogue.text && (dialogue.answers || dialogue.feedback)) || 
        (dialogue.feedback && dialogue.speaker) || 
        (dialogue.speaker === 'wojak' && dialogueIndex > 0 && level.dialogues[dialogueIndex-1].answers)) {
      
      // Generate 3 random fart opportunities for answer/feedback dialogues
      const fartTypes: FartType[] = ['t', 'p', 'k', 'f', 'r', 'z'];
      
      // Space the fart opportunities throughout the dialogue duration (estimated at 5 seconds)
      for (let i = 0; i < 3; i++) {
        const randomType = fartTypes[Math.floor(Math.random() * fartTypes.length)];
        const time = 500 + (i * 1500); // Space them out at 0.5s, 2s, and 3.5s
        
        opportunities.push({
          dialogueIndex,
          wordIndex: i, // Using index as wordIndex
          visemeIndex: i,
          time: time,
          type: randomType,
          active: false,
          handled: false,
          pressed: false,
          pressedTime: 0,
          animationKey: ''
        });
      }
      
      return; // Skip the regular metadata processing
    }
    
    // Regular dialogue with text
    if (!dialogue.text || !dialogue.speaker) return;
    
    const speakerId = dialogue.speaker;
    const metadataKey = `src/assets/dialogue/speech_marks/${levelId}-${dialogueIndex}-${speakerId}-metadata.json`;
    const metadata = dialogueMetadata[metadataKey];
    
    if (!metadata) return;
    
    // Group visemes by word
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
 * Check if a key press matches a fart opportunity
 */
export const checkFartKeyPress = (
  key: string,
  opportunity: FartOpportunity | null,
  currentTime: number,
  precisionWindowMs: number
): FartResult | null => {
  if (!opportunity || !opportunity.active) return null;
  
  const pressedKey = key.toLowerCase();
  if (pressedKey !== opportunity.type) return null;
  
  // Check timing precision
  const timeDifference = Math.abs(currentTime - opportunity.time);
  
  let resultType: FartResultType;
  if (timeDifference <= precisionWindowMs * 0.75) {
    resultType = 'perfect';
  } else if (timeDifference <= precisionWindowMs * 2) {
    resultType = 'okay';
  } else {
    resultType = 'bad';
  }
  
  return {
    type: resultType,
    fartType: opportunity.type,
    timestamp: currentTime,
    wordIndex: opportunity.wordIndex,
  };
};

/**
 * Apply the result of a fart to the game state
 */
export const applyFartResult = (state: GameState, result: FartResult): GameState => {
  if (!state.isPlaying || state.isGameOver) {
    return state;
  }
  
  // Get pressure release and shame values based on result type
  const pressureRelease = getPressureRelease(state, result.type);
  const shameGain = getShameGain(state, result.type);
  
  // Update combo
  let newCombo = state.combo;
  if (result.type === 'perfect') {
    newCombo += 1;
  } else if (result.type === 'bad' || result.type === 'terrible') {
    newCombo = 0;
  }
  
  // Apply combo bonus to pressure release (for perfect farts)
  const comboBonus = result.type === 'perfect' ? Math.min(newCombo, 5) * 5 : 0;
  const totalPressureRelease = pressureRelease + comboBonus;
  
  // Update pressure and shame
  const newPressure = Math.max(0, state.pressure - totalPressureRelease);
  const newShame = Math.min(100, state.shame + shameGain);
  
  // Update score
  const scoreIncrease = result.type === 'perfect' ? 100 + (newCombo * 50) : 
                        result.type === 'okay' ? 50 : 0;
  const newScore = state.score + scoreIncrease;
  
  // Check if game is over due to shame
  const isGameOver = newShame >= 100;
  
  return {
    ...state,
    pressure: newPressure,
    shame: newShame,
    combo: newCombo,
    score: newScore,
    lastFartResult: result,
    isGameOver,
  };
};

/**
 * Handle terrible fart when pressure maxes out
 */
export const handleTerribleFart = (state: GameState, newPressure: number): GameState => {
  // Select a random fart type
  const randomFartType = ['t', 'p', 'k', 'f', 'r', 'z'][Math.floor(Math.random() * 6)] as FartType;
  
  // Create the terrible auto-fart result
  const autoFartResult: FartResult = {
    type: 'terrible',
    fartType: randomFartType,
    timestamp: state.playbackTime,
    wordIndex: state.currentWordIndex,
  };
  
  // Get the terrible shame value or calculate it (1.5x the bad shame)
  const terribleShameGain = state.level.rules.shame_gain.terrible || 
                           Math.ceil(state.level.rules.shame_gain.bad * 1.5);
  
  // Get the terrible pressure release or calculate it (half of bad pressure release)
  const terriblePressureRelease = state.level.rules.pressure_release.terrible || 
                                 (state.level.rules.pressure_release.bad / 2);
  
  return {
    ...state,
    pressure: Math.max(0, newPressure - terriblePressureRelease),
    shame: Math.min(100, state.shame + terribleShameGain),
    combo: 0, // Reset combo
    lastFartResult: autoFartResult,
    isGameOver: (state.shame + terribleShameGain) >= 100,
  };
};

/**
 * Update fart opportunities based on current playback time
 */
export const updateFartOpportunities = (
  state: GameState,
  playbackTime: number
): { 
  newFartOpportunities: FartOpportunity[], 
  currentFartOpportunity: FartOpportunity | null 
} => {
  // Update basic active/handled status based on timing
  const fartOpportunities = state.fartOpportunities.map(opportunity => {
    if (opportunity.dialogueIndex === state.currentDialogueIndex) {
      if (opportunity.handled || opportunity.pressed) {
        return opportunity;
      }
      
      const startTime = opportunity.time - (state.level.rules.precision_window_ms * 2.5);
      const endTime = opportunity.time + state.level.rules.letter_visible_duration_ms;
      
      const isActive = playbackTime >= startTime && playbackTime <= endTime && !opportunity.handled;
      const handled = opportunity.handled || (playbackTime > endTime && !opportunity.pressed);
      
      return { ...opportunity, active: isActive, handled };
    }
    return opportunity;
  });
  
  // Apply "only one instance of each letter" rule
  const activeByType: { [key: string]: FartOpportunity[] } = {};
  fartOpportunities
    .filter(opp => opp.active && !opp.handled)
    .forEach(opp => {
      if (!activeByType[opp.type]) {
        activeByType[opp.type] = [];
      }
      activeByType[opp.type].push(opp);
    });
  
  // Keep only the most recent letter of each type
  Object.keys(activeByType).forEach(letterType => {
    if (activeByType[letterType].length > 1) {
      activeByType[letterType].sort((a, b) => b.time - a.time);
      
      for (let i = 1; i < activeByType[letterType].length; i++) {
        const oppIndex = fartOpportunities.findIndex(o => o === activeByType[letterType][i]);
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
  const activeOpportunities = fartOpportunities.filter(opp => opp.active && !opp.handled);
  if (activeOpportunities.length > state.level.rules.max_simultaneous_letters) {
    activeOpportunities.sort((a, b) => a.time - b.time);
    
    for (let i = state.level.rules.max_simultaneous_letters; i < activeOpportunities.length; i++) {
      const oppIndex = fartOpportunities.findIndex(o => o === activeOpportunities[i]);
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
    opportunity => opportunity.active && !opportunity.handled
  ) || null;
  
  return { newFartOpportunities: fartOpportunities, currentFartOpportunity };
};

/**
 * Get pressure release value based on result type
 */
const getPressureRelease = (state: GameState, resultType: FartResultType): number => {
  if (resultType === 'missed') return 0;
  
  if (resultType === 'terrible') {
    return state.level.rules.pressure_release.terrible || 
           (state.level.rules.pressure_release.bad / 2);
  }
  
  return state.level.rules.pressure_release[resultType];
};

/**
 * Get shame gain value based on result type
 */
const getShameGain = (state: GameState, resultType: FartResultType): number => {
  if (resultType === 'missed') return 0;
  
  if (resultType === 'terrible') {
    return state.level.rules.shame_gain.terrible || 
           Math.ceil(state.level.rules.shame_gain.bad * 1.5);
  }
  
  return state.level.rules.shame_gain[resultType];
};
