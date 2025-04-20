import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { AssetLoader } from '../utils/AssetLoader';

export class PreloadScene extends Phaser.Scene {
  private assetLoader!: AssetLoader;
  private loadingBar!: Phaser.GameObjects.Graphics;
  
  constructor() {
    super({
      key: GameConfig.SCENE_PRELOAD
    });
  }

  preload(): void {
    // Create loading bar
    this.createLoadingBar();
    
    // Initialize asset loader
    this.assetLoader = new AssetLoader(this);
    
    // Load all game assets
    this.assetLoader.loadFaces();
    this.assetLoader.loadAudio();
    this.assetLoader.loadImages();
    this.assetLoader.loadLevels();
    
    // Update loading bar as assets load
    this.load.on('progress', this.updateLoadingBar, this);
  }

  create(): void {
    // When everything is loaded, go to the menu scene
    this.scene.start(GameConfig.SCENE_MENU);
  }
  
  private createLoadingBar(): void {
    this.loadingBar = this.add.graphics();
    const { width, height } = this.cameras.main;
    
    // Add loading text
    this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '24px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Create loading bar container
    this.loadingBar.fillStyle(0x222222, 0.8);
    this.loadingBar.fillRect(width / 2 - 160, height / 2, 320, 30);
  }
  
  private updateLoadingBar(value: number): void {
    const { width, height } = this.cameras.main;
    
    // Clear previous fill
    this.loadingBar.clear();
    
    // Background
    this.loadingBar.fillStyle(0x222222, 0.8);
    this.loadingBar.fillRect(width / 2 - 160, height / 2, 320, 30);
    
    // Progress fill
    this.loadingBar.fillStyle(0x00ff00, 1);
    this.loadingBar.fillRect(width / 2 - 155, height / 2 + 5, 310 * value, 20);
  }
}
