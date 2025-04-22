import Phaser from 'phaser';
import { Dialogue } from '../types/Dialogue';
import { Character } from '../entities/Character';
import { AudioManager } from './AudioManager';
import { GameScene } from '../scenes/GameScene';
import { NeuralSpeechProcessor } from './NeuralSpeechProcessor';
import { SafeZone, SpeechMark } from '../types/speech/SpeechMark';
import { VisemeData } from '../types/speech/Viseme';
import { KaraokeDialogue } from '../entities/KaraokeDialogue';

export class DialogueManager {
  private scene: GameScene;
  private dialogues: Dialogue[];
  private audioManager: AudioManager;
  private speechProcessor: NeuralSpeechProcessor;
  private npcs: Character[] = [];
  private currentDialogueIndex: number = -1;
  private isDialogueActive: boolean = false;
  private nextDialogueTimer: Phaser.Time.TimerEvent | null = null;
  private currentSafetyStatus: 'safe' | 'neutral' | 'danger' = 'neutral';
  private currentDialogueStartTime: number = 0;
  private currentDialogue: Dialogue | null = null;
  private safeZones: SafeZone[] = [];
  private speechRhythmDisplay: Phaser.GameObjects.Container | null = null;
  private karaokeDialogue: KaraokeDialogue;
  private currentSpeechMarks: SpeechMark[] = [];
  private currentVisemeMarks: SpeechMark[] = [];
  
  // Flags to prevent double initialization and start
  private static instance: DialogueManager | null = null;
  private initialized: boolean = false;
  private dialogueStarted: boolean = false;
  
  constructor(scene: GameScene, dialogues: Dialogue[]) {
    // Implement singleton pattern to prevent multiple instances
    if (DialogueManager.instance) {
      console.warn("DialogueManager already exists - returning existing instance");
      return DialogueManager.instance;
    }
    
    DialogueManager.instance = this;
    
    this.scene = scene;
    this.dialogues = dialogues;
    this.audioManager = new AudioManager(scene);
    this.speechProcessor = new NeuralSpeechProcessor();
    
    // Create rhythm display
    this.createSpeechRhythmDisplay();
    
    // Create karaoke dialogue display
    this.karaokeDialogue = new KaraokeDialogue(
      scene,
      scene.cameras.main.width / 2,
      scene.cameras.main.height - 180,
      scene.cameras.main.width * 0.6,
      150
    );
    
    this.initialized = true;
    console.log("DialogueManager initialized once");
  }
  
  public setNPCs(npcs: Character[]): void {
    this.npcs = npcs;
  }
  
  public update(delta: number): void {
    // Update safety status based on current time in dialogue
    if (this.isDialogueActive && this.currentDialogue) {
      const currentTime = this.scene.time.now - this.currentDialogueStartTime;
      
      // Update safety status based on speech rhythm
      this.currentSafetyStatus = this.speechProcessor.getSafetyStatusAtTime(
        this.currentDialogue,
        currentTime
      );
      
      // Update rhythm display
      this.updateRhythmDisplay(currentTime);
      
      // Update karaoke dialogue display
      this.karaokeDialogue.update();
    }
  }
  
  /**
   * Creates a visual display for speech rhythm
   */
  private createSpeechRhythmDisplay(): void {
    // Create container for rhythm display elements
    this.speechRhythmDisplay = this.scene.add.container(
      this.scene.cameras.main.width - 150,
      this.scene.cameras.main.height / 2
    );
    
    // Add background
    const bg = this.scene.add.rectangle(0, 0, 20, 300, 0x222222, 0.7);
    bg.setStrokeStyle(1, 0x444444);
    
    this.speechRhythmDisplay.add(bg);
    
    // Add title
    const title = this.scene.add.text(0, -170, "Rhythm", {
      font: '14px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    this.speechRhythmDisplay.add(title);
    
    // Hide initially
    this.speechRhythmDisplay.setVisible(false);
  }
  
  /**
   * Updates the speech rhythm display based on current time
   */
  private updateRhythmDisplay(currentTime: number): void {
    if (!this.speechRhythmDisplay || !this.currentDialogue) return;
    
    // Clear previous rhythm indicators
    this.speechRhythmDisplay.getAll()
      .filter(obj => obj.name === 'rhythm-indicator')
      .forEach(obj => obj.destroy());
    
    // Get safe zones for this dialogue
    const safeZones = this.speechProcessor.getSafeZones(this.currentDialogue);
    
    // Display upcoming safe zones in the next 3 seconds
    const lookAheadTime = 3000; // 3 seconds ahead
    
    safeZones.forEach(zone => {
      const zoneStartTime = zone.startTime;
      const zoneEndTime = zone.endTime;
      
      // Only show zones that are coming up in the next few seconds or currently active
      if (zoneStartTime > currentTime - 500 && zoneStartTime < currentTime + lookAheadTime) {
        // Calculate position on rhythm bar (higher = further in future)
        const yPos = ((zoneStartTime - currentTime) / lookAheadTime) * 200;
        const height = Math.min(((zoneEndTime - zoneStartTime) / lookAheadTime) * 200, 200);
        
        // Create zone indicator
        const indicator = this.scene.add.rectangle(
          0,  // Center of rhythm bar
          yPos - 100, // Offset to position correctly
          18,  // Slightly narrower than the background
          height,
          0x00ff00,
          0.5
        );
        indicator.setName('rhythm-indicator');
        
        // Add to display
        this.speechRhythmDisplay.add(indicator);
      }
    });
    
    // Add "now" marker (horizontal line)
    const nowMarker = this.scene.add.line(0, -100, -15, 0, 15, 0, 0xffffff);
    nowMarker.setLineWidth(2);
    nowMarker.setName('rhythm-indicator');
    this.speechRhythmDisplay.add(nowMarker);
    
    // Ensure display is visible
    this.speechRhythmDisplay.setVisible(true);
  }
  
  public async startDialogue(): Promise<void> {
    // Prevent multiple starts of dialogue sequence
    if (this.dialogueStarted) {
      console.warn("Dialogue sequence already started - ignoring duplicate call");
      return;
    }
    
    // Mark as started
    this.dialogueStarted = true;
    
    console.log("Starting dialogue sequence with", this.dialogues.length, "dialogues");
    
    // Stop any playing audio from previous attempts
    this.audioManager.stopAllSpeechSounds();
    
    // Reset dialogue state
    this.currentDialogueIndex = -1;
    this.isDialogueActive = false;
    this.currentDialogue = null;
    
    // Preload all speech marks first
    await this.speechProcessor.preloadSpeechMarks(this.dialogues);
    
    // Begin dialogue sequence
    await this.moveToNextDialogue();
  }
  
  public getCurrentSpeaker(): Character | null {
    if (this.currentDialogueIndex < 0 || this.currentDialogueIndex >= this.dialogues.length) {
      return null;
    }
    
    const speakerId = this.dialogues[this.currentDialogueIndex].speakerId;
    return this.npcs.find(npc => npc.id === speakerId) || null;
  }
  
  public getCurrentSafetyStatus(): 'safe' | 'neutral' | 'danger' {
    return this.currentSafetyStatus;
  }
  
  /**
   * Get the current safe zones
   * @returns Array of current safe zones
   */
  public getCurrentSafeZones(): SafeZone[] {
    return this.safeZones;
  }
  
  /**
   * Get the current time in the dialogue
   * @returns Current time in ms since dialogue started
   */
  public getCurrentDialogueTime(): number {
    if (!this.isDialogueActive) {
      return 0;
    }
    
    return this.scene.time.now - this.currentDialogueStartTime;
  }
  
  private async moveToNextDialogue(): Promise<void> {
    console.log("Moving to next dialogue...");
    
    // Stop current dialogue if any
    this.stopCurrentDialogue();
    
    // Increment dialogue index
    this.currentDialogueIndex++;
    console.log(`Dialogue index is now ${this.currentDialogueIndex}`);
    
    // Check if we've reached the end
    if (this.currentDialogueIndex >= this.dialogues.length) {
      console.log("Reached the end of dialogues");
      this.finalizeDialogue();
      return;
    }
    
    // Get current dialogue
    const dialogue = this.dialogues[this.currentDialogueIndex];
    console.log(`Next dialogue: Speaker=${dialogue.speakerId}, Text="${dialogue.text.substring(0, 30)}...", SoundFile=${dialogue.soundFile || 'none'}`);
    
    // Schedule the dialogue with delay
    console.log(`Scheduling dialogue with ${dialogue.delay}ms delay`);
    
    // Use Promise-based delay instead of callback
    await this.delay(dialogue.delay);
    
    // Play dialogue after delay
    await this.playDialogue(dialogue);
  }
  
  private async playDialogue(dialogue: Dialogue): Promise<void> {
    try {
      // If there's already an active dialogue, stop it first
      if (this.isDialogueActive) {
        console.log("Stopping active dialogue before starting new one");
        this.stopCurrentDialogue();
      }
      
      console.log(`Playing dialogue for speaker ${dialogue.speakerId}`);
      
      // Store current dialogue reference
      this.currentDialogue = dialogue;
      
      // Find the speaking NPC
      const speaker = this.npcs.find(npc => npc.id === dialogue.speakerId);
      
      if (!speaker) {
        console.warn(`Speaker with ID ${dialogue.speakerId} not found!`);
        console.log(`Available NPCs: ${this.npcs.map(npc => npc.id).join(', ')}`);
        await this.moveToNextDialogue();
        return;
      }
      
      console.log(`Found speaker: ${speaker.name} (ID: ${speaker.id})`);
      
      // Get safe zones for this dialogue from speech processor
      this.safeZones = this.speechProcessor.getSafeZones(dialogue);
      
      // Set current safety status to neutral initially
      // It will be updated dynamically based on the speech rhythm
      this.currentSafetyStatus = 'neutral';
      
      // Make NPC speak
      speaker.startSpeaking();
      
      // Record start time for timing calculations
      this.currentDialogueStartTime = this.scene.time.now;
      
      // Update player's fart meter with safe zones
      const fartMeter = this.scene.getFartMeter();
      if (fartMeter) {
        const meterSafeZones = this.speechProcessor.getSafeZonesForMeter(dialogue);
        fartMeter.setSafeZones(meterSafeZones);
      }
      
      // Get speech marks from cache to use with karaoke display
      // These should be loaded by the speech processor already
      fetch(`audio/dialogue/speech_marks/${dialogue.soundFile.replace('.mp3', '.json')}`)
        .then(response => response.json())
        .then((speechMarks: SpeechMark[]) => {
          this.currentSpeechMarks = speechMarks.filter((mark: SpeechMark) => mark.type === 'word');
          this.currentVisemeMarks = speechMarks.filter((mark: SpeechMark) => mark.type === 'viseme');
          
          // Set karaoke dialogue with speech marks
          this.karaokeDialogue.setDialogue(
            speaker.name,
            dialogue.text,
            this.currentSpeechMarks,
            this.currentVisemeMarks
          );
        })
        .catch(error => {
          console.warn("Could not load speech marks for karaoke display:", error);
          // Still show dialogue text without highlighting
          this.scene.showDialogue(speaker.name, dialogue.text);
        });
      
      // Get rhythm UI from game scene (if it exists)
      const rhythmUI = (this.scene as any).rhythmUI;
      if (rhythmUI) {
        // Clear existing notes
        rhythmUI.clearNotes();
        
        // Reset all key highlights to ensure clean state
        rhythmUI.resetAllKeyHighlights();
        
        // Set active speaker
        rhythmUI.setActiveSpeaker(dialogue.speakerId);
        
        // Get viseme data from speech processor
        const visemeData = this.speechProcessor.getVisemeData(dialogue);
        
        // Add viseme notes to rhythm UI
        rhythmUI.addUpcomingVisemes(visemeData, dialogue.duration);
      }
      
      // Set dialogue as active before playing audio
      this.isDialogueActive = true;
      
      // Play voice audio
      await this.audioManager.playVoice(dialogue);
      
      // Wait for complete dialogue duration with error handling
      try {
        await this.delay(dialogue.duration);
      } catch (error) {
        console.warn("Error during dialogue delay:", error);
      }
      
      // Make sure we only continue if the scene still exists
      if (!this.scene || !this.scene.scene.isActive()) {
        console.log("Scene no longer active, stopping dialogue sequence");
        return;
      }
      
      // Stop speaking
      speaker.stopSpeaking();
      
      // Hide traditional dialogue text
      this.scene.hideDialogue();
      
      // Hide karaoke dialogue
      this.karaokeDialogue.hide();
      
      // Hide rhythm display
      if (this.speechRhythmDisplay) {
        this.speechRhythmDisplay.setVisible(false);
      }
      
      // Mark dialogue as inactive
      this.isDialogueActive = false;
      this.currentDialogue = null;
      
      // Clear safe zones
      if (fartMeter) {
        fartMeter.clearSafeZones();
      }
      
      // Add a small delay before moving to next dialogue to prevent cutting off
      await this.delay(300);
      
      // Move to next dialogue
      await this.moveToNextDialogue();
    } catch (error) {
      console.error("Error in playDialogue:", error);
      
      // Attempt to recover by moving to next dialogue
      this.isDialogueActive = false;
      this.currentDialogue = null;
      
      try {
        await this.moveToNextDialogue();
      } catch (moveError) {
        console.error("Failed to recover dialogue sequence:", moveError);
      }
    }
  }
  
  // Helper method for Promise-based delays
  private delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
  
  private stopCurrentDialogue(): void {
    // Clear any pending dialogue timer
    if (this.nextDialogueTimer) {
      this.nextDialogueTimer.remove();
      this.nextDialogueTimer = null;
    }
    
    // Stop current speaker if any
    const currentSpeaker = this.getCurrentSpeaker();
    if (currentSpeaker) {
      currentSpeaker.stopSpeaking();
    }
    
    // Stop any playing dialogue audio
    this.audioManager.stopAllSpeechSounds();
    
    // Hide dialogue text
    this.scene.hideDialogue();
    
    // Hide karaoke dialogue
    this.karaokeDialogue.hide();
    
    // Set dialogue as inactive
    this.isDialogueActive = false;
  }
  
  /**
   * Public method to stop the dialogue, useful for cleanup during game over
   */
  public stopDialogue(): void {
    // Same implementation as the private method
    // Clear any pending dialogue timer
    if (this.nextDialogueTimer) {
      this.nextDialogueTimer.remove();
      this.nextDialogueTimer = null;
    }
    
    // Stop current speaker if any
    const currentSpeaker = this.getCurrentSpeaker();
    if (currentSpeaker) {
      currentSpeaker.stopSpeaking();
    }
    
    // Stop any playing dialogue audio
    this.audioManager.stopAllSpeechSounds();
    
    // Hide dialogue text
    this.scene.hideDialogue();
    
    // Set dialogue as inactive
    this.isDialogueActive = false;
  }
  
  private finalizeDialogue(): void {
    // All dialogues completed
    console.log('All dialogues completed');
    
    // Game could trigger success here or continue to another phase
  }
}
