import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { FartMeter } from '../ui/FartMeter';

export class Player {
  private scene: Phaser.Scene;
  private fartPressure: number = GameConfig.FART_PRESSURE_INITIAL;
  private fartMeter: FartMeter | null = null;
  private faceSprite: Phaser.GameObjects.Image;
  private nameTag: Phaser.GameObjects.Container;
  private statusText: Phaser.GameObjects.Text;
  private currentExpression: string = 'normal';
  private expressionLookup: Record<string, string> = {
    normal: 'player-normal',
    uncomfortable: 'player-uncomfortable',
    sweating: 'player-sweating',
    struggling: 'player-struggling',
    critical: 'player-critical',
    farting: 'player-farting'
  };
  
  public x: number;
  public y: number;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    
    // Create face sprite
    this.faceSprite = this.scene.add.image(x, y, this.expressionLookup.normal);
    this.faceSprite.setScale(1.5);
    
    // Create name tag as a container
    this.nameTag = this.scene.add.container(x, y + 70);
    
    // Add background for name tag
    const nameBackground = this.scene.add.rectangle(0, 0, 150, 30, 0x0066aa, 0.8).setOrigin(0.5);
    
    // Create name text
    const nameText = this.scene.add.text(
      0, 
      0,
      'Russell (You)',
      {
        font: '18px Arial',
        color: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5);
    
    // Create status text (above character)
    this.statusText = this.scene.add.text(
      0,
      -95, // Position above character
      '',
      {
        font: '20px Arial',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 10, y: 6 },
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);
    this.statusText.setVisible(false);
    
    // Add elements to container
    this.nameTag.add([nameBackground, nameText]);
    
    // Initialize with normal expression
    this.setExpression('normal');
  }
  
  public update(delta: number): void {
    // Increase pressure over time
    this.increasePressure(GameConfig.FART_PRESSURE_INCREASE_RATE * (delta / 16.667));
    
    // Update facial expression based on pressure
    this.updateFacialExpression();
  }
  
  public setFartMeter(meter: FartMeter): void {
    this.fartMeter = meter;
    // Initialize meter with current pressure
    if (this.fartMeter) {
      this.fartMeter.setPressure(this.fartPressure);
    }
  }
  
  public getCurrentPressure(): number {
    return this.fartPressure;
  }
  
  public increasePressure(amount: number): void {
    this.fartPressure = Math.min(this.fartPressure + amount, GameConfig.FART_PRESSURE_MAX);
    
    // Update meter if available
    if (this.fartMeter) {
      this.fartMeter.setPressure(this.fartPressure);
    }
  }
  
  public releasePressure(): void {
    this.fartPressure = GameConfig.FART_PRESSURE_INITIAL;
    
    // Update meter if available
    if (this.fartMeter) {
      this.fartMeter.setPressure(this.fartPressure);
    }
    
    // Hide critical warning if it was showing
    this.statusText.setVisible(false);
  }
  
  public setExpression(expression: string): void {
    if (this.expressionLookup[expression]) {
      this.currentExpression = expression;
      this.faceSprite.setTexture(this.expressionLookup[expression]);
      
      // Show status for critical only
      if (expression === 'critical') {
        this.statusText.setText('CRITICAL');
        this.statusText.setStyle({
          font: '20px Arial',
          color: '#ffffff',
          backgroundColor: '#ff0000',
          padding: { x: 10, y: 6 },
          align: 'center',
          stroke: '#000000',
          strokeThickness: 2
        });
        this.statusText.setVisible(true);
        
        // Add pulsing effect to critical warning
        if (!this.scene.tweens.isTweening(this.statusText)) {
          this.scene.tweens.add({
            targets: this.statusText,
            scaleX: { from: 0.95, to: 1.05 },
            scaleY: { from: 0.95, to: 1.05 },
            yoyo: true,
            repeat: -1,
            duration: 500
          });
        }
      } else {
        // Hide status for other expressions
        this.statusText.setVisible(false);
        this.scene.tweens.killTweensOf(this.statusText);
        this.statusText.setScale(1);
      }
    }
  }
  
  public resetExpression(): void {
    // Reset to appropriate expression based on current pressure
    this.updateFacialExpression();
  }
  
  public shouldAutoRelease(): boolean {
    // Check if pressure is at critical level where auto-release is possible
    if (this.fartPressure >= GameConfig.FART_PRESSURE_CRITICAL) {
      // Chance increases with pressure
      const overPressure = this.fartPressure - GameConfig.FART_PRESSURE_CRITICAL;
      const chance = overPressure * 0.02; // 2% chance per pressure point over critical
      
      return Math.random() < chance;
    }
    
    return false;
  }
  
  private updateFacialExpression(): void {
    if (this.currentExpression === 'farting') {
      // Don't change during fart animation
      return;
    }
    
    // Determine expression based on pressure levels
    if (this.fartPressure < 30) {
      this.setExpression('normal');
    } else if (this.fartPressure < 50) {
      this.setExpression('uncomfortable');
    } else if (this.fartPressure < 70) {
      this.setExpression('sweating');
    } else if (this.fartPressure < 90) {
      this.setExpression('struggling');
    } else {
      this.setExpression('critical');
    }
  }
}
