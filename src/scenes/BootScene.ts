import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({
      key: GameConfig.SCENE_BOOT
    });
  }

  preload(): void {
    // Load minimal assets needed for the preloader
    this.load.image('logo', 'images/logo.png');
    this.load.image('loading-bar', 'images/loading-bar.png');
  }

  create(): void {
    this.scene.start(GameConfig.SCENE_PRELOAD);
  }
}
