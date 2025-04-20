import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class AudioManager {
  private scene: Phaser.Scene;
  private fartSounds: Phaser.Sound.BaseSound[] = [];
  private speechSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  
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
    // In a real implementation, this would make API calls to the TTS service
    // For now, we'll just simulate it with a dummy sound
    
    // Check if we've already synthesized this text/voice combination
    const key = `${voiceType}-${text.substring(0, 20)}`;
    
    if (this.speechSounds.has(key)) {
      // Reuse existing audio
      const sound = this.speechSounds.get(key);
      if (sound) {
        sound.play();
      }
    } else {
      // In a real implementation, this would call the TTS API
      // For now, we'll simulate it
      console.log(`[TTS] Playing "${text}" with voice ${voiceType}`);
      
      // In a real implementation, we would load the resulting audio file
      // and play it. For now, we'll just log it.
    }
  }
  
  private initAudio(): void {
    // Initialize any audio resources needed
    // In a real implementation, fart sounds would be loaded during the preload phase
  }
  
  // Additional methods for managing and controlling audio
  public stopAllSounds(): void {
    this.scene.sound.stopAll();
  }
  
  public generateTTS(text: string, voiceType: string): string {
    // In a real implementation, this would generate a URL or request to the TTS service
    return `${GameConfig.SPEECH_API_URL}?text=${encodeURIComponent(text)}&voice=${voiceType}`;
  }
}
