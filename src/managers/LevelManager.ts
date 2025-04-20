import { Level } from '../types/Level';

export class LevelManager {
  private levels: Map<string, Level> = new Map();
  
  constructor() {
    this.loadLevels();
  }
  
  public getLevel(id: string): Level {
    const level = this.levels.get(id);
    
    if (!level) {
      throw new Error(`Level with ID ${id} not found!`);
    }
    
    return level;
  }
  
  public getLevelList(): Level[] {
    return Array.from(this.levels.values());
  }
  
  private loadLevels(): void {
    // In a real implementation, this would load from YAML files
    // For now, we'll create mock levels in memory
    
    // Level 1: Tutorial
    const level1: Level = {
      id: 'level1',
      title: 'First Day Jitters',
      description: 'Your first remote meeting. Thankfully, people are forgiving.',
      difficulty: 1,
      duration: 120, // 2 minutes
      participants: [
        { id: 'player', name: 'Russell', voiceType: 'Brian' },
        { id: 'boss', name: 'Mr. Bogdanoff', voiceType: 'Bruno' },
        { id: 'coworker1', name: 'Zoomer', voiceType: 'Brandon' },
        { id: 'coworker2', name: 'Susan', voiceType: 'Salli' }
      ],
      dialogues: [
        {
          speakerId: 'boss',
          text: 'Welcome to the quarterly review meeting. We have lots to discuss today.',
          delay: 2000,
          duration: 4000,
          safetyStatus: 'neutral'
        },
        {
          speakerId: 'coworker1',
          text: "Hey everyone! I'm super excited to share our Q4 results!",
          delay: 1000,
          duration: 3000,
          safetyStatus: 'neutral'
        },
        {
          speakerId: 'boss',
          text: 'Before we begin, I would like to emphasize how important it is to listen carefully.',
          delay: 1000,
          duration: 5000,
          safetyStatus: 'danger'
        },
        {
          speakerId: 'coworker2',
          text: "Let's synergize our efforts and leverage our core competencies going forward.",
          delay: 1000,
          duration: 4000,
          safetyStatus: 'safe'
        },
        {
          speakerId: 'boss',
          text: 'Russell, are you with us? You look a bit uncomfortable.',
          delay: 1000,
          duration: 3000,
          safetyStatus: 'danger'
        },
        {
          speakerId: 'coworker1',
          text: "HAHAHA, that's so funny! I can't believe that happened!",
          delay: 1000,
          duration: 3000,
          safetyStatus: 'safe'
        },
        // More dialogue would be added here
      ],
      zeroMistakesAllowed: false
    };
    
    // Level 2: Medium difficulty
    const level2: Level = {
      id: 'level2',
      title: 'Important Client Call',
      description: 'An important client is joining. Maintain your professionalism!',
      difficulty: 2,
      duration: 180, // 3 minutes
      participants: [
        { id: 'player', name: 'Russell', voiceType: 'Brian' },
        { id: 'boss', name: 'Mr. Bogdanoff', voiceType: 'Bruno' },
        { id: 'coworker1', name: 'Zoomer', voiceType: 'Brandon' },
        { id: 'intern', name: 'Intern', voiceType: 'Salli' }
      ],
      dialogues: [
        // Would contain more complex dialogue patterns
        {
          speakerId: 'boss',
          text: 'This client meeting is critically important for our Q4 revenue targets.',
          delay: 2000,
          duration: 5000,
          safetyStatus: 'danger'
        },
        {
          speakerId: 'intern',
          text: "I've prepared the presentation as requested. Should I share my screen?",
          delay: 1000,
          duration: 4000,
          safetyStatus: 'neutral'
        },
        // More dialogue would be added here
      ],
      zeroMistakesAllowed: false
    };
    
    // Level 3: Hard difficulty
    const level3: Level = {
      id: 'level3',
      title: 'Board Presentation',
      description: 'The entire board of directors is watching. Zero mistakes allowed!',
      difficulty: 3,
      duration: 240, // 4 minutes
      participants: [
        { id: 'player', name: 'Russell', voiceType: 'Brian' },
        { id: 'boss', name: 'Mr. Bogdanoff', voiceType: 'Bruno' },
        { id: 'coworker1', name: 'Zoomer', voiceType: 'Brandon' },
        { id: 'coworker3', name: 'CFO', voiceType: 'Salli' }
      ],
      dialogues: [
        // Would contain intense dialogue with few safe windows
        {
          speakerId: 'boss',
          text: 'Board members, thank you for joining us for this critical quarterly review.',
          delay: 2000,
          duration: 5000,
          safetyStatus: 'danger'
        },
        {
          speakerId: 'coworker3',
          text: "Our financial projection models indicate substantial growth in Q1 of next year.",
          delay: 1000,
          duration: 5000,
          safetyStatus: 'danger'
        },
        // More dialogue would be added here
      ],
      zeroMistakesAllowed: true
    };
    
    // Add levels to the map
    this.levels.set(level1.id, level1);
    this.levels.set(level2.id, level2);
    this.levels.set(level3.id, level3);
  }
}
