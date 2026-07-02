// Entity configs — Weapons
// slot: 'primary' (laser, infinite ammo) | 'secondary' (cannon, L1/right-click)
// minesHardness: max asteroid hardness tier this weapon can crack (v0.7.f)
export const WEAPON_CONFIGS = {
  laser_mk1: {
    id: 'laser_mk1', name: 'Laser Mk1', type: 'laser', tier: 1, slot: 'primary',
    damage: 15, fireRate: 250, projectileSpeed: 500, projectileLifetime: 700,
    maxRange: 333, ammo: Infinity,
    projectile: { width: 4, height: 2, color: 0x00d4ff },
    sounds: { fire: 'laser_fire', hit: 'laser_hit' },
    minesHardness: 1,
  },
  laser_mk2: {
    id: 'laser_mk2', name: 'Laser Mk2', type: 'laser', tier: 2, slot: 'primary',
    damage: 28, fireRate: 220, projectileSpeed: 560, projectileLifetime: 750,
    maxRange: 380, ammo: Infinity,
    projectile: { width: 5, height: 2, color: 0x66f0ff },
    sounds: { fire: 'laser_fire', hit: 'laser_hit' },
    minesHardness: 2,
  },
  cannon_mk1: {
    id: 'cannon_mk1', name: 'Cannon Mk1', type: 'cannon', tier: 1, slot: 'secondary',
    damage: 45, fireRate: 800, projectileSpeed: 420, projectileLifetime: 900,
    maxRange: 360, ammo: 60,
    projectile: { width: 7, height: 5, color: 0xf39c12 },
    sounds: { fire: 'cannon_fire', hit: 'laser_hit' },
    minesHardness: 3,
  },
};

// Best owned weapon for a slot (highest tier wins)
export function bestOwned(ownedIds, slot) {
  let best = null;
  for (const id of ownedIds) {
    const cfg = WEAPON_CONFIGS[id];
    if (!cfg || cfg.slot !== slot) continue;
    if (!best || cfg.tier > best.tier) best = cfg;
  }
  return best;
}
