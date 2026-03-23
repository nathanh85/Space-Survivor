// ============================================================
// Weapon System — laser firing, projectile pool
// ============================================================

import Phaser from 'phaser';

const LASER = {
  type: 'laser',
  damage: 15,
  fireRate: 250,
  projectileSpeed: 500,
  projectileLifetime: 1500,
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
    proj.body.setVelocity(cos * this.weapon.projectileSpeed, sin * this.weapon.projectileSpeed);
    proj._damage = this.weapon.damage;
    this.projectiles.add(proj);

    // Despawn timer
    this.scene.time.delayedCall(this.weapon.projectileLifetime, () => {
      if (proj && proj.active) proj.destroy();
    });

    return proj;
  }

  getWeaponName() {
    return this.weapon.type.toUpperCase();
  }

  getDamage() {
    return this.weapon.damage;
  }
}
