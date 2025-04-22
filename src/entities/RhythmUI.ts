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
      "PRESS KEYS TO VENT + SPACE TO FART",
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
          bg.setStrokeStyle(1, 0x666666);
          
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
    
    // Remove from active keys set
    this.activeKeys.delete(keyUpper);
    
    // Add visual feedback for key release
    for (let i = 0; i < this.keyTexts.length; i++) {
      if (this.keyTexts[i].text === keyUpper) {
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
      
      // Different colors for different vowels
      let noteColor = 0x22ff22; // Default green
      switch(viseme.keyToPress) {
        case 'A': noteColor = 0xff3333; break; // Red
        case 'E': noteColor = 0x33ff33; break; // Green
        case 'I': noteColor = 0x3333ff; break; // Blue
        case 'O': noteColor = 0xffff33; break; // Yellow
        case 'U': noteColor = 0xff33ff; break; // Purple
      }
      
      // Main note body with colors matching the key
      const noteBody = this.scene.add.rectangle(
        0, 0,
        this.laneWidth - 10, // Wider
        height,
        noteColor, 0.8 // Matching color, more opaque
      );
      noteBody.setStrokeStyle(3, 0xffffff, 1); // Thicker, more visible border
      note.add(noteBody);
      
      // Add letter indicator - bigger and more visible
      const letter = this.scene.add.text(
        0, 0,
        viseme.keyToPress,
        {
          fontFamily: 'Arial',
          fontSize: '28px', // Bigger text
          color: '#ffffff',
          fontStyle: 'bold',
          backgroundColor: '#333333',
          padding: { x: 8, y: 6 }, // More padding
          stroke: '#000000',
          strokeThickness: 2 // Add stroke for visibility
        }
      ).setOrigin(0.5);
      note.add(letter);
      
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
  
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
