import Phaser from 'phaser';

export class NPC {
  private scene: Phaser.Scene;
  private faceSprite: Phaser.GameObjects.Image;
  private nameTag: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private speakingIndicator: Phaser.GameObjects.Rectangle | null = null;
  private animMouthLoop: Phaser.Time.TimerEvent | null = null;
  private currentExpression: string = 'normal';
  private expressionText: Phaser.GameObjects.Text;
  
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
    
    // Create status text above character with background (in container for positioning)
    const expressionContainer = this.scene.add.container(x, y - 25);
    
    const expressionBackground = this.scene.add.rectangle(0, 0, 100, 24, 0x000000, 0.5).setOrigin(0.5);
    
    // Add status text showing current expression
    this.expressionText = this.scene.add.text(
      0,
      0, // Positioned with container
      'Normal',
      {
        font: '14px Arial',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);
    
    expressionContainer.add([expressionBackground, this.expressionText]);
    expressionContainer.setVisible(false); // Hide by default
    
    // Add text to container
    this.nameTag.add([nameBackground, this.nameText]);
    
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
      if (this.expressionText) {
        this.expressionText.setText(expression.charAt(0).toUpperCase() + expression.slice(1));
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
    // First check if texture exists to prevent errors
    const textureName = `${this.id}-${this.currentExpression}`;
    if (this.scene.textures.exists(textureName)) {
      this.faceSprite.setTexture(textureName);
    } else if (this.scene.textures.exists(`${this.id}-normal`)) {
      // Fallback to normal if current expression doesn't exist
      this.faceSprite.setTexture(`${this.id}-normal`);
      this.currentExpression = 'normal';
    }
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
    // Green dot indicator when speaking - positioned inside the video frame
    this.speakingIndicator = this.scene.add.rectangle(
      this.x - 60,
      this.y - 60,
      12,
      12,
      0x00ff00
    ).setOrigin(0.5);
  }
  
  private animateMouth(): void {
    // Toggle between normal/talking for mouth animation
    // Check if textures exist before setting them
    if (this.faceSprite.texture.key.endsWith('talking')) {
      const normalTexture = `${this.id}-${this.currentExpression}`;
      if (this.scene.textures.exists(normalTexture)) {
        this.faceSprite.setTexture(normalTexture);
      }
    } else {
      const talkingTexture = `${this.id}-talking`;
      if (this.scene.textures.exists(talkingTexture)) {
        this.faceSprite.setTexture(talkingTexture);
      }
    }
  }
}
