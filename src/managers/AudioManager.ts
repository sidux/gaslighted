import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Dialogue } from '../types/Dialogue';
import { VisemeType } from '../types/speech/SpeechMark';

export class AudioManager {
  private scene: Phaser.Scene;
  private fartSounds: Phaser.Sound.BaseSound[] = [];
  private speechSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private loadedAudioFiles: Set<string> = new Set();
  
  // Keep track of currently playing speech sounds
  private activeSpeechSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  
  // Track sound playback state
  private playingDialogue: string | null = null;
  private isPlayingAny: boolean = false;
  
  // Singleton pattern
  private static instance: AudioManager | null = null;
  
  constructor(scene: Phaser.Scene) {
    // Singleton implementation
    if (AudioManager.instance) {
      console.warn("AudioManager already exists - returning existing instance");
      return AudioManager.instance;
    }
    
    AudioManager.instance = this;
    this.scene = scene;
    console.log("AudioManager initialized");
  }
  
  public playFartSound(intensity: number, isAuto: boolean = false, visemeType: VisemeType = VisemeType.NONE): void {
    // Play fart sound based on intensity and viseme type
    
    // Select sound key based on viseme type (vowel/consonant) and intensity
    let soundKey = 'fart'; // Default sound
    let soundVariation = '';
    
    // Different variations based on viseme type
    switch (visemeType) {
      case VisemeType.A:
        soundVariation = '-low'; // Low, deep fart
        break;
      case VisemeType.E:
        soundVariation = '-short'; // Short, quick fart
        break;
      case VisemeType.I:
        soundVariation = '-high'; // High-pitched fart
        break;
      case VisemeType.O:
        soundVariation = '-long'; // Long, sustained fart
        break;
      case VisemeType.U:
        soundVariation = '-bubbles'; // Bubbly fart
        break;
        
      // Consonants
      case VisemeType.P:
        soundVariation = '-puff'; // Puff-like fart
        break;
      case VisemeType.T:
        soundVariation = '-staccato'; // Short, staccato fart
        break;
      case VisemeType.S:
        soundVariation = '-hiss'; // Hissing fart
        break;
    }
    
    // Try to use the variant sound if available, fallback to default
    const variantKey = soundKey + soundVariation;
    if (this.scene.sound.get(variantKey)) {
      soundKey = variantKey;
    }
    
    // Adjust volume based on intensity and safety status
    // Higher intensity = louder
    const volume = isAuto ? 1.0 : Math.min(0.4 + (intensity / 100) * 0.6, 1.0);
    
    // Adjust playback rate for variety based on intensity
    // Lower intensities = higher pitch (subtle sound)
    // Higher intensities = lower pitch (deeper sound)
    const rate = isAuto ? 0.8 : Math.max(1.2 - (intensity / 100) * 0.4, 0.8);
    
    // Create the sound
    const fartSound = this.scene.sound.add(soundKey);
    
    // Play with custom settings
    fartSound.play({
      volume,
      rate,
      detune: Math.random() * 300 - 150 // Add slight randomness to pitch (-150 to +150 cents)
    });
  }
  
  public async playVoice(dialogue: Dialogue): Promise<void> {
    // Only allow one voice to play at a time
    if (this.isPlayingAny) {
      console.warn(`Another dialogue is already playing - stopping it first`);
      this.stopAllSpeechSounds();
    }
    
    // Set playing flags
    this.isPlayingAny = true;
    
    try {
      console.log(`Attempting to play voice for speaker: ${dialogue.speakerId}`);
      
      // Check if this dialogue has a sound file specified
      if (!dialogue.soundFile) {
        console.warn(`No audio file specified for: "${dialogue.text.substring(0, 30)}..." (${dialogue.speakerId})`);
        // Mark as not playing
        this.isPlayingAny = false;
        this.playingDialogue = null;
        return;
      }
      
      // Set current playing dialogue
      this.playingDialogue = dialogue.soundFile;
      
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
          const completeListener = () => {
            console.log(`Successfully loaded: ${dialogue.soundFile}`);
            this.scene.load.off('complete', completeListener);
            this.scene.load.off('loaderror', errorListener);
            resolve();
          };
          
          const errorListener = (file: any) => {
            console.error(`Failed to load audio file: ${file.src}`);
            this.scene.load.off('complete', completeListener);
            this.scene.load.off('loaderror', errorListener);
            this.isPlayingAny = false;
            this.playingDialogue = null;
            reject(new Error(`Failed to load audio file: ${file.src}`));
          };
          
          this.scene.load.once('complete', completeListener);
          this.scene.load.once('loaderror', errorListener);
          this.scene.load.start();
        });
        this.loadedAudioFiles.add(dialogue.soundFile);
      } else {
        console.log(`Audio file ${dialogue.soundFile} already loaded, reusing`);
      }
      
      // Double-check we're still supposed to play this sound
      if (this.playingDialogue !== dialogue.soundFile) {
        console.log(`Dialogue changed during loading, not playing ${dialogue.soundFile}`);
        return;
      }
      
      // Play the audio - but first remove any existing instances
      const soundKey = dialogue.soundFile;
      
      // Clean up old sound object if it exists
      if (this.speechSounds.has(soundKey)) {
        const existingSound = this.speechSounds.get(soundKey)!;
        existingSound.removeAllListeners();
        if (existingSound.isPlaying) {
          existingSound.stop();
        }
        this.speechSounds.delete(soundKey);
      }
      
      console.log(`Creating fresh sound instance for: ${soundKey}`);
      
      // Create a new sound instance
      const sound = this.scene.sound.add(soundKey, {
        volume: 1.0,
        loop: false
      });
      
      // Store for tracking
      this.speechSounds.set(soundKey, sound);
      this.activeSpeechSounds.set(soundKey, sound);
      
      // Set up event handlers with strong error handling
      const onPlay = () => {
        console.log(`Sound ${soundKey} started playing`);
      };
      
      const onComplete = () => {
        console.log(`Sound ${soundKey} finished playing`);
        this.activeSpeechSounds.delete(soundKey);
        sound.removeAllListeners();
        
        // Only clear playing flags if this is still the current dialogue
        if (this.playingDialogue === soundKey) {
          this.isPlayingAny = false;
          this.playingDialogue = null;
        }
      };
      
      const onError = (error: any) => {
        console.error(`Error playing sound ${soundKey}:`, error);
        this.activeSpeechSounds.delete(soundKey);
        sound.removeAllListeners();
        this.isPlayingAny = false;
        this.playingDialogue = null;
      };
      
      // Add event listeners
      sound.once('play', onPlay);
      sound.once('complete', onComplete);
      sound.once('loaderror', onError);
      
      // Play the sound with a short timeout to ensure event listeners are ready
      setTimeout(() => {
        if (this.playingDialogue === soundKey) {
          console.log(`Actually playing sound: ${soundKey}`);
          sound.play();
        } else {
          console.log(`Dialogue changed, not playing: ${soundKey}`);
          sound.removeAllListeners();
          this.speechSounds.delete(soundKey);
          this.activeSpeechSounds.delete(soundKey);
        }
      }, 10);
      
    } catch (error) {
      console.error('Error playing voice:', error);
      // Reset playing state
      this.isPlayingAny = false;
      this.playingDialogue = null;
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
  
  /**
   * Stop all currently playing speech sounds
   */
  public stopAllSpeechSounds(): void {
    console.log("Stopping all speech sounds");
    
    // Stop all active speech sounds
    this.activeSpeechSounds.forEach((sound, key) => {
      try {
        console.log(`Stopping sound: ${key}`);
        sound.removeAllListeners();
        if (sound.isPlaying) {
          sound.stop();
        }
      } catch (e: any) {
        console.error(`Error stopping sound ${key}:`, e);
      }
    });
    
    // Clear the active sounds map
    this.activeSpeechSounds.clear();
    
    // Reset state
    this.isPlayingAny = false;
    this.playingDialogue = null;
    
    console.log("All speech sounds stopped");
  }
  
  // Additional methods for managing and controlling audio
  public stopAllSounds(): void {
    console.log("Stopping ALL audio");
    
    try {
      // First do our own cleanup
      this.stopAllSpeechSounds();
      
      // Stop all sounds including speech
      this.scene.sound.stopAll();
      
      // Clear our tracking maps
      this.speechSounds.clear();
      this.activeSpeechSounds.clear();
      
      // Reset state
      this.isPlayingAny = false;
      this.playingDialogue = null;
    } catch (e: any) {
      console.error("Error stopping all sounds:", e);
    }
    
    console.log("All audio stopped");
  }
}
