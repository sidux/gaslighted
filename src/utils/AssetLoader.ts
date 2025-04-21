import Phaser from 'phaser';

export class AssetLoader {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  public loadFaces(): void {
    // Player faces (SVG)
    this.scene.load.image('player-normal', 'faces/player-normal.svg');
    this.scene.load.image('player-uncomfortable', 'faces/player-uncomfortable.svg');
    this.scene.load.image('player-sweating', 'faces/player-sweating.svg');
    this.scene.load.image('player-struggling', 'faces/player-struggling.svg');
    this.scene.load.image('player-critical', 'faces/player-critical.svg');
    this.scene.load.image('player-farting', 'faces/player-farting.svg');
    
    // New Boomer face assets (PNG)
    this.scene.load.image('boomer-neutral', 'faces/boomer-neutral.png');
    this.scene.load.image('boomer-mad', 'faces/boomer-mad.png');
    this.scene.load.image('boomer-shock', 'faces/boomer-shock.png');
    this.scene.load.image('boomer-talking', 'faces/boomer-talking.png');
    this.scene.load.image('boomer-talking2', 'faces/boomer-talking2.png');
    
    // New Zoomer face assets (PNG)
    this.scene.load.image('zoomer-neutral', 'faces/zoomer-neutral.png');
    this.scene.load.image('zoomer-laughing', 'faces/zoomer-laughing.png');
    this.scene.load.image('zoomer-shock', 'faces/zoomer-shock.png');
    this.scene.load.image('zoomer-talking', 'faces/zoomer-talking.png');
    this.scene.load.image('zoomer-talking2', 'faces/zoomer-talking2.png');
    
    // Legacy faces (SVG)
    this.scene.load.image('coworker1-normal', 'faces/coworker1-normal.svg');
    this.scene.load.image('coworker1-laughing', 'faces/coworker1-laughing.svg');
    this.scene.load.image('coworker1-shocked', 'faces/coworker1-shocked.svg');
    this.scene.load.image('coworker1-smirk', 'faces/coworker1-smirk.svg');
  }
  
  public loadAudio(): void {
    // Load audio files
    this.scene.load.audio('fart', 'audio/fart.mp3');
    
    // Other sounds would be loaded here
  }
  
  public loadImages(): void {
    // Load UI and background images
    // Would load images from the images directory
    
    // For loading assets, create the directory if it doesn't exist
    try {
      this.scene.load.image('logo', 'images/logo.png');
      this.scene.load.image('loading-bar', 'images/loading-bar.png');
    } catch (e) {
      console.warn('Some images failed to load. This is expected in development.');
    }
  }
  
  public loadLevels(): void {
    // In a real implementation, this would load YAML level definitions
    // For now, the levels are defined in code in the LevelManager
  }
}
