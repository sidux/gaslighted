import Phaser from 'phaser';

export class NPC {
  private scene: Phaser.Scene;
  private faceSprite: Phaser.GameObjects.Image;
  private nameTag: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private speakingIndicator: Phaser.GameObjects.Rectangle | null = null;
  private animMouthLoop: Phaser.Time.TimerEvent | null = null;
  private currentExpression: string = 'normal';
  
  public readonly id: string;
  public readonly name: string;
  public readonly voiceType: string;
  public readonly x: number;
  public readonly y: number;
  
  constructor(scene: Phaser.Scene, x: number, y: number, id: string, name: string, voiceType: string, scale: number = 1.5, nameYOffset: number = 70) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.id = id;
    this.name = name;
    this.voiceType = voiceType;
    
    // Create face sprite
    this.faceSprite = this.scene.add.image(x, y, `${id}-normal`);
    this.faceSprite.setScale(scale);
    
    // Create name tag as a container
    this.nameTag = this.scene.add.container(x, y + nameYOffset);
    
    // Add background for name tag
    const nameBackground = this.scene.add.rectangle(0, 0, 150, 30, 0x0066aa, 0.8).setOrigin(0.5);
    
    // Create name text
    this.nameText = this.scene.add.text(
      0, 
      0,
      name,
      {
        font: '18px Arial',
        color: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5);
    
    // Add text to container
    this.nameTag.add([nameBackground, this.nameText]);
    
    // Add status text showing current expression
    const expressionText = this.scene.add.text(
      0,
      -nameYOffset - 25, // Position above character
      'Normal',
      {
        font: '16px Arial',
        color: '#cccccc'
      }
    ).setOrigin(0.5);
    
    this.nameTag.add(expressionText);
    
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
      
      // Update expression text
      const expressionText = this.nameTag.getAt(2) as Phaser.GameObjects.Text;
      if (expressionText) {
        expressionText.setText(expression.charAt(0).toUpperCase() + expression.slice(1));
      }
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
