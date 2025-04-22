import Phaser from 'phaser';
import {GameConfig} from '../config/GameConfig';
import {LevelManager} from '../managers/LevelManager';
import {FartMeter} from '../entities/FartMeter';
import {Character, CharacterRole} from '../entities/Character';
import {DialogueManager} from '../managers/DialogueManager';
import {AudioManager} from '../managers/AudioManager';
import {Level} from '../types/Level';
import {RhythmUI} from '../entities/RhythmUI';
import {SafeZone} from '../types/speech/SpeechMark';

export class GameScene extends Phaser.Scene {
  private levelManager!: LevelManager;
  private dialogueManager!: DialogueManager;
  private audioManager!: AudioManager;
  private player!: Character;
  private npcs: Character[] = [];
  private fartMeter!: FartMeter;
  private rhythmUI!: RhythmUI; 
  private currentLevel!: Level;
  private timeRemaining: number = 0;
  private timeText!: Phaser.GameObjects.Text;
  private gameOver: boolean = false;
  private credibilityScore: number = 100;
  private credibilityText!: Phaser.GameObjects.Text;
  private dialogueBox!: Phaser.GameObjects.Rectangle;
  private dialogueText!: Phaser.GameObjects.Text;
  private componentsInitialized: boolean = false;
  private playerStartedFarting: boolean = false;
  private combo: number = 0;
  private comboText!: Phaser.GameObjects.Text;
  private fartParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  
  // Additional tracking to help with cleanup
  private notes: any[] = [];
  
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

  async create(): Promise<void> {
    console.log("Creating GameScene");
    
    // Setup scene lifecycle listeners for cleanup
    this.setupSceneEventListeners();
    
    // Setup background
    this.createBackground();
    
    // Setup UI elements
    this.setupUI();
    
    // Create dialogue box
    this.createDialogueBox();

    // Initialize managers
    this.audioManager = new AudioManager(this);
    
    // Create fart particle emitter
    this.fartParticles = this.add.particles(0, 0, 'fart-particle', {});

    // Setup fart meter in left side of screen
    this.fartMeter = new FartMeter(
        this,
        100, // Left side position
        this.cameras.main.height / 2,
        GameConfig.PRESSURE_METER_WIDTH,
        GameConfig.PRESSURE_METER_HEIGHT,
    );
    
    // Setup rhythm UI (Guitar Hero style) on right side
    this.rhythmUI = new RhythmUI(
      this,
      this.cameras.main.width / 2, // Right side position
      this.cameras.main.height / 2
    );
    
    // Add combo counter
    this.comboText = this.add.text(
      this.cameras.main.width / 2, 
      50,
      "COMBO: 0",
      {
        font: 'bold 24px Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    this.comboText.setVisible(false);
    
    // Start with holding required - player must hold SPACE to start
    // Create "Hold SPACE to Start" prompt
    this.showStartPrompt();
    
    // Add gameplay instructions that stay visible
    this.createGameplayInstructions();
    
    // Press SPACE to start the game (immediate start without holding)
    this.input.keyboard.once('keydown-SPACE', () => {
      this.startGame();
      // Start game immediately without requiring the space bar to be released
      this.playerStartedFarting = true;
      this.comboText.setVisible(true);
      this.initializeGameComponents();
    });
    
    // Replace SPACE holding with fart release mechanics
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.gameOver && this.componentsInitialized && this.playerStartedFarting) {
        this.handleFartRelease();
      }
    });
    
    // Add key handlers for different fart types/visemes
    // Vowels with both keydown and keyup handlers
    this.input.keyboard.on('keydown-A', () => this.handleVisemeKeyPress('A'));
    this.input.keyboard.on('keydown-E', () => this.handleVisemeKeyPress('E'));
    this.input.keyboard.on('keydown-I', () => this.handleVisemeKeyPress('I'));
    this.input.keyboard.on('keydown-O', () => this.handleVisemeKeyPress('O'));
    this.input.keyboard.on('keydown-U', () => this.handleVisemeKeyPress('U'));
    
    // Add keyup handlers to unhighlight keys
    this.input.keyboard.on('keyup-A', () => this.handleVisemeKeyRelease('A'));
    this.input.keyboard.on('keyup-E', () => this.handleVisemeKeyRelease('E'));
    this.input.keyboard.on('keyup-I', () => this.handleVisemeKeyRelease('I'));
    this.input.keyboard.on('keyup-O', () => this.handleVisemeKeyRelease('O'));
    this.input.keyboard.on('keyup-U', () => this.handleVisemeKeyRelease('U'));
    
    // Consonants
    this.input.keyboard.on('keydown-P', () => this.handleVisemeKeyPress('P'));
    this.input.keyboard.on('keydown-F', () => this.handleVisemeKeyPress('F'));
    this.input.keyboard.on('keydown-T', () => this.handleVisemeKeyPress('T'));
    this.input.keyboard.on('keydown-S', () => this.handleVisemeKeyPress('S'));
    this.input.keyboard.on('keydown-K', () => this.handleVisemeKeyPress('K'));
    
    // Add keyup handlers for consonants
    this.input.keyboard.on('keyup-P', () => this.handleVisemeKeyRelease('P'));
    this.input.keyboard.on('keyup-F', () => this.handleVisemeKeyRelease('F'));
    this.input.keyboard.on('keyup-T', () => this.handleVisemeKeyRelease('T'));
    this.input.keyboard.on('keyup-S', () => this.handleVisemeKeyRelease('S'));
    this.input.keyboard.on('keyup-K', () => this.handleVisemeKeyRelease('K'));
    
    // Start the game timer
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });
    
    try {
      // Preload all audio files for this level for better performance
      await this.audioManager.preloadLevelAudio(this.currentLevel.dialogues);
      
      // Create dialogue manager - now it uses singleton pattern so only one instance will exist
      console.log("Creating DialogueManager");
      this.dialogueManager = new DialogueManager(this, this.currentLevel.dialogues);
      console.log("DialogueManager created");

      // Create NPCs from level data
      this.createNPCs();

      // Position player exactly according to the screenshot (bottom left)
      const playerX = this.cameras.main.width / 6; // 1/6 of screen width
      const playerY = this.cameras.main.height * 3 / 4; // 3/4 of screen height
      
      // Find player data
      const playerData = this.currentLevel.participants.find(p => p.id === 'player');
      
      if (!playerData) {
        console.error("Player data not found in level configuration");
        return;
      }
      
      // Create player (after NPCs so player is on top layer)
      this.player = new Character(
        this, 
        playerX, 
        playerY, 
        playerData.id,
        playerData.name,
        playerData.voiceType,
        CharacterRole.PLAYER
      );

      // Link dialogue manager to NPCs for expression changes
      this.dialogueManager.setNPCs(this.npcs);
      
      // Link player to fart meter for pressure updates
      this.player.setFartMeter(this.fartMeter);
      
      // Mark components as initialized
      this.componentsInitialized = true;
      
      console.log("Game components initialized, starting dialogue...");
      
      // Start level dialogue in a controlled way
      setTimeout(() => {
        if (this.dialogueManager && !this.gameOver) {
          console.log("Starting dialogue sequence...");
          this.dialogueManager.startDialogue().catch(error => {
            console.error("Error starting dialogue:", error);
          });
        }
      }, 500); // Short delay to ensure everything is ready
      
      console.log("Level initialized with audio preloaded");
    } catch (error) {
      console.error("Error in GameScene create:", error);
    }
  }

  update(time: number, delta: number): void {
    // Add additional safety check for game over or scene shutdown
    if (this.gameOver || !this.scene) return;
    
    try {
      // If game hasn't fully started yet, just wait for space press
      if (!this.componentsInitialized) return;
      
      // Update player (increases pressure, updates face) - with additional safety checks
      if (this.player) {
        this.player.update(delta);
        
        // Check for auto-release if pressure is critical - with null safety
        if (this.player.shouldAutoRelease && this.player.shouldAutoRelease()) {
          this.handleAutoFartRelease();
        }
        
        // Update RhythmUI with current pressure - with null safety
        if (this.rhythmUI && this.player.getCurrentPressure) {
          this.rhythmUI.updatePressureIndicator(this.player.getCurrentPressure());
          // Additional null check for isHoldingFart
          if (typeof this.player.isHoldingFart !== 'undefined') {
            this.rhythmUI.showHolding(this.player.isHoldingFart);
          }
        }
      }
      
      // Update fart meter display
      if (this.fartMeter && this.fartMeter.update) {
        this.fartMeter.update();
      }
      
      // Update dialogue manager
      if (this.dialogueManager && this.dialogueManager.update) {
        this.dialogueManager.update(delta);
        
        // Get current speaker for rhythm UI
        if (this.dialogueManager.getCurrentSpeaker) {
          const currentSpeaker = this.dialogueManager.getCurrentSpeaker();
          if (currentSpeaker && this.rhythmUI && this.rhythmUI.setActiveSpeaker) {
            this.rhythmUI.setActiveSpeaker(currentSpeaker.id);
          }
        }
      }
      
      // Update NPCs
      if (this.npcs && Array.isArray(this.npcs) && this.npcs.length > 0) {
        this.npcs.forEach(npc => {
          if (npc && npc.update) {
            npc.update(delta);
          }
        });
      }
    } catch (error) {
      console.error("Error in GameScene update:", error);
      // Don't set gameOver here as it might cause infinite loops if error is persistent
      // Just log the error and try to continue
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

    this.hideDialogue = async () => {
      // Return a Promise that resolves when animation is complete
      return new Promise<void>((resolve) => {
        // Animate hiding
        this.tweens.add({
          targets: dialogueContainer,
          y: 50,
          duration: 200,
          ease: 'Power2',
          onComplete: () => {
            dialogueContainer.setVisible(false);
            resolve();
          }
        });
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
        const npc = new Character(
          this,
          position.x,
          position.y,
          participant.id,
          participant.name,
          participant.voiceType,
          CharacterRole.NPC,
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
  
  /**
   * Gets the fart meter instance
   * @returns The fart meter
   */
  public getFartMeter(): FartMeter | null {
    return this.fartMeter;
  }
  
  /**
   * Handle player holding the SPACE key (holding in the fart)
   */
  private handleFartHold(): void {
    if (!this.componentsInitialized || !this.player) {
      return;
    }
    
    // Reduce pressure buildup rate while holding
    this.player.setHoldingFart(true);
    
    // Update player expression to show effort
    if (this.player.getCurrentPressure() > 50) {
      this.player.setExpression('struggling');
    } else {
      this.player.setExpression('uncomfortable');
    }
    
    // Visual feedback
    const holdText = this.add.text(
      this.player.x,
      this.player.y - 90,
      "Holding...",
      {
        font: '18px Arial',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 8, y: 4 }
      }
    ).setOrigin(0.5);
    
    // Store reference to remove when releasing
    this.player.setHoldingText(holdText);
  }
  
  /**
   * Handle player releasing the SPACE key (releasing the fart)
   */
  private async handleFartRelease(): Promise<void> {
    if (!this.componentsInitialized || !this.dialogueManager || !this.player || !this.audioManager) {
      console.warn("Cannot handle fart release - components not fully initialized");
      return;
    }
    
    // Remove holding text if exists
    this.player.clearHoldingText();
    
    // Stop holding fart
    this.player.setHoldingFart(false);
    
    // Get current pressure
    const currentPressure = this.player.getCurrentPressure();
    
    // Check if there's enough pressure to make a sound
    if (currentPressure < 10) {
      // Not enough pressure built up
      this.player.setExpression('neutral');
      return;
    }
    
    // Get the current viseme key being pressed
    const currentVisemeKey = this.player.getCurrentVisemeKey();
    const currentFartType = this.player.getCurrentFartType();
    
    // Check if a valid key is being pressed
    if (!currentVisemeKey) {
      // No viseme key pressed, use default fart type
      this.showVisemeKeyWarning();
      return;
    }
    
    // Get current dialogue safety from speech rhythm analysis
    let safetyStatus = this.dialogueManager.getCurrentSafetyStatus();
    
    // Check if the viseme key matches the current safe zone
    const safeZones = this.dialogueManager.getCurrentSafeZones();
    const currentTime = this.dialogueManager.getCurrentDialogueTime();
    
    // Find the closest safe zone
    const activeZone = this.findClosestSafeZone(safeZones, currentTime);
    
    // Check if the key pressed matches the required key
    if (activeZone) {
      if (activeZone.keyToPress === currentVisemeKey) {
        // Perfect match - improve safety if possible
        if (safetyStatus !== 'safe') {
          safetyStatus = 'safe';
        }
      } else {
        // Key mismatch - worsen safety status
        if (safetyStatus === 'safe') {
          safetyStatus = 'neutral';
        } else if (safetyStatus === 'neutral') {
          safetyStatus = 'danger';
        }
      }
    }
    
    // Start continuous farting
    this.player.startFarting(currentPressure);
    
    // Play initial fart sound with intensity based on pressure and fart type
    this.audioManager.playFartSound(currentPressure, false, currentFartType);
    
    // Show visual feedback in the rhythm UI
    if (this.rhythmUI) {
      this.rhythmUI.showFartRelease(safetyStatus, currentVisemeKey);
    }
    
    // Show visual feedback about timing
    this.showFartTimingFeedback(safetyStatus);
    
    // Handle reactions based on safety status
    this.handleFartReaction(safetyStatus, currentPressure);
    
    // Update combo count based on safety
    this.updateCombo(safetyStatus);
    
    // Show viseme match feedback for visual confirmation
    if (this.rhythmUI && activeZone) {
      let accuracy: 'perfect' | 'good' | 'miss';
      
      if (activeZone.keyToPress === currentVisemeKey && safetyStatus === 'safe') {
        accuracy = 'perfect';
      } else if (activeZone.keyToPress === currentVisemeKey && safetyStatus === 'neutral') {
        accuracy = 'good';
      } else {
        accuracy = 'miss';
      }
      
      this.rhythmUI.showVisemeMatch(currentVisemeKey, accuracy);
      
      // Reset key highlights after a short delay
      setTimeout(() => {
        if (this.rhythmUI) {
          this.rhythmUI.resetAllKeyHighlights();
        }
      }, 500);
    }
  }
  
  /**
   * Find the closest safe zone to the current time
   * @param safeZones Array of safe zones
   * @param currentTime Current dialogue time
   * @returns The closest safe zone or null if none are close
   */
  private findClosestSafeZone(safeZones: SafeZone[], currentTime: number): SafeZone | null {
    if (!safeZones || safeZones.length === 0) {
      return null;
    }
    
    // Find the closest safe zone
    let closestZone: SafeZone | null = null;
    let closestDistance = Number.MAX_VALUE;
    
    for (const zone of safeZones) {
      // Calculate distance to zone center
      const zoneCenter = (zone.startTime + zone.endTime) / 2;
      const distance = Math.abs(currentTime - zoneCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestZone = zone;
      }
    }
    
    // Only return if the zone is reasonably close (within 500ms)
    return closestDistance < 500 ? closestZone : null;
  }
  
  /**
   * Show warning when no viseme key is pressed
   */
  private showVisemeKeyWarning(): void {
    // Create warning text
    const warningText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 3,
      "Press a letter key first!",
      {
        font: 'bold 24px Arial',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    
    // Animate and remove
    this.tweens.add({
      targets: warningText,
      y: warningText.y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => warningText.destroy()
    });
  }
  
  /**
   * Update combo counter based on timing quality
   */
  private updateCombo(safetyStatus: 'safe' | 'neutral' | 'danger'): void {
    if (safetyStatus === 'safe') {
      // Increase combo for perfect timing
      this.combo += 1;
      
      // Show combo text
      this.comboText.setText(`COMBO: ${this.combo}x`);
      this.comboText.setVisible(true);
      
      // Scale effect
      this.tweens.add({
        targets: this.comboText,
        scaleX: { from: 1.5, to: 1 },
        scaleY: { from: 1.5, to: 1 },
        duration: 300,
        ease: 'Back.easeOut'
      });
      
      // Change color based on combo value
      if (this.combo >= 10) {
        this.comboText.setStyle({
          font: 'bold 28px Arial',
          color: '#ff00ff',
          stroke: '#000000',
          strokeThickness: 4
        });
      } else if (this.combo >= 5) {
        this.comboText.setStyle({
          font: 'bold 26px Arial',
          color: '#ffff00',
          stroke: '#000000',
          strokeThickness: 4
        });
      }
      
      // Give bonus credibility for higher combos
      if (this.combo >= 5) {
        this.updateCredibility(this.combo / 2);
      }
      
    } else if (safetyStatus === 'danger') {
      // Reset combo on bad timing
      this.resetCombo();
    }
  }
  
  /**
   * Reset combo counter
   */
  private resetCombo(): void {
    if (this.combo <= 1) {
      this.comboText.setVisible(false);
    } else {
      // Broken combo effect
      this.tweens.add({
        targets: this.comboText,
        y: this.comboText.y + 20,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.combo = 0;
          this.comboText.setText("COMBO: 0");
          this.comboText.y -= 20;
          this.comboText.alpha = 1;
          this.comboText.setVisible(false);
          this.comboText.setStyle({
            font: 'bold 24px Arial', 
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
          });
        }
      });
    }
    this.combo = 0;
  }
  
  /**
   * Shows visual feedback about fart timing
   */
  private showFartTimingFeedback(safetyStatus: 'safe' | 'neutral' | 'danger'): void {
    if (!this.player) return;
    
    let feedbackText: string;
    let textColor: string;
    
    switch (safetyStatus) {
      case 'safe':
        feedbackText = "Perfect Timing!";
        textColor = '#00ff00';
        break;
      case 'neutral':
        feedbackText = "Okay Timing";
        textColor = '#ffff00';
        break;
      case 'danger':
        feedbackText = "Bad Timing!";
        textColor = '#ff0000';
        break;
    }
    
    // Create feedback text
    const feedback = this.add.text(
      this.player.x,
      this.player.y - 120,
      feedbackText,
      {
        font: 'bold 20px Arial',
        color: textColor,
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);
    
    // Animate and remove
    this.tweens.add({
      targets: feedback,
      y: feedback.y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => feedback.destroy()
    });
  }
  
  /**
   * Handle when player presses a key for a specific viseme
   * @param key The key pressed (A, E, I, O, etc.)
   */
  private handleVisemeKeyPress(key: string): void {
    if (!this.componentsInitialized || !this.player || !this.playerStartedFarting) {
      return;
    }
    
    // Set the current viseme key on the player
    this.player.setVisemeKey(key);
    
    // Show the key press in the rhythm UI
    if (this.rhythmUI) {
      this.rhythmUI.showKeyPress(key);
      
      // Remove the note with this key to clean up the UI
      this.rhythmUI.removeNoteWithKey(key);
    }
    
    // Show a visual indicator above the player to show which key is active
    this.showActiveKeyIndicator(key);
    
    // Add a feedback sound for pressing a key - conditionally check if sound exists
    try {
      if (this.sound.get('fart')) {
        // Use the fart sound at very low volume as a placeholder 'click' since we know it exists
        const sound = this.sound.add('fart', { volume: 0.05, rate: 2.0, detune: 1200 });
        sound.play();
      }
    } catch(e) {
      // Ignore sound errors - not critical
      console.log("Sound effect skipped");
    }
  }
  
  /**
   * Handle when player releases a letter key
   * @param key The key that was released
   */
  private handleVisemeKeyRelease(key: string): void {
    if (!this.componentsInitialized || !this.player || !this.playerStartedFarting) {
      return;
    }
    
    // Keep the key active for gameplay purposes but visually show release
    if (this.rhythmUI) {
      this.rhythmUI.showKeyRelease(key);
    }
    
    // Note: We're intentionally NOT clearing the player's current viseme key
    // This allows the player to press and release a key, but still have that letter
    // selected for when they release SPACE to fart
  }

  // Store the current active key for the player
  private currentActiveKey: string = '';
  
  /**
   * Shows a visual indicator of which key is currently active
   */
  private showActiveKeyIndicator(key: string): void {
    // If this is the same key we're already showing, just refresh the animation
    const isSameKey = this.currentActiveKey === key;
    this.currentActiveKey = key;
    
    // Remove any existing indicators
    this.children.getAll()
      .filter(obj => obj.name === 'active-key-indicator')
      .forEach(obj => obj.destroy());
    
    if (!this.player) return;
    
    // Don't show letter next to player face as requested
    // Instead, only update the key in the rhythm UI
    
    // Update the rhythm UI to show the active key
    if (this.rhythmUI) {
      this.rhythmUI.showKeyPress(key);
    }
    
    // Create a simple flash effect to indicate the key was pressed
    const flash = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0xffffff,
      0.1
    );
    
    // Quick flash animation
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy()
    });
    
    // Play a sound effect for key press
    try {
      if (this.sound.get('fart')) {
        const sound = this.sound.add('fart', { volume: 0.05, rate: 2.0, detune: 1200 });
        sound.play();
      }
    } catch(e) {
      // Ignore sound errors - not critical
      console.log("Sound effect skipped");
    }
  }

  private async handleAutoFartRelease(): Promise<void> {
    if (!this.componentsInitialized || !this.player || !this.audioManager) {
      return;
    }
    
    // Auto-release is always at a bad time
    const currentPressure = this.player.getCurrentPressure();
    
    // Get the current fart type from player (or default)
    const fartType = this.player.getCurrentFartType();
    
    // Play loud fart sound with current type
    this.audioManager.playFartSound(currentPressure, true, fartType);
    
    // Release pressure
    this.player.releasePressure();
    
    // Force player expression
    this.player.setExpression('farting');
    
    // Heavy penalty - always treat as danger
    this.handleFartReaction('danger', currentPressure, true);
    
    // Reset expression after a moment (using Promise instead of callback)
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        if (this.player) {
          this.player.resetExpression();
        }
        resolve();
      }, 1000);
    });
  }
  
  private handleFartReaction(safetyStatus: 'safe' | 'neutral' | 'danger', currentPressure: number, isAuto: boolean = false): void {
    if (!this.componentsInitialized || this.npcs.length === 0) {
      return;
    }
    
    switch (safetyStatus) {
      case 'safe':
        // No penalty, got away with it
        // Add visual feedback
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
        break;
        
      case 'neutral':
        // Small penalty
        this.updateCredibility(-5);
        
        // Make one random NPC react slightly
        const randomNPC = this.npcs[Phaser.Math.Between(0, this.npcs.length - 1)];
        
        // Use playAnimation instead of specific reactToFart method
        randomNPC.playAnimation(['mad', 'neutral'], 2000);
        break;
        
      case 'danger':
        // Heavy penalty based on pressure
        const penalty = isAuto ? -30 : -15;
        this.updateCredibility(penalty);
        
        // All NPCs react strongly
        this.npcs.forEach(npc => {
          // Play shock animation
          npc.playAnimation(['shock', 'neutral'], 3000);

          // Add reaction text
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
        
        // Check current level failure conditions
        if (this.currentLevel.zeroMistakesAllowed || this.credibilityScore <= 0) {
          this.triggerGameOver(false);
        }
        break;
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
  
  private async triggerGameOver(success: boolean): Promise<void> {
    // Mark as game over immediately to prevent further updates
    this.gameOver = true;
    
    console.log("Game over triggered:", success ? "Success" : "Failure");
    
    try {
      // Stop any ongoing audio to prevent errors
      if (this.audioManager && this.audioManager.stopAllSounds) {
        try {
          this.audioManager.stopAllSounds();
        } catch (e) {
          console.warn("Error stopping audio:", e);
        }
      }
      
      // Stop any active dialogue
      if (this.dialogueManager && this.dialogueManager.stopDialogue) {
        try {
          this.dialogueManager.stopDialogue();
        } catch (e) {
          console.warn("Error stopping dialogue:", e);
        }
      }
      
      // Clean up NPCs to prevent callback errors during scene transition
      if (this.npcs && Array.isArray(this.npcs)) {
        for (const npc of this.npcs) {
          if (npc && npc.stopSpeaking) {
            try {
              npc.stopSpeaking();
            } catch (e) {
              console.warn("Error stopping NPC speech:", e);
            }
          }
        }
      }
      
      // Clean up player if it exists
      if (this.player) {
        if (this.player.stopFarting) {
          try {
            this.player.stopFarting();
          } catch (e) {
            console.warn("Error stopping player farting:", e);
          }
        }
      }
      
      // Additional cleanup of scene resources
      this.performSceneCleanup();
      
      // Short delay to allow for visual feedback before transitioning
      console.log("Delaying before transition...");
      await this.delay(2000);
      
      // Make sure we clean up stuff that might cause errors during transition
      this.notes = [];
      
      // Clear any timers or event listeners
      if (this.time) {
        try {
          this.time.removeAllEvents();
        } catch (e) {
          console.warn("Error removing time events:", e);
        }
      }
      
      // Save important data for transition
      const levelId = this.currentLevel ? this.currentLevel.id : "";
      const finalScore = this.credibilityScore || 0;
      
      // Only transition if scene still exists
      if (this.scene && this.scene.start) {
        console.log("Transitioning to game over scene...");
        
        // Reset all references before transitioning
        const player = this.player;
        const npcs = this.npcs;
        
        // Null out references before transition
        this.player = null as any;
        this.npcs = [];
        this.dialogueManager = null as any;
        this.audioManager = null as any;
        
        // Transition with minimal data
        try {
          this.scene.start(GameConfig.SCENE_GAME_OVER, {
            success,
            levelId,
            credibilityScore: finalScore
          });
        } catch (e) {
          console.error("Error during scene transition:", e);
          
          // Last resort emergency transition
          this.scene.start(GameConfig.SCENE_GAME_OVER);
        }
      } else {
        console.error("Cannot transition - scene is not available");
      }
    } catch (error) {
      console.error("Error during game over transition:", error);
      
      // As a fallback, try to force the transition
      if (this.scene) {
        try {
          // Last resort - force a hard restart of the game over scene
          this.scene.stop(GameConfig.SCENE_GAME);
          this.scene.start(GameConfig.SCENE_GAME_OVER, {
            success,
            levelId: this.currentLevel ? this.currentLevel.id : "",
            credibilityScore: this.credibilityScore || 0
          });
        } catch (e) {
          console.error("Critical error during fallback transition:", e);
          // Can't do much more at this point
        }
      }
    }
  }
  
  /**
   * Additional cleanup of scene resources
   */
  private performSceneCleanup(): void {
    try {
      console.log("Performing scene cleanup...");
      
      // Stop all tweens
      if (this.tweens) {
        this.tweens.killAll();
      }
      
      // Clear particles if they exist
      if (this.fartParticles) {
        this.fartParticles.stop();
        this.fartParticles.destroy();
      }
      
      // Cleanup rhythm UI
      if (this.rhythmUI) {
        // Clear any timers or animations in rhythm UI if needed
      }
      
      // Remove key handlers to prevent memory leaks
      if (this.input && this.input.keyboard) {
        this.input.keyboard.removeAllKeys();
      }
      
      // Force a garbage collection cycle by nullifying references
      this.dialogueManager = null as any;
      this.npcs = [];
      this.player = null as any;
      
      console.log("Scene cleanup complete");
    } catch (error) {
      console.error("Error in scene cleanup:", error);
    }
  }
  
  /**
   * Display the start prompt for the player
   */
  private showStartPrompt(): void {
    // Create container for start prompt
    const startContainer = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2 - 50);
    startContainer.setName('startPrompt');
    
    // Background
    const bg = this.add.rectangle(0, 0, 400, 200, 0x000000, 0.8);
    bg.setStrokeStyle(4, 0x6666cc);
    startContainer.add(bg);
    
    // Title
    const title = this.add.text(0, -60, "GASLIGHTED", {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    startContainer.add(title);
    
    // Instructions
    const instructions = this.add.text(0, 0, 
      "PRESS A, E, I, O, U keys to release pressure\nPRESS SPACE to let out a fart\n\nTime your releases with character speech\nDon't get caught!", 
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);
    startContainer.add(instructions);
    
    // Start prompt
    const startText = this.add.text(0, 70, "PRESS SPACE TO START", {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffff00'
    }).setOrigin(0.5);
    startContainer.add(startText);
    
    // Add pulsing animation to start text
    this.tweens.add({
      targets: startText,
      alpha: 0.5,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }
  
  /**
   * Start the game when player holds SPACE initially
   */
  private startGame(): void {
    // Hide start prompt
    const startPrompt = this.children.getByName('startPrompt');
    if (startPrompt) {
      this.tweens.add({
        targets: startPrompt,
        alpha: 0,
        y: '-=50',
        duration: 500,
        onComplete: () => startPrompt.destroy()
      });
    }
    
    // Show "Get Ready..." text
    const readyText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "Get Ready... Game starting!",
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 16, y: 8 }
      }
    ).setOrigin(0.5);
    
    // Remove the text after a moment and start the game
    this.tweens.add({
      targets: readyText,
      alpha: 0,
      y: '-=50',
      duration: 1000,
      onComplete: () => {
        readyText.destroy();
        
        // Start game timer
        this.time.addEvent({
          delay: 1000,
          callback: this.updateTimer,
          callbackScope: this,
          loop: true
        });
      }
    });
  }
  
  /**
   * Initialize the rest of the game components after player starts
   */
  private async initializeGameComponents(): Promise<void> {
    try {
      console.log("Initializing game components after player start");
      
      // We don't need to recreate the dialogue manager or NPCs since they're already created
      // in the create method. Just make sure they're properly connected.
      
      // Make sure we have DialogueManager
      if (!this.dialogueManager) {
        console.log("No DialogueManager exists, creating one");
        this.dialogueManager = new DialogueManager(this, this.currentLevel.dialogues);
      }
      
      // Make sure we have NPCs
      if (this.npcs.length === 0) {
        console.log("No NPCs exist, creating them");
        this.createNPCs();
      }
      
      // Re-link dialogueManager to NPCs in case they were recreated
      this.dialogueManager.setNPCs(this.npcs);
      
      // Position player exactly according to the screenshot (bottom left)
      const playerX = this.cameras.main.width / 6; // 1/6 of screen width
      const playerY = this.cameras.main.height * 3 / 4; // 3/4 of screen height
      
      // Find player data
      const playerData = this.currentLevel.participants.find(p => p.id === 'player');
      
      if (!playerData) {
        console.error("Player data not found in level configuration");
        return;
      }
      
      // Create player (after NPCs so player is on top layer) if it doesn't exist
      if (!this.player) {
        this.player = new Character(
          this, 
          playerX, 
          playerY, 
          playerData.id,
          playerData.name,
          playerData.voiceType,
          CharacterRole.PLAYER
        );
        
        // Link player to fart meter
        if (this.fartMeter) {
          this.player.setFartMeter(this.fartMeter);
        }
      }
      
      // Mark components as initialized
      this.componentsInitialized = true;
      
      // Only start dialogue if it hasn't been started yet
      console.log("Components initialized - waiting a moment before starting dialogue");
      setTimeout(() => {
        if (this.dialogueManager && !this.gameOver) {
          console.log("Starting dialogue sequence from initializeGameComponents");
          this.dialogueManager.startDialogue().catch(error => {
            console.error("Error starting dialogue:", error);
          });
        }
      }, 1000); // Longer delay to ensure everything is really ready
      
      console.log("Game components initialized successfully");
    } catch (error) {
      console.error("Error initializing game components:", error);
    }
  }
  
  // Helper method for Promise-based delays
  /**
   * Create permanent gameplay instructions
   */
  private createGameplayInstructions(): void {
    // Create a semi-transparent background for the instructions
    const instructionsContainer = this.add.container(10, 10);
    instructionsContainer.setName('gameplay-instructions');
    
    // Background
    const bg = this.add.rectangle(0, 0, 250, 100, 0x000000, 0.7);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0xffffff, 0.3);
    instructionsContainer.add(bg);
    
    // Title
    const title = this.add.text(
      10, 10,
      "HOW TO PLAY:",
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    );
    instructionsContainer.add(title);
    
    // Instructions
    const instructions = [
      "1. Press A, E, I, O, or U keys to vent pressure",
      "2. Keys must match falling notes on screen",
      "3. Each key press reduces pressure buildup",
      "4. PRESS SPACE during speech (green zone) to fart"
    ];
    
    // Add each instruction line
    instructions.forEach((text, index) => {
      const instruction = this.add.text(
        10, 35 + (index * 16),
        text,
        {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#cccccc'
        }
      );
      instructionsContainer.add(instruction);
    });
    
    // Make instructions fade out after a while but return on hover
    this.time.delayedCall(8000, () => {
      this.tweens.add({
        targets: instructionsContainer,
        alpha: 0.3,
        duration: 1000
      });
    });
    
    // Make instructions interactive
    bg.setInteractive();
    bg.on('pointerover', () => {
      this.tweens.add({
        targets: instructionsContainer,
        alpha: 1,
        duration: 200
      });
    });
    
    bg.on('pointerout', () => {
      this.tweens.add({
        targets: instructionsContainer,
        alpha: 0.3,
        duration: 500
      });
    });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Add listeners for scene lifecycle events
   */
  private setupSceneEventListeners(): void {
    // Listen for scene shutdown event
    this.events.once('shutdown', this.onSceneShutdown, this);
    this.events.once('destroy', this.onSceneDestroy, this);
  }
  
  /**
   * Cleanup method that runs when the scene is shut down
   */
  private onSceneShutdown = (): void => {
    console.log("GameScene shutdown event triggered");
    
    try {
      // Mark game as over to stop any updates
      this.gameOver = true;
      
      // Stop audio
      if (this.audioManager) {
        this.audioManager.stopAllSounds();
      }
      
      // Stop dialogue
      if (this.dialogueManager) {
        this.dialogueManager.stopDialogue();
      }
      
      // Clear all timers
      if (this.time) {
        this.time.removeAllEvents();
      }
      
      // Stop all tweens
      if (this.tweens) {
        this.tweens.killAll();
      }
      
      // Clear input handlers
      if (this.input && this.input.keyboard) {
        this.input.keyboard.removeAllKeys();
      }
      
      // Clean up NPCs
      if (this.npcs && Array.isArray(this.npcs)) {
        for (const npc of this.npcs) {
          if (npc.stopSpeaking) {
            try {
              npc.stopSpeaking();
            } catch (e) {
              console.warn("Error stopping NPC speech:", e);
            }
          }
        }
      }
      
      // Clean up player
      if (this.player) {
        if (this.player.stopFarting) {
          try {
            this.player.stopFarting();
          } catch (e) {
            console.warn("Error stopping player farting:", e);
          }
        }
      }
      
      // Nullify references to aid garbage collection
      this.dialogueManager = null as any;
      this.audioManager = null as any;
      this.player = null as any;
      this.npcs = [];
      this.fartMeter = null as any;
      this.rhythmUI = null as any;
      this.notes = [];
      
      console.log("GameScene shutdown complete");
    } catch (error) {
      console.error("Error in GameScene shutdown:", error);
    }
  }
  
  /**
   * Cleanup method that runs when the scene is destroyed
   */
  private onSceneDestroy = (): void => {
    console.log("GameScene destroy event triggered");
    try {
      // Any additional cleanup specific to scene destruction
      // Most cleanup should already be handled in onSceneShutdown
    } catch (error) {
      console.error("Error in GameScene destroy handler:", error);
    }
  }
}
