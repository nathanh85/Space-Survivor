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
    this.turnSmooth = PLAYER_DEFAULTS.turnSmooth;
    this.shipAngle = 0;
    this.isThrusting = false;

    // Ship graphics
    this.shipGfx = scene.add.graphics();
    this.add(this.shipGfx);
    this.drawShip(false);

    // Physics body
    scene.physics.add.existing(this);
    this.body.setCircle(14, -14, -14);
    this.body.setMaxVelocity(PLAYER_DEFAULTS.maxSpeed);
    this.body.setDrag(PLAYER_DEFAULTS.drag);
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
    // Aim toward mouse
    const wp = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const target = Phaser.Math.Angle.Between(this.x, this.y, wp.x, wp.y);
    let diff = target - this.shipAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.shipAngle += diff * this.turnSmooth;
    this.setRotation(this.shipAngle);

    // Thrust-based movement relative to ship facing
    const cos = Math.cos(this.shipAngle);
    const sin = Math.sin(this.shipAngle);
    let forward = 0, strafe = 0;

    if (cursors.w.isDown || cursors.up.isDown || (cursors.space && cursors.space.isDown)) forward = PLAYER_DEFAULTS.thrust;
    if (cursors.s.isDown || cursors.down.isDown) forward = -PLAYER_DEFAULTS.reverse;
    if (cursors.a.isDown || cursors.left.isDown) strafe = -PLAYER_DEFAULTS.strafe;
    if (cursors.d.isDown || cursors.right.isDown) strafe = PLAYER_DEFAULTS.strafe;

    this.isThrusting = forward > 0;
    const hasInput = forward !== 0 || strafe !== 0;

    if (hasInput) {
      // Forward: (cos, sin), Right: (-sin, cos) in screen coords
      const ax = forward * cos + strafe * (-sin);
      const ay = forward * sin + strafe * cos;
      this.body.setAcceleration(ax, ay);
      this.drawShip(this.isThrusting);
    } else {
      this.body.setAcceleration(0, 0);
      this.drawShip(false);
    }

    // Shield regen
    if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 0.015);
    }
  }
}
