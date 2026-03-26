// ============================================================
// Weapon System — laser firing, projectile pool
// ============================================================

import Phaser from 'phaser';

const LASER = {
  type: 'laser',
  damage: 15,
  fireRate: 250,
  projectileSpeed: 500,
  projectileLifetime: 700,
  maxRange: 333,
  projectileColor: 0x00d4ff,
};

export default class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.weapon = { ...LASER };
    this.lastFired = 0;
    this.projectiles = scene.physics.add.group();
  }

  fire(time, x, y, angle) {
    if (time - this.lastFired < this.weapon.fireRate) return null;
    this.lastFired = time;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const spawnX = x + cos * 18;
    const spawnY = y + sin * 18;

    const proj = this.scene.add.rectangle(spawnX, spawnY, 4, 2, this.weapon.projectileColor)
      .setDepth(95).setRotation(angle);
    this.scene.physics.add.existing(proj);

    // Add to group FIRST, then set velocity (group.add can reset body props)
    this.projectiles.add(proj);

    // Ensure no drag/damping on projectile
    proj.body.setDrag(0);
    proj.body.setMaxVelocity(9999);
    proj.body.setCollideWorldBounds(false);

    // NOW set velocity — after group add
    proj.body.setVelocity(cos * this.weapon.projectileSpeed, sin * this.weapon.projectileSpeed);

    proj._damage = this.weapon.damage;
    proj._spawnX = spawnX;
    proj._spawnY = spawnY;
    proj._maxRange = 333;

    // Despawn timer (backup)
    this.scene.time.delayedCall(this.weapon.projectileLifetime, () => {
      if (proj && proj.active) proj.destroy();
    });

    return proj;
  }

  update() {
    // Range-limit projectiles
    this.projectiles.getChildren().forEach(proj => {
      if (!proj || !proj.active) return;
      if (proj._spawnX !== undefined) {
        const dist = Phaser.Math.Distance.Between(proj._spawnX, proj._spawnY, proj.x, proj.y);
        if (dist > (proj._maxRange || 333)) proj.destroy();
      }
    });
  }

  getWeaponName() {
    return this.weapon.type.toUpperCase();
  }

  getDamage() {
    return this.weapon.damage;
  }

  getRange() {
    return this.weapon.maxRange || 333;
  }
}
