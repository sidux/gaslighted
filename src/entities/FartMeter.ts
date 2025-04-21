import Phaser from 'phaser';
import {GameConfig} from '../config/GameConfig';

export class FartMeter {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private currentPressure: number = 0;
  
  private meterContainer: Phaser.GameObjects.Container;
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
    
    // Create container for all meter elements
    this.meterContainer = this.scene.add.container(x, y);
    
    this.createMeter();
  }
  
  public update(): void {
    // Update fill height based on current pressure for vertical meter
    // Fill from bottom to top by keeping the origin at the bottom

    this.fill.height = (this.currentPressure / GameConfig.FART_PRESSURE_MAX) * -200;

    // Use a consistent blue-gray color for meter fill as shown in screenshot
    this.fill.fillColor = 0x6682bb;
    
    // Update the label with current pressure
    this.label.setText(`Pressure: ${Math.floor(this.currentPressure)}%`);
    
    // Pulsate when critical
    if (this.currentPressure >= GameConfig.FART_PRESSURE_CRITICAL && !this.scene.tweens.isTweening(this.fill)) {
      this.scene.tweens.add({
        targets: this.fill,
        alpha: { from: 0.7, to: 1 },
        yoyo: true,
        repeat: -1,
        duration: 300
      });
    } else if (this.currentPressure < GameConfig.FART_PRESSURE_CRITICAL) {
      this.scene.tweens.killTweensOf(this.fill);
      this.fill.alpha = 1;
    }
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
    
    // Create new danger zones for vertical meter
    dangerZones.forEach(zone => {
      const zoneStartY = (this.width / 2) - 2 - (zone.end / GameConfig.FART_PRESSURE_MAX) * (this.width - 4);
      const zoneHeight = ((zone.end - zone.start) / GameConfig.FART_PRESSURE_MAX) * (this.width - 4);
      
      const zoneRect = this.scene.add.rectangle(
        0,
        zoneStartY + zoneHeight,
        this.height - 4,
        zoneHeight,
        0xff0000,
        0.3
      ).setOrigin(0.5, 1);
      
      this.meterContainer.add(zoneRect);
      this.dangerZones.push(zoneRect);
    });
  }
  
  public setSafeZones(safeZones: Array<{ start: number; end: number }>): void {
    // Clear existing zones
    this.dangerZones.forEach(zone => zone.destroy());
    this.dangerZones = [];
    
    // Create new safe zones for vertical meter
    safeZones.forEach(zone => {
      const zoneStartY = (this.width / 2) - 2 - (zone.end / GameConfig.FART_PRESSURE_MAX) * (this.width - 4);
      const zoneHeight = ((zone.end - zone.start) / GameConfig.FART_PRESSURE_MAX) * (this.width - 4);
      
      const zoneRect = this.scene.add.rectangle(
        0,
        zoneStartY + zoneHeight,
        this.height - 4,
        zoneHeight,
        0x00ff00,
        0.3
      ).setOrigin(0.5, 1);
      
      this.meterContainer.add(zoneRect);
      this.dangerZones.push(zoneRect);
    });
  }
  
  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.meterContainer.setPosition(x, y);
  }
  
  private createMeter(): void {
    // Create a vertical meter that exactly matches the screenshot
    
    // Background with dark gray color
    const meterBg = this.scene.add.graphics();
    
    // Add outer stroke for the vertical bar (very thin, light gray)
    meterBg.lineStyle(1, 0x444444, 0.8);
    meterBg.strokeRoundedRect(-15, -100, 30, 200, 4);
    
    // Add background fill (dark gray)
    meterBg.fillStyle(0x333333, 1);
    meterBg.fillRoundedRect(-15, -100, 30, 200, 4);
    
    this.meterContainer.add(meterBg);
    
    // Fill rectangle starting from bottom (fills upward)
    this.fill = this.scene.add.rectangle(
      0,
      100 - 2, // Starting from bottom
      26,
      0,
      0x6682bb // Blue color from screenshot
    ).setOrigin(0.5, 1); // Origin at bottom center for bottom-to-top filling
    
    this.meterContainer.add(this.fill);
    
    // Critical threshold marker - horizontal red line
    const criticalY = -30; // Exact position from screenshot
    
    const criticalLine = this.scene.add.line(
      0,
      criticalY,
      -15,
      0,
      15,
      0,
      0xff0000
    ).setLineWidth(2);
    
    this.meterContainer.add(criticalLine);
    
    // Add critical text
    const criticalText = this.scene.add.text(
      30, 
      criticalY,
      'CRITICAL',
      {
        font: '12px Arial',
        color: '#ff0000',
        align: 'left'
      }
    ).setOrigin(0, 0.5);
    
    this.meterContainer.add(criticalText);
    
    // Pressure text above meter
    this.label = this.scene.add.text(
      0,
      -130,
      'Pressure: 3%',
      {
        font: '16px Arial',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);
    
    this.meterContainer.add(this.label);
  }
}
