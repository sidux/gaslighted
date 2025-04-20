import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { LevelManager } from '../managers/LevelManager';

export class MenuScene extends Phaser.Scene {
  private levelManager!: LevelManager;
  
  constructor() {
    super({
      key: GameConfig.SCENE_MENU
    });
  }

  create(): void {
    // Initialize level manager
    this.levelManager = new LevelManager();
    
    // Create title text
    this.add.text(
      this.cameras.main.width / 2, 
      100, 
      'GASLIGHTED', 
      { 
        font: 'bold 64px Arial',
        color: '#ffffff' 
      }
    ).setOrigin(0.5);
    
    // Create subtitle
    this.add.text(
      this.cameras.main.width / 2, 
      180, 
      'The Corporate Meeting Simulator', 
      { 
        font: '32px Arial',
        color: '#cccccc' 
      }
    ).setOrigin(0.5);
    
    // Create level selection
    const levels = this.levelManager.getLevelList();
    const startY = 280;
    const spacing = 60;
    
    levels.forEach((level, index) => {
      const button = this.add.text(
        this.cameras.main.width / 2,
        startY + (index * spacing),
        `Level ${index + 1}: ${level.title}`,
        {
          font: '28px Arial',
          color: '#ffffff',
          backgroundColor: '#3498db',
          padding: { x: 20, y: 10 }
        }
      ).setOrigin(0.5)
       .setInteractive({ useHandCursor: true });
      
      // Handle level selection
      button.on('pointerdown', () => {
        this.scene.start(GameConfig.SCENE_GAME, { levelId: level.id });
      });
      
      // Hover effects
      button.on('pointerover', () => {
        button.setStyle({ backgroundColor: '#2980b9' });
      });
      
      button.on('pointerout', () => {
        button.setStyle({ backgroundColor: '#3498db' });
      });
    });
    
    // Instructions text
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 100,
      'Press SPACE during the meeting to release pressure!',
      {
        font: '22px Arial',
        color: '#eeeeee'
      }
    ).setOrigin(0.5);
  }
}
