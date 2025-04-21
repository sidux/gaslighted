import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Dialogue } from '../types/Dialogue';

export class AudioManager {
  private scene: Phaser.Scene;
  private fartSounds: Phaser.Sound.BaseSound[] = [];
  private speechSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private loadedAudioFiles: Set<string> = new Set();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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
  
  public async playVoice(dialogue: Dialogue): Promise<void> {
    try {
      console.log(`Attempting to play voice for speaker: ${dialogue.speakerId}`);
      
      // Check if this dialogue has a sound file specified
      if (dialogue.soundFile) {
        console.log(`Found soundFile: ${dialogue.soundFile} for text: "${dialogue.text.substring(0, 30)}..."`);
        
        // Construct the full path to the audio file
        const audioPath = `audio/dialogue/${dialogue.soundFile}`;
        console.log(`Full audio path: ${audioPath}`);
        
        // Check if this audio file is already loaded
        if (!this.loadedAudioFiles.has(dialogue.soundFile)) {
          console.log(`Loading audio file: ${dialogue.soundFile}`);
          // Load the audio file if not already loaded
          this.scene.load.audio(dialogue.soundFile, audioPath);
          // Wait for loading to complete
          await new Promise<void>((resolve, reject) => {
            this.scene.load.once('complete', () => {
              console.log(`Successfully loaded: ${dialogue.soundFile}`);
              resolve();
            });
            this.scene.load.once('loaderror', (file: any) => {
              console.error(`Failed to load audio file: ${file.src}`);
              reject(new Error(`Failed to load audio file: ${file.src}`));
            });
            this.scene.load.start();
          });
          this.loadedAudioFiles.add(dialogue.soundFile);
        } else {
          console.log(`Audio file ${dialogue.soundFile} already loaded, reusing`);
        }
        
        // Play the audio
        console.log(`Playing audio file: ${dialogue.soundFile}`);
        const sound = this.scene.sound.add(dialogue.soundFile);
        sound.once('play', () => {
          console.log(`Sound ${dialogue.soundFile} started playing`);
        });
        sound.once('complete', () => {
          console.log(`Sound ${dialogue.soundFile} finished playing`);
        });
        sound.once('loaderror', (error: any) => {
          console.error(`Error playing sound ${dialogue.soundFile}:`, error);
        });
        sound.play();
        return;
      }
      
      // If no sound file specified, fallback to placeholder method
      console.warn(`No audio file specified for: "${dialogue.text.substring(0, 30)}..." (${dialogue.speakerId})`);
      
      // In a production environment, you might want to:
      // 1. Generate the audio on-the-fly (but this requires server-side support)
      // 2. Play a placeholder sound
      // 3. Show a visual indicator that the character is speaking
      
      // For now, we'll just log to console
      console.log(`Character ${dialogue.speakerId} says: "${dialogue.text}"`);
    } catch (error) {
      console.error('Error playing voice:', error);
      console.error(error); // Log the full error object for more details
    }
  }
  
  // Additional method to preload all dialogue audio files for a level
  public async preloadLevelAudio(dialogues: Dialogue[]): Promise<void> {
    try {
      console.log("Starting to preload level audio files");
      
      // Get all unique sound files from dialogues
      const soundFiles = new Set<string>();
      dialogues.forEach(dialogue => {
        if (dialogue.soundFile) {
          soundFiles.add(dialogue.soundFile);
          console.log(`Found sound file to preload: ${dialogue.soundFile} for speaker: ${dialogue.speakerId}`);
        } else {
          console.warn(`No sound file for dialogue: "${dialogue.text.substring(0, 30)}..." (${dialogue.speakerId})`);
        }
      });
      
      console.log(`Found ${soundFiles.size} unique sound files to preload`);
      
      // Preload all sound files
      let filesToLoad = 0;
      for (const file of soundFiles) {
        if (!this.loadedAudioFiles.has(file)) {
          const audioPath = `audio/dialogue/${file}`;
          console.log(`Queuing file for preload: ${file} at path: ${audioPath}`);
          this.scene.load.audio(file, audioPath);
          this.loadedAudioFiles.add(file);
          filesToLoad++;
        } else {
          console.log(`File already loaded, skipping: ${file}`);
        }
      }
      
      // Start loading if there are any files to load
      if (filesToLoad > 0) {
        console.log(`Starting load of ${filesToLoad} new audio files`);
        
        await new Promise<void>((resolve, reject) => {
          this.scene.load.once('complete', () => {
            console.log(`Successfully preloaded ${filesToLoad} audio files`);
            resolve();
          });
          
          this.scene.load.once('loaderror', (file: any) => {
            console.error(`Failed to preload audio file: ${file.src}`);
            reject(new Error(`Failed to preload audio file: ${file.src}`));
          });
          
          this.scene.load.start();
        });
        
        console.log(`Completed preloading ${filesToLoad} audio files for the level`);
      } else {
        console.log("No new audio files to preload");
      }
    } catch (error) {
      console.error('Error preloading level audio:', error);
      console.error(error); // Log the full error object
      throw error; // Re-throw to be caught by the caller
    }
  }
  
  // Additional methods for managing and controlling audio
  public stopAllSounds(): void {
    this.scene.sound.stopAll();
  }
}
