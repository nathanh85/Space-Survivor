// ============================================================
// Player Entity — twin-stick ship: move + aim independently
// v0.7.a: No rotation. Velocity-based movement. Instant stop.
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

    // Twin-stick state
    this.aimAngle = 0;    // radians — where the player is aiming (mouse / left stick)
    this.isMoving = false; // true when ship has movement input

    // Ship graphics
    this.shipGfx = scene.add.graphics();
    this.add(this.shipGfx);
    this.drawShip(false);

    // Scale ship up 20%
    this.setScale(1.5);

    // Physics body
    scene.physics.add.existing(this);
    this.body.setCircle(17, -17, -17);
    this.body.setDrag(0);           // no drag — instant stop on release
    this.body.setMaxVelocity(9999); // velocity set directly, no cap needed
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

  /**
   * Twin-stick update — scene computes inputs, player applies them.
   * @param {number} moveX  -1..1 horizontal movement (right stick / arrows)
   * @param {number} moveY  -1..1 vertical movement (right stick / arrows)
   * @param {number} aimAngle  radians — aim direction (left stick / mouse)
   */
  update(moveX, moveY, aimAngle) {
    // Movement — direct velocity, instant stop
    const speed = PLAYER_DEFAULTS.moveSpeed;
    if (moveX !== 0 || moveY !== 0) {
      const mag = Math.hypot(moveX, moveY);
      const intensity = Math.min(mag, 1.0);
      const nx = moveX / mag;
      const ny = moveY / mag;
      this.body.setVelocity(nx * speed * intensity, ny * speed * intensity);
      this.isMoving = true;
    } else {
      this.body.setVelocity(0, 0);
      this.isMoving = false;
    }

    // Aim angle — for firing + crosshair (ship does NOT rotate)
    this.aimAngle = aimAngle;

    // Horizontal flip when moving left
    if (moveX < -0.2) this.setScale(-1.5, 1.5);
    else if (moveX > 0.2) this.setScale(1.5, 1.5);

    // Engine glow when moving
    this.drawShip(this.isMoving);

    // Shield regen (paused during combat damage)
    const scene = this.scene;
    const regenPaused = scene.shieldRegenPaused && Date.now() < scene.shieldRegenPaused;
    if (this.shield < this.maxShield && !regenPaused) {
      this.shield = Math.min(this.maxShield, this.shield + 0.008);
    }
  }
}
