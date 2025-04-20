import Phaser from 'phaser';

export class NPC {
  private scene: Phaser.Scene;
  private faceSprite: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private speakingIndicator: Phaser.GameObjects.Rectangle | null = null;
  private animMouthLoop: Phaser.Time.TimerEvent | null = null;
  private currentExpression: string = 'normal';
  
  public readonly id: string;
  public readonly name: string;
  public readonly voiceType: string;
  public readonly x: number;
  public readonly y: number;
  
  constructor(scene: Phaser.Scene, x: number, y: number, id: string, name: string, voiceType: string) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.id = id;
    this.name = name;
    this.voiceType = voiceType;
    
    // Create face sprite
    this.faceSprite = this.scene.add.image(x, y, `${id}-normal`);
    this.faceSprite.setScale(1.5);
    
    // Create name text
    this.nameText = this.scene.add.text(
      x, 
      y + 100,
      name,
      {
        font: '20px Arial',
        color: '#ffffff',
        backgroundColor: '#0066aa',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5);
    
    this.createSpeakingIndicator();
    this.stopSpeaking();
  }
  
  public update(delta: number): void {
    // Any per-frame updates for NPCs
  }
  
  public setExpression(expression: string): void {
    // Try to set the expression if the texture exists
    const textureName = `${this.id}-${expression}`;
    
    // Check if texture exists
    if (this.scene.textures.exists(textureName)) {
      this.faceSprite.setTexture(textureName);
      this.currentExpression = expression;
    }
  }
  
  public resetExpression(): void {
    this.setExpression('normal');
  }
  
  public startSpeaking(): void {
    // Show speaking indicator
    if (this.speakingIndicator) {
      this.speakingIndicator.setVisible(true);
    }
    
    // Animation for mouth - toggle between normal and talking
    if (this.scene.textures.exists(`${this.id}-talking`)) {
      this.animMouthLoop = this.scene.time.addEvent({
        delay: 150,
        callback: this.animateMouth,
        callbackScope: this,
        loop: true
      });
    }
  }
  
  public stopSpeaking(): void {
    // Hide speaking indicator
    if (this.speakingIndicator) {
      this.speakingIndicator.setVisible(false);
    }
    
    // Stop mouth animation
    if (this.animMouthLoop) {
      this.animMouthLoop.destroy();
      this.animMouthLoop = null;
    }
    
    // Reset to normal or current expression
    this.faceSprite.setTexture(`${this.id}-${this.currentExpression}`);
  }
  
  public reactToFart(intensity: 'mild' | 'medium' | 'strong'): void {
    // Different reactions based on intensity
    switch (intensity) {
      case 'mild':
        this.setExpression('annoyed');
        break;
      case 'medium':
        this.setExpression('shocked');
        break;
      case 'strong':
        this.setExpression('shocked');
        // Add shake effect for strong reaction
        this.scene.tweens.add({
          targets: this.faceSprite,
          x: { from: this.x - 5, to: this.x + 5 },
          yoyo: true,
          repeat: 3,
          duration: 100
        });
        break;
    }
  }
  
  private createSpeakingIndicator(): void {
    // Green dot indicator when speaking
    this.speakingIndicator = this.scene.add.rectangle(
      this.x - 80,
      this.y - 60,
      20,
      20,
      0x00ff00
    ).setOrigin(0.5);
  }
  
  private animateMouth(): void {
    // Toggle between normal/talking for mouth animation
    if (this.faceSprite.texture.key.endsWith('talking')) {
      this.faceSprite.setTexture(`${this.id}-${this.currentExpression}`);
    } else {
      this.faceSprite.setTexture(`${this.id}-talking`);
    }
  }
}
