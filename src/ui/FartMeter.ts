import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class FartMeter {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private currentPressure: number = 0;
  
  private background!: Phaser.GameObjects.Rectangle;
  private fill!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  private dangerZones: Phaser.GameObjects.Rectangle[] = [];
  
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    
    this.createMeter();
  }
  
  public update(): void {
    // Update fill width based on current pressure
    const fillWidth = (this.currentPressure / GameConfig.FART_PRESSURE_MAX) * (this.width - 4);
    this.fill.width = fillWidth;
    
    // Update fill color based on pressure level
    if (this.currentPressure < 30) {
      this.fill.fillColor = 0x00ff00; // Green
    } else if (this.currentPressure < 60) {
      this.fill.fillColor = 0xffff00; // Yellow
    } else if (this.currentPressure < GameConfig.FART_PRESSURE_CRITICAL) {
      this.fill.fillColor = 0xff8800; // Orange
    } else {
      this.fill.fillColor = 0xff0000; // Red
      
      // Pulsate when critical
      if (!this.scene.tweens.isTweening(this.fill)) {
        this.scene.tweens.add({
          targets: this.fill,
          alpha: { from: 0.7, to: 1 },
          yoyo: true,
          repeat: -1,
          duration: 300
        });
      }
    }
    
    // Update label
    this.label.setText("Pressure: " + Math.floor(this.currentPressure) + "%");
  }
  
  public setPressure(value: number): void {
    this.currentPressure = value;
    
    // Stop pulsating if no longer critical
    if (this.currentPressure < GameConfig.FART_PRESSURE_CRITICAL) {
      this.scene.tweens.killTweensOf(this.fill);
      this.fill.alpha = 1;
    }
  }
  
  public setDangerZones(dangerZones: Array<{ start: number; end: number }>): void {
    // Clear existing danger zones
    this.dangerZones.forEach(zone => zone.destroy());
    this.dangerZones = [];
    
    // Create new danger zones
    dangerZones.forEach(zone => {
      const zoneStartX = this.x - (this.width / 2) + 2 + (zone.start / GameConfig.FART_PRESSURE_MAX) * (this.width - 4);
      const zoneWidth = ((zone.end - zone.start) / GameConfig.FART_PRESSURE_MAX) * (this.width - 4);
      
      const zoneRect = this.scene.add.rectangle(
        zoneStartX,
        this.y,
        zoneWidth,
        this.height,
        0xff0000,
        0.3
      ).setOrigin(0, 0.5);
      
      this.dangerZones.push(zoneRect);
    });
  }
  
  public setSafeZones(safeZones: Array<{ start: number; end: number }>): void {
    // Clear existing danger zones
    this.dangerZones.forEach(zone => zone.destroy());
    this.dangerZones = [];
    
    // Create new safe zones
    safeZones.forEach(zone => {
      const zoneStartX = this.x - (this.width / 2) + 2 + (zone.start / GameConfig.FART_PRESSURE_MAX) * (this.width - 4);
      const zoneWidth = ((zone.end - zone.start) / GameConfig.FART_PRESSURE_MAX) * (this.width - 4);
      
      const zoneRect = this.scene.add.rectangle(
        zoneStartX,
        this.y,
        zoneWidth,
        this.height,
        0x00ff00,
        0.3
      ).setOrigin(0, 0.5);
      
      this.dangerZones.push(zoneRect);
    });
  }
  
  private createMeter(): void {
    // Background
    this.background = this.scene.add.rectangle(
      this.x,
      this.y,
      this.width,
      this.height,
      0x333333
    ).setOrigin(0.5);
    
    // Fill (starts empty)
    this.fill = this.scene.add.rectangle(
      this.x - (this.width / 2) + 2,
      this.y,
      0,
      this.height - 4,
      0x00ff00
    ).setOrigin(0, 0.5);
    
    // Label
    this.label = this.scene.add.text(
      this.x,
      this.y - 25,
      'Pressure: 0%',
      {
        font: '18px Arial',
        color: '#ffffff'
      }
    ).setOrigin(0.5);
    
    // Critical threshold marker
    const criticalX = this.x - (this.width / 2) + (GameConfig.FART_PRESSURE_CRITICAL / GameConfig.FART_PRESSURE_MAX) * this.width;
    
    this.scene.add.line(
      criticalX,
      this.y,
      0,
      -this.height / 2,
      0,
      this.height / 2,
      0xff0000
    ).setLineWidth(2).setOrigin(0.5);
  }
}
