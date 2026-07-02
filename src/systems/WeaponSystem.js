// ============================================================
// Weapon System — config-driven firing, projectile pool
// v0.7.e.3: reads WEAPON_CONFIGS; primary (laser) + secondary (cannon)
// ============================================================

import Phaser from 'phaser';
import { WEAPON_CONFIGS, bestOwned } from '../data/entities/weapons.js';

export default class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.primary = WEAPON_CONFIGS.laser_mk1;
    this.secondary = null;            // cannon config once owned
    this.damageBonus = 0;             // level-up bonus, applies to primary
    this.lastFired = { primary: 0, secondary: 0 };
    this.projectiles = scene.physics.add.group();

    // Back-compat shim: legacy code reads weaponSystem.weapon.damage
    this.weapon = this.primary;
  }

  // Recompute equipped weapons from owned weapon ids
  setLoadout(ownedIds) {
    this.primary = bestOwned(ownedIds, 'primary') || WEAPON_CONFIGS.laser_mk1;
    this.secondary = bestOwned(ownedIds, 'secondary');
    this.weapon = this.primary;
  }

  firePrimary(time, x, y, angle) {
    return this._fire('primary', this.primary, time, x, y, angle);
  }

  // Returns projectile or null; caller manages ammo
  fireSecondary(time, x, y, angle) {
    if (!this.secondary) return null;
    return this._fire('secondary', this.secondary, time, x, y, angle);
  }

  _fire(slot, cfg, time, x, y, angle) {
    if (time - this.lastFired[slot] < cfg.fireRate) return null;
    this.lastFired[slot] = time;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const spawnX = x + cos * 18;
    const spawnY = y + sin * 18;

    const p = cfg.projectile;
    const proj = this.scene.add.rectangle(spawnX, spawnY, p.width, p.height, p.color)
      .setDepth(95).setRotation(angle);
    this.scene.physics.add.existing(proj);

    // Add to group FIRST, then set velocity (group.add can reset body props)
    this.projectiles.add(proj);
    proj.body.setDrag(0);
    proj.body.setMaxVelocity(9999);
    proj.body.setCollideWorldBounds(false);
    proj.body.setVelocity(cos * cfg.projectileSpeed, sin * cfg.projectileSpeed);

    proj._damage = cfg.damage + (slot === 'primary' ? this.damageBonus : 0);
    proj._hardness = cfg.minesHardness || 1;
    proj._weaponId = cfg.id;
    proj._spawnX = spawnX;
    proj._spawnY = spawnY;
    proj._maxRange = cfg.maxRange;

    this.scene.time.delayedCall(cfg.projectileLifetime, () => {
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
    return this.primary.name.toUpperCase();
  }

  getDamage() {
    return this.primary.damage + this.damageBonus;
  }

  getRange() {
    return this.primary.maxRange || 333;
  }
}
