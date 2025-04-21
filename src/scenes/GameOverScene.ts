import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class GameOverScene extends Phaser.Scene {
  private success: boolean = false;
  private levelId: string = '';
  private credibilityScore: number = 0;
  
  constructor() {
    super({
      key: GameConfig.SCENE_GAME_OVER
    });
  }

  init(data: { success: boolean; levelId: string; credibilityScore: number }): void {
    this.success = data.success;
    this.levelId = data.levelId;
    this.credibilityScore = data.credibilityScore;
  }

  create(): void {
    // Background
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x1a1a2e)
      .setOrigin(0, 0);
    
    // Title text
    const title = this.success ? 'MEETING COMPLETED' : 'MEETING DISASTER';
    const titleColor = this.success ? '#22cc22' : '#cc2222';
    
    this.add.text(
      this.cameras.main.width / 2,
      100,
      title,
      {
        font: 'bold 48px Arial',
        color: titleColor
      }
    ).setOrigin(0.5);
    
    // Results text
    let resultText = '';
    if (this.success) {
      resultText = "You made it through the meeting with " + this.credibilityScore + "% credibility intact!";
    } else {
      if (this.credibilityScore <= 0) {
        resultText = 'Your credibility dropped to zero! Everyone knows it was you!';
      } else {
        resultText = 'Your inappropriate timing was too obvious!';
      }
    }
    
    this.add.text(
      this.cameras.main.width / 2,
      180,
      resultText,
      {
        font: '28px Arial',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: this.cameras.main.width - 200 }
      }
    ).setOrigin(0.5);
    
    // Feedback based on score
    let feedbackText = '';
    if (this.credibilityScore >= 90) {
      feedbackText = 'Master of disguise! Your timing was impeccable.';
    } else if (this.credibilityScore >= 70) {
      feedbackText = 'Well played! A few suspicious moments, but you stayed professional.';
    } else if (this.credibilityScore >= 50) {
      feedbackText = 'Barely acceptable. People had their suspicions...';
    } else if (this.credibilityScore >= 20) {
      feedbackText = 'Quite unprofessional. Expect some awkward looks tomorrow.';
    } else {
      feedbackText = 'Completely transparent. Everyone knew what you were doing.';
    }
    
    this.add.text(
      this.cameras.main.width / 2,
      260,
      feedbackText,
      {
        font: '24px Arial',
        color: '#cccccc',
        align: 'center',
        wordWrap: { width: this.cameras.main.width - 200 }
      }
    ).setOrigin(0.5);
    
    // Add player image with appropriate expression
    const expressionKey = this.success ? 'normal' : 'uncomfortable';
    const playerFace = this.add.image(
      this.cameras.main.width / 2,
      380,
      `player-${expressionKey}`
    ).setScale(2);
    
    // Add buttons
    this.createButton(
      this.cameras.main.width / 2,
      500,
      'Try Again',
      () => {
        this.scene.start(GameConfig.SCENE_GAME, { levelId: this.levelId });
      }
    );
    
    this.createButton(
      this.cameras.main.width / 2,
      570,
      'Back to Menu',
      () => {
        this.scene.start(GameConfig.SCENE_MENU);
      }
    );
  }
  
  private createButton(x: number, y: number, text: string, callback: () => void | Promise<void>): void {
    const button = this.add.text(
      x,
      y,
      text,
      {
        font: '28px Arial',
        color: '#ffffff',
        backgroundColor: '#3498db',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5)
     .setInteractive({ useHandCursor: true });
    
    button.on('pointerdown', () => {
      const result = callback();
      // If callback returns a Promise, handle potential errors
      if (result instanceof Promise) {
        result.catch(error => console.error("Button action error:", error));
      }
    });
    
    // Hover effects
    button.on('pointerover', () => {
      button.setStyle({ backgroundColor: '#2980b9' });
    });
    
    button.on('pointerout', () => {
      button.setStyle({ backgroundColor: '#3498db' });
    });
  }
}
