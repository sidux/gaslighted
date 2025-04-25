import { GameState, FartType, FartResult } from '../../types';
import { getShameGain, getPressureRelease } from './keyPress';

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
  
  // Get the terrible shame value
  const terribleShameGain = getShameGain(state, 'terrible');
  
  // Get the terrible pressure release
  const terriblePressureRelease = getPressureRelease(state, 'terrible');
  
  return {
    ...state,
    pressure: Math.max(0, newPressure - terriblePressureRelease),
    shame: Math.min(100, state.shame + terribleShameGain),
    combo: 0, // Reset combo
    lastFartResult: autoFartResult,
    isGameOver: (state.shame + terribleShameGain) >= 100,
  };
};