// ============================================================
// Player Entity — ship graphics, physics, controls
// ============================================================

import Phaser from 'phaser';
import { PLAYER_DEFAULTS } from '../config/constants.js';

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);

    // Stats
    this.hull = PLAYER_DEFAULTS.hull;
    this.maxHull = PLAYER_DEFAULTS.hull;
    this.shield = PLAYER_DEFAULTS.shield;
    this.maxShield = PLAYER_DEFAULTS.shield;
    this.fuel = PLAYER_DEFAULTS.fuel;
    this.maxFuel = PLAYER_DEFAULTS.fuel;
    this.xp = 0;
    this.xpNext = PLAYER_DEFAULTS.xpNext;
    this.level = 1;
    this.credits = 500;

    // Physics tuning
    this.accelRate = PLAYER_DEFAULTS.accel;
    this.turnSmooth = PLAYER_DEFAULTS.turnSmooth;
    this.shipAngle = 0;

    // Ship graphics
    this.shipGfx = scene.add.graphics();
    this.add(this.shipGfx);
    this.drawShip(false);

    // Physics body
    scene.physics.add.existing(this);
    this.body.setCircle(14, -14, -14);
    this.body.setMaxVelocity(PLAYER_DEFAULTS.speed);
    this.body.setDrag(PLAYER_DEFAULTS.speed * 1.8);
    this.body.setCollideWorldBounds(true);

    this.setDepth(100);
  }

  drawShip(showGlow) {
    const g = this.shipGfx;
    g.clear();

    if (showGlow) {
      g.fillStyle(0x00b4ff, 0.15);
      g.beginPath();
      g.moveTo(-10, -6); g.lineTo(-22, 0); g.lineTo(-10, 6);
      g.closePath(); g.fillPath();
    }

    g.fillStyle(0x666666); g.fillRect(-10, -4, 5, 8);       // Engine
    g.fillStyle(0xdddddd); g.fillRect(-6, -5, 16, 10);      // Hull
    g.fillStyle(0x00d4ff); g.fillRect(10, -3, 6, 6);        // Nose
    g.fillStyle(0x999999); g.fillRect(-4, -11, 10, 5);      // Top wing
    g.fillStyle(0x999999); g.fillRect(-4, 6, 10, 5);        // Bot wing
    g.fillStyle(0xe74c3c); g.fillRect(-4, -12, 3, 2);       // Top tip
    g.fillStyle(0xe74c3c); g.fillRect(-4, 10, 3, 2);        // Bot tip
    g.fillStyle(0x00aaff); g.fillRect(4, -2, 4, 4);         // Cockpit
  }

  update(cursors, pointer) {
    let ax = 0, ay = 0;
    if (cursors.up.isDown || cursors.w.isDown) ay = -1;
    if (cursors.down.isDown || cursors.s.isDown) ay = 1;
    if (cursors.left.isDown || cursors.a.isDown) ax = -1;
    if (cursors.right.isDown || cursors.d.isDown) ax = 1;
    if (ax && ay) { ax /= Math.SQRT2; ay /= Math.SQRT2; }

    const isMoving = ax !== 0 || ay !== 0;

    if (isMoving) {
      this.body.setAcceleration(ax * this.accelRate, ay * this.accelRate);
      this.drawShip(true);
    } else {
      this.body.setAcceleration(0, 0);
      this.drawShip(false);
    }

    // Aim toward mouse
    const wp = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const target = Phaser.Math.Angle.Between(this.x, this.y, wp.x, wp.y);
    let diff = target - this.shipAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.shipAngle += diff * this.turnSmooth;
    this.setRotation(this.shipAngle);

    // Shield regen
    if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 0.015);
    }
  }
}
