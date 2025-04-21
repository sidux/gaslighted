import Phaser from 'phaser';
import { Dialogue } from '../types/Dialogue';
import { Character } from '../entities/Character';
import { AudioManager } from './AudioManager';
import { GameScene } from '../scenes/GameScene';

export class DialogueManager {
  private scene: GameScene;
  private dialogues: Dialogue[];
  private audioManager: AudioManager;
  private npcs: Character[] = [];
  private currentDialogueIndex: number = -1;
  private isDialogueActive: boolean = false;
  private nextDialogueTimer: Phaser.Time.TimerEvent | null = null;
  private currentSafetyStatus: 'safe' | 'neutral' | 'danger' = 'neutral';
  
  constructor(scene: GameScene, dialogues: Dialogue[]) {
    this.scene = scene;
    this.dialogues = dialogues;
    this.audioManager = new AudioManager(scene);
  }
  
  public setNPCs(npcs: Character[]): void {
    this.npcs = npcs;
  }
  
  public update(delta: number): void {
    // Any per-frame updates
  }
  
  public async startDialogue(): Promise<void> {
    console.log("Starting dialogue sequence with", this.dialogues.length, "dialogues");
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
    console.log(`Playing dialogue for speaker ${dialogue.speakerId}`);
    
    // Find the speaking NPC
    const speaker = this.npcs.find(npc => npc.id === dialogue.speakerId);
    
    if (!speaker) {
      console.warn(`Speaker with ID ${dialogue.speakerId} not found!`);
      console.log(`Available NPCs: ${this.npcs.map(npc => npc.id).join(', ')}`);
      await this.moveToNextDialogue();
      return;
    }
    
    console.log(`Found speaker: ${speaker.name} (ID: ${speaker.id})`);
    
    // Set current safety status
    this.currentSafetyStatus = dialogue.safetyStatus;
    
    // Make NPC speak
    speaker.startSpeaking();
    
    // Update dialogue text in the GameScene
    // this.scene.showDialogue(speaker.name, dialogue.text);
    
    // Play voice audio
    await this.audioManager.playVoice(dialogue);
    
    // Set dialogue as active
    this.isDialogueActive = true;
    
    // Wait for dialogue duration
    await this.delay(dialogue.duration);
    
    // Stop speaking
    speaker.stopSpeaking();
    
    // Hide dialogue text
    this.scene.hideDialogue();
    
    // Mark dialogue as inactive
    this.isDialogueActive = false;
    
    // Move to next dialogue
    await this.moveToNextDialogue();
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
