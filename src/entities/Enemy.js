// ============================================================
// Enemy Entity — AI state machine, rendering, health
// ============================================================

import Phaser from 'phaser';

export default class Enemy {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.config = config;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.damage = config.damage;
    this.speed = config.speed;
    this.detectRange = config.detectRange;
    this.attackRange = config.attackRange;
    this.fireRate = config.fireRate;
    this.lastFired = 0;
    this.state = 'patrol';
    this.loot = config.loot;
    this.xp = config.xp;
    this.alive = true;
    this.angle = 0;
    this.distantTime = 0; // time spent far from player

    // Graphics
    this.gfx = scene.add.graphics().setDepth(95);
    this.x = x;
    this.y = y;

    // Physics body (invisible rectangle for collision)
    this.body = scene.add.rectangle(x, y, config.width, config.height, 0x000000, 0)
      .setDepth(95);
    scene.physics.add.existing(this.body);
    this.body.body.setCollideWorldBounds(false);
    this.body.body.setMaxVelocity(config.speed);

    // Health bar (only visible when damaged)
    this.hpBar = scene.add.graphics().setDepth(96);
    this.flashTimer = 0;

    // Patrol target
    this.patrolTarget = { x: x + Math.random() * 400 - 200, y: y + Math.random() * 400 - 200 };
  }

  update(time, delta, playerX, playerY, enemyProjectiles) {
    if (!this.alive) return;
    const dt = delta / 1000;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    // State transitions
    switch (this.state) {
      case 'patrol':
        if (dist < this.detectRange) this.state = 'chase';
        break;
      case 'chase':
        if (dist < this.attackRange) this.state = 'attack';
        else if (dist > this.detectRange * 1.5) this.state = 'patrol';
        break;
      case 'attack':
        if (dist > this.attackRange * 1.3) this.state = 'chase';
        break;
    }

    // State behavior
    switch (this.state) {
      case 'patrol':
        this.doPatrol(dt);
        break;
      case 'chase':
        this.doChase(dt, playerX, playerY);
        break;
      case 'attack':
        this.doAttack(dt, time, playerX, playerY, enemyProjectiles);
        break;
    }

    // Sync physics body position
    this.body.setPosition(this.x, this.y);

    // Flash timer
    if (this.flashTimer > 0) this.flashTimer -= delta;

    // Draw
    this.draw(time);
    this.drawHpBar();
  }

  doPatrol(dt) {
    const dx = this.patrolTarget.x - this.x;
    const dy = this.patrolTarget.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 20) {
      this.patrolTarget = {
        x: this.x + Math.random() * 400 - 200,
        y: this.y + Math.random() * 400 - 200,
      };
      return;
    }
    const spd = this.speed * 0.5 * dt;
    this.x += (dx / dist) * spd;
    this.y += (dy / dist) * spd;
    this.angle = Math.atan2(dy, dx);
  }

  doChase(dt, px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const spd = this.speed * dt;
    this.x += (dx / dist) * spd;
    this.y += (dy / dist) * spd;
    this.angle = Math.atan2(dy, dx);
  }

  doAttack(dt, time, px, py, enemyProjectiles) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    // Close slowly
    if (dist > 80) {
      const spd = this.speed * 0.6 * dt;
      this.x += (dx / dist) * spd;
      this.y += (dy / dist) * spd;
    }

    // Fire
    if (time - this.lastFired > this.fireRate) {
      this.lastFired = time;
      this.fireProjectile(px, py, enemyProjectiles);
    }
  }

  fireProjectile(px, py, group) {
    const angle = Math.atan2(py - this.y, px - this.x);
    const proj = this.scene.add.rectangle(
      this.x + Math.cos(angle) * 10,
      this.y + Math.sin(angle) * 10,
      4, 2, 0xe74c3c
    ).setDepth(94);
    this.scene.physics.add.existing(proj);
    proj.body.setVelocity(
      Math.cos(angle) * this.config.projectileSpeed,
      Math.sin(angle) * this.config.projectileSpeed
    );
    proj.setRotation(angle);
    proj._damage = this.damage;
    group.add(proj);

    // Despawn after 2s
    this.scene.time.delayedCall(2000, () => {
      if (proj && proj.active) proj.destroy();
    });
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.flashTimer = 100;
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  die() {
    this.alive = false;

    // Particle burst
    for (let i = 0; i < 10; i++) {
      const px = this.x + (Math.random() - 0.5) * 20;
      const py = this.y + (Math.random() - 0.5) * 20;
      const color = Math.random() > 0.5 ? 0xf39c12 : 0xe74c3c;
      const p = this.scene.add.rectangle(px, py, 3, 3, color).setDepth(200).setAlpha(0.9);
      this.scene.tweens.add({
        targets: p,
        x: px + (Math.random() - 0.5) * 60,
        y: py + (Math.random() - 0.5) * 60,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 500,
        onComplete: () => p.destroy(),
      });
    }

    this.destroy();
  }

  draw(time) {
    const g = this.gfx;
    g.clear();

    const flash = this.flashTimer > 0;
    const color = flash ? 0xffffff : this.config.color;

    // Diamond shape
    const s = this.config.width / 2;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const pts = [
      { x: this.x + cos * s * 1.3, y: this.y + sin * s * 1.3 },         // nose
      { x: this.x + (-sin) * s * 0.7, y: this.y + cos * s * 0.7 },      // left
      { x: this.x - cos * s * 0.8, y: this.y - sin * s * 0.8 },         // tail
      { x: this.x + sin * s * 0.7, y: this.y - cos * s * 0.7 },         // right
    ];

    g.fillStyle(color);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();

    // Red glow
    if (!flash) {
      g.fillStyle(this.config.color, 0.15);
      g.fillCircle(this.x, this.y, s * 2);
    }
  }

  drawHpBar() {
    this.hpBar.clear();
    if (this.hp >= this.maxHp) return;
    const w = 20, h = 3;
    const bx = this.x - w / 2, by = this.y - this.config.height - 6;
    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(bx, by, w, h);
    this.hpBar.fillStyle(0xe74c3c);
    this.hpBar.fillRect(bx, by, w * (this.hp / this.maxHp), h);
  }

  destroy() {
    this.alive = false;
    if (this.gfx) this.gfx.destroy();
    if (this.body) this.body.destroy();
    if (this.hpBar) this.hpBar.destroy();
  }
}
