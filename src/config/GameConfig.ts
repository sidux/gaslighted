/**
 * Game configuration constants
 */
export class GameConfig {
  // Display settings
  static readonly WIDTH: number = 1280;
  static readonly HEIGHT: number = 720;
  static readonly BACKGROUND_COLOR: number = 0x2c3e50;
  
  // Game settings
  static readonly FART_PRESSURE_INITIAL: number = 0;
  static readonly FART_PRESSURE_MAX: number = 100;
  static readonly FART_PRESSURE_INCREASE_RATE: number = 0.4; // per frame
  static readonly FART_PRESSURE_CRITICAL: number = 85; // when auto-release risk begins
  
  // UI settings
  static readonly PRESSURE_METER_WIDTH: number = 300;
  static readonly PRESSURE_METER_HEIGHT: number = 25;

  // Asset keys
  static readonly PLAYER_FACE_KEY: string = 'player';
  
  // Scene keys
  static readonly SCENE_BOOT: string = 'Boot';
  static readonly SCENE_PRELOAD: string = 'Preload';
  static readonly SCENE_MENU: string = 'Menu';
  static readonly SCENE_GAME: string = 'Game';
  static readonly SCENE_GAME_OVER: string = 'GameOver';
  
  // Audio settings
  static readonly SPEECH_API_URL: string = 'https://readloud.net/';
  
  // Voice mappings for ReadLoud API
  static readonly VOICE_MAPPINGS: Record<string, string> = {
    'Brian': 'Brian', // Slow, managerial (Boomer)
    'Bruno': 'Russell', // Mysterious, deep (Bogdanoff)
    'Brandon': 'Evan', // Hyper, high-pitched (Zoomer)
    'Salli': 'Joanna' // Corporate perky (Girl)
  };
}
