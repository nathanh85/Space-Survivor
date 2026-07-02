// ============================================================
// Deputy Harlan — Act 1 boss (v0.9.c)
// 3 phases per LEVEL_DESIGN_PACK: volley → summons+ring → charges.
// Scout silhouette at 2.5x with gold trim (placeholder art per ⚑).
// ============================================================

import Phaser from 'phaser';
import { TIN_BADGE } from '../data/enemies.js';

const PHASE_LINES = {
  2: "Unregistered, uncooperative, AND rude. Addin' that to the file.",
  3: "You know what happens to folks who resist? ...Neither do I. Nobody's ever made it this far.",
};

export default class BossHarlan {
  constructor(scene, x, y, arenaCenter) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.arenaCenter = arenaCenter;
    this.maxHp = 40 * 30; // 40x tin_badge
    this.hp = this.maxHp;
    this.phase = 1;
    this.alive = true;
    this.angle = 0;
    this.size = 30; // scout-ish at 2.5x

    // Movement
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.speed = 90;

    // Attack timers
    this.lastVolley = 0;
    this.lastSummon = 0;
    this.lastCharge = 0;
    this.telegraph = null;   // { type: 'volley'|'charge', until, targetX, targetY }
    this.charging = null;    // { vx, vy, until }
    this.lastContactHit = 0;
    this.trailHazards = [];

    this.gfx = scene.add.graphics().setDepth(96);
    this.telegraphGfx = scene.add.graphics().setDepth(94);
    this.flashTimer = 0;
  }

  update(time, delta, px, py, projGroup) {
    if (!this.alive) return;
    const dt = delta / 1000;

    // Phase transitions
    const pct = this.hp / this.maxHp;
    const wantPhase = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (wantPhase > this.phase) this._enterPhase(wantPhase, time);

    // Movement + attacks by phase
    if (this.charging) {
      this._updateCharge(time, dt, px, py);
    } else if (this.telegraph && this.telegraph.type === 'charge') {
      // Hold still during charge telegraph
      if (time > this.telegraph.until) this._beginCharge(time);
    } else {
      this._orbitMove(dt, px, py);
      if (this.phase === 1 || this.phase === 2) this._updateVolley(time, px, py, projGroup);
      if (this.phase === 2) this._updateSummons(time, projGroup);
      if (this.phase === 3 && time - this.lastCharge > 4000) {
        // Telegraph the charge: 1s line toward the player's current position
        this.telegraph = { type: 'charge', until: time + 1000, targetX: px, targetY: py };
      }
    }

    // Contact damage while charging
    if (this.charging && time - this.lastContactHit > 800) {
      if (Phaser.Math.Distance.Between(this.x, this.y, px, py) < this.size + 18) {
        this.lastContactHit = time;
        this.scene.playerTakeDamage(15);
      }
    }

    // Trail hazards damage + expiry
    for (let i = this.trailHazards.length - 1; i >= 0; i--) {
      const h = this.trailHazards[i];
      if (time > h.until) { h.obj.destroy(); this.trailHazards.splice(i, 1); continue; }
      if (time - this.lastContactHit > 800 &&
          Phaser.Math.Distance.Between(h.x, h.y, px, py) < 26) {
        this.lastContactHit = time;
        this.scene.playerTakeDamage(6);
      }
    }

    if (this.flashTimer > 0) this.flashTimer -= delta;
    this.draw(time);
  }

  _enterPhase(phase, time) {
    this.phase = phase;
    this.scene.sound_mgr.play('boss_phase');
    const line = PHASE_LINES[phase];
    if (line) {
      this.scene.textQueue.enqueue({ type: 'transmission', speaker: 'harlan',
        data: { speaker: 'harlan', lines: [line] } });
    }
    // Entering phase 3 clears any pending summock cycle
    if (phase === 3) this.telegraph = null;
  }

  _orbitMove(dt, px, py) {
    // Patrol a ring around the arena center, drifting toward the player a little
    this.orbitAngle += 0.25 * dt * (this.phase === 2 ? 1.4 : 1);
    const r = 420;
    const tx = this.arenaCenter.x + Math.cos(this.orbitAngle) * r;
    const ty = this.arenaCenter.y + Math.sin(this.orbitAngle) * r;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const spd = this.speed * (this.phase === 3 ? 1.3 : 1);
    this.x += (dx / dist) * spd * dt;
    this.y += (dy / dist) * spd * dt;
    this.angle = Math.atan2(py - this.y, px - this.x);
  }

  _updateVolley(time, px, py, projGroup) {
    const interval = this.phase === 1 ? 2600 : 3200;
    if (!this.telegraph && time - this.lastVolley > interval) {
      // Generous telegraph: 600ms wind-up ring before firing
      this.telegraph = { type: 'volley', until: time + 600, targetX: px, targetY: py };
    }
    if (this.telegraph && this.telegraph.type === 'volley' && time > this.telegraph.until) {
      this.telegraph = null;
      this.lastVolley = time;
      // Aimed 3-shot burst, 150ms apart
      for (let i = 0; i < 3; i++) {
        this.scene.time.delayedCall(i * 150, () => {
          if (this.alive) this._fireAt(px, py, projGroup, 300, 10);
        });
      }
    }
  }

  _updateSummons(time, projGroup) {
    if (time - this.lastSummon < 15000) return;
    const em = this.scene.enemyManager;
    if (em.getEnemyCount() >= 4) return;
    this.lastSummon = time;
    // "By the book." — 2 Tin Badges + a slow radial bullet ring
    const rank = { key: 'standard_0', hpMult: 1, dmgMult: 1, spdMult: 1, color: 0xff4444, stripes: 0 };
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      em.spawnEnemy(this.x + Math.cos(a) * 120, this.y + Math.sin(a) * 120, { ...TIN_BADGE }, rank);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this._fireDir(a, projGroup, 140, 8);
    }
  }

  _beginCharge(time) {
    const t = this.telegraph;
    this.telegraph = null;
    this.lastCharge = time;
    const dx = t.targetX - this.x, dy = t.targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.charging = { vx: (dx / dist) * 520, vy: (dy / dist) * 520, until: time + 800 };
  }

  _updateCharge(time, dt, px, py) {
    this.x += this.charging.vx * dt;
    this.y += this.charging.vy * dt;
    this.angle = Math.atan2(this.charging.vy, this.charging.vx);
    // Damage trail: brief hazard puffs along the path
    if (Math.random() < 0.5) {
      const obj = this.scene.add.circle(this.x, this.y, 10, 0xe74c3c, 0.35).setDepth(93);
      this.trailHazards.push({ x: this.x, y: this.y, until: time + 1500, obj });
    }
    if (time > this.charging.until) this.charging = null;
  }

  _fireAt(px, py, group, speed, damage) {
    this._fireDir(Math.atan2(py - this.y, px - this.x), group, speed, damage);
  }

  _fireDir(angle, group, speed, damage) {
    const proj = this.scene.add.rectangle(
      this.x + Math.cos(angle) * (this.size + 6),
      this.y + Math.sin(angle) * (this.size + 6),
      6, 3, 0xffd700
    ).setDepth(94);
    this.scene.physics.add.existing(proj);
    proj.setRotation(angle);
    proj._damage = damage;
    group.add(proj);
    proj.body.setDrag(0);
    proj.body.setMaxVelocity(9999);
    proj.body.setCollideWorldBounds(false);
    proj.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.scene.time.delayedCall(3500, () => { if (proj && proj.active) proj.destroy(); });
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    this.flashTimer = 80;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  draw(time) {
    const g = this.gfx;
    g.clear();
    const flash = this.flashTimer > 0;
    const bodyColor = flash ? 0xffffff : 0xc0392b;
    const s = this.size;
    const cos = Math.cos(this.angle), sin = Math.sin(this.angle);
    const pts = [
      { x: this.x + cos * s * 1.3, y: this.y + sin * s * 1.3 },
      { x: this.x + (-sin) * s * 0.7, y: this.y + cos * s * 0.7 },
      { x: this.x - cos * s * 0.8, y: this.y - sin * s * 0.8 },
      { x: this.x + sin * s * 0.7, y: this.y - cos * s * 0.7 },
    ];
    g.fillStyle(bodyColor);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    // Gold trim (the badge)
    g.lineStyle(2.5, 0xffd700, 0.95);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.strokePath();
    g.fillStyle(0xffd700, 1);
    g.fillCircle(this.x, this.y, 5);
    // Menace glow
    if (!flash) {
      g.fillStyle(0xc0392b, 0.12);
      g.fillCircle(this.x, this.y, s * 2.2);
    }

    // Telegraphs
    const tg = this.telegraphGfx;
    tg.clear();
    if (this.telegraph) {
      if (this.telegraph.type === 'volley') {
        const pulse = 0.4 + Math.sin(time * 0.02) * 0.3;
        tg.lineStyle(2, 0xffd700, pulse);
        tg.strokeCircle(this.x, this.y, s + 14);
      } else if (this.telegraph.type === 'charge') {
        tg.lineStyle(3, 0xe74c3c, 0.5);
        tg.beginPath();
        tg.moveTo(this.x, this.y);
        tg.lineTo(this.telegraph.targetX, this.telegraph.targetY);
        tg.strokePath();
      }
    }
  }

  destroy() {
    this.alive = false;
    if (this.gfx) this.gfx.destroy();
    if (this.telegraphGfx) this.telegraphGfx.destroy();
    for (const h of this.trailHazards) h.obj.destroy();
    this.trailHazards = [];
  }
}
