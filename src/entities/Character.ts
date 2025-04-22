import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { FartMeter } from './FartMeter';
import { VisemeType } from '../types/speech/SpeechMark';

export enum CharacterRole {
  PLAYER = 'player',
  NPC = 'npc'
}

export class Character {
  private scene: Phaser.Scene;
  private fartPressure: number = GameConfig.FART_PRESSURE_INITIAL;
  private fartMeter: FartMeter | null = null;
  private faceSprite: Phaser.GameObjects.Image;
  private nameTag: Phaser.GameObjects.Container;
  private statusText: Phaser.GameObjects.Text;
  private effectCircle: Phaser.GameObjects.Ellipse | null = null;
  private currentExpression: string = 'neutral';
  private speakingIndicator: Phaser.GameObjects.Rectangle | null = null;
  private animMouthLoop: Phaser.Time.TimerEvent | null = null;
  private talkingFrame: number = 0;
  private videoFrame: Phaser.GameObjects.Rectangle | null = null;
  public isHoldingFart: boolean = false;
  private holdingText: Phaser.GameObjects.Text | null = null;
  private isFarting: boolean = false;
  private fartingTimer: Phaser.Time.TimerEvent | null = null;
  private fartParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  
  // Viseme/fart type tracking
  private currentVisemeKey: string = '';
  private currentFartType: VisemeType = VisemeType.NONE;
  private fartReleaseRate: number = 5; // How fast pressure decreases per frame when farting
  
  public readonly id: string;
  public readonly name: string;
  public readonly voiceType: string;
  public readonly role: CharacterRole;
  public readonly x: number;
  public readonly y: number;
  
  constructor(
    scene: Phaser.Scene, 
    x: number,
    y: number, 
    id: string, 
    name: string, 
    voiceType: string,
    role: CharacterRole = CharacterRole.NPC,
    nameYOffset: number = 85
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.id = id;
    this.name = name;
    this.voiceType = voiceType;
    this.role = role;

    try {
      // Create video frame background for NPC characters
      const frameSize = 320;
      this.videoFrame = scene.add.rectangle(x, y, frameSize, frameSize, 0x000000);
      this.videoFrame.setStrokeStyle(1, 0x333333);

      // Create speaking indicator for NPCs
      this.createSpeakingIndicator();

      // Add effect circle for player character (initially invisible)
      if (role === CharacterRole.PLAYER) {
        this.effectCircle = this.scene.add.ellipse(x, y, 160, 160, 0x6495ed, 0);
        this.effectCircle.setStrokeStyle(2, 0x6495ed, 0.6);
        this.effectCircle.setVisible(false);
      }
      
      // Use neutral as the default expression
      const defaultTexture = `${id}-neutral`;
      if (scene.textures.exists(defaultTexture)) {
        this.faceSprite = this.scene.add.image(x, y, defaultTexture);
      } else {
        // Fallback to normal if neutral doesn't exist
        this.faceSprite = this.scene.add.image(x, y, `${id}-normal`);
      }
      
      // Increase scale for better visibility
      this.faceSprite.setScale(0.8);
      
      // Create name tag as a container
      this.nameTag = this.scene.add.container(x, y + nameYOffset);
      
      // Add background for name tag
      const nameBackground = this.scene.add.rectangle(0, 0, 120, 30, 0x2d5986).setOrigin(0.5);
      
      // Create name text
      const nameText = this.scene.add.text(
        0, 
        0,
        role === CharacterRole.PLAYER ? `${name} (You)` : name,
        {
          font: '16px Arial',
          color: '#ffffff',
          align: 'center',
        }
      ).setOrigin(0.5);
      
      // Create status text (above character)
      this.statusText = this.scene.add.text(
        x,
        y - 100,
        'CRITICAL',
        {
          font: '24px Arial',
          color: '#ffffff',
          backgroundColor: '#ff0000',
          padding: { x: 12, y: 8 },
          align: 'center',
          stroke: '#000000',
          strokeThickness: 2
        }
      ).setOrigin(0.5);
      this.statusText.setVisible(false);
      
      // Add elements to container
      this.nameTag.add([nameBackground, nameText]);
      
      // Initialize with neutral expression
      this.setExpression('neutral');
      
      // Hide speaking indicator for players
      if (role === CharacterRole.PLAYER && this.speakingIndicator) {
        this.speakingIndicator.setVisible(false);
      }
      
      // Add scene shutdown listener to clean up resources when the scene changes
      this.scene.events.once('shutdown', this.cleanup, this);
      this.scene.events.once('destroy', this.cleanup, this);
    } catch (error) {
      console.error('Error initializing Character:', error);
    }
  }
  
  public update(delta: number): void {
    // Safety check
    if (!this.scene) return;
    
    try {
      // Player-specific update logic
      if (this.role === CharacterRole.PLAYER) {
        // Calculate pressure increase rate based on state
        let pressureRate = GameConfig.FART_PRESSURE_INCREASE_RATE;
        
        if (this.isHoldingFart) {
          // Holding fart reduces pressure increase rate significantly
          pressureRate *= 0.2; // 80% reduction when holding
        } else if (this.isFarting) {
          // Actively farting reduces pressure based on release rate
          this.decreasePressure(this.fartReleaseRate * (delta / 16.667)); // Decrease pressure while farting
          
          // If pressure gets too low, stop farting automatically
          if (this.fartPressure <= 5) {
            this.stopFarting();
          }
        } else {
          // Normal pressure buildup (not holding, not actively farting)
          pressureRate *= 1.2; // 20% faster buildup when neither holding nor farting
        }
        
        // If not actively farting, increase pressure
        if (!this.isFarting) {
          this.increasePressure(pressureRate * (delta / 16.667));
        }
        
        // Update facial expression based on pressure and state
        this.updateFacialExpression();
        
        // Update particle position if farting
        if (this.isFarting && this.fartParticles) {
          this.fartParticles.setPosition(this.x, this.y + 50);
        }
      }
      
      // Animate effect circle if visible (player-only)
      if (this.role === CharacterRole.PLAYER && this.effectCircle && this.effectCircle.visible) {
        this.effectCircle.scaleX += 0.01;
        this.effectCircle.scaleY += 0.01;
        this.effectCircle.alpha -= 0.01;
        
        if (this.effectCircle.alpha <= 0) {
          this.effectCircle.setVisible(false);
          this.effectCircle.setScale(1);
          this.effectCircle.alpha = 0.7;
        }
      }
    } catch (error) {
      console.warn('Error in Character update:', error);
    }
  }
  
  /**
   * Decrease pressure (used when farting)
   */
  public decreasePressure(amount: number): void {
    this.fartPressure = Math.max(this.fartPressure - amount, 0);
    
    // Update meter if available
    if (this.fartMeter) {
      this.fartMeter.setPressure(this.fartPressure);
    }
  }
  
  /**
   * Set whether the player is holding in the fart
   * @param isHolding Whether the player is holding the fart
   */
  public setHoldingFart(isHolding: boolean): void {
    this.isHoldingFart = isHolding;
    
    if (isHolding && this.isFarting) {
      // Player is holding fart again after releasing
      this.stopFarting();
    }
  }
  
  /**
   * Set the current viseme key for the character
   * @param key The viseme key being pressed (A, E, I, O, etc.)
   */
  public setVisemeKey(key: string): void {
    this.currentVisemeKey = key.toUpperCase();
    
    // Map key to viseme type
    switch (this.currentVisemeKey) {
      case 'A':
        this.currentFartType = VisemeType.A;
        break;
      case 'E':
        this.currentFartType = VisemeType.E;
        break;
      case 'I':
        this.currentFartType = VisemeType.I;
        break;
      case 'O':
        this.currentFartType = VisemeType.O;
        break;
      case 'U':
        this.currentFartType = VisemeType.U;
        break;
      case 'P':
        this.currentFartType = VisemeType.P;
        break;
      case 'F':
        this.currentFartType = VisemeType.F;
        break;
      case 'T':
        this.currentFartType = VisemeType.T;
        break;
      case 'S':
        this.currentFartType = VisemeType.S;
        break;
      case 'K':
        this.currentFartType = VisemeType.K;
        break;
      default:
        this.currentFartType = VisemeType.NONE;
    }
    
    // Automatically release some pressure when a key is pressed
    if (this.role === CharacterRole.PLAYER) {
      // Release between 3-5 pressure units based on current pressure
      const releaseAmount = 3 + (this.fartPressure / 100) * 2;
      this.decreasePressure(releaseAmount);
      
      // Update facial expression based on new pressure
      this.updateFacialExpression();
    }
  }
  
  /**
   * Get the current viseme key
   */
  public getCurrentVisemeKey(): string {
    return this.currentVisemeKey;
  }
  
  /**
   * Get the current fart type (viseme)
   */
  public getCurrentFartType(): VisemeType {
    return this.currentFartType;
  }
  
  /**
   * Set the fart release rate (how quickly pressure releases when farting)
   * @param rate The rate (pressure points per frame)
   */
  public setFartReleaseRate(rate: number): void {
    this.fartReleaseRate = rate;
  }

  public startFarting(intensity: number): void {
    if (this.isFarting) return; // Already farting
    
    this.isFarting = true;
    this.setExpression('farting');
    
    // Set fart release rate based on intensity
    this.fartReleaseRate = 3 + (intensity / 20); // Higher intensity = faster release
    
    // Create particle emitter for fart visual effect if it doesn't exist
    if (!this.fartParticles && this.role === CharacterRole.PLAYER) {
      // Determine particle color based on fart type/viseme
      let particleColor = 0xccff66; // Default green
      
      // Different colors for different viseme types
      switch (this.currentFartType) {
        case VisemeType.A:
          particleColor = 0xff0000; // Red
          break;
        case VisemeType.E:
          particleColor = 0xffff00; // Yellow
          break;
        case VisemeType.I:
          particleColor = 0x00ff00; // Green
          break;
        case VisemeType.O:
          particleColor = 0x0000ff; // Blue
          break;
        case VisemeType.U:
          particleColor = 0xff00ff; // Purple
          break;
      }
      
      // Create particles
      this.fartParticles = this.scene.add.particles(this.x, this.y + 50, 'fart-particle', {
        speed: { min: 50, max: 100 },
        angle: { min: 250, max: 290 },
        scale: { start: 0.6, end: 0.1 },
        lifespan: { min: 400, max: 1000 },
        blendMode: 'ADD',
        frequency: 30,
        tint: particleColor
      });
    }
    
    // Enable emitter if it exists
    if (this.fartParticles) {
      this.fartParticles.start();
    }
    
    // Set timer to continuously decrease pressure and play sound
    if (this.fartingTimer) {
      this.fartingTimer.remove();
    }
    
    // Timer to play fart sound periodically while continuously farting
    this.fartingTimer = this.scene.time.addEvent({
      delay: 1000, // Play sound every second
      callback: () => {
        // Get audio manager from scene
        const gameScene = this.scene as any;
        if (gameScene.audioManager) {
          gameScene.audioManager.playFartSound(20, false, this.currentFartType); // Pass fart type to audio manager
        }
      },
      callbackScope: this,
      loop: true
    });
  }
  
  /**
   * Stop continuous farting
   */
  public stopFarting(): void {
    if (!this.isFarting) return;
    
    this.isFarting = false;
    this.resetExpression();
    
    // Stop particles
    if (this.fartParticles) {
      this.fartParticles.stop();
    }
    
    // Clear timer
    if (this.fartingTimer) {
      this.fartingTimer.remove();
      this.fartingTimer = null;
    }
  }
  
  /**
   * Check if character is currently farting
   */
  public isCurrentlyFarting(): boolean {
    return this.isFarting;
  }
  
  /**
   * Set the holding text reference
   * @param text The text object showing "Holding..."
   */
  public setHoldingText(text: Phaser.GameObjects.Text): void {
    this.holdingText = text;
  }
  
  /**
   * Clear the holding text
   */
  public clearHoldingText(): void {
    if (this.holdingText) {
      this.holdingText.destroy();
      this.holdingText = null;
    }
  }
  
  public setFartMeter(meter: FartMeter): void {
    if (this.role === CharacterRole.PLAYER) {
      this.fartMeter = meter;
      // Initialize meter with current pressure
      if (this.fartMeter) {
        this.fartMeter.setPressure(this.fartPressure);
      }
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
    if (this.currentExpression === 'critical') {
      this.statusText.setVisible(false);
      this.scene.tweens.killTweensOf(this.statusText);
      this.statusText.setScale(1);
    }
  }
  
  public setExpression(expression: string): void {
    // Safety check - make sure the scene and textures still exist
    if (!this.scene || !this.scene.textures || !this.faceSprite) {
      console.warn('Cannot set expression: scene or sprite destroyed');
      return;
    }
    
    try {
      // Try to set the expression if the texture exists
      const textureName = `${this.id}-${expression}`;
      
      if (this.scene.textures.exists(textureName)) {
        this.faceSprite.setTexture(textureName);
        this.currentExpression = expression;
        
        // Special status handling for player
        if (this.role === CharacterRole.PLAYER) {
          if (!this.statusText) return; // Safety check
          
          if (expression === 'critical') {
            this.statusText.setText('CRITICAL');
            this.statusText.setStyle({
              font: '24px Arial',
              color: '#ffffff',
              backgroundColor: '#ff0000',
              padding: { x: 12, y: 8 },
              align: 'center',
              stroke: '#000000',
              strokeThickness: 2
            });
            this.statusText.setVisible(true);
            
            // Add pulsing effect to critical warning - with safety check
            if (this.scene && this.scene.tweens && !this.scene.tweens.isTweening(this.statusText)) {
              this.scene.tweens.add({
                targets: this.statusText,
                scaleX: { from: 0.95, to: 1.05 },
                scaleY: { from: 0.95, to: 1.05 },
                yoyo: true,
                repeat: -1,
                duration: 500
              });
            }
          } else if (expression === 'farting') {
            // Show farting text and effect
            this.statusText.setText('FARTING!');
            this.statusText.setStyle({
              font: '18px Arial',
              color: '#ffffff',
              backgroundColor: '#4169e1',
              padding: { x: 10, y: 5 },
              align: 'center',
              fontStyle: 'bold'
            });
            this.statusText.setVisible(true);
            
            // Show and animate effect circle - with safety check
            if (this.effectCircle) {
              this.effectCircle.setVisible(true);
              this.effectCircle.setScale(1);
              this.effectCircle.alpha = 0.7;
            }
          } else {
            // Hide status for other expressions
            this.statusText.setVisible(false);
            if (this.scene && this.scene.tweens) {
              this.scene.tweens.killTweensOf(this.statusText);
            }
            this.statusText.setScale(1);
          }
        }
      } else {
        console.warn(`Texture ${textureName} for expression ${expression} does not exist`);
      }
    } catch (error) {
      console.warn('Error in setExpression:', error);
    }
  }

  public async playAnimation(expressions: string[], delay: number = 1000): Promise<void> {
    // Safety checks
    if (!expressions || expressions.length === 0 || !this.scene) return;
    
    try {
      // Play the first expression immediately
      this.setExpression(expressions[0]);
      
      // Schedule the rest of the expressions - only if we have multiple
      if (expressions.length > 1) {
        for (let i = 1; i < expressions.length; i++) {
          // Check if scene still exists before continuing
          if (!this.scene) {
            console.warn('Scene destroyed during animation sequence');
            break;
          }
          
          await this.delay(delay);
          
          // Double-check scene still exists after delay
          if (!this.scene) {
            console.warn('Scene destroyed during animation delay');
            break;
          }
          
          this.setExpression(expressions[i]);
        }
      }
    } catch (error) {
      console.warn('Error in playAnimation:', error);
    }
  }
  
  // Helper method for Promise-based delays
  private delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
  
  public resetExpression(): void {
    // Reset to appropriate expression 
    if (this.role === CharacterRole.PLAYER) {
      // For player, expression is based on pressure
      this.updateFacialExpression();
    } else {
      // For NPCs, simply return to neutral
      this.setExpression('neutral');
    }
  }
  
  public shouldAutoRelease(): boolean {
    // Only applicable to player characters
    if (this.role !== CharacterRole.PLAYER) return false;
    
    // Check if pressure is at critical level where auto-release is possible
    if (this.fartPressure >= GameConfig.FART_PRESSURE_CRITICAL) {
      // Chance increases with pressure
      const overPressure = this.fartPressure - GameConfig.FART_PRESSURE_CRITICAL;
      const chance = overPressure * 0.02; // 2% chance per pressure point over critical
      
      return Math.random() < chance;
    }
    
    return false;
  }
  
  public startSpeaking(): void {
    // Only applicable to NPCs
    if (this.role !== CharacterRole.NPC) return;
    
    // Show speaking indicator
    if (this.speakingIndicator) {
      this.speakingIndicator.setVisible(true);
    }
    
    // Reset talking frame counter
    this.talkingFrame = 0;
    
    // Start mouth animation
    const hasTalkingFrames = this.scene.textures.exists(`${this.id}-talking`);
    
    if (hasTalkingFrames) {
      this.animMouthLoop = this.scene.time.addEvent({
        delay: 150,
        callback: this.animateMouth,
        callbackScope: this,
        loop: true
      });
    }
  }
  
  public stopSpeaking(): void {
    // Only applicable to NPCs
    if (this.role !== CharacterRole.NPC) return;
    
    try {
      // Hide speaking indicator
      if (this.speakingIndicator) {
        this.speakingIndicator.setVisible(false);
      }
      
      // Stop mouth animation - with additional safety checks
      if (this.animMouthLoop) {
        // Check if the timer still exists and is valid before destroying
        if (this.scene && this.scene.time && this.scene.time.removeEvent) {
          try {
            this.scene.time.removeEvent(this.animMouthLoop);
          } catch (e) {
            console.warn('Could not remove animation timer event:', e);
          }
        }
        this.animMouthLoop.destroy();
        this.animMouthLoop = null;
      }
      
      // Reset to current expression with safety check
      if (this.scene && this.scene.textures) {
        this.setExpression('neutral');
      }
    } catch (error) {
      console.warn('Error in stopSpeaking:', error);
      // Clear the animation loop reference to be safe
      this.animMouthLoop = null;
    }
  }
  
  private updateFacialExpression(): void {
    // Only applicable to player character
    if (this.role !== CharacterRole.PLAYER) return;
    
    if (this.currentExpression === 'farting') {
      // Don't change during fart animation
      return;
    }
    
    // Determine expression based on pressure levels
    if (this.fartPressure < 30) {
      this.setExpression('neutral');
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
  
  private createSpeakingIndicator(): void {
    // Only for NPCs
    if (this.role !== CharacterRole.NPC) return;
    
    // Green dot indicator when speaking
    this.speakingIndicator = this.scene.add.rectangle(
      this.x - 160 + 20, 
      this.y - 160 + 20,
      14,
      14,
      0x00ff00
    ).setOrigin(0.5);
    
    // Add a glow effect
    this.speakingIndicator.setStrokeStyle(2, 0x00ff00, 0.5);
  }
  
  private animateMouth = (): void => {
    // Safety checks - verify that all required objects exist
    if (!this.scene || !this.scene.textures || !this.scene.textures.exists || !this.faceSprite) {
      console.warn('Cannot animate mouth: scene or sprite destroyed');
      
      // Clean up the animation timer if it exists to prevent further calls
      if (this.animMouthLoop) {
        this.animMouthLoop.destroy();
        this.animMouthLoop = null;
      }
      return;
    }
    
    // Only for NPCs
    if (this.role !== CharacterRole.NPC) return;
    
    try {
      // Cycle through talking frames
      this.talkingFrame = (this.talkingFrame + 1) % 4;
      
      let frameTexture: string;
      if (this.talkingFrame === 0) {
        frameTexture = `${this.id}-neutral`;
      } else if (this.talkingFrame === 1) {
        frameTexture = `${this.id}-talking`;
      } else if (this.talkingFrame === 2 && this.scene.textures.exists(`${this.id}-talking2`)) {
        frameTexture = `${this.id}-talking2`;
      } else {
        frameTexture = `${this.id}-neutral`;
      }
      
      // Check if texture exists before setting
      if (this.scene.textures.exists(frameTexture)) {
        this.faceSprite.setTexture(frameTexture);
      }
    } catch (error) {
      console.warn('Error in animateMouth:', error);
      
      // Clean up the animation timer on error
      if (this.animMouthLoop) {
        this.animMouthLoop.destroy();
        this.animMouthLoop = null;
      }
    }
  }
  
  /**
   * Cleanup method to properly dispose of resources when the scene changes
   */
  private cleanup = (): void => {
    try {
      // Stop any active animations or timers
      if (this.animMouthLoop) {
        if (this.scene && this.scene.time) {
          this.scene.time.removeEvent(this.animMouthLoop);
        }
        this.animMouthLoop = null;
      }
      
      if (this.fartingTimer) {
        if (this.scene && this.scene.time) {
          this.scene.time.removeEvent(this.fartingTimer);
        }
        this.fartingTimer = null;
      }
      
      // Stop any active particles
      if (this.fartParticles) {
        this.fartParticles.stop();
        this.fartParticles = null;
      }
      
      // Clear any active tweens on status text
      if (this.statusText && this.scene && this.scene.tweens) {
        this.scene.tweens.killTweensOf(this.statusText);
      }
      
      // Clear holding text if exists
      this.clearHoldingText();
      
      // Reference cleanup to avoid memory leaks and prevent
      // potential access to destroyed objects
      this.fartMeter = null;
      
      // Note: We don't destroy scene objects manually as Phaser will handle that
      // We just need to clear our references to them
      
      // Clear the scene reference last
      this.scene = null as any;
    } catch (error) {
      console.warn('Error during Character cleanup:', error);
    }
  }
}
