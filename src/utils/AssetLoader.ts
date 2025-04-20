import Phaser from 'phaser';

export class AssetLoader {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  public loadFaces(): void {
    // Player faces
    this.scene.load.image('player-normal', 'faces/player-normal.svg');
    this.scene.load.image('player-uncomfortable', 'faces/player-uncomfortable.svg');
    this.scene.load.image('player-sweating', 'faces/player-sweating.svg');
    this.scene.load.image('player-struggling', 'faces/player-struggling.svg');
    this.scene.load.image('player-critical', 'faces/player-critical.svg');
    this.scene.load.image('player-farting', 'faces/player-farting.svg');
    
    // Boss faces
    this.scene.load.image('boss-normal', 'faces/boss-normal.svg');
    this.scene.load.image('boss-angry', 'faces/boss-angry.svg');
    this.scene.load.image('boss-annoyed', 'faces/boss-annoyed.svg');
    this.scene.load.image('boss-shocked', 'faces/boss-shocked.svg');
    
    // Coworker 1 faces
    this.scene.load.image('coworker1-normal', 'faces/coworker1-normal.svg');
    this.scene.load.image('coworker1-laughing', 'faces/coworker1-laughing.svg');
    this.scene.load.image('coworker1-shocked', 'faces/coworker1-shocked.svg');
    this.scene.load.image('coworker1-smirk', 'faces/coworker1-smirk.svg');
    
    // Coworker 2 faces
    this.scene.load.image('coworker2-normal', 'faces/coworker2-normal.svg');
    
    // Coworker 3 faces
    this.scene.load.image('coworker3-normal', 'faces/coworker3-normal.svg');
    
    // Intern faces
    this.scene.load.image('intern-normal', 'faces/intern-normal.svg');
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
