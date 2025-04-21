import Phaser from 'phaser';

export class AssetLoader {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  public loadFaces(): void {
    // Define all character expressions
    const characters = {
      player: {
        baseId: 'player',
        prefix: 'wojak',
        expressions: [
          'neutral', 'poker-face', 'talking', 'talking2', 'talking3', 'farting'
        ],
        aliases: {
          'normal': 'neutral',
          'uncomfortable': 'poker-face',
          'sweating': 'poker-face',
          'struggling': 'talking2',
          'critical': 'talking3'
        }
      },
      boomer: {
        baseId: 'boomer',
        prefix: 'boomer',
        expressions: [
          'neutral', 'mad', 'shock', 'talking', 'talking2'
        ],
        aliases: {
          'normal': 'neutral',
          'annoyed': 'mad',
          'shocked': 'shock'
        }
      },
      zoomer: {
        baseId: 'zoomer',
        prefix: 'zoomer',
        expressions: [
          'neutral', 'laughing', 'shock', 'talking', 'talking2'
        ],
        aliases: {
          'normal': 'neutral',
          'shocked': 'shock'
        }
      },
      coworker1: {
        baseId: 'coworker1',
        prefix: 'wifey',
        expressions: [
          'neutral', 'mad', 'shock', 'talking', 'talking2'
        ],
        aliases: {
          'normal': 'neutral',
          'laughing': 'talking',
          'shocked': 'shock',
          'smirk': 'mad',
          'annoyed': 'mad'
        }
      }
    };

    // Load all character expressions
    Object.values(characters).forEach(char => {
      // Load base expressions
      char.expressions.forEach(expression => {
        const assetKey = `${char.baseId}-${expression}`;
        const assetPath = `faces/${char.prefix}-${expression}.png`;
        this.scene.load.image(assetKey, assetPath);
      });

      // Load aliased expressions
      Object.entries(char.aliases).forEach(([alias, target]) => {
        const assetKey = `${char.baseId}-${alias}`;
        const assetPath = `faces/${char.prefix}-${target}.png`;
        this.scene.load.image(assetKey, assetPath);
      });
    });
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
    // Levels are now loaded directly by the LevelManager from YAML files
    // No need to preload them via the asset loader anymore
  }
}
