import { SafeZone, SpeechMark, SpeechSegment } from '../types/speech/SpeechMark';
import { Dialogue } from '../types/Dialogue';

export class NeuralSpeechProcessor {
  // Map of dialogue sound files to their speech marks
  private speechMarksCache: Map<string, SpeechMark[]> = new Map();
  // Map of dialogue sound files to their safe zones
  private safeZonesCache: Map<string, SafeZone[]> = new Map();
  
  constructor() {}
  
  /**
   * Load speech marks from a JSON file for a dialogue
   * @param dialogue The dialogue to load speech marks for
   * @returns Promise that resolves when loading is complete
   */
  public async loadSpeechMarks(dialogue: Dialogue): Promise<void> {
    // Skip if no sound file or already loaded
    if (!dialogue.soundFile || this.speechMarksCache.has(dialogue.soundFile)) {
      return;
    }
    
    try {
      // Construct path to speech marks JSON file (same name as audio but .json extension)
      const jsonPath = `audio/dialogue/speech_marks/${dialogue.soundFile.replace('.mp3', '.json')}`;
      
      // Load and parse the JSON file
      const response = await fetch(jsonPath);
      if (!response.ok) {
        throw new Error(`Failed to load speech marks: ${response.statusText}`);
      }
      
      const speechMarks: SpeechMark[] = await response.json();
      
      // Store in cache
      this.speechMarksCache.set(dialogue.soundFile, speechMarks);
      
      // Generate safe zones from speech marks
      const safeZones = this.generateSafeZones(speechMarks, dialogue.duration);
      this.safeZonesCache.set(dialogue.soundFile, safeZones);
      
      console.log(`Loaded ${speechMarks.length} speech marks and ${safeZones.length} safe zones for ${dialogue.soundFile}`);
    } catch (error) {
      console.warn(`Error loading speech marks for ${dialogue.soundFile}:`, error);
      
      // Fallback: create a simple safe zone based on dialogue duration
      // This ensures the game still works without speech marks
      this.createFallbackSafeZones(dialogue);
    }
  }
  
  /**
   * Creates fallback safe zones based on dialogue duration (used when speech marks are unavailable)
   */
  private createFallbackSafeZones(dialogue: Dialogue): void {
    // If speech marks aren't available, create a simple safe zone pattern
    // based on the dialogue's manual safety status
    const safeZones: SafeZone[] = [];
    
    // If manually marked as safe, create a safe zone for the entire dialogue
    if (dialogue.safetyStatus === 'safe') {
      safeZones.push({
        startTime: 0,
        endTime: dialogue.duration,
        confidence: 0.8
      });
    } 
    // If neutral, create semi-safe zones with gaps
    else if (dialogue.safetyStatus === 'neutral') {
      // Create alternating safe zones (speaking) and dangerous zones (pauses)
      const segments = 4; // Number of segments to divide the dialogue into
      const segmentDuration = dialogue.duration / segments;
      
      for (let i = 0; i < segments; i++) {
        // Only even segments are safe (simulating speech pattern)
        if (i % 2 === 0) {
          safeZones.push({
            startTime: i * segmentDuration,
            endTime: (i + 0.8) * segmentDuration, // Leave a small gap between segments
            confidence: 0.6
          });
        }
      }
    }
    // If danger, create very few, short safe zones
    else if (dialogue.safetyStatus === 'danger') {
      // Create just one short safe zone in the middle
      const middleStart = dialogue.duration * 0.4;
      safeZones.push({
        startTime: middleStart,
        endTime: middleStart + (dialogue.duration * 0.2),
        confidence: 0.4
      });
    }
    
    // Store in cache
    if (dialogue.soundFile) {
      this.safeZonesCache.set(dialogue.soundFile, safeZones);
    }
  }
  
  /**
   * Generate safe zones from speech marks
   * @param speechMarks The speech marks to process
   * @param totalDuration Total duration of the dialogue in milliseconds
   * @returns Array of safe zones
   */
  private generateSafeZones(speechMarks: SpeechMark[], totalDuration: number): SafeZone[] {
    const safeZones: SafeZone[] = [];
    
    // Filter to only get word marks (most useful for rhythm)
    const wordMarks = speechMarks.filter(mark => mark.type === 'word');
    
    if (wordMarks.length === 0) {
      return safeZones;
    }
    
    // Process each word mark to create speech segments
    const segments: SpeechSegment[] = [];
    
    for (let i = 0; i < wordMarks.length; i++) {
      const currentMark = wordMarks[i];
      const nextMark = wordMarks[i + 1];
      
      // Calculate end time (either next word start time or estimated)
      const estimatedWordDuration = currentMark.value.length * 75; // ~75ms per character as estimate
      const endTime = nextMark 
        ? nextMark.time 
        : Math.min(currentMark.time + estimatedWordDuration, totalDuration);
      
      segments.push({
        word: currentMark.value,
        startTime: currentMark.time,
        endTime,
        isSafe: true
      });
      
      // If there's a significant gap before the next word, add it as a pause segment
      if (nextMark && (nextMark.time - endTime) > 200) { // 200ms threshold for a pause
        segments.push({
          word: '',
          startTime: endTime,
          endTime: nextMark.time,
          isSafe: false
        });
      }
    }
    
    // Merge consecutive safe segments into safe zones
    let currentSafeZone: SafeZone | null = null;
    
    for (const segment of segments) {
      if (segment.isSafe) {
        // Start a new safe zone or extend the current one
        if (!currentSafeZone) {
          currentSafeZone = {
            startTime: segment.startTime,
            endTime: segment.endTime,
            confidence: this.calculateConfidence(segment)
          };
        } else {
          currentSafeZone.endTime = segment.endTime;
          // Average the confidence
          currentSafeZone.confidence = (currentSafeZone.confidence + this.calculateConfidence(segment)) / 2;
        }
      } else if (currentSafeZone) {
        // End the current safe zone
        safeZones.push(currentSafeZone);
        currentSafeZone = null;
      }
    }
    
    // Add the last safe zone if there is one
    if (currentSafeZone) {
      safeZones.push(currentSafeZone);
    }
    
    return safeZones;
  }
  
  /**
   * Calculate confidence level for a speech segment
   */
  private calculateConfidence(segment: SpeechSegment): number {
    // Longer words tend to be more reliable for masking sounds
    const duration = segment.endTime - segment.startTime;
    
    // Words shorter than 100ms are not very reliable
    if (duration < 100) {
      return 0.3;
    }
    // Words between 100-300ms are moderately reliable
    if (duration < 300) {
      return 0.6;
    }
    // Words longer than 300ms are very reliable
    return 0.9;
  }
  
  /**
   * Get safe zones for a dialogue
   * @param dialogue The dialogue to get safe zones for
   * @returns Array of safe zones, or empty array if none
   */
  public getSafeZones(dialogue: Dialogue): SafeZone[] {
    if (!dialogue.soundFile || !this.safeZonesCache.has(dialogue.soundFile)) {
      // Create fallback safe zones if none exist
      this.createFallbackSafeZones(dialogue);
    }
    
    return dialogue.soundFile ? (this.safeZonesCache.get(dialogue.soundFile) || []) : [];
  }
  
  /**
   * Determine safety status at a specific time in the dialogue
   * @param dialogue The dialogue to check
   * @param currentTime Current time in milliseconds since dialogue started
   * @returns Safety status: 'safe', 'neutral', or 'danger'
   */
  public getSafetyStatusAtTime(dialogue: Dialogue, currentTime: number): 'safe' | 'neutral' | 'danger' {
    const safeZones = this.getSafeZones(dialogue);
    
    // Check if current time is in any safe zone
    for (const zone of safeZones) {
      if (currentTime >= zone.startTime && currentTime <= zone.endTime) {
        // Determine safety level based on confidence
        if (zone.confidence > 0.7) {
          return 'safe';
        } else {
          return 'neutral';
        }
      }
    }
    
    // Not in any safe zone = danger
    return 'danger';
  }
  
  /**
   * Convert safe zones to pressure meter format
   * @param dialogue The dialogue to get safe zones for
   * @param relativeTo Current time to make zones relative to
   * @returns Safe zones in pressure meter format (0-100 scale)
   */
  public getSafeZonesForMeter(dialogue: Dialogue, relativeTo: number = 0): Array<{ start: number; end: number }> {
    const safeZones = this.getSafeZones(dialogue);
    
    // Convert to 0-100 scale for pressure meter
    return safeZones
      .filter(zone => zone.endTime > relativeTo) // Only include future zones
      .map(zone => ({
        start: Math.max(20, 40 + ((zone.startTime - relativeTo) / 1000) * 20), // Scale and offset
        end: Math.min(95, 40 + ((zone.endTime - relativeTo) / 1000) * 20) // Scale and offset
      }))
      .filter(zone => zone.end > zone.start); // Ensure valid zones
  }
  
  /**
   * Preload all speech marks for a set of dialogues
   * @param dialogues The dialogues to preload speech marks for
   * @returns Promise that resolves when all loading is complete
   */
  public async preloadSpeechMarks(dialogues: Dialogue[]): Promise<void> {
    const loadingPromises = dialogues
      .filter(dialogue => dialogue.soundFile)
      .map(dialogue => this.loadSpeechMarks(dialogue));
    
    await Promise.all(loadingPromises);
  }
}
