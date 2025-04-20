import Phaser from 'phaser';
import { Dialogue } from '../types/Dialogue';
import { NPC } from '../entities/NPC';
import { AudioManager } from './AudioManager';
import { CorporateDialogueGenerator } from '../utils/CorporateDialogueGenerator';
import { GameScene } from '../scenes/GameScene';

export class DialogueManager {
  private scene: GameScene;
  private dialogues: Dialogue[];
  private audioManager: AudioManager;
  private dialogueGenerator: CorporateDialogueGenerator;
  private npcs: NPC[] = [];
  private currentDialogueIndex: number = -1;
  private isDialogueActive: boolean = false;
  private nextDialogueTimer: Phaser.Time.TimerEvent | null = null;
  private currentSafetyStatus: 'safe' | 'neutral' | 'danger' = 'neutral';
  
  constructor(scene: GameScene, dialogues: Dialogue[]) {
    this.scene = scene;
    this.dialogues = dialogues;
    this.audioManager = new AudioManager(scene);
    this.dialogueGenerator = new CorporateDialogueGenerator();
  }
  
  public setNPCs(npcs: NPC[]): void {
    this.npcs = npcs;
  }
  
  public update(delta: number): void {
    // Any per-frame updates
  }
  
  public startDialogue(): void {
    // Begin dialogue sequence
    this.moveToNextDialogue();
  }
  
  public getCurrentSpeaker(): NPC | null {
    if (this.currentDialogueIndex < 0 || this.currentDialogueIndex >= this.dialogues.length) {
      return null;
    }
    
    const speakerId = this.dialogues[this.currentDialogueIndex].speakerId;
    return this.npcs.find(npc => npc.id === speakerId) || null;
  }
  
  public getCurrentSafetyStatus(): 'safe' | 'neutral' | 'danger' {
    return this.currentSafetyStatus;
  }
  
  private moveToNextDialogue(): void {
    // Stop current dialogue if any
    this.stopCurrentDialogue();
    
    // Increment dialogue index
    this.currentDialogueIndex++;
    
    // Check if we've reached the end
    if (this.currentDialogueIndex >= this.dialogues.length) {
      this.finalizeDialogue();
      return;
    }
    
    // Get current dialogue
    const dialogue = this.dialogues[this.currentDialogueIndex];
    
    // Schedule the dialogue with delay
    this.nextDialogueTimer = this.scene.time.delayedCall(
      dialogue.delay,
      () => this.playDialogue(dialogue),
      [],
      this
    );
  }
  
  private playDialogue(dialogue: Dialogue): void {
    // Find the speaking NPC
    const speaker = this.npcs.find(npc => npc.id === dialogue.speakerId);
    
    if (!speaker) {
      console.warn(`Speaker with ID ${dialogue.speakerId} not found!`);
      this.moveToNextDialogue();
      return;
    }
    
    // Set current safety status
    this.currentSafetyStatus = dialogue.safetyStatus;
    
    // Make NPC speak
    speaker.startSpeaking();
    
    // Process the dialogue text (replace templates if needed)
    let processedText = dialogue.text;
    if (processedText.includes('{{') && processedText.includes('}}')) {
      processedText = this.dialogueGenerator.processTemplate(processedText);
    }
    
    // Update dialogue text in the GameScene
    this.scene.showDialogue(speaker.name, processedText);
    
    // Play voice audio
    this.audioManager.playVoice(processedText, speaker.voiceType);
    
    // Set dialogue as active
    this.isDialogueActive = true;
    
    // Schedule end of dialogue
    this.scene.time.delayedCall(
      dialogue.duration,
      () => {
        // Stop speaking
        speaker.stopSpeaking();
        
        // Hide dialogue text
        this.scene.hideDialogue();
        
        // Mark dialogue as inactive
        this.isDialogueActive = false;
        
        // Move to next dialogue
        this.moveToNextDialogue();
      },
      [],
      this
    );
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
