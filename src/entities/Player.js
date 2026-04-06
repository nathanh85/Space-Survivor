// ============================================================
// Player Entity — twin-stick ship: move + aim independently
// v0.7.a2: Ship rotates to face aim/move direction via shipGfx
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
    this.aimAngle = 0;      // radians — aim direction (mouse / right stick)
    this.facingAngle = 0;   // radians — direction ship sprite faces
    this.isMoving = false;
    this._lastGlow = false; // cached — only redraw ship when this changes

    // Ship graphics (child of container — rotate THIS, never the container)
    this.shipGfx = scene.add.graphics();
    this.add(this.shipGfx);
    this.drawShip(false);

    // Scale container — ALWAYS positive, NEVER negative on container
    this.setScale(1.5);

    // Physics body
    scene.physics.add.existing(this);
    this.body.setCircle(17, -17, -17);
    this.body.setDrag(300);
    this.body.setMaxVelocity(300);
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
   * @param {number} moveX  -1..1 horizontal movement
   * @param {number} moveY  -1..1 vertical movement
   * @param {number} aimAngle  radians — aim direction
   * @param {boolean} isAiming  true when right stick or mouse is actively aiming
   */
  update(moveX, moveY, aimAngle, isAiming) {
    const speed = PLAYER_DEFAULTS.moveSpeed;

    if (moveX !== 0 || moveY !== 0) {
      const mag = Math.hypot(moveX, moveY);
      const intensity = Math.min(mag, 1.0);
      const nx = moveX / mag;
      const ny = moveY / mag;
      this.body.setVelocity(nx * speed * intensity, ny * speed * intensity);
      this.isMoving = true;
    } else {
      this.isMoving = false;
    }

    this.aimAngle = aimAngle;

    // Ship facing priority: aim > move > hold last
    if (isAiming) {
      this.facingAngle = aimAngle;
    } else if (moveX !== 0 || moveY !== 0) {
      this.facingAngle = Math.atan2(moveY, moveX);
    }
    // Both neutral: facingAngle holds its last value

    // Rotate the GRAPHICS CHILD only — never the Container
    this.shipGfx.setRotation(this.facingAngle);

    // Engine glow — only redraw when glow state changes (NOT every frame)
    const wantGlow = this.isMoving;
    if (wantGlow !== this._lastGlow) {
      this._lastGlow = wantGlow;
      this.drawShip(wantGlow);
    }

    // Shield regen
    const scene = this.scene;
    const regenPaused = scene.shieldRegenPaused && Date.now() < scene.shieldRegenPaused;
    if (this.shield < this.maxShield && !regenPaused) {
      this.shield = Math.min(this.maxShield, this.shield + 0.008);
    }
  }
}
