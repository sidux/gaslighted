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
  private dangerZones: Phaser.GameObjects.GameObject[] = []; // Changed to GameObject to accept both Rectangle and Text
  
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
    this.clearSafeZones();
    
    // Create new safe zones for vertical meter
    safeZones.forEach(zone => {
      // For vertical meter, we need to convert the percentage values to Y positions
      // The meter is 200 pixels tall, positioning from -100 (top) to +100 (bottom)
      // Higher values should be higher on the meter (lower Y values)
      const zoneEndY = -100 + (200 - ((zone.end / 100) * 200));
      const zoneStartY = -100 + (200 - ((zone.start / 100) * 200));
      const zoneHeight = Math.abs(zoneEndY - zoneStartY);
      
      // Create a green zone indicator
      const zoneRect = this.scene.add.rectangle(
        0,  // Center X
        (zoneStartY + zoneEndY) / 2,  // Center Y of zone
        26,  // Width - slightly narrower than the background
        zoneHeight,
        0x00ff00,
        0.4
      ).setOrigin(0.5, 0.5);
      
      // Add border to make it more visible
      zoneRect.setStrokeStyle(1, 0x00ff00, 0.8);
      
      // Add a pulsing animation to make it more noticeable
      this.scene.tweens.add({
        targets: zoneRect,
        alpha: { from: 0.4, to: 0.8 },
        yoyo: true,
        repeat: -1,
        duration: 500
      });
      
      // Add "SAFE" text for the largest zone
      if (zoneHeight > 30) {
        const safeText = this.scene.add.text(
          -40, // Left of the meter
          (zoneStartY + zoneEndY) / 2,
          "SAFE",
          {
            font: '12px Arial',
            color: '#00ff00',
            fontStyle: 'bold'
          }
        ).setOrigin(1, 0.5);
        
        this.meterContainer.add(safeText);
        this.dangerZones.push(safeText); // It's now safe to add Text to dangerZones (GameObject[])
      }
      
      this.meterContainer.add(zoneRect);
      this.dangerZones.push(zoneRect);
    });
    
    // Add up/down indicators to guide player to safe zones
    this.addSafeZoneGuides(safeZones);
  }
  
  /**
   * Add visual guides to direct player to nearest safe zone
   */
  private addSafeZoneGuides(safeZones: Array<{ start: number; end: number }>): void {
    // Find the nearest safe zone to current pressure
    const currentPressurePercent = (this.currentPressure / GameConfig.FART_PRESSURE_MAX) * 100;
    
    // Find closest safe zone
    let closestZone = null;
    let minDistance = Infinity;
    
    for (const zone of safeZones) {
      const zoneMiddle = (zone.start + zone.end) / 2;
      const distance = Math.abs(zoneMiddle - currentPressurePercent);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestZone = zone;
      }
    }
    
    if (closestZone) {
      const zoneMiddle = (closestZone.start + closestZone.end) / 2;
      
      // Determine if we need to go up or down
      const needToGoUp = zoneMiddle < currentPressurePercent;
      
      // Add an arrow indicator
      const arrowText = needToGoUp ? "↑" : "↓";
      const arrowColor = needToGoUp ? "#00ffff" : "#ffff00";
      
      const arrow = this.scene.add.text(
        40, // Right of the meter
        0,  // Will be positioned based on current pressure
        arrowText,
        {
          font: '24px Arial',
          color: arrowColor,
          fontStyle: 'bold'
        }
      ).setOrigin(0, 0.5);
      
      // Position arrow at current pressure level
      const pressureY = -100 + (200 - ((currentPressurePercent / 100) * 200));
      arrow.y = pressureY;
      
      // Add pulsing animation
      this.scene.tweens.add({
        targets: arrow,
        alpha: { from: 0.7, to: 1 },
        scale: { from: 0.9, to: 1.1 },
        yoyo: true,
        repeat: -1,
        duration: 300
      });
      
      this.meterContainer.add(arrow);
      this.dangerZones.push(arrow); // It's now safe to add Text to dangerZones (GameObject[])
    }
  }
  
  /**
   * Clear all safe zone indicators
   */
  public clearSafeZones(): void {
    // Remove all zone indicators
    this.dangerZones.forEach(zone => zone.destroy());
    this.dangerZones = [];
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
