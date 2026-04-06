// ============================================================
// Player Entity — twin-stick ship: move + aim independently
// v0.7.a: No rotation. Drag-based decel. Flip graphics only.
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
    this.aimAngle = 0;     // radians — aim direction (mouse / left stick)
    this.isMoving = false;  // true when movement input is active
    this._lastGlow = false; // cached glow state — only redraw ship when this changes

    // Ship graphics (child of container — flip THIS, never the container)
    this.shipGfx = scene.add.graphics();
    this.add(this.shipGfx);
    this.drawShip(false);

    // Scale container — ALWAYS positive, NEVER set negative scale on container
    this.setScale(1.5);

    // Physics body
    scene.physics.add.existing(this);
    this.body.setCircle(17, -17, -17);
    this.body.setDrag(300);           // gentle decel — gravity/knockback persist
    this.body.setMaxVelocity(300);    // cap so gravity can't accelerate forever
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
   * @param {number} moveX  -1..1 horizontal movement
   * @param {number} moveY  -1..1 vertical movement
   * @param {number} aimAngle  radians — aim direction
   */
  update(moveX, moveY, aimAngle) {
    const speed = PLAYER_DEFAULTS.moveSpeed;

    if (moveX !== 0 || moveY !== 0) {
      // Active input — set velocity directly
      const mag = Math.hypot(moveX, moveY);
      const intensity = Math.min(mag, 1.0);
      const nx = moveX / mag;
      const ny = moveY / mag;
      this.body.setVelocity(nx * speed * intensity, ny * speed * intensity);
      this.isMoving = true;
    } else {
      // No input — do NOT zero velocity. Drag handles deceleration.
      // Star gravity, knockback, and bounces persist between frames.
      this.isMoving = false;
    }

    // Aim angle (ship does NOT rotate — firing direction only)
    this.aimAngle = aimAngle;

    // Horizontal flip — ONLY flip the child graphics, never the container
    if (moveX < -0.2) {
      this.shipGfx.setScale(-1, 1);
    } else if (moveX > 0.2) {
      this.shipGfx.setScale(1, 1);
    }

    // Engine glow — only redraw when glow state changes (NOT every frame)
    const wantGlow = this.isMoving;
    if (wantGlow !== this._lastGlow) {
      this._lastGlow = wantGlow;
      this.drawShip(wantGlow);
    }

    // Shield regen (paused during combat damage)
    const scene = this.scene;
    const regenPaused = scene.shieldRegenPaused && Date.now() < scene.shieldRegenPaused;
    if (this.shield < this.maxShield && !regenPaused) {
      this.shield = Math.min(this.maxShield, this.shield + 0.008);
    }
  }
}
