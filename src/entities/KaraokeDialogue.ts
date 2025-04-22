import Phaser from 'phaser';
import { SafeZone, SpeechMark } from '../types/speech/SpeechMark';
import { VisemeType } from '../types/speech/SpeechMark';

/**
 * Karaoke-style dialogue display that highlights the current word and viseme
 */
export class KaraokeDialogue {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private speakerText: Phaser.GameObjects.Text;
  private dialogueText: Phaser.GameObjects.Text[] = [];
  private visemeText: Phaser.GameObjects.Text[] = [];
  private wordMarks: SpeechMark[] = [];
  private visemeMarks: SpeechMark[] = [];
  private currentTime: number = 0;
  private dialogueStartTime: number = 0;
  private fullText: string = '';
  private lastHighlightedWordIndex: number = -1;
  private lastHighlightedVisemeIndex: number = -1;
  private safePadding: number = 15;
  private width: number;
  private height: number;
  
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    
    // Create container for all elements
    this.container = this.scene.add.container(x, y);
    
    // Create background
    this.background = this.scene.add.rectangle(
      0, 0, width, height, 0x333333, 0.9
    );
    this.background.setStrokeStyle(1, 0x555555);
    this.container.add(this.background);
    
    // Create speaker name text
    this.speakerText = this.scene.add.text(
      -width/2 + this.safePadding, 
      -height/2 + this.safePadding,
      "", 
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    );
    this.container.add(this.speakerText);
    
    // Hide until needed
    this.container.setVisible(false);
  }
  
  /**
   * Set the current dialogue with speech marks for karaoke highlighting
   */
  public setDialogue(speakerName: string, text: string, wordMarks: SpeechMark[], visemeMarks: SpeechMark[]): void {
    // Clear any existing text elements
    this.dialogueText.forEach(t => t.destroy());
    this.dialogueText = [];
    
    this.visemeText.forEach(t => t.destroy());
    this.visemeText = [];
    
    // Store speech marks
    this.wordMarks = wordMarks;
    this.visemeMarks = visemeMarks;
    this.fullText = text;
    
    // Set speaker name
    this.speakerText.setText(speakerName + ":");
    
    // Create text for each word
    const wordStartY = -this.height/2 + this.safePadding * 3;
    let currentX = -this.width/2 + this.safePadding;
    let currentY = wordStartY;
    let lineWidth = 0;
    
    // Process each word mark and create text objects
    for (let i = 0; i < this.wordMarks.length; i++) {
      const mark = this.wordMarks[i];
      const word = mark.value;
      
      // Add space after each word except the first one on a new line
      const wordWithSpace = (i < this.wordMarks.length - 1 && lineWidth > 0) ? word + " " : word;
      
      // Check if we need to wrap to next line
      const wordWidth = this.getTextWidth(wordWithSpace);
      
      if (lineWidth + wordWidth > this.width - this.safePadding * 2) {
        // Move to next line
        currentX = -this.width/2 + this.safePadding;
        currentY += 30; // Line height
        lineWidth = 0;
      }
      
      // Create text for this word
      const wordText = this.scene.add.text(
        currentX,
        currentY,
        wordWithSpace,
        {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#cccccc'
        }
      );
      
      // Store reference to the word's speech mark in the text object
      (wordText as any).speechMark = mark;
      
      // Add to container and tracking array
      this.container.add(wordText);
      this.dialogueText.push(wordText);
      
      // Update current position for next word
      currentX += wordWidth;
      lineWidth += wordWidth;
    }
    
    // Create viseme indicator text above dialogue
    const visemeY = -this.height/2 + this.safePadding * 2;
    
    this.visemeText = [];
    
    // Create viseme keys that will appear above the dialogue
    for (let i = 0; i < 5; i++) {
      const visemeKey = this.scene.add.text(
        0, // Will be positioned dynamically
        visemeY,
        "",
        {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#00ff00',
          fontStyle: 'bold',
          backgroundColor: '#111111',
          padding: { x: 8, y: 4 }
        }
      ).setOrigin(0.5);
      
      // Hide initially
      visemeKey.setVisible(false);
      
      // Add to container and tracking
      this.container.add(visemeKey);
      this.visemeText.push(visemeKey);
    }
    
    // Reset state
    this.lastHighlightedWordIndex = -1;
    this.lastHighlightedVisemeIndex = -1;
    
    // Show the dialogue
    this.container.setVisible(true);
    
    // Record start time
    this.dialogueStartTime = this.scene.time.now;
  }
  
  /**
   * Update the karaoke display based on current time
   */
  public update(): void {
    if (!this.container.visible || this.wordMarks.length === 0) return;
    
    // Calculate current time in the dialogue
    this.currentTime = this.scene.time.now - this.dialogueStartTime;
    
    // Find current word
    let currentWordIndex = -1;
    
    for (let i = 0; i < this.wordMarks.length; i++) {
      if (this.wordMarks[i].time <= this.currentTime) {
        currentWordIndex = i;
      } else {
        break;
      }
    }
    
    // Highlight current word if different from last highlighted
    if (currentWordIndex !== this.lastHighlightedWordIndex && currentWordIndex >= 0) {
      // Reset previous word's color
      if (this.lastHighlightedWordIndex >= 0 && this.lastHighlightedWordIndex < this.dialogueText.length) {
        this.dialogueText[this.lastHighlightedWordIndex].setColor('#cccccc');
      }
      
      // Highlight current word
      if (currentWordIndex < this.dialogueText.length) {
        this.dialogueText[currentWordIndex].setColor('#ffffff');
        this.lastHighlightedWordIndex = currentWordIndex;
      }
    }
    
    // Find current viseme and update the viseme keys
    this.updateVisemeDisplay();
  }
  
  /**
   * Update the viseme display to show the current and upcoming viseme keys
   */
  private updateVisemeDisplay(): void {
    // Find active and upcoming visemes
    const activeVisemes = this.findActiveAndUpcomingVisemes();
    
    // Update each viseme key text
    for (let i = 0; i < this.visemeText.length; i++) {
      if (i < activeVisemes.length) {
        const viseme = activeVisemes[i];
        const visemeKeyText = this.visemeText[i];
        
        // Set text to the key to press
        visemeKeyText.setText(viseme.keyToPress);
        
        // Position above the corresponding word
        if (viseme.wordIndex >= 0 && viseme.wordIndex < this.dialogueText.length) {
          const word = this.dialogueText[viseme.wordIndex];
          visemeKeyText.x = word.x + word.width / 2;
          
          // Make special highlighting for the active viseme
          if (i === 0) {
            visemeKeyText.setColor('#00ff00');
            visemeKeyText.setFontSize(32);
          } else {
            // Upcoming visemes get progressively lighter
            const opacity = Math.max(0.4, 1 - (i * 0.2));
            visemeKeyText.setColor(`rgba(255, 255, 255, ${opacity})`);
            visemeKeyText.setFontSize(24);
          }
          
          visemeKeyText.setVisible(true);
        } else {
          visemeKeyText.setVisible(false);
        }
      } else {
        this.visemeText[i].setVisible(false);
      }
    }
  }
  
  /**
   * Find the active and upcoming visemes
   */
  private findActiveAndUpcomingVisemes(): Array<{keyToPress: string, wordIndex: number, time: number}> {
    const result = [];
    const lookAheadTime = 2000; // Look ahead 2 seconds
    
    // First find the active viseme
    let activeViseme = null;
    
    for (let i = 0; i < this.visemeMarks.length; i++) {
      const viseme = this.visemeMarks[i];
      
      // Skip visemes that don't have a corresponding vowel key
      const visemeValue = viseme.value.toLowerCase();
      if (!this.isVowelViseme(visemeValue)) continue;
      
      if (viseme.time <= this.currentTime && 
          (i === this.visemeMarks.length - 1 || this.visemeMarks[i + 1].time > this.currentTime)) {
        // Convert viseme value to key letter
        const keyToPress = this.getKeyForViseme(visemeValue);
        
        // Find which word this viseme belongs to
        const wordIndex = this.findWordIndexForViseme(viseme);
        
        activeViseme = {
          keyToPress,
          wordIndex,
          time: viseme.time
        };
        break;
      }
    }
    
    // If we found an active viseme, add it first
    if (activeViseme) {
      result.push(activeViseme);
    }
    
    // Then find upcoming visemes
    for (const viseme of this.visemeMarks) {
      // Skip visemes that are in the past or too far in the future
      if (viseme.time <= this.currentTime || viseme.time > this.currentTime + lookAheadTime) continue;
      
      // Skip visemes that don't have a corresponding vowel key
      const visemeValue = viseme.value.toLowerCase();
      if (!this.isVowelViseme(visemeValue)) continue;
      
      // Convert viseme value to key letter
      const keyToPress = this.getKeyForViseme(visemeValue);
      
      // Find which word this viseme belongs to
      const wordIndex = this.findWordIndexForViseme(viseme);
      
      result.push({
        keyToPress,
        wordIndex,
        time: viseme.time
      });
      
      // Limit to 4 upcoming visemes (plus the active one)
      if (result.length >= 5) break;
    }
    
    return result;
  }
  
  /**
   * Find which word a viseme belongs to
   */
  private findWordIndexForViseme(viseme: SpeechMark): number {
    for (let i = 0; i < this.wordMarks.length; i++) {
      const word = this.wordMarks[i];
      const nextWordTime = (i < this.wordMarks.length - 1) ? this.wordMarks[i + 1].time : Infinity;
      
      if (viseme.time >= word.time && viseme.time < nextWordTime) {
        return i;
      }
    }
    
    // If no matching word is found, return the last word
    return this.wordMarks.length - 1;
  }
  
  /**
   * Check if a viseme is a vowel that we want to show
   */
  private isVowelViseme(visemeValue: string): boolean {
    // We only want to show vowels for simplicity
    const vowels = ['a', 'e', 'i', 'o', 'u', 'æ', 'ɛ', 'ə', 'ɪ', 'ɔ', 'ʊ', 'ʌ'];
    return vowels.some(vowel => visemeValue.startsWith(vowel));
  }
  
  /**
   * Get the key to press for a viseme
   */
  private getKeyForViseme(visemeValue: string): string {
    // Map viseme values to vowel keys
    if (visemeValue.startsWith('a') || visemeValue.startsWith('æ')) return 'A';
    if (visemeValue.startsWith('e') || visemeValue.startsWith('ɛ') || visemeValue.startsWith('ə')) return 'E';
    if (visemeValue.startsWith('i') || visemeValue.startsWith('ɪ')) return 'I';
    if (visemeValue.startsWith('o') || visemeValue.startsWith('ɔ') || visemeValue.startsWith('ʊ')) return 'O';
    if (visemeValue.startsWith('u') || visemeValue.startsWith('ʌ')) return 'U';
    
    // Default to a random vowel if unrecognized
    const vowels = ['A', 'E', 'I', 'O', 'U'];
    return vowels[Math.floor(Math.random() * vowels.length)];
  }
  
  /**
   * Estimate the width of a text string
   */
  private getTextWidth(text: string): number {
    // Simple estimation for positioning
    return text.length * 12;
  }
  
  /**
   * Get the current viseme key that should be pressed
   */
  public getCurrentVisemeKey(): string | null {
    // Find the active viseme
    for (let i = 0; i < this.visemeMarks.length; i++) {
      const viseme = this.visemeMarks[i];
      
      // Skip visemes that don't have a corresponding vowel key
      const visemeValue = viseme.value.toLowerCase();
      if (!this.isVowelViseme(visemeValue)) continue;
      
      if (viseme.time <= this.currentTime && 
          (i === this.visemeMarks.length - 1 || this.visemeMarks[i + 1].time > this.currentTime)) {
        // Convert viseme value to key letter
        return this.getKeyForViseme(visemeValue);
      }
    }
    
    return null;
  }
  
  /**
   * Hide the dialogue
   */
  public hide(): void {
    this.container.setVisible(false);
  }
  
  /**
   * Show the dialogue
   */
  public show(): void {
    this.container.setVisible(true);
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    this.container.destroy();
  }
}
