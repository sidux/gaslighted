export interface Participant {
  id: string;
  voiceType: string;
  type: 'player' | 'npc';
}

export interface Answer {
  text: string;
  correct: boolean;
}

export interface DialogueItem {
  speaker: string;
  text?: string;
  answers?: Answer[];
  feedback?: Answer[];
}

export interface LevelRules {
  pressure_buildup_speed: number;
  precision_window_ms: number;
  max_possible_farts_by_word: number;
  max_simultaneous_letters: number;
  letter_float_duration_ms: number;
  letter_visible_duration_ms: number;
  letter_float_height_px: number;
  letter_float_speed_multiplier: number;
  pressure_release: {
    perfect: number;
    okay: number;
    bad: number;
    terrible?: number; // Optional property for terrible state
  };
  shame_gain: {
    perfect: number;
    okay: number;
    bad: number;
    terrible?: number; // Optional property for terrible state
  };
  question_pressure_multiplier?: number;
  question_effects?: {
    correct_shame_change: number;
    incorrect_shame_change: number;
    heartbeat_intensity: number;
  };
  question_time_limit?: string;
}

export interface Level {
  id?: string; // Added ID field
  title: string;
  description: string;
  rules: LevelRules;
  participants: Participant[];
  dialogues: DialogueItem[];
}

export interface Viseme {
  time: number;
  type: string;
  value: string;
  start?: number;
  end?: number;
}

export interface GameState {
  level: Level;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  victory: boolean;
  currentDialogueIndex: number;
  pressure: number;
  shame: number;
  combo: number;
  score: number;
  playbackTime: number;
  currentWordIndex: number;
  currentVisemeIndex: number;
  fartOpportunities: FartOpportunity[];
  currentFartOpportunity: FartOpportunity | null;
  lastFartResult: FartResult | null;
  dialogueMetadata: { [key: string]: Viseme[] };
  pausedTimestamp: number | null;
  showingQuestion: boolean;
  currentQuestion?: {
    answers: Answer[];
    selectedAnswer?: number;
    isCorrect?: boolean;
    timeRemaining: number;
    startTime: number;
  };
  screenEffects: {
    heartbeatIntensity: number;
    pulseEffect: boolean;
    blurEffect: boolean;
  };
  audioResources?: AudioResources;
}

export type FartType = 't' | 'p' | 'k' | 'f' | 'r' | 'z';

export interface FartOpportunity {
  dialogueIndex: number;
  wordIndex: number;
  visemeIndex: number;
  time: number;
  type: FartType;
  active: boolean;
  handled: boolean;
  pressed: boolean;   // Whether the letter has been pressed but is still floating
  pressedTime: number; // When the letter was pressed
  resultType?: FartResultType; // Type of result when pressed (perfect, okay, bad)
  animationKey?: string; // Unique key to force animation refresh
}

export type FartResultType = 'perfect' | 'okay' | 'bad' | 'terrible' | 'missed';

export interface FartResult {
  type: FartResultType;
  fartType: FartType;
  timestamp: number;
  wordIndex: number;
}

export interface AudioResources {
  dialogues: { [key: string]: HTMLAudioElement };
  farts: { [key in FartType]: HTMLAudioElement };
  heartbeat: HTMLAudioElement;
}
