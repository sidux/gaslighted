import { 
  GameState, 
  Level, 
  Viseme, 
  FartOpportunity, 
  FartType, 
  FartResult, 
  FartResultType 
} from './types';

// Map the viseme value to fart type
const visemeToFartTypeMap: { [key: string]: FartType | null } = {
  // Primary mappings
  'p': 'p',
  'b': 'b',
  'f': 'f',
  't': 't',
  'r': 'r',
  'z': 'z',
  
  // Extended mappings for similar sounds
  'T': 't',
  'd': 't',
  'D': 't',
  'n': 't',
  'th': 't',
  'g': 't',
  'k': 't',
  'c': 't',
  'q': 't',
  
  'm': 'p',
  'w': 'p',
  
  'v': 'f',
  'ph': 'f',
  
  'j': 'z',
  'S': 'z',
  's': 'z',
  'Z': 'z',
  'x': 'z',
  'sh': 'z',
  'ch': 'z',
  
  'l': 'r',
  'R': 'r',
  'er': 'r',
  'ar': 'r',
  'or': 'r',
  'ur': 'r',
  
  // Map all viseme types to ensure no sounds are missed
  '@': 'f',
  'E': 't',
  'O': 'b',
  'A': 'z',
  'I': 'z',
  'U': 'p',
  'sil': null, // Silence, no fart opportunity
};

// Initialize the game state with default values
export const initializeGameState = (level: Level, dialogueMetadata: { [key: string]: Viseme[] }): GameState => {
  return {
    level,
    isPlaying: false,
    isGameOver: false,
    victory: false,
    currentDialogueIndex: 0,
    pressure: 0,
    shame: 0,
    combo: 0,
    score: 0,
    playbackTime: 0,
    currentWordIndex: -1,
    currentVisemeIndex: -1,
    fartOpportunities: generateFartOpportunities(level, dialogueMetadata),
    currentFartOpportunity: null,
    lastFartResult: null,
    dialogueMetadata,
    pausedTimestamp: null,
  };
};

// Generate fart opportunities for the level based on viseme data
export const generateFartOpportunities = (
  level: Level, 
  dialogueMetadata: { [key: string]: Viseme[] }
): FartOpportunity[] => {
  const opportunities: FartOpportunity[] = [];
  
  level.dialogues.forEach((dialogue, dialogueIndex) => {
    const speakerId = dialogue.speakerId;
    const metadata = dialogueMetadata[`level1-${dialogueIndex}-${speakerId}-metadata.json`];
    
    if (!metadata) return;
    
    // Check for special words that should always have opportunities (like "quarterly")
    const specialWords = ["quarterly", "quart", "quarter", "questions", "quality", "quick", "report", "team", "please", "brief", "forward", "review", "synergize", "framework", "blockchain", "leverage", "pivot"];
    const lowerText = dialogue.text.toLowerCase();
    
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
    
    // Generate opportunities based on rules
    Object.entries(wordVisemes).forEach(([wordIndexStr, visemes]) => {
      const wordIndex = parseInt(wordIndexStr);
      
      // Get the word text from metadata
      const wordItem = metadata.find(item => 
        item.type === 'word' && metadata.indexOf(item) === wordIndex * 2 // Accounting for sentence markers
      );
      
      let maxOpportunitiesForWord = Math.min(
        level.rules.max_possible_farts_by_word,
        visemes.length
      );
      
      // If it's a special word that should have more opportunities
      if (wordItem && wordItem.value) {
        const wordText = wordItem.value.toLowerCase();
        if (specialWords.some(special => wordText.includes(special))) {
          // Increase opportunities for special words
          maxOpportunitiesForWord = Math.min(
            level.rules.max_possible_farts_by_word * 2, // Double the opportunities
            visemes.length
          );
        }
      }
      
      // Get all possible visemes that map to valid fart types
      const validVisemes = visemes.filter(viseme => getFartTypeFromViseme(viseme.value) !== null);
      
      // If we don't have enough valid visemes, try to convert some other visemes
      if (validVisemes.length < maxOpportunitiesForWord && visemes.length > 0) {
        // Assign random fart types to some visemes that don't have mappings
        const unmappedVisemes = visemes.filter(viseme => getFartTypeFromViseme(viseme.value) === null);
        for (let i = 0; i < Math.min(unmappedVisemes.length, maxOpportunitiesForWord - validVisemes.length); i++) {
          const randomFartType = ['t', 'p', 'b', 'f', 'r', 'z'][Math.floor(Math.random() * 6)] as FartType;
          opportunities.push({
            dialogueIndex,
            wordIndex,
            visemeIndex: metadata.findIndex(item => 
              item.type === 'viseme' && item.time === unmappedVisemes[i].time
            ),
            time: unmappedVisemes[i].time,
            type: randomFartType,
            active: false,
            handled: false,
            pressed: false,
            pressedTime: 0
          });
        }
      }
      
      // Randomly select visemes for fart opportunities from the valid ones
      const selectedVisemes = shuffleArray([...validVisemes])
        .slice(0, maxOpportunitiesForWord)
        .sort((a, b) => a.time - b.time);
      
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
            pressedTime: 0
          });
        }
      });
    });
  });
  
  return opportunities;
};

// Helper function to get fart type from viseme
export const getFartTypeFromViseme = (visemeValue: string): FartType | null => {
  return visemeToFartTypeMap[visemeValue] || null;
};

// Helper function to shuffle array
const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Check if a key press matches the current fart opportunity
export const checkFartKeyPress = (
  key: string,
  currentFartOpportunity: FartOpportunity | null,
  currentTime: number,
  precisionWindowMs: number
): FartResult | null => {
  if (!currentFartOpportunity || !currentFartOpportunity.active) {
    return null;
  }
  
  // Convert key to lowercase and check if it matches the fart type
  const pressedKey = key.toLowerCase();
  if (pressedKey !== currentFartOpportunity.type) {
    return null;
  }
  
  // Check timing precision with extremely forgiving windows
  const opportunityTime = currentFartOpportunity.time;
  const timeDifference = Math.abs(currentTime - opportunityTime);
  
  let resultType: FartResultType;
  // Make the perfect window much larger (3/4 of the precision window)
  if (timeDifference <= precisionWindowMs * 0.75) {
    resultType = 'perfect';
  // Make the okay window very large (double the precision window)
  } else if (timeDifference <= precisionWindowMs * 2) {
    resultType = 'okay';
  } else {
    resultType = 'bad';
  }
  
  return {
    type: resultType,
    fartType: currentFartOpportunity.type,
    timestamp: currentTime,
    wordIndex: currentFartOpportunity.wordIndex,
  };
};

// Update game state based on elapsed time
export const updateGameState = (state: GameState, elapsedMs: number): GameState => {
  if (!state.isPlaying || state.isGameOver) {
    return state;
  }
  
  // Update pressure based on elapsed time
  const pressureIncrease = (elapsedMs / 1000) * state.level.rules.pressure_buildup_speed;
  let newPressure = state.pressure + pressureIncrease;
  
  // Check for auto-fart (pressure max)
  if (newPressure >= 100 && !state.lastFartResult) {
    // Trigger a bad automatic fart
    const autoFartResult: FartResult = {
      type: 'bad',
      fartType: ['t', 'p', 'b', 'f', 'r', 'z'][Math.floor(Math.random() * 6)] as FartType,
      timestamp: state.playbackTime,
      wordIndex: state.currentWordIndex,
    };
    
    // Apply shame increase
    const newShame = state.shame + state.level.rules.shame_gain.bad;
    
    // Reset combo
    const newCombo = 0;
    
    // Game over if shame is too high
    const isGameOver = newShame >= 100;
    
    return {
      ...state,
      pressure: Math.max(0, newPressure - state.level.rules.pressure_release.bad),
      shame: Math.min(100, newShame),
      combo: newCombo,
      lastFartResult: autoFartResult,
      isGameOver,
    };
  }
  
  // Update playback time
  const newPlaybackTime = state.playbackTime + elapsedMs;
  
  // Find current dialogue metadata
  const currentDialogue = state.level.dialogues[state.currentDialogueIndex];
  const currentSpeakerId = currentDialogue?.speakerId;
  const currentMetadata = state.dialogueMetadata[`level1-${state.currentDialogueIndex}-${currentSpeakerId}-metadata.json`];
  
  // Update current word and viseme based on playback time
  let newWordIndex = state.currentWordIndex;
  let newVisemeIndex = state.currentVisemeIndex;
  
  if (currentMetadata) {
    // Find current word
    const wordItems = currentMetadata.filter(item => item.type === 'word');
    for (let i = 0; i < wordItems.length; i++) {
      if (newPlaybackTime >= wordItems[i].time) {
        newWordIndex = i;
      } else {
        break;
      }
    }
    
    // Find current viseme
    const visemeItems = currentMetadata.filter(item => item.type === 'viseme');
    for (let i = 0; i < visemeItems.length; i++) {
      if (newPlaybackTime >= visemeItems[i].time) {
        newVisemeIndex = currentMetadata.findIndex(item => 
          item.type === 'viseme' && item.time === visemeItems[i].time
        );
      } else {
        break;
      }
    }
  }
  
  // Check if dialogue is complete
  let newDialogueIndex = state.currentDialogueIndex;
  let completedCurrentDialogue = false;
  
  if (currentMetadata) {
    const lastItem = currentMetadata[currentMetadata.length - 1];
    if (newPlaybackTime >= lastItem.time + 1000) { // Add 1 second buffer
      newDialogueIndex++;
      completedCurrentDialogue = true;
    }
  }
  
  // Check if level is complete
  const isLevelComplete = newDialogueIndex >= state.level.dialogues.length;
  const victory = isLevelComplete && state.shame < 100;
  
  // Update fart opportunities with much wider windows and make them stay visible longer
  const newFartOpportunities = state.fartOpportunities.map(opportunity => {
    if (opportunity.dialogueIndex === state.currentDialogueIndex) {
      // Use the configured values from level rules
      const startTime = opportunity.time - (state.level.rules.precision_window_ms * 2.5); // Show much earlier
      
      // Use the letter_visible_duration_ms to control how long the letter stays visible
      const endTime = opportunity.time + state.level.rules.letter_visible_duration_ms; 
      
      const isActive = newPlaybackTime >= startTime && newPlaybackTime <= endTime && !opportunity.handled;
      
      // Mark as handled if the active window has passed
      const handled = opportunity.handled || newPlaybackTime > endTime;
      
      return { ...opportunity, active: isActive, handled };
    }
    return opportunity;
  });
  
  // Limit the number of active fart opportunities based on max_simultaneous_letters
  const activeOpportunities = newFartOpportunities.filter(opp => opp.active && !opp.handled);
  if (activeOpportunities.length > state.level.rules.max_simultaneous_letters) {
    // Sort by time, keep the earliest ones
    activeOpportunities.sort((a, b) => a.time - b.time);
    
    // Mark excess opportunities as not active
    for (let i = state.level.rules.max_simultaneous_letters; i < activeOpportunities.length; i++) {
      const oppIndex = newFartOpportunities.findIndex(o => o === activeOpportunities[i]);
      if (oppIndex !== -1) {
        newFartOpportunities[oppIndex] = {
          ...newFartOpportunities[oppIndex],
          active: false
        };
      }
    }
  }
  
  // Allow multiple fart opportunities to be active simultaneously
  // We'll use the first one for handling key presses, but UI can show all of them
  const currentFartOpportunity = newFartOpportunities.find(
    opportunity => opportunity.active && !opportunity.handled
  ) || null;
  
  // Check for missed opportunities
  const missedOpportunities = newFartOpportunities.filter(
    opportunity => !opportunity.active && 
                  opportunity.handled && 
                  opportunity.dialogueIndex === state.currentDialogueIndex &&
                  !state.fartOpportunities[newFartOpportunities.indexOf(opportunity)].handled
  );
  
  // Apply missed opportunity penalties
  let updatedState = {
    ...state,
    pressure: newPressure,
    playbackTime: newPlaybackTime,
    currentWordIndex: newWordIndex,
    currentVisemeIndex: newVisemeIndex,
    currentDialogueIndex: newDialogueIndex,
    fartOpportunities: newFartOpportunities,
    currentFartOpportunity,
    isGameOver: state.shame >= 100 || victory,
    victory,
  };
  
  if (completedCurrentDialogue) {
    updatedState = {
      ...updatedState,
      playbackTime: 0,
      currentWordIndex: -1,
      currentVisemeIndex: -1,
      lastFartResult: null,
    };
  }
  
  return updatedState;
};

// Apply the result of a fart to the game state
export const applyFartResult = (state: GameState, result: FartResult): GameState => {
  if (!state.isPlaying || state.isGameOver) {
    return state;
  }
  
  // Get pressure release and shame values based on result type
  const pressureRelease = result.type === 'missed' ? 0 : state.level.rules.pressure_release[result.type];
  const shameGain = result.type === 'missed' ? 0 : state.level.rules.shame_gain[result.type];
  
  // Update combo
  let newCombo = state.combo;
  if (result.type === 'perfect') {
    newCombo += 1;
  } else if (result.type === 'bad') {
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

// Get the final score when the game is over
export const getFinalScore = (state: GameState): number => {
  if (state.victory) {
    // Final score is the negative of the pressure
    return Math.max(0, -state.pressure + state.score);
  } else {
    // Failed, score is the accumulated score
    return state.score;
  }
};
