/**
 * Game configuration constants
 */
export const GameConfig = {
  // Game dimensions
  WIDTH: 1024, // Wider game area for rhythm UI
  HEIGHT: 600,
  BACKGROUND_COLOR: 0x222222,
  
  // Scene keys
  SCENE_BOOT: 'boot',
  SCENE_PRELOAD: 'preload',
  SCENE_MENU: 'menu',
  SCENE_GAME: 'game',
  SCENE_GAME_OVER: 'gameOver',
  SCENE_LEVEL_SELECT: 'levelSelect',
  
  // Fart pressure settings
  FART_PRESSURE_INITIAL: 3,  // Starting pressure
  FART_PRESSURE_INCREASE_RATE: 0.7, // How fast pressure builds (points per frame)
  FART_PRESSURE_MAX: 100,    // Maximum pressure
  FART_PRESSURE_CRITICAL: 85, // Threshold for critical pressure warning
  
  // Pressure meter dimensions
  PRESSURE_METER_WIDTH: 30,
  PRESSURE_METER_HEIGHT: 200,
  
  // Gameplay settings
  DEFAULT_LEVEL_DURATION: 120, // Default level duration in seconds
  
  // Speech rhythm visualization settings
  RHYTHM_LOOK_AHEAD_TIME: 3000, // How far ahead to show speech rhythm (ms)
  RHYTHM_DISPLAY_WIDTH: 30,
  RHYTHM_DISPLAY_HEIGHT: 300,
  
  // Neural speech processing settings
  MIN_SAFE_WORD_DURATION: 200, // Minimum word duration to be considered a safe zone (ms)
  PAUSE_THRESHOLD: 150,       // Gap between words that constitutes a pause (ms)
  
  // Fart timing feedback
  PERFECT_TIMING_BONUS: 5,    // Credibility points for perfect timing
  BAD_TIMING_PENALTY: -15,    // Credibility points for bad timing
  AUTO_RELEASE_PENALTY: -25,  // Credibility penalty for auto-release
  
  // Difficulty settings
  DIFFICULTY_MODIFIER: {
    // Easy mode
    1: { 
      pressureRate: 0.5, 
      autoReleaseChance: 0.01,
      visemeSamplingRate: 0.25, // Only 25% of potential visemes
      minTimeBetweenVisemes: 1000, // 1 second minimum spacing
      noteFallSpeed: 1.3, // 30% slower notes
      noteLimit: 3 // Max 3 notes at once
    },
    // Medium mode
    2: { 
      pressureRate: 0.7, 
      autoReleaseChance: 0.02,
      visemeSamplingRate: 0.4, // 40% of potential visemes
      minTimeBetweenVisemes: 800, // 0.8 second minimum spacing
      noteFallSpeed: 1.1, // 10% slower notes
      noteLimit: 4 // Max 4 notes at once
    },
    // Hard mode
    3: { 
      pressureRate: 1.0, 
      autoReleaseChance: 0.03,
      visemeSamplingRate: 0.6, // 60% of potential visemes
      minTimeBetweenVisemes: 600, // 0.6 second minimum spacing
      noteFallSpeed: 1.0, // Normal speed
      noteLimit: 5 // Max 5 notes at once
    }
  }
};
