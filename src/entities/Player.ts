import Phaser from 'phaser';
import { Character, CharacterRole } from './Character';
import { FartMeter } from './FartMeter';

/**
 * Player class extends Character with fart-specific functionalities
 * This is a wrapper around Character that makes player-specific code cleaner
 */
export class Player extends Character {
  // No need to redeclare properties that are already in Character
  
  constructor(
    scene: Phaser.Scene, 
    x: number,
    y: number, 
    id: string, 
    name: string, 
    voiceType: string,
    nameYOffset: number = 85
  ) {
    super(scene, x, y, id, name, voiceType, CharacterRole.PLAYER, nameYOffset);
  }
  
  /**
   * Checks if player is currently holding in a fart
   */
  public isHolding(): boolean {
    return this.getCurrentPressure() > 10; // Simplified implementation
  }
  
  /**
   * Override the update method to include player-specific behaviors
   */
  public update(delta: number): void {
    // Call the parent update method
    super.update(delta);
    
    // Add any player-specific update logic here
  }
}
