import Phaser from 'phaser';

export class NPC {
  private scene: Phaser.Scene;
  private faceSprite: Phaser.GameObjects.Image;
  private videoFrame: Phaser.GameObjects.Rectangle;
  private nameTag: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private speakingIndicator: Phaser.GameObjects.Rectangle | null = null;
  private animMouthLoop: Phaser.Time.TimerEvent | null = null;
  private currentExpression: string = 'neutral';
  private expressionText: Phaser.GameObjects.Text;
  private talkingFrame: number = 0; // Track which talking frame we're on
  private hasMultiframeTalking: boolean = false; // Whether this character has multi-frame talking
  
  public readonly id: string;
  public readonly name: string;
  public readonly voiceType: string;
  public readonly x: number;
  public readonly y: number;
  private readonly frameSize: number = 240; // Size of video frame square
  
  constructor(scene: Phaser.Scene, x: number, y: number, id: string, name: string, voiceType: string, scale: number = 1.0, nameYOffset: number = 70) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.id = id;
    this.name = name;
    this.voiceType = voiceType;
    
    // Create video frame background
    this.videoFrame = scene.add.rectangle(x, y, this.frameSize, this.frameSize, 0x000000, 0.3);
    this.videoFrame.setStrokeStyle(2, 0xffffff, 0.5);
    
    // Determine if PNG-based character with multi-frame talking
    if (id === 'boomer' || id === 'zoomer') {
      this.hasMultiframeTalking = true;
      
      // For boomer and zoomer, use -neutral instead of -normal
      this.faceSprite = this.scene.add.image(x, y, `${id}-neutral`);
      this.currentExpression = 'neutral';
      
      // PNG images need to be scaled down to fit in the frame
      if (id === 'boomer') {
        this.faceSprite.setScale(0.3); // Boomer may need different scaling
      } else {
        this.faceSprite.setScale(0.35); // Zoomer may need different scaling
      }
    } else {
      // Legacy characters (SVG)
      this.faceSprite = this.scene.add.image(x, y, `${id}-normal`);
      this.currentExpression = 'normal';
      this.faceSprite.setScale(scale);
    }
    
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
    // For boomer/zoomer, map 'normal' to 'neutral' to match the asset names
    if ((this.id === 'boomer' || this.id === 'zoomer') && expression === 'normal') {
      expression = 'neutral';
    }
    
    // For boomer/zoomer, map various expressions
    if (this.id === 'boomer' || this.id === 'zoomer') {
      // Map 'shocked' to 'shock' for these characters
      if (expression === 'shocked') expression = 'shock';
      // Map 'annoyed' to 'mad' for boomer
      if (expression === 'annoyed' && this.id === 'boomer') expression = 'mad';
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
        } else {
          this.setExpression('annoyed');
        }
        break;
      case 'medium':
        if (this.id === 'boomer' || this.id === 'zoomer') {
          this.setExpression('shock');
        } else {
          this.setExpression('shocked');
        }
        break;
      case 'strong':
        if (this.id === 'boomer' || this.id === 'zoomer') {
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
      this.x - (this.frameSize/2) + 15, 
      this.y - (this.frameSize/2) + 15,
      10,
      10,
      0x00ff00
    ).setOrigin(0.5);
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
    // Cycle through talking frames for boomer/zoomer
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
    
    // Check if texture exists before setting
    if (this.scene.textures.exists(frameTexture)) {
      this.faceSprite.setTexture(frameTexture);
    }
  }
}
