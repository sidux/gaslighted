import Phaser from 'phaser';

export class NPC {
  private scene: Phaser.Scene;
  private readonly faceSprite: Phaser.GameObjects.Image;
  private videoFrame: Phaser.GameObjects.Rectangle;
  private nameTag: Phaser.GameObjects.Container;
  private readonly nameText: Phaser.GameObjects.Text;
  private speakingIndicator: Phaser.GameObjects.Rectangle | null = null;
  private animMouthLoop: Phaser.Time.TimerEvent | null = null;
  private currentExpression: string = 'neutral';
  private readonly expressionText: Phaser.GameObjects.Text;
  private talkingFrame: number = 0; // Track which talking frame we're on
  private readonly hasMultiframeTalking: boolean = false; // Whether this character has multi-frame talking
  
  public readonly id: string;
  public readonly name: string;
  public readonly voiceType: string;
  public readonly x: number;
  public readonly y: number;
  private readonly frameSize: number = 320; // Further increased size of video frames
  
  constructor(scene: Phaser.Scene, x: number, y: number, id: string, name: string, voiceType: string, nameYOffset: number = 85) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.id = id;
    this.name = name;
    this.voiceType = voiceType;
    
    // Create video frame background - thin dark border as in screenshot
    this.videoFrame = scene.add.rectangle(x, y, this.frameSize, this.frameSize, 0x000000);
    this.videoFrame.setStrokeStyle(1, 0x333333);
    
    // All characters now use PNG with standardized sizes and multi-frame talking
    this.hasMultiframeTalking = true;
    
    // Use neutral as the default expression
    this.faceSprite = this.scene.add.image(x, y, `${id}-neutral`);
    this.currentExpression = 'neutral';
    
    // Increase scale for better visibility
    this.faceSprite.setScale(0.8);
    
    // Create name tag as a container - positioned exactly as in screenshot
    this.nameTag = this.scene.add.container(x, y + 120);
    
    // Add background for name tag - style to match screenshot
    const nameBackground = this.scene.add.rectangle(0, 0, 120, 30, 0x2d5986).setOrigin(0.5);
    
    // Create name text
    this.nameText = this.scene.add.text(
      0, 
      0,
      name,
      {
        font: '16px Arial',
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
      this.hasMultiframeTalking ? 'Neutral' : 'Normal',
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
    // For PNG-based characters, map 'normal' to 'neutral' to match the asset names
    if ((this.id === 'boomer' || this.id === 'zoomer' || this.id === 'coworker1') && expression === 'normal') {
      expression = 'neutral';
    }
    
    // For PNG-based characters, map various expressions
    if (this.id === 'boomer' || this.id === 'zoomer' || this.id === 'coworker1') {
      // Map 'shocked' to 'shock' for these characters
      if (expression === 'shocked') expression = 'shock';
      // Map 'annoyed' to 'mad' for boomer and wifey
      if (expression === 'annoyed' && (this.id === 'boomer' || this.id === 'coworker1')) {
        expression = 'mad';
      }
      // Map 'smirk' to appropriate equivalent
      if (expression === 'smirk') {
        if (this.id === 'coworker1') {
          expression = 'mad'; // Use mad for wifey's smirk
        }
      }
    }
    
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
    if (this.hasMultiframeTalking) {
      this.setExpression('neutral');
    } else {
      this.setExpression('normal');
    }
  }
  
  public startSpeaking(): void {
    // Show speaking indicator
    if (this.speakingIndicator) {
      this.speakingIndicator.setVisible(true);
    }
    
    // Reset talking frame counter
    this.talkingFrame = 0;
    
    // Start mouth animation
    if (this.hasMultiframeTalking) {
      // For multi-frame talking (boomer/zoomer)
      this.animMouthLoop = this.scene.time.addEvent({
        delay: 150,
        callback: this.animateMouthMultiframe,
        callbackScope: this,
        loop: true
      });
    } else {
      // For legacy characters
      if (this.scene.textures.exists(`${this.id}-talking`)) {
        this.animMouthLoop = this.scene.time.addEvent({
          delay: 150,
          callback: this.animateMouth,
          callbackScope: this,
          loop: true
        });
      }
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
    if (this.hasMultiframeTalking) {
      // For boomer/zoomer, always reset to neutral
      const neutralTexture = `${this.id}-neutral`;
      if (this.scene.textures.exists(neutralTexture)) {
        this.faceSprite.setTexture(neutralTexture);
        this.currentExpression = 'neutral';
      }
    } else {
      // For legacy characters
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
  }
  
  public reactToFart(intensity: 'mild' | 'medium' | 'strong'): void {
    // Different reactions based on intensity
    switch (intensity) {
      case 'mild':
        if (this.id === 'boomer') {
          this.setExpression('mad');
        } else if (this.id === 'zoomer') {
          this.setExpression('shock'); // No direct 'annoyed' equivalent
        } else if (this.id === 'coworker1') {
          this.setExpression('mad'); // Use mad for wifey
        } else {
          this.setExpression('annoyed');
        }
        break;
      case 'medium':
        if (this.id === 'boomer' || this.id === 'zoomer' || this.id === 'coworker1') {
          this.setExpression('shock');
        } else {
          this.setExpression('shocked');
        }
        break;
      case 'strong':
        if (this.id === 'boomer' || this.id === 'zoomer' || this.id === 'coworker1') {
          this.setExpression('shock');
        } else {
          this.setExpression('shocked');
        }
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
      this.x - (this.frameSize/2) + 20, 
      this.y - (this.frameSize/2) + 20,
      14, // Larger dot
      14, // Larger dot
      0x00ff00
    ).setOrigin(0.5);
    
    // Add a glow effect
    this.speakingIndicator.setStrokeStyle(2, 0x00ff00, 0.5);
  }
  
  private animateMouth(): void {
    // Toggle between normal/talking for legacy characters
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
  
  private animateMouthMultiframe(): void {
    // Cycle through talking frames for PNG-based characters
    this.talkingFrame = (this.talkingFrame + 1) % 4; // 4 frames in the cycle: neutral->talking->talking2->neutral
    
    let frameTexture: string;
    if (this.talkingFrame === 0) {
      frameTexture = `${this.id}-neutral`;
    } else if (this.talkingFrame === 1) {
      frameTexture = `${this.id}-talking`;
    } else if (this.talkingFrame === 2) {
      frameTexture = `${this.id}-talking2`;
    } else {
      frameTexture = `${this.id}-neutral`;
    }
    
    // Special case for wojak if we ever add that as an NPC
    if (this.id === 'wojak' && this.talkingFrame === 2) {
      // Use talking3 for wojak's second talking frame if available
      const wojak3 = `${this.id}-talking3`;
      if (this.scene.textures.exists(wojak3)) {
        frameTexture = wojak3;
      }
    }
    
    // Check if texture exists before setting
    if (this.scene.textures.exists(frameTexture)) {
      this.faceSprite.setTexture(frameTexture);
    }
  }
}
