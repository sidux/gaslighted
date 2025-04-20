import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { LevelManager } from '../managers/LevelManager';
import { Player } from '../entities/Player';
import { FartMeter } from '../ui/FartMeter';
import { NPC } from '../entities/NPC';
import { DialogueManager } from '../managers/DialogueManager';
import { AudioManager } from '../managers/AudioManager';
import { Level } from '../types/Level';

export class GameScene extends Phaser.Scene {
  private levelManager!: LevelManager;
  private dialogueManager!: DialogueManager;
  private audioManager!: AudioManager;
  private player!: Player;
  private npcs: NPC[] = [];
  private fartMeter!: FartMeter;
  private currentLevel!: Level;
  private timeRemaining: number = 0;
  private timeText!: Phaser.GameObjects.Text;
  private gameOver: boolean = false;
  private credibilityScore: number = 100;
  private credibilityText!: Phaser.GameObjects.Text;
  
  constructor() {
    super({
      key: GameConfig.SCENE_GAME
    });
  }

  init(data: { levelId: string }): void {
    // Get the selected level
    this.levelManager = new LevelManager();
    this.currentLevel = this.levelManager.getLevel(data.levelId);
    this.timeRemaining = this.currentLevel.duration;
    this.gameOver = false;
    this.credibilityScore = 100;
  }

  create(): void {
    // Setup background
    this.createBackground();
    
    // Setup UI elements
    this.setupUI();
    
    // Initialize managers
    this.dialogueManager = new DialogueManager(this, this.currentLevel.dialogues);
    this.audioManager = new AudioManager(this);
    
    // Create player
    this.player = new Player(this, this.cameras.main.width / 2, this.cameras.main.height - 150);
    
    // Create NPCs from level data
    this.createNPCs();
    
    // Link dialogue manager to NPCs for expression changes
    this.dialogueManager.setNPCs(this.npcs);
    
    // Setup fart meter
    this.fartMeter = new FartMeter(
      this, 
      this.cameras.main.width / 2, 
      this.cameras.main.height - 50,
      GameConfig.PRESSURE_METER_WIDTH,
      GameConfig.PRESSURE_METER_HEIGHT
    );
    
    // Link player to fart meter for pressure updates
    this.player.setFartMeter(this.fartMeter);
    
    // Setup input
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.gameOver) {
        this.handleFartAttempt();
      }
    });
    
    // Start level dialogue
    this.dialogueManager.startDialogue();
    
    // Start the game timer
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;
    
    // Update player (increases pressure, updates face)
    this.player.update(delta);
    
    // Update fart meter display
    this.fartMeter.update();
    
    // Check for auto-release if pressure is critical
    if (this.player.shouldAutoRelease()) {
      this.handleAutoFartRelease();
    }
    
    // Update dialogue manager
    this.dialogueManager.update(delta);
    
    // Update NPCs
    this.npcs.forEach(npc => npc.update(delta));
  }
  
  private createBackground(): void {
    // Create a video conference background
    const bg = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x1a1a2e);
    bg.setOrigin(0, 0);
    
    // Add grid for video feeds
    const gridColor = 0x16213e;
    const gridThickness = 4;
    
    // Horizontal lines
    this.add.rectangle(0, this.cameras.main.height / 2, this.cameras.main.width, gridThickness, gridColor).setOrigin(0, 0.5);
    
    // Vertical lines
    this.add.rectangle(this.cameras.main.width / 2, 0, gridThickness, this.cameras.main.height, gridColor).setOrigin(0.5, 0);
  }
  
  private setupUI(): void {
    // Create timer text
    this.timeText = this.add.text(
      20, 
      20, 
      "Meeting Time: " + this.formatTime(this.timeRemaining), 
      {
        font: '24px Arial',
        color: '#ffffff'
      }
    );
    
    // Create credibility score
    this.credibilityText = this.add.text(
      this.cameras.main.width - 20, 
      20, 
      "Credibility: " + this.credibilityScore + "%", 
      {
        font: '24px Arial',
        color: '#ffffff'
      }
    ).setOrigin(1, 0);
  }
  
  private createNPCs(): void {
    const positions = [
      { x: this.cameras.main.width / 4, y: this.cameras.main.height / 4 },      // Top Left
      { x: this.cameras.main.width * 3/4, y: this.cameras.main.height / 4 },    // Top Right
      { x: this.cameras.main.width / 4, y: this.cameras.main.height * 3/4 - 100 } // Bottom Left
    ];
    
    this.currentLevel.participants.forEach((participant, index) => {
      if (participant.id !== 'player') {
        const pos = positions[index % positions.length];
        const npc = new NPC(
          this,
          pos.x,
          pos.y,
          participant.id,
          participant.name,
          participant.voiceType
        );
        this.npcs.push(npc);
      }
    });
  }
  
  private handleFartAttempt(): void {
    // Get current dialogue safety
    const safetyStatus = this.dialogueManager.getCurrentSafetyStatus();
    const currentPressure = this.player.getCurrentPressure();
    
    if (currentPressure < 10) {
      // Not enough pressure built up
      this.player.setExpression('struggling');
      return;
    }
    
    // Play fart sound
    this.audioManager.playFartSound(currentPressure);
    
    // Release pressure
    this.player.releasePressure();
    
    // Update player expression
    this.player.setExpression('farting');
    
    // Handle reactions based on safety
    if (safetyStatus === 'danger') {
      // Bad timing
      this.handleBadFartTiming(currentPressure);
    } else if (safetyStatus === 'safe') {
      // Good timing
      this.handleGoodFartTiming();
    } else {
      // Neutral timing - slightly risky
      this.handleNeutralFartTiming();
    }
    
    // Reset expression after a moment
    this.time.delayedCall(1000, () => {
      this.player.resetExpression();
    });
  }
  
  private handleAutoFartRelease(): void {
    // Auto-release is always at a bad time
    const currentPressure = this.player.getCurrentPressure();
    
    // Play loud fart sound
    this.audioManager.playFartSound(currentPressure, true);
    
    // Release pressure
    this.player.releasePressure();
    
    // Force player expression
    this.player.setExpression('farting');
    
    // Heavy penalty
    this.handleBadFartTiming(currentPressure, true);
    
    // Reset expression after a moment
    this.time.delayedCall(1000, () => {
      this.player.resetExpression();
    });
  }
  
  private handleGoodFartTiming(): void {
    // No penalty, got away with it
    // Add some small positive indicator
    const goodText = this.add.text(
      this.player.x,
      this.player.y - 60,
      'Masked!',
      {
        font: '20px Arial',
        color: '#00ff00'
      }
    ).setOrigin(0.5);
    
    // Fade out and remove
    this.tweens.add({
      targets: goodText,
      y: goodText.y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => goodText.destroy()
    });
  }
  
  private handleNeutralFartTiming(): void {
    // Small penalty
    this.updateCredibility(-5);
    
    // Make one random NPC react slightly
    const randomNPC = this.npcs[Phaser.Math.Between(0, this.npcs.length - 1)];
    randomNPC.reactToFart('mild');
    
    // Reset NPC after a moment
    this.time.delayedCall(2000, () => {
      randomNPC.resetExpression();
    });
  }
  
  private handleBadFartTiming(pressureValue: number, isAuto: boolean = false): void {
    // Heavy penalty based on pressure
    const penalty = isAuto ? -30 : -15;
    this.updateCredibility(penalty);
    
    // All NPCs react strongly
    this.npcs.forEach(npc => {
      npc.reactToFart('strong');
      
      // Add reaction text
      const reactionText = this.add.text(
        npc.x,
        npc.y - 60,
        'What was that?!',
        {
          font: '20px Arial',
          color: '#ff0000'
        }
      ).setOrigin(0.5);
      
      // Fade out and remove
      this.tweens.add({
        targets: reactionText,
        y: reactionText.y - 40,
        alpha: 0,
        duration: 2000,
        onComplete: () => reactionText.destroy()
      });
    });
    
    // Reset NPCs after reactions
    this.time.delayedCall(3000, () => {
      this.npcs.forEach(npc => npc.resetExpression());
    });
    
    // Check current level failure conditions
    if (this.currentLevel.zeroMistakesAllowed || this.credibilityScore <= 0) {
      this.triggerGameOver(false);
    }
  }
  
  private updateCredibility(change: number): void {
    this.credibilityScore = Phaser.Math.Clamp(this.credibilityScore + change, 0, 100);
    this.credibilityText.setText("Credibility: " + this.credibilityScore + "%");
    
    // Update text color based on score
    if (this.credibilityScore < 30) {
      this.credibilityText.setStyle({ color: '#ff0000' });
    } else if (this.credibilityScore < 60) {
      this.credibilityText.setStyle({ color: '#ffaa00' });
    } else {
      this.credibilityText.setStyle({ color: '#ffffff' });
    }
  }
  
  private updateTimer(): void {
    if (this.gameOver) return;
    
    this.timeRemaining--;
    this.timeText.setText("Meeting Time: " + this.formatTime(this.timeRemaining));
    
    if (this.timeRemaining <= 0) {
      // Meeting ended successfully
      this.triggerGameOver(true);
    }
  }
  
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes + ":" + remainingSeconds.toString().padStart(2, '0');
  }
  
  private triggerGameOver(success: boolean): void {
    this.gameOver = true;
    
    // Transition to game over scene after a short delay
    this.time.delayedCall(2000, () => {
      this.scene.start(GameConfig.SCENE_GAME_OVER, {
        success,
        levelId: this.currentLevel.id,
        credibilityScore: this.credibilityScore
      });
    });
  }
}
