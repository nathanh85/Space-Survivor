// Entity configs — Weapons
export const WEAPON_CONFIGS = {
  laser_mk1: {
    id: 'laser_mk1', name: 'Laser Mk1', type: 'laser', tier: 1, slot: 'primary',
    damage: 15, fireRate: 250, projectileSpeed: 500, projectileLifetime: 700,
    maxRange: 333, ammo: Infinity,
    projectile: { width: 4, height: 2, color: 0x00d4ff },
    sounds: { fire: 'laser_fire', hit: 'laser_hit' },
    minesHardness: 1,
  },
};
