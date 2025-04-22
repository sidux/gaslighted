import { SafeZone, SpeechMark, SpeechSegment, VisemeType } from '../types/speech/SpeechMark';
import { Viseme, VisemeData, visemeTypeToViseme, getKeyForViseme } from '../types/speech/Viseme';
import { Dialogue } from '../types/Dialogue';
import { GameConfig } from '../config/GameConfig';

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
    
    // Default viseme types to use for fallback
    const defaultVisemes = [
      VisemeType.A, 
      VisemeType.E, 
      VisemeType.I, 
      VisemeType.O, 
      VisemeType.U
    ];
    
    // If manually marked as safe, create a safe zone for the entire dialogue
    if (dialogue.safetyStatus === 'safe') {
      // Use a random vowel viseme for the full duration
      const randomViseme = defaultVisemes[Math.floor(Math.random() * defaultVisemes.length)];
      safeZones.push({
        startTime: 0,
        endTime: dialogue.duration,
        confidence: 0.8,
        visemeType: randomViseme,
        keyToPress: randomViseme.toUpperCase()
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
          // Use a different vowel for each segment
          const visemeIndex = i % defaultVisemes.length;
          const visemeType = defaultVisemes[visemeIndex];
          safeZones.push({
            startTime: i * segmentDuration,
            endTime: (i + 0.8) * segmentDuration, // Leave a small gap between segments
            confidence: 0.6,
            visemeType: visemeType,
            keyToPress: visemeType.toUpperCase()
          });
        }
      }
    }
    // If danger, create very few, short safe zones
    else if (dialogue.safetyStatus === 'danger') {
      // Create just one short safe zone in the middle
      const middleStart = dialogue.duration * 0.4;
      // Use a consonant viseme (harder to time)
      const visemeType = VisemeType.T;
      safeZones.push({
        startTime: middleStart,
        endTime: middleStart + (dialogue.duration * 0.2),
        confidence: 0.4,
        visemeType: visemeType,
        keyToPress: visemeType.toUpperCase()
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
    
    // Filter to get both word and viseme marks (most useful for rhythm)
    const wordMarks = speechMarks.filter(mark => mark.type === 'word');
    const visemeMarks = speechMarks.filter(mark => mark.type === 'viseme');
    
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
    
    // Extract viseme information directly from viseme marks, not tied to words
    // This creates a more steady flow based on actual phonetic components
    
    // Get difficulty settings from GameConfig
    const difficulty = 1; // Default to easy (can be passed in as parameter)
    const difficultySettings = GameConfig.DIFFICULTY_MODIFIER[difficulty];
    
    // Difficulty-based parameters
    const samplingRate = difficultySettings.visemeSamplingRate;
    const minTimeBetweenVisemes = difficultySettings.minTimeBetweenVisemes;
    
    // First, collect all potential viseme zones
    const potentialZones = [];
    
    // Process all viseme marks directly instead of going word by word
    if (visemeMarks.length > 0) {
      // Sort visemes by time
      const sortedVisemes = [...visemeMarks].sort((a, b) => a.time - b.time);
      
      // Track viseme count for consistent sampling
      let visemeCount = 0;
      
      // Process each viseme
      for (let i = 0; i < sortedVisemes.length; i++) {
        const currentViseme = sortedVisemes[i];
        visemeCount++;
        
        // Sample visemes based on count rather than random chance
        // This ensures a steady, predictable flow
        if (visemeCount % Math.floor(1/samplingRate) !== 0) {
          continue; // Skip this viseme based on sampling rate
        }
        
        // Check if this viseme falls within a speech segment (actual word)
        const speechSegment = segments.find(seg => 
          currentViseme.time >= seg.startTime && 
          currentViseme.time <= seg.endTime &&
          seg.isSafe
        );
        
        // Skip if not part of a spoken word
        if (!speechSegment) continue;
        
        // Calculate viseme duration
        const nextViseme = sortedVisemes.find(v => v.time > currentViseme.time);
          
        // Make duration longer for easier timing
        const visemeDuration = nextViseme 
          ? (nextViseme.time - currentViseme.time) * 1.5  // 50% longer for easier timing
          : 400; // Default duration of 400ms
        
        // Determine the viseme type - limit to just a few keys for simplicity
        // We'll use only A, E, I, O, U to make it easier to remember
        const visemeValue = currentViseme.value.toLowerCase();
        
        // Map all possible visemes to just 5 vowels for simplicity
        let visemeType: VisemeType;
        switch (visemeValue.charAt(0)) {
          case 'a': 
          case 'æ': 
            visemeType = VisemeType.A;
            break;
          case 'e': 
          case 'ɛ': 
          case 'ə': 
            visemeType = VisemeType.E;
            break;
          case 'i': 
          case 'ɪ': 
            visemeType = VisemeType.I;
            break;
          case 'o': 
          case 'ɔ': 
          case 'ʊ': 
            visemeType = VisemeType.O;
            break;
          case 'u':
          case 'ʌ':
            visemeType = VisemeType.U;
            break;
          default:
            // For consonants, just pick a vowel based on position in sequence
            // This creates a more predictable pattern rather than random
            const vowels = [VisemeType.A, VisemeType.E, VisemeType.I, VisemeType.O, VisemeType.U];
            visemeType = vowels[visemeCount % 5];
        }
        
        // Add to potential zones
        potentialZones.push({
          startTime: currentViseme.time - 150, // Start 150ms earlier
          endTime: currentViseme.time + visemeDuration + 150, // End 150ms later
          confidence: 0.8, // Higher confidence for easier gameplay
          visemeType: visemeType,
          keyToPress: visemeType.toUpperCase(),
          originalTime: currentViseme.time // Keep track of original time for sorting
        });
      }
    } else {
      // If no viseme marks available, fallback to word-based sampling
      // but still make it more evenly distributed
      
      // Count safe speech segments with words
      const safeWordSegments = segments.filter(seg => seg.isSafe && seg.word.length > 0);
      
      // Calculate how many segments to include based on sampling rate
      const segmentsToInclude = Math.ceil(safeWordSegments.length * samplingRate);
      
      // Spread these evenly through the speech
      if (segmentsToInclude > 0 && safeWordSegments.length > 0) {
        const step = Math.max(1, Math.floor(safeWordSegments.length / segmentsToInclude));
        
        for (let i = 0; i < safeWordSegments.length; i += step) {
          const segment = safeWordSegments[i];
          
          // Use a vowel based on position for consistency
          const vowels = [VisemeType.A, VisemeType.E, VisemeType.I, VisemeType.O, VisemeType.U];
          const visemeType = vowels[i % 5];
          
          // Add to potential zones
          potentialZones.push({
            startTime: segment.startTime - 150, // Start 150ms earlier
            endTime: segment.endTime + 150, // End 150ms later  
            confidence: 0.8, // Higher confidence for easier gameplay
            visemeType: visemeType, 
            keyToPress: visemeType.toUpperCase(),
            originalTime: segment.startTime // Keep track of original time for sorting
          });
        }
      }
    }
    
    // Sort potential zones by their original timing
    potentialZones.sort((a, b) => a.originalTime - b.originalTime);
    
    // Now filter to ensure minimum spacing between safe zones
    let lastEndTime = 0;
    
    for (const zone of potentialZones) {
      // Significantly increase minimum spacing to prevent overlapping notes
      // Only add if there's enough spacing from previous zone
      if (zone.startTime - lastEndTime >= minTimeBetweenVisemes * 2) { // Double the minimum time between visemes
        // Create a copy without the originalTime property
        const safeZone: SafeZone = {
          startTime: zone.startTime,
          endTime: zone.endTime,
          confidence: zone.confidence,
          visemeType: zone.visemeType,
          keyToPress: zone.keyToPress
        };
        
        safeZones.push(safeZone);
        lastEndTime = zone.endTime;
      }
    }
    
    // Merge overlapping safe zones with the same viseme type
    // This further reduces the number of notes falling
    const mergedZones: SafeZone[] = [];
    const sortedZones = [...safeZones].sort((a, b) => a.startTime - b.startTime);
    
    let currentZone: SafeZone | null = null;
    
    for (const zone of sortedZones) {
      if (!currentZone) {
        currentZone = zone;
      } else if (currentZone.visemeType === zone.visemeType && zone.startTime <= currentZone.endTime) {
        // Merge zones if they're the same type and overlap
        currentZone.endTime = Math.max(currentZone.endTime, zone.endTime);
      } else {
        // Add the current zone and start a new one
        mergedZones.push(currentZone);
        currentZone = zone;
      }
    }
    
    // Add the last zone
    if (currentZone) {
      mergedZones.push(currentZone);
    }
    
    return mergedZones;
    
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
   * Extract viseme data from safe zones for RhythmUI
   * @param dialogue The dialogue to extract visemes from
   * @returns Array of VisemeData objects
   */
  public getVisemeData(dialogue: Dialogue): VisemeData[] {
    // Get safe zones for this dialogue
    const safeZones = this.getSafeZones(dialogue);
    
    // Convert to VisemeData format
    return safeZones.map(zone => ({
      viseme: visemeTypeToViseme(zone.visemeType),
      startTime: zone.startTime,
      endTime: zone.endTime,
      duration: zone.endTime - zone.startTime,
      keyToPress: zone.keyToPress,
      intensity: zone.confidence
    }));
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
