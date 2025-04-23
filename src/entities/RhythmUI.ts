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
  private targetZoneMovementTimer: number = 0;
  private targetZoneDirection: number = 1;
  private targetZoneBaseY: number = 0;
  private targetZoneAmplitude: number = 180; // How far it moves up/down
  private targetZoneSpeed: number = 0.005; // Speed of movement
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
    
    // Create a slimmer, more compact UI
    this.laneWidth = 60;
    this.laneHeight = 300;
    
    // Create background - smaller, more transparent, and narrower
    this.background = this.scene.add.rectangle(
      0, 0, 
      this.laneWidth + 40, // Narrower width
      this.laneHeight + 40, // Shorter height
      0x111111, 0.5 // More transparent
    );
    this.background.setStrokeStyle(1, 0x444444);
    this.container.add(this.background);
    
    // Add simpler heading
    const title = this.scene.add.text(
      0, -this.laneHeight/2 - 10,
      "TIMING",
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    this.container.add(title);
    
    // Create main rhythm lane - narrower
    const mainLane = this.scene.add.rectangle(
      0, 0,
      this.laneWidth,
      this.laneHeight,
      0x333333, 0.4
    );
    mainLane.setStrokeStyle(1, 0x6666cc, 0.5);
    this.container.add(mainLane);
    this.lanes.push(mainLane);
    
    // Create target zone - simpler and less visually intrusive
    this.targetZone = this.scene.add.rectangle(
      0, this.targetZoneBaseY,
      this.laneWidth, 20, // Thinner
      0x00ff00, 0.4 // Less opaque green
    );
    this.targetZone.setStrokeStyle(1, 0xffffff, 0.5); // Thinner border
    this.container.add(this.targetZone);
    
    // Add small hit indicator text
    const hitZoneText = this.scene.add.text(
      0, this.targetZoneBaseY,
      "HIT",
      {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    hitZoneText.setName('hitZoneText');
    this.container.add(hitZoneText);
    
    // Add subtle pulsing animation
    this.scene.tweens.add({
      targets: this.targetZone,
      fillAlpha: { from: 0.3, to: 0.5 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    // Add update event to handle movement
    this.scene.events.on('update', this.updateTargetZone, this);
    
    // Create current time marker - thinner line
    this.currentTimeMarker = this.scene.add.rectangle(
      0, this.targetZoneBaseY,
      this.laneWidth, 2,
      0xffffff, 0.6
    );
    this.container.add(this.currentTimeMarker);
    
    // Create smaller key indicators
    const keyRowY = this.laneHeight/2 + 15;
    this.createKeyIndicators(keyRowY);
    
    // Create smaller pressed key display
    this.pressedKeyDisplay = this.scene.add.text(
      0, keyRowY - 40,
      "",
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#333333',
        padding: { x: 8, y: 4 },
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);
    this.container.add(this.pressedKeyDisplay);
    
    // Add minimal instructions
    const instructions = this.scene.add.text(
      0, this.laneHeight/2 + 60,
      "ARROW KEYS",
      {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 1
      }
    ).setOrigin(0.5);
    this.container.add(instructions);
  }
  
  /**
   * Create key indicators - simplified version showing only the primary four arrow keys
   */
  private createKeyIndicators(yPosition: number): void {
    // Map viseme keys to arrow keys - only use the four main arrow keys for clarity
    // A = LEFT, E = UP, I = RIGHT, O = DOWN
    const keyMappings: Record<string, string> = {
      'A': '←',    // Left arrow
      'E': '↑',    // Up arrow
      'I': '→',    // Right arrow
      'O': '↓'     // Down arrow
    };
    
    const keys = ['A', 'E', 'I', 'O'];
    const startX = -((keys.length * 25) / 2) + 12; // Tighter spacing
    
    for (let i = 0; i < keys.length; i++) {
      const keyX = startX + (i * 25);
      
      // Create key container
      const keyContainer = this.scene.add.container(keyX, yPosition);
      
      // Key background - smaller and simpler
      const keyBg = this.scene.add.rectangle(
        0, 0, 20, 20, 
        0x444444, 1
      );
      keyBg.setStrokeStyle(1, 0x666666);
      keyBg.setOrigin(0.5, 0.5);
      keyContainer.add(keyBg);
      
      // Key text - arrow symbol only
      const keyText = this.scene.add.text(
        0, 0, 
        keyMappings[keys[i]],
        {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5);
      keyContainer.add(keyText);
      
      // Store the original letter in the text name property
      keyText.name = keys[i];
      this.keyIndicators.push(keyContainer);
      this.keyTexts.push(keyText);
      
      // Add to main container
      this.container.add(keyContainer);
    }
  }
  
  /**
   * Get the arrow symbol for a key
   */
  private getArrowForKey(key: string): string {
    const keyUpper = key.toUpperCase();
    // Manual mapping to avoid TypeScript issues
    switch (keyUpper) {
      case 'A': return '←';    // Left arrow
      case 'E': return '↑';    // Up arrow
      case 'I': return '→';    // Right arrow
      case 'O': return '↓';    // Down arrow
      case 'U': return '↗';    // Up-right diagonal
      case 'P': return '↖';    // Up-left diagonal
      case 'T': return '↙';    // Down-left diagonal
      case 'S': return '↘';    // Down-right diagonal
      default: return keyUpper; // Default to the key itself
    }
  }

  /**
   * Highlight a specific key
   */
  private highlightKey(key: string, highlight: boolean = true): void {
    const keyUpper = key.toUpperCase();
    
    // Find the index of the key by checking the name property we set
    for (let i = 0; i < this.keyTexts.length; i++) {
      const keyText = this.keyTexts[i];
      
      if (keyText.name === keyUpper) {
        // Get the container
        const container = this.keyIndicators[i];
        
        // Get the background (second child, after shadow)
        const bg = container.list[1] as Phaser.GameObjects.Rectangle;
        
        // Stop any existing tweens
        this.scene.tweens.killTweensOf(container);
        
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
            repeat: 0,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              // Make sure scale resets properly
              container.setScale(1);
            }
          });
        } else {
          bg.setFillStyle(0x444444, 1);
          bg.setStrokeStyle(2, 0x666666);
          
          // Reset the scale
          container.setScale(1);
          
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
    
    // Update the pressed key display with arrow symbol
    const arrowSymbol = this.getArrowForKey(keyUpper);
    this.pressedKeyDisplay.setText(arrowSymbol);
    this.pressedKeyDisplay.setVisible(true);
    
    // Add key press effect
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
    const arrowSymbol = this.getArrowForKey(keyUpper);
    
    // Hide the pressed key display after a delay
    this.scene.time.delayedCall(300, () => {
      if (this.pressedKeyDisplay.text === arrowSymbol) {
        this.pressedKeyDisplay.setVisible(false);
      }
    });
    
    // Unhighlight the key in the UI
    this.highlightKey(keyUpper, false);
    
    // Remove from active keys set
    this.activeKeys.delete(keyUpper);
    
    // Add visual feedback for key release
    for (let i = 0; i < this.keyTexts.length; i++) {
      if (this.keyTexts[i].name === keyUpper) {
        const container = this.keyIndicators[i];
        
        // Flash effect to show key release
        this.scene.tweens.add({
          targets: container,
          alpha: { from: 0.5, to: 1 },
          duration: 200,
          ease: 'Sine.easeOut'
        });
      }
    }
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
    
    // Get difficulty settings
    const difficulty = 1; // Default to easy
    const difficultySettings = GameConfig.DIFFICULTY_MODIFIER[difficulty];
    
    // Only use the configured number of visemes based on difficulty
    const limitedVisemes = sortedVisemes.slice(0, difficultySettings.noteLimit);
    
    // Create note for each viseme
    limitedVisemes.forEach((viseme, index) => {
      // Skip silence visemes
      if (viseme.viseme === Viseme.SILENCE) return;
      
      // Create note container
      const note = this.scene.add.container(0, -this.laneHeight/2);
      note.setName(`note-${viseme.keyToPress}`); // Add name for identifying
      
      // Make notes larger and more visible
      const height = Math.max(40, (viseme.endTime - viseme.startTime) / 15);
      
      // Map key to arrow symbol for display
      const arrowSymbol = this.getArrowForKey(viseme.keyToPress);
      
      // Different colors for different arrows based on direction
      let noteColor = 0x22ff22; // Default green
      switch(viseme.keyToPress) {
        case 'A': noteColor = 0xff3333; break; // Left - Red
        case 'E': noteColor = 0x33ff33; break; // Up - Green
        case 'I': noteColor = 0x3333ff; break; // Right - Blue
        case 'O': noteColor = 0xffff33; break; // Down - Yellow
        case 'U': noteColor = 0xff33ff; break; // Diagonal - Purple
        case 'P': noteColor = 0x33ffff; break; // Diagonal - Cyan
        case 'T': noteColor = 0xff9900; break; // Diagonal - Orange
        case 'S': noteColor = 0x9966ff; break; // Diagonal - Violet
      }
      
      // Main note body - make it look like a key
      const noteBody = this.scene.add.rectangle(
        0, 0,
        this.laneWidth - 10, // Wider
        height,
        noteColor, 0.8 // Matching color, more opaque
      );
      noteBody.setStrokeStyle(3, 0xffffff, 1); // Thicker, more visible border
      // No rounded corners since setCornerRadius is not available
      note.add(noteBody);
      
      // Add arrow indicator - bigger and more visible
      const arrow = this.scene.add.text(
        0, 0,
        arrowSymbol,
        {
          fontFamily: 'Arial',
          fontSize: '32px', // Bigger text
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3 // Add stroke for visibility
        }
      ).setOrigin(0.5);
      note.add(arrow);
      
      // Store the key in the note for reference
      (note as any).keyToPress = viseme.keyToPress;
      
      // Add to container
      this.container.add(note);
      this.notes.push(note);
      
      // Add a indicator for "NEXT" on the closest upcoming note
      if (index === 0) { // First note is next
        const nextIndicator = this.scene.add.text(
          -this.laneWidth/2 - 50, 0,
          "NEXT →",
          {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }
        ).setOrigin(1, 0.5);
        note.add(nextIndicator);
        
        // Add flashing animation to draw attention
        this.scene.tweens.add({
          targets: nextIndicator,
          alpha: { from: 0.5, to: 1 },
          duration: 400,
          yoyo: true,
          repeat: -1
        });
      }
      
      // Animate note moving down the lane - speed based on difficulty
      this.scene.tweens.add({
        targets: note,
        y: this.laneHeight/2 + height/2,
        duration: viseme.startTime * (dialogueDuration / viseme.endTime) * difficultySettings.noteFallSpeed,
        ease: 'Linear',
        onComplete: () => {
          note.destroy();
          this.notes = this.notes.filter(n => n !== note);
        }
      });
    });
  }
  
  /**
   * Remove a note from the UI when its key is pressed
   * @param key The key that was pressed
   */
  public removeNoteWithKey(key: string): void {
    // Find notes with this key
    const keyToPress = key.toUpperCase();
    
    // Check if we're getting close to the target zone
    const notesToRemove: Phaser.GameObjects.Container[] = [];
    
    for (const note of this.notes) {
      // Check if this note has the matching key
      if ((note as any).keyToPress === keyToPress) {
        const noteY = note.y;
        const targetY = this.targetZone.y;
        
        // Only remove if it's within a reasonable distance of the target zone
        const distance = Math.abs(noteY - targetY);
        
        // Increase threshold significantly to make hit detection more forgiving
        // This makes it easier to hit notes that are approaching the target zone
        const threshold = 200; // Much wider threshold for better gameplay (increased from 150)
        
        // Add special handling for notes that are about to enter the target zone
        const isApproaching = noteY < targetY && noteY > targetY - 100;
        
        if (distance < threshold || isApproaching) {
          notesToRemove.push(note);
          
          // Create a hit effect animation
          const hitEffect = this.scene.add.circle(
            0, noteY,
            40, // Wider effect
            0xffffff, 0.8
          );
          this.container.add(hitEffect);
          
          // Animate and remove
          this.scene.tweens.add({
            targets: hitEffect,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => hitEffect.destroy()
          });
          
          // No need to remove more than one note with this key
          break;
        }
      }
    }
    
    // Remove the notes
    for (const note of notesToRemove) {
      // Explode animation
      this.scene.tweens.add({
        targets: note,
        scaleX: 1.5,
        scaleY: 0.1,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          // Remove from our notes array
          this.notes = this.notes.filter(n => n !== note);
          // Destroy the note
          note.destroy();
        }
      });
    }
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
    
    // Create highlight effect on target zone using current position
    const highlight = this.scene.add.rectangle(
      0, this.targetZone.y, // Use current target zone Y position
      this.laneWidth - 10, 30,
      colors[accuracy], 0.7
    );
    highlight.setName('viseme-match');
    this.container.add(highlight);
    
    // Flash the letter that matched at current target zone position
    const letterText = this.scene.add.text(
      0, this.targetZone.y,
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
    
    // Create explosion effect at current target zone position
    const explosion = this.scene.add.circle(
      0, this.targetZone.y, // Use current Y position of moving target zone
      40,
      colors[safetyStatus], 0.7
    );
    explosion.setName('fart-release');
    this.container.add(explosion);
    
    // Show the key used - at current target zone position
    const keyText = this.scene.add.text(
      0, this.targetZone.y,
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
   * Update the target zone position to create a moving hit zone
   */
  private updateTargetZone = (): void => {
    if (!this.scene) return; // Safety check
    
    // Increment timer
    this.targetZoneMovementTimer += this.scene.game.loop.delta * this.targetZoneSpeed;
    
    // Calculate new Y position using sine wave for smooth up and down motion
    const newY = this.targetZoneBaseY + Math.sin(this.targetZoneMovementTimer) * this.targetZoneAmplitude;
    
    // Update the target zone position
    this.targetZone.y = newY;
    
    // Update the current time marker to match
    this.currentTimeMarker.y = newY;
    
    // Update hit zone text position
    const hitZoneText = this.container.getByName('hitZoneText');
    if (hitZoneText && hitZoneText instanceof Phaser.GameObjects.Text) {
      hitZoneText.y = newY;
    }
  }
  
  /**
   * Reset all highlighted keys to normal state
   */
  public resetAllKeyHighlights(): void {
    // Get all active keys and unhighlight them
    const activeKeysCopy = [...this.activeKeys]; // Copy to avoid issues while iterating
    
    activeKeysCopy.forEach(key => {
      this.highlightKey(key, false);
    });
    
    // Clear the active keys set
    this.activeKeys.clear();
    
    // Hide the pressed key display
    this.pressedKeyDisplay.setVisible(false);
  }
  
  /**
   * Set visibility of the UI
   */
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
