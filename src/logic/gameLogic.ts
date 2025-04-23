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
    
    // Enhanced list of special words that should always have opportunities
    const specialWords = [
      "quarterly", "quart", "quarter", "questions", "quality", "quick",
      "report", "team", "please", "brief", "forward", "review",
      "synergize", "framework", "blockchain", "leverage", "pivot",
      "business", "profit", "meeting", "target", "budget", "benchmark",
      "presentation", "performance", "strategy", "revenue", "forecast",
      "resources", "timeline", "deliverable", "project", "feedback",
      "discuss", "follow", "priority", "focus", "progress", "update",
      "time", "paradigm", "baseline", "metric", "kpi", "agenda", "issue"
    ];
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
      let maxOpportunitiesForWord = Math.min(
        level.rules.max_possible_farts_by_word,
        visemes.length
      );
      
      // Get all visemes that map to valid fart types
      const validVisemes = visemes.filter(viseme => getFartTypeFromViseme(viseme.value) !== null);
      
      // Add opportunities from the valid visemes
      if (validVisemes.length > 0) {
        // Use all valid visemes up to maxOpportunitiesForWord, prioritizing different types
        const fartTypes = new Set<FartType>();
        const selectedVisemes: Viseme[] = [];
        
        // First pass: try to select one of each fart type
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
              animationKey: '' // Initialize with blank animation key
            });
          }
        });
      }
    });
  });
  
  // Ensure there are plenty of opportunities spread throughout the dialogue
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

// Import the playFartAudio function directly here
import { playFartAudio } from './audioManager';

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
    // Select a random fart type
    const randomFartType = ['t', 'p', 'b', 'f', 'r', 'z'][Math.floor(Math.random() * 6)] as FartType;
    
    // Create the terrible auto-fart result
    const autoFartResult: FartResult = {
      type: 'terrible',
      fartType: randomFartType,
      timestamp: state.playbackTime,
      wordIndex: state.currentWordIndex,
    };
    
    // IMPORTANT: Access the audio resources from the global window object to play the fart sound
    // This is a workaround since we don't have direct access to audioResources here
    // The GameScreen component will handle this part by checking lastFartResult
    
    // Get the terrible shame value or calculate it (1.5x the bad shame)
    const terribleShameGain = state.level.rules.shame_gain.terrible || 
                              Math.ceil(state.level.rules.shame_gain.bad * 1.5);
    
    // Apply shame increase for terrible farts
    const newShame = state.shame + terribleShameGain;
    
    // Reset combo
    const newCombo = 0;
    
    // Game over if shame is too high
    const isGameOver = newShame >= 100;
    
    // Get the terrible pressure release or calculate it (half of bad pressure release)
    const terriblePressureRelease = state.level.rules.pressure_release.terrible || 
                                   (state.level.rules.pressure_release.bad / 2);
    
    return {
      ...state,
      pressure: Math.max(0, newPressure - terriblePressureRelease),
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
      // Skip update if this opportunity is already handled
      if (opportunity.handled) {
        return opportunity;
      }
      
      // Use the configured values from level rules
      const startTime = opportunity.time - (state.level.rules.precision_window_ms * 2.5); // Show much earlier
      
      // Use the letter_visible_duration_ms to control how long the letter stays visible
      const endTime = opportunity.time + state.level.rules.letter_visible_duration_ms; 
      
      // If it's already pressed, don't mark it as inactive or handled by the time check
      // This allows the animation to play fully
      if (opportunity.pressed) {
        return opportunity; // Keep its current state so animation can finish
      }
      
      const isActive = newPlaybackTime >= startTime && newPlaybackTime <= endTime && !opportunity.handled;
      
      // Mark as handled if the active window has passed and it's not pressed
      const handled = opportunity.handled || (newPlaybackTime > endTime && !opportunity.pressed);
      
      return { ...opportunity, active: isActive, handled };
    }
    return opportunity;
  });
  
  // Implement "only one instance of each letter" rule:
  // Group active opportunities by their letter type
  const activeByType: { [key: string]: FartOpportunity[] } = {};
  newFartOpportunities
    .filter(opp => opp.active && !opp.handled)
    .forEach(opp => {
      if (!activeByType[opp.type]) {
        activeByType[opp.type] = [];
      }
      activeByType[opp.type].push(opp);
    });
  
  // For each letter type, if we have more than one instance, keep only the most recent one
  Object.keys(activeByType).forEach(letterType => {
    if (activeByType[letterType].length > 1) {
      // Sort by time (newest first)
      activeByType[letterType].sort((a, b) => b.time - a.time);
      
      // Keep only the most recent one, mark others as handled
      for (let i = 1; i < activeByType[letterType].length; i++) {
        const oppIndex = newFartOpportunities.findIndex(o => o === activeByType[letterType][i]);
        if (oppIndex !== -1) {
          newFartOpportunities[oppIndex] = {
            ...newFartOpportunities[oppIndex],
            active: false,
            handled: true
          };
        }
      }
    }
  });
  
  // Limit the total number of active fart opportunities based on max_simultaneous_letters
  const allActiveOpportunities = newFartOpportunities.filter(opp => opp.active && !opp.handled);
  if (allActiveOpportunities.length > state.level.rules.max_simultaneous_letters) {
    // Sort by time, keep the earliest ones
    allActiveOpportunities.sort((a, b) => a.time - b.time);
    
    // Mark excess opportunities as not active
    for (let i = state.level.rules.max_simultaneous_letters; i < allActiveOpportunities.length; i++) {
      const oppIndex = newFartOpportunities.findIndex(o => o === allActiveOpportunities[i]);
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
  
  // Handle pressure release and shame values based on result type
  let pressureRelease = 0;
  let shameGain = 0;
  
  if (result.type !== 'missed') {
    if (result.type === 'terrible') {
      // Use terrible values if they exist, or calculate from bad values
      pressureRelease = state.level.rules.pressure_release.terrible || 
                       (state.level.rules.pressure_release.bad / 2);
      shameGain = state.level.rules.shame_gain.terrible || 
                  Math.ceil(state.level.rules.shame_gain.bad * 1.5);
    } else {
      // For regular result types (perfect, okay, bad)
      pressureRelease = state.level.rules.pressure_release[result.type];
      shameGain = state.level.rules.shame_gain[result.type];
    }
  }
  
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
