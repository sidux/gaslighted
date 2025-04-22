import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { SafeZone } from '../types/speech/SpeechMark';
import { Viseme, VisemeData } from '../types/speech/Viseme';

/**
 * Guitar Hero style rhythm UI for showing viseme timing and keys to press
 */
export class RhythmUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private lanes: Phaser.GameObjects.Rectangle[] = [];
  private notes: Phaser.GameObjects.Container[] = [];
  private currentTimeMarker: Phaser.GameObjects.Rectangle;
  private targetZone: Phaser.GameObjects.Rectangle;
  private laneWidth: number = 80;
  private laneHeight: number = 400;
  private speakerLabels: Phaser.GameObjects.Text[] = [];
  private activeSpeaker: string | null = null;
  private keyIndicators: Phaser.GameObjects.Container[] = [];
  private activeKeys: Set<string> = new Set();
  private keyTexts: Phaser.GameObjects.Text[] = [];
  private pressedKeyDisplay: Phaser.GameObjects.Text;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    
    // Create container
    this.container = this.scene.add.container(x, y);
    
    // Create background
    this.background = this.scene.add.rectangle(
      0, 0, 
      this.laneWidth * 2 + 20, // Width for single lane + padding
      this.laneHeight + 60,     // Height + space for labels
      0x111111, 0.8
    );
    this.background.setStrokeStyle(2, 0x444444);
    this.container.add(this.background);
    
    // Add title
    const title = this.scene.add.text(
      0, -this.laneHeight/2 - 25,
      "SPEECH RHYTHM",
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    this.container.add(title);
    
    // Create main rhythm lane
    const mainLane = this.scene.add.rectangle(
      0, 0,
      this.laneWidth - 10,
      this.laneHeight,
      0x333333, 0.5
    );
    mainLane.setStrokeStyle(1, 0x6666cc, 0.8);
    this.container.add(mainLane);
    this.lanes.push(mainLane);
    
    // Create target zone (where notes should hit) - make it more visible
    this.targetZone = this.scene.add.rectangle(
      0, 80, // Position in lower part of track
      this.laneWidth - 10, 40, // Taller
      0x00ff00, 0.5 // More visible green
    );
    this.targetZone.setStrokeStyle(3, 0xffffff, 0.8); // Thicker border
    this.container.add(this.targetZone);
    
    // Add "HIT ZONE" text to make it super clear
    const hitZoneText = this.scene.add.text(
      0, 80,
      "HIT ZONE",
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);
    this.container.add(hitZoneText);
    
    // Add pulsing animation to draw attention
    this.scene.tweens.add({
      targets: this.targetZone,
      fillAlpha: { from: 0.5, to: 0.7 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    // Create current time marker (horizontal line)
    this.currentTimeMarker = this.scene.add.rectangle(
      0, 80, // Same position as target zone
      this.laneWidth * 2, 3,
      0xffffff, 0.8
    );
    this.container.add(this.currentTimeMarker);
    
    // Create key indicators at bottom of UI
    const keyRowY = this.laneHeight/2 + 20;
    this.createKeyIndicators(keyRowY);
    
    // Create display for pressed key
    this.pressedKeyDisplay = this.scene.add.text(
      0, keyRowY + 40,
      "",
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#333333',
        padding: { x: 10, y: 6 }
      }
    ).setOrigin(0.5);
    this.container.add(this.pressedKeyDisplay);
    
    // Add instructions
    const instructions = this.scene.add.text(
      0, this.laneHeight/2 + 70,
      "PRESS KEY + RELEASE SPACE",
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffff00'
      }
    ).setOrigin(0.5);
    this.container.add(instructions);
  }
  
  /**
   * Create key indicators at the bottom of the UI
   */
  private createKeyIndicators(yPosition: number): void {
    // Create common viseme keys: A, E, I, O, U, P, T, S
    const keys = ['A', 'E', 'I', 'O', 'U', 'P', 'T', 'S'];
    const startX = -((keys.length * 30) / 2) + 15; // Center the keys
    
    for (let i = 0; i < keys.length; i++) {
      const keyX = startX + (i * 30);
      
      // Create key container
      const keyContainer = this.scene.add.container(keyX, yPosition);
      
      // Key background
      const keyBg = this.scene.add.rectangle(
        0, 0, 25, 25, 
        0x444444, 1
      );
      keyBg.setStrokeStyle(1, 0x666666);
      keyContainer.add(keyBg);
      
      // Key text
      const keyText = this.scene.add.text(
        0, 0, 
        keys[i],
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#ffffff'
        }
      ).setOrigin(0.5);
      keyContainer.add(keyText);
      
      // Store references
      this.keyIndicators.push(keyContainer);
      this.keyTexts.push(keyText);
      
      // Add to main container
      this.container.add(keyContainer);
    }
  }
  
  /**
   * Highlight a specific key
   */
  private highlightKey(key: string, highlight: boolean = true): void {
    const keyUpper = key.toUpperCase();
    
    // Find the index of the key
    for (let i = 0; i < this.keyTexts.length; i++) {
      const keyText = this.keyTexts[i];
      
      if (keyText.text === keyUpper) {
        // Get the container
        const container = this.keyIndicators[i];
        
        // Get the background (first child)
        const bg = container.list[0] as Phaser.GameObjects.Rectangle;
        
        // Highlight or unhighlight
        if (highlight) {
          bg.setFillStyle(0x00aaff, 1);
          bg.setStrokeStyle(2, 0x00ffff);
          
          // Add to active keys
          this.activeKeys.add(keyUpper);
          
          // Add a pulse animation
          this.scene.tweens.add({
            targets: container,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 100,
            yoyo: true,
            ease: 'Sine.easeInOut'
          });
        } else {
          bg.setFillStyle(0x444444, 1);
          bg.setStrokeStyle(1, 0x666666);
          
          // Remove from active keys
          this.activeKeys.delete(keyUpper);
        }
      }
    }
  }
  
  /**
   * Display a key being pressed
   */
  public showKeyPress(key: string): void {
    const keyUpper = key.toUpperCase();
    
    // Update the pressed key display
    this.pressedKeyDisplay.setText(keyUpper);
    this.pressedKeyDisplay.setVisible(true);
    
    // Pulse effect
    this.scene.tweens.add({
      targets: this.pressedKeyDisplay,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Highlight the key in the UI
    this.highlightKey(keyUpper);
  }
  
  /**
   * Display key release
   */
  public showKeyRelease(key: string): void {
    const keyUpper = key.toUpperCase();
    
    // Hide the pressed key display after a delay
    this.scene.time.delayedCall(300, () => {
      if (this.pressedKeyDisplay.text === keyUpper) {
        this.pressedKeyDisplay.setVisible(false);
      }
    });
    
    // Unhighlight the key in the UI
    this.highlightKey(keyUpper, false);
  }
  
  /**
   * Clear all notes from the UI
   */
  public clearNotes(): void {
    this.notes.forEach(note => note.destroy());
    this.notes = [];
  }
  
  /**
   * Set the active speaker
   */
  public setActiveSpeaker(speakerId: string): void {
    this.activeSpeaker = speakerId;
  }
  
  /**
   * Add upcoming visemes to the rhythm UI
   */
  public addUpcomingVisemes(visemes: VisemeData[], dialogueDuration: number): void {
    // Clear existing notes
    this.clearNotes();
    
    // For easier gameplay, limit the number of notes shown at once
    // Sort by start time so we get the most immediate ones
    const sortedVisemes = [...visemes].sort((a, b) => a.startTime - b.startTime);
    
    // Only use the next few visemes (up to 5) to avoid overwhelming the player
    const limitedVisemes = sortedVisemes.slice(0, 5);
    
    // Create note for each viseme
    limitedVisemes.forEach(viseme => {
      // Skip silence visemes
      if (viseme.viseme === Viseme.SILENCE) return;
      
      // Create note container
      const note = this.scene.add.container(0, -this.laneHeight/2);
      
      // Make notes larger and more visible
      const height = Math.max(30, (viseme.endTime - viseme.startTime) / 15);
      
      // Main note body with brighter colors
      const noteBody = this.scene.add.rectangle(
        0, 0,
        this.laneWidth - 10, // Wider
        height,
        0x22ff22, 0.8 // Brighter green, more opaque
      );
      noteBody.setStrokeStyle(3, 0xffffff, 1); // Thicker, more visible border
      note.add(noteBody);
      
      // Add letter indicator - bigger and more visible
      const letter = this.scene.add.text(
        0, 0,
        viseme.keyToPress,
        {
          fontFamily: 'Arial',
          fontSize: '24px', // Bigger text
          color: '#ffffff',
          fontStyle: 'bold',
          backgroundColor: '#333333',
          padding: { x: 6, y: 4 }, // More padding
          stroke: '#000000',
          strokeThickness: 2 // Add stroke for visibility
        }
      ).setOrigin(0.5);
      note.add(letter);
      
      // Add to container
      this.container.add(note);
      this.notes.push(note);
      
      // Add a indicator for "NEXT" on the closest upcoming note
      if (note === this.container.getAll()[1]) { // First note after background
        const nextIndicator = this.scene.add.text(
          -this.laneWidth/2 - 50, 0,
          "NEXT →",
          {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffff00',
            fontStyle: 'bold'
          }
        ).setOrigin(1, 0.5);
        note.add(nextIndicator);
        
        // Add flashing animation to draw attention
        this.scene.tweens.add({
          targets: nextIndicator,
          alpha: { from: 0.5, to: 1 },
          duration: 500,
          yoyo: true,
          repeat: -1
        });
      }
      
      // Animate note moving down the lane - slower for easier timing
      this.scene.tweens.add({
        targets: note,
        y: this.laneHeight/2 + height/2,
        duration: viseme.startTime * (dialogueDuration / viseme.endTime) * 1.2, // 20% slower
        ease: 'Linear',
        onComplete: () => {
          note.destroy();
          this.notes = this.notes.filter(n => n !== note);
        }
      });
    });
  }
  
  /**
   * Update the UI based on current fart pressure
   */
  public updatePressureIndicator(pressure: number): void {
    // Remove any existing pressure indicator
    this.container.getAll()
      .filter(obj => obj.name === 'pressure-indicator')
      .forEach(obj => obj.destroy());
    
    // Create new pressure indicator - horizontal bar showing current pressure
    const indicator = this.scene.add.rectangle(
      -this.laneWidth/2 - 10, 0, // Left side of the UI
      10,
      (pressure / 100) * this.laneHeight,
      0xff6600, 0.7
    );
    indicator.setName('pressure-indicator');
    indicator.setOrigin(0.5, 1); // Origin at bottom center
    indicator.setY(this.laneHeight/2); // Position at bottom of lane
    indicator.setStrokeStyle(1, 0xff9900, 0.8);
    
    this.container.add(indicator);
  }
  
  /**
   * Show when viseme is matched correctly with the right key
   */
  public showVisemeMatch(key: string, accuracy: 'perfect' | 'good' | 'miss'): void {
    // Colors based on accuracy
    const colors = {
      perfect: 0x00ff00, // Green
      good: 0xffff00,    // Yellow
      miss: 0xff0000     // Red
    };
    
    // Text based on accuracy
    const texts = {
      perfect: 'PERFECT!',
      good: 'GOOD',
      miss: 'MISS'
    };
    
    // Create highlight effect on target zone
    const highlight = this.scene.add.rectangle(
      0, 80, // Same Y as target zone
      this.laneWidth - 10, 30,
      colors[accuracy], 0.7
    );
    highlight.setName('viseme-match');
    this.container.add(highlight);
    
    // Flash the letter that matched
    const letterText = this.scene.add.text(
      0, 80,
      key.toUpperCase(),
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    this.container.add(letterText);
    
    // Add accuracy text
    const accuracyText = this.scene.add.text(
      0, 40,
      texts[accuracy],
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    this.container.add(accuracyText);
    
    // Animate and remove
    this.scene.tweens.add({
      targets: [highlight, letterText],
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        highlight.destroy();
        letterText.destroy();
      }
    });
    
    this.scene.tweens.add({
      targets: accuracyText,
      y: 0,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => accuracyText.destroy()
    });
  }
  
  /**
   * Show when player is holding the fart
   */
  public showHolding(isHolding: boolean): void {
    // Remove existing indicators
    this.container.getAll()
      .filter(obj => obj.name === 'hold-indicator')
      .forEach(obj => obj.destroy());
    
    if (isHolding) {
      // Show holding indicator
      const holdBox = this.scene.add.rectangle(
        0, 15,
        120, 30,
        0x0066cc, 0.8
      );
      holdBox.setName('hold-indicator');
      holdBox.setStrokeStyle(2, 0x3399ff);
      this.container.add(holdBox);
      
      const holdText = this.scene.add.text(
        0, 15,
        "HOLDING",
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#ffffff',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5);
      holdText.setName('hold-indicator');
      this.container.add(holdText);
    }
  }
  
  /**
   * Show a fart release at the current position with a specific key
   */
  public showFartRelease(safetyStatus: 'safe' | 'neutral' | 'danger', key: string): void {
    // Color based on safety
    const colors = {
      safe: 0x00ff00,
      neutral: 0xffff00,
      danger: 0xff0000
    };
    
    // Create explosion effect
    const explosion = this.scene.add.circle(
      0, 80, // Same Y as current time marker
      40,
      colors[safetyStatus], 0.7
    );
    explosion.setName('fart-release');
    this.container.add(explosion);
    
    // Show the key used
    const keyText = this.scene.add.text(
      0, 80,
      key.toUpperCase(),
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#333333',
        padding: { x: 8, y: 6 }
      }
    ).setOrigin(0.5);
    this.container.add(keyText);
    
    // Animate explosion
    this.scene.tweens.add({
      targets: explosion,
      radius: 80,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => explosion.destroy()
    });
    
    // Animate key text
    this.scene.tweens.add({
      targets: keyText,
      y: 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => keyText.destroy()
    });
    
    // Add text indicator
    let text = 'PERFECT!';
    if (safetyStatus === 'neutral') text = 'OKAY';
    if (safetyStatus === 'danger') text = 'BAD!';
    
    const indicator = this.scene.add.text(
      0, 10,
      text,
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    this.container.add(indicator);
    
    // Animate and remove
    this.scene.tweens.add({
      targets: indicator,
      y: -20,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => indicator.destroy()
    });
  }
  
  /**
   * Set position of the UI
   */
  public setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }
  
  /**
   * Set visibility of the UI
   */
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
