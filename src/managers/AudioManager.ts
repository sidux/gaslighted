import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class AudioManager {
  private scene: Phaser.Scene;
  private fartSounds: Phaser.Sound.BaseSound[] = [];
  private speechSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private audioMappings: Map<string, any> = new Map();
  private loadedAudioFiles: Set<string> = new Set();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initAudio();
  }
  
  public playFartSound(intensity: number, isAuto: boolean = false): void {
    // Play fart sound based on intensity
    // For now we have just one fart sound, but this could be expanded
    const fartSound = this.scene.sound.add('fart');
    
    // Adjust volume based on intensity (higher intensity = louder)
    const volume = isAuto ? 1.0 : Math.min(0.4 + (intensity / 100) * 0.6, 1.0);
    
    fartSound.play({
      volume
    });
  }
  
  public async playVoice(text: string, voiceType: string, speakerId: string = "unknown"): Promise<void> {
    try {
      // First, try to find a pre-generated audio file for this text
      const audioFile = this.findAudioFile(text);
      
      if (audioFile) {
        // We found a pre-generated audio file
        console.log(`Playing pre-generated audio for: "${text.substring(0, 30)}..."`);
        
        // Check if this audio file is already loaded
        if (!this.loadedAudioFiles.has(audioFile)) {
          // Load the audio file if not already loaded
          this.scene.load.audio(audioFile, `audio/dialogue/${audioFile}`);
          // Wait for loading to complete
          await new Promise<void>((resolve) => {
            this.scene.load.once('complete', () => resolve());
            this.scene.load.start();
          });
          this.loadedAudioFiles.add(audioFile);
        }
        
        // Play the audio
        const sound = this.scene.sound.add(audioFile);
        sound.play();
        return;
      }
      
      // If no pre-generated audio found, fallback to placeholder method
      console.log(`No pre-generated audio found for: "${text.substring(0, 30)}..." (${speakerId}, ${voiceType})`);
      
      // In a production environment, you might want to:
      // 1. Generate the audio on-the-fly (but this requires server-side support)
      // 2. Play a placeholder sound
      // 3. Show a visual indicator that the character is speaking
      
      // For now, we'll just log to console
      console.log(`Character ${speakerId} says: "${text}" (Voice: ${voiceType})`);
    } catch (error) {
      console.error('Error playing voice:', error);
    }
  }
  
  private findAudioFile(text: string): string | null {
    // Check each mapping file to find the audio for this text
    for (const [levelName, mapping] of this.audioMappings.entries()) {
      if (mapping[text]) {
        return mapping[text];
      }
    }
    
    // Check if text needs corporate jargon template processing
    if (text.includes('{{')) {
      // For template text, we'll need a different approach
      // This is a simplification - in a real scenario, you'd need to match patterns
      console.log('Text contains templates, cannot find exact match');
    }
    
    return null;
  }
  
  private async initAudio(): Promise<void> {
    // Load audio mapping files
    try {
      // Load all JSON mapping files from the audio/dialogue directory
      const mappingFiles = await this.getAudioMappingFiles();
      
      for (const file of mappingFiles) {
        const levelName = file.replace('_mapping.json', '');
        this.scene.load.json(file, `audio/dialogue/${file}`);
        
        // Wait for loading to complete
        const loadPromise = new Promise<void>((resolve) => {
          this.scene.load.once('complete', () => {
            // Store the mapping in our cache
            const mapping = this.scene.cache.json.get(file);
            this.audioMappings.set(levelName, mapping);
            resolve();
          });
          this.scene.load.start();
        });
        
        await loadPromise;
      }
      
      console.log(`Loaded ${this.audioMappings.size} audio mapping files`);
    } catch (error) {
      console.error('Error loading audio mappings:', error);
    }
  }
  
  private async getAudioMappingFiles(): Promise<string[]> {
    // In a real scenario, you would dynamically discover these files
    // For simplicity, we'll hardcode the level1 mapping file
    return ['level1_mapping.json'];
  }
  
  // Additional methods for managing and controlling audio
  public stopAllSounds(): void {
    this.scene.sound.stopAll();
  }
}
