import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

window.addEventListener('load', () => {
  // Create the Phaser game instance
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GameConfig.WIDTH,
    height: GameConfig.HEIGHT,
    scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene],
    backgroundColor: GameConfig.BACKGROUND_COLOR,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    },
    audio: {
      disableWebAudio: false
    }
  });
});
