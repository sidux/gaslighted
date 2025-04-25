import { 
  FartType, 
  FartResult, 
  FartResultType, 
  FartOpportunity,
  GameState
} from '../../types';

/**
 * Check if a key press matches a fart opportunity
 */
export const checkFartKeyPress = (
  key: string,
  opportunity: FartOpportunity | null,
  currentTime: number,
  precisionWindowMs: number,
  gameSpeed: number = 1.0
): FartResult | null => {
  if (!opportunity || !opportunity.active) return null;
  
  const pressedKey = key.toLowerCase();
  if (pressedKey !== opportunity.type) return null;
  
  // Check timing precision - adjust opportunity time for game speed
  const adjustedOpportunityTime = opportunity.time * (1.0 / gameSpeed);
  const timeDifference = Math.abs(currentTime - adjustedOpportunityTime);
  
  // Also adjust precision window based on game speed
  const adjustedPrecisionWindow = precisionWindowMs / gameSpeed;
  
  let resultType: FartResultType;
  if (timeDifference <= adjustedPrecisionWindow * 0.75) {
    resultType = 'perfect';
  } else if (timeDifference <= adjustedPrecisionWindow * 2) {
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
 * Get pressure release value based on result type
 */
export const getPressureRelease = (state: GameState, resultType: FartResultType): number => {
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
export const getShameGain = (state: GameState, resultType: FartResultType): number => {
  if (resultType === 'missed') return 0;
  
  if (resultType === 'terrible') {
    return state.level.rules.shame_gain.terrible || 
           Math.ceil(state.level.rules.shame_gain.bad * 1.5);
  }
  
  return state.level.rules.shame_gain[resultType];
};