import Phaser from 'phaser';
import {GameConfig} from '../config/GameConfig';
import {LevelManager} from '../managers/LevelManager';
import {Player} from '../entities/Player';
import {FartMeter} from '../ui/FartMeter';
import {NPC} from '../entities/NPC';
import {DialogueManager} from '../managers/DialogueManager';
import {AudioManager} from '../managers/AudioManager';
import {Level} from '../types/Level';

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
  private dialogueBox!: Phaser.GameObjects.Rectangle;
  private dialogueText!: Phaser.GameObjects.Text;
  private componentsInitialized: boolean = false;
  
  constructor() {
    super({
      key: GameConfig.SCENE_GAME
    });
  }

  async init(data: { levelId: string }): Promise<void> {
    // Get the selected level
    this.levelManager = new LevelManager();
    
    try {
      // Get the level
      this.currentLevel = this.levelManager.getLevel(data.levelId);
      this.timeRemaining = this.currentLevel.duration;
      this.gameOver = false;
      this.credibilityScore = 100;
      this.componentsInitialized = false;
      
    } catch (error) {
      console.error("Error loading level:", error);
      alert("Error loading level. See console for details.");
    }
  }

  create(): void {
    // Setup background
    this.createBackground();
    
    // Setup UI elements
    this.setupUI();
    
    // Create dialogue box
    this.createDialogueBox();

    // Initialize managers
    this.audioManager = new AudioManager(this);

    // Setup fart meter - we'll position it once the player is created
    this.fartMeter = new FartMeter(
        this,
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
      GameConfig.PRESSURE_METER_WIDTH,
      GameConfig.PRESSURE_METER_HEIGHT
    );
    
    // Setup input
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.gameOver && this.componentsInitialized) {
        this.handleFartAttempt();
      }
    });
    
    // Start the game timer
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });
    
    // Preload all audio files for this level for better performance
    this.audioManager.preloadLevelAudio(this.currentLevel.dialogues).then(() => {
      this.dialogueManager = new DialogueManager(this, this.currentLevel.dialogues);

      // Create NPCs from level data
      this.createNPCs();

      // Position player exactly according to the screenshot (bottom left)
      const playerX = this.cameras.main.width / 6; // 1/6 of screen width
      const playerY = this.cameras.main.height * 3 / 4; // 3/4 of screen height
      
      // Create player (after NPCs so player is on top layer)
      this.player = new Player(this, playerX, playerY);
      
      // Link dialogue manager to NPCs for expression changes
      this.dialogueManager.setNPCs(this.npcs);
      

      // Link player to fart meter for pressure updates
      this.player.setFartMeter(this.fartMeter);
      
      // Mark components as initialized
      this.componentsInitialized = true;
      
      // Start level dialogue
      this.dialogueManager.startDialogue();
      
      console.log("Level initialized with audio preloaded");
    }).catch(error => {
      console.error("Error preloading audio:", error);
    });
  }

  update(time: number, delta: number): void {
    if (this.gameOver || !this.componentsInitialized) return;
    
    // Update player (increases pressure, updates face)
    if (this.player) {
      this.player.update(delta);
      
      // Check for auto-release if pressure is critical
      if (this.player.shouldAutoRelease()) {
        this.handleAutoFartRelease();
      }
    }
    
    // Update fart meter display
    if (this.fartMeter) {
      this.fartMeter.update();
    }
    
    // Update dialogue manager
    if (this.dialogueManager) {
      this.dialogueManager.update(delta);
    }
    
    // Update NPCs
    if (this.npcs.length > 0) {
      this.npcs.forEach(npc => npc.update(delta));
    }
  }
  
  private createBackground(): void {
    // const bg = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000);
    // bg.setOrigin(0, 0);
    //
    // // Create the top black bar
    // const topBar = this.add.rectangle(0, 0, this.cameras.main.width, 35, 0x000000);
    // topBar.setOrigin(0, 0);
    //
    // // ZOOM text
    // this.add.text(20, 15, "ZOOM", {
    //   font: 'bold 16px Arial',
    //   color: '#ffffff'
    // }).setOrigin(0, 0.5);
    //
    // // Original Sound: Off
    // this.add.text(140, 15, "Original Sound: Off", {
    //   font: '14px Arial',
    //   color: '#aaaaaa'
    // }).setOrigin(0.5, 0.5);
    //
    // // Meeting time in center
    // this.add.text(this.cameras.main.width / 2, 18, "Meeting Time: 1:56", {
    //   font: '16px Arial',
    //   color: '#ffffff',
    //   fontStyle: 'bold'
    // }).setOrigin(0.5, 0.5);
    //
    // // View button and Recording indicator
    // this.add.text(this.cameras.main.width - 70, 15, "☐", {
    //   font: '16px Arial',
    //   color: '#ffffff'
    // }).setOrigin(0.5, 0.5);
    //
    // const recBox = this.add.rectangle(this.cameras.main.width - 25, 15, 40, 22, 0xcc0000).setOrigin(0.5, 0.5);
    // this.add.text(this.cameras.main.width - 25, 15, "● REC", {
    //   font: '12px Arial',
    //   color: '#ffffff'
    // }).setOrigin(0.5, 0.5);
    //
    // // Video grid with exact dimensions to match screenshot
    // // Each video is surrounded by a very thin dark gray border
    // const borderColor = 0x333333;
    // const borderWidth = 1;
    //
    // // Create the four video frames with exact positioning
    // // Top-left (Mr. Bogdanoff)
    // this.add.rectangle(10, 45, this.cameras.main.width/2 - 20, this.cameras.main.height/2 - 60, 0x000000)
    //   .setStrokeStyle(borderWidth, borderColor)
    //   .setOrigin(0, 0);
    //
    // // Top-right (Zoomer)
    // this.add.rectangle(this.cameras.main.width/2 + 10, 45, this.cameras.main.width/2 - 20, this.cameras.main.height/2 - 60, 0x000000)
    //   .setStrokeStyle(borderWidth, borderColor)
    //   .setOrigin(0, 0);
    //
    // // Bottom-left (Wojak)
    // this.add.rectangle(10, this.cameras.main.height/2 + 10, this.cameras.main.width/2 - 20, this.cameras.main.height/2 - 60, 0x000000)
    //   .setStrokeStyle(borderWidth, borderColor)
    //   .setOrigin(0, 0);
    //
    // // Bottom-right (Wifey)
    // this.add.rectangle(this.cameras.main.width/2 + 10, this.cameras.main.height/2 + 10, this.cameras.main.width/2 - 20, this.cameras.main.height/2 - 60, 0x000000)
    //   .setStrokeStyle(borderWidth, borderColor)
    //   .setOrigin(0, 0);
    //
    // // Draw the green active speaker indicator (small box in top-left of Bogdanoff)
    // this.add.rectangle(20, 55, 15, 15, 0x00ff00).setOrigin(0, 0);
    //
    // // Controls at the bottom with exact spacing to match screenshot
    // const controls = [
    //   { icon: "🎤", label: "Mute", x: 75 },
    //   { icon: "📹", label: "Stop Video", x: 175 },
    //   { icon: "🔒", label: "Security", x: 275 },
    //   { icon: "👥", label: "Participants", x: 375 },
    //   { icon: "💬", label: "Chat", x: 475 },
    //   { icon: "📊", label: "Share Screen", x: 580 },
    //   { icon: "📈", label: "Record", x: 680 },
    // ];
    //
    // // Add each control button
    // controls.forEach(control => {
    //   // Icon
    //   this.add.text(control.x, this.cameras.main.height - 25, control.icon, {
    //     font: '16px Arial',
    //     color: '#ffffff'
    //   }).setOrigin(0.5, 0.5);
    //
    //   // Label below icon
    //   this.add.text(control.x, this.cameras.main.height - 10, control.label, {
    //     font: '11px Arial',
    //     color: '#aaaaaa'
    //   }).setOrigin(0.5, 0.5);
    // });
    //
    // // End button (special red button)
    // this.add.text(this.cameras.main.width - 80, this.cameras.main.height - 20, "End", {
    //   font: '14px Arial',
    //   color: '#ffffff',
    //   fontStyle: 'bold'
    // }).setOrigin(0.5, 0.5);
    //
    // // Credibility score display in bottom right
    // this.add.text(this.cameras.main.width - 120, this.cameras.main.height - 60, "Credibility: 70%", {
    //   font: '16px Arial',
    //   color: '#ffffff',
    //   stroke: '#000000',
    //   strokeThickness: 1
    // }).setOrigin(0.5, 0.5);
    //
    // // Add warning icon next to credibility
    // this.add.text(this.cameras.main.width - 70, this.cameras.main.height - 60, "⚠️", {
    //   font: '16px Arial'
    // }).setOrigin(0.5, 0.5);
  }
  
  private setupUI(): void {
    // Create timer text - positioned in the Zoom-style top bar
    this.timeText = this.add.text(
        this.cameras.main.width / 2,
        18,
        "Meeting Time: 1:56", // Exact text from screenshot
      {
        font: '16px Arial',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5, 0.5);

    // Create credibility text in bottom right
    this.credibilityText = this.add.text(
        this.cameras.main.width - 120,
        this.cameras.main.height - 60,
        "Credibility: 70%", // Starting with 70% as shown in screenshot
      {
        font: '16px Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 1
      }
    ).setOrigin(0.5, 0.5);

    // Add warning icon next to credibility
    this.add.text(
        this.cameras.main.width - 70,
        this.cameras.main.height - 60,
        "⚠️",
        {
          font: '16px Arial'
        }
    ).setOrigin(0.5, 0.5);
  }
  
  private createDialogueBox(): void {
    // Create dialogue box that looks like a Zoom chat message
    const boxHeight = 80;

    // Create container for the dialogue
    const dialogueContainer = this.add.container(0, 0);

    // Create chat-like background
    this.dialogueBox = this.add.rectangle(
      this.cameras.main.width / 2,
        this.cameras.main.height - boxHeight - 60, // Position above the controls
        this.cameras.main.width * 0.6,
      boxHeight,
        0x333333,
        0.9
    ).setOrigin(0.5);

    // Add rounded corners and border
    this.dialogueBox.setStrokeStyle(1, 0x555555);

    // Add chat header with "To: Everyone" like in Zoom
    const chatHeader = this.add.text(
        this.cameras.main.width / 2 - (this.dialogueBox.width / 2) + 10,
        this.cameras.main.height - boxHeight - 60 - 15,
        "Chat | To: Everyone",
        {
          font: '14px Arial',
          color: '#aaaaaa'
        }
    );
    
    // Add text to dialogue box
    this.dialogueText = this.add.text(
        this.cameras.main.width / 2 - (this.dialogueBox.width / 2) + 15,
        this.cameras.main.height - boxHeight - 60 - 5,
      "", 
      {
        font: '16px Arial',
        color: '#ffffff',
        wordWrap: {width: this.dialogueBox.width - 30}
      }
    );

    // Add a close button like in Zoom
    const closeButton = this.add.text(
        this.cameras.main.width / 2 + (this.dialogueBox.width / 2) - 25,
        this.cameras.main.height - boxHeight - 60 - 15,
        "✕",
        {
          font: '14px Arial',
          color: '#aaaaaa'
      }
    );

    // Add all elements to the container
    dialogueContainer.add([this.dialogueBox, chatHeader, this.dialogueText, closeButton]);
    
    // Hide until needed
    dialogueContainer.setVisible(false);

    // Override the show/hide methods to manage the container
    this.showDialogue = (speakerName, text) => {
      // Update dialogue text with sender name in bold
      this.dialogueText.setText(speakerName + ": " + text);

      // Show dialogue container
      dialogueContainer.setVisible(true);

      // Animate it appearing from bottom
      dialogueContainer.y = 50;
      this.tweens.add({
        targets: dialogueContainer,
        y: 0,
        duration: 200,
        ease: 'Power2'
      });
    };

    this.hideDialogue = () => {
      // Animate hiding
      this.tweens.add({
        targets: dialogueContainer,
        y: 50,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          dialogueContainer.setVisible(false);
        }
      });
    };
  }
  
  private createNPCs(): void {
    // Position characters exactly according to the screenshot
    const positions = [
      { // Top Left - Boomer (position 0)
        id: 'boomer',
        x: this.cameras.main.width / 6,
        y: this.cameras.main.height / 4,
        nameY: 80
      },
      { // Top Right - Zoomer (position 1)
        id: 'zoomer',
        x: this.cameras.main.width * 5 / 6,
        y: this.cameras.main.height / 4,
        nameY: 80
      },
      { // Bottom Right - Wifey
        id: 'coworker1',
        x: this.cameras.main.width * 5 / 6,
        y: this.cameras.main.height * 3 / 4,
        nameY: 80
      }
    ];
    
    // Create NPCs based on character type and position
    positions.forEach(position => {
      // Find the participant with matching ID
      const participant = this.currentLevel.participants.find(p => p.id === position.id);
      
      if (participant && participant.id !== 'player') {
        const npc = new NPC(
          this,
          position.x,
          position.y,
          participant.id,
          participant.name,
          participant.voiceType,
          position.nameY
        );
        this.npcs.push(npc);
      }
    });
  }
  
  public showDialogue(speakerName: string, text: string): void {
    // Update dialogue text
    this.dialogueText.setText(speakerName + ": " + text);
    
    // Show dialogue box
    this.dialogueBox.setVisible(true);
    this.dialogueText.setVisible(true);
  }

  public hideDialogue(): void {
    // Hide dialogue box
    this.dialogueBox.setVisible(false);
    this.dialogueText.setVisible(false);
  }
  
  private handleFartAttempt(): void {
    if (!this.componentsInitialized || !this.dialogueManager || !this.player || !this.audioManager) {
      console.warn("Cannot handle fart attempt - components not fully initialized");
      return;
    }
    
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
      if (this.player) {
        this.player.resetExpression();
      }
    });
  }
  
  private handleAutoFartRelease(): void {
    if (!this.componentsInitialized || !this.player || !this.audioManager) {
      return;
    }
    
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
      if (this.player) {
        this.player.resetExpression();
      }
    });
  }
  
  private handleGoodFartTiming(): void {
    if (!this.componentsInitialized || !this.player) {
      return;
    }
    
    // No penalty, got away with it
    // Add some small positive indicator
    const goodText = this.add.text(
      this.player.x,
      this.player.y - 60,
      'Masked!',
      {
        font: '20px Arial',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 2
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
    if (!this.componentsInitialized || this.npcs.length === 0) {
      return;
    }
    
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
    if (!this.componentsInitialized || this.npcs.length === 0) {
      return;
    }
    
    // Heavy penalty based on pressure
    const penalty = isAuto ? -30 : -15;
    this.updateCredibility(penalty);
    
    // All NPCs react strongly
    this.npcs.forEach(npc => {
      npc.reactToFart('strong');

      // Add reaction text with correct styling
      const reactionText = this.add.text(
        npc.x,
        npc.y - 60,
        'What was that?!',
        {
          font: '20px Arial',
          color: '#ff0000',
          fontStyle: 'bold'
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
      this.credibilityText.setStyle({ 
        color: '#ffaa00',
        stroke: '#000000',
        strokeThickness: 2
      });
    } else if (this.credibilityScore < 60) {
      this.credibilityText.setStyle({ 
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 2
      });
    } else {
      this.credibilityText.setStyle({ 
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      });
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
