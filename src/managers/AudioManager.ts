import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class AudioManager {
  private scene: Phaser.Scene;
  private fartSounds: Phaser.Sound.BaseSound[] = [];
  private speechSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  
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
  
  public async playVoice(text: string, voiceType: string): Promise<void> {
    try {
      // Map the voice type to the ReadLoud API voice names
      const apiVoice = GameConfig.VOICE_MAPPINGS[voiceType] || voiceType;
      
      // Create a unique key for this text/voice combination
      const key = `${apiVoice}-${this.hashText(text)}`;
      
      // Check if we already have this cached
      if (this.audioCache.has(key)) {
        const audio = this.audioCache.get(key);
        if (audio) {
          // Restart audio playback
          audio.currentTime = 0;
          audio.play().catch(e => console.error('Error playing cached audio:', e));
        }
        return;
      }
      
      // Generate TTS URL
      const ttsUrl = this.generateTTS(text, apiVoice);
      
      console.log(`TTS URL: ${ttsUrl}`);
      
      // For development purposes, we'll fall back to a basic console log
      // since the actual TTS might not work in all environments
      console.log(`Speaking with ${apiVoice}: "${text}"`);
      
      // In production, this would be uncommented:
      /*
      // Create an HTML audio element to play the TTS
      const audio = new Audio();
      audio.crossOrigin = "anonymous"; // Important for CORS
      audio.src = ttsUrl;
      
      // Add to cache
      this.audioCache.set(key, audio);
      
      // Play the audio (don't await, let it play asynchronously)
      audio.play().catch(e => {
        console.error('Error playing TTS:', e);
      });
      */
    } catch (error) {
      console.error('Error playing TTS:', error);
      
      // As a fallback, just log what would have been said
      console.log(`TTS (fallback): [${voiceType}] "${text}"`);
    }
  }
  
  // Simple hash function for creating cache keys
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
  
  private initAudio(): void {
    // Initialize any audio resources needed
    // In a real implementation, fart sounds would be loaded during the preload phase
  }
  
  // Additional methods for managing and controlling audio
  public stopAllSounds(): void {
    this.scene.sound.stopAll();
    
    // Also stop any HTML audio elements
    this.audioCache.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
  
  public generateTTS(text: string, voiceType: string): string {
    // Ensure text is properly encoded for URL
    const encodedText = encodeURIComponent(text);
    
    // ReadLoud.net specific URL format
    // Example format: https://readloud.net/speech.php?q=Hello+world&voice=Brian
    return `${GameConfig.SPEECH_API_URL}speech.php?q=${encodedText}&voice=${voiceType}`;
  }
}
