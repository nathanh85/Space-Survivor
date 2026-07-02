// Entity configs — Asteroids
// v0.7.f.1: T2/T3 hardness tiers. hardness N requires a weapon with
// minesHardness >= N (Mk1 laser=1, Mk2 laser=2, Cannon=3) or shots deflect.
// HP/tint values are Code's call (ASTEROID_MINING_SPEC not in repo).
export const ASTEROID_CONFIGS = {
  iron_t1: {
    id: 'iron_t1', name: 'Iron Asteroid', type: 'iron', tier: 1, hardness: 1,
    hp: { min: 20, max: 35 },
    size: { min: 12, max: 20 },
    tint: 0x8B4513,
    drops: [
      { id: 'iron', chance: 0.70, amount: [2, 4] },
      { id: 'carbon', chance: 0.20, amount: [1, 2] },
      // v0.10.b: T2 trickle pre-Mk2 (mirrors ice_t1's cryo drop) — keeps
      // the Laser Mk2 recipe reachable before T2 rocks are crackable
      { id: 'titanium', chance: 0.08, amount: [1, 1] },
    ],
    sounds: { hit: 'asteroid_hit_rock', break: 'asteroid_break_rock' },
    mineRequires: null,
  },
  carbon_t1: {
    id: 'carbon_t1', name: 'Carbon Asteroid', type: 'carbon', tier: 1, hardness: 1,
    hp: { min: 15, max: 25 },
    size: { min: 10, max: 16 },
    tint: 0x333333,
    drops: [
      { id: 'carbon', chance: 0.70, amount: [2, 4] },
      { id: 'iron', chance: 0.20, amount: [1, 2] },
      { id: 'plasma', chance: 0.06, amount: [1, 1] }, // v0.10.b T2 trickle
    ],
    sounds: { hit: 'asteroid_hit_rock', break: 'asteroid_break_dark' },
    mineRequires: null,
  },
  ice_t1: {
    id: 'ice_t1', name: 'Ice Asteroid', type: 'ice', tier: 1, hardness: 1,
    hp: { min: 10, max: 20 },
    size: { min: 14, max: 22 },
    tint: 0x87CEEB,
    drops: [
      { id: 'fuel', chance: 0.60, amount: [1, 3] },
      { id: 'cryo', chance: 0.10, amount: [1, 1] },
    ],
    sounds: { hit: 'asteroid_hit_ice', break: 'asteroid_break_ice' },
    mineRequires: null,
  },
  common_t1: {
    id: 'common_t1', name: 'Asteroid', type: 'common', tier: 1, hardness: 1,
    hp: { min: 15, max: 30 },
    size: { min: 10, max: 18 },
    tint: 0x888888,
    drops: [
      { id: 'iron', chance: 0.30, amount: [1, 3] },
      { id: 'carbon', chance: 0.30, amount: [1, 2] },
      { id: 'fuel', chance: 0.20, amount: [1, 2] },
    ],
    sounds: { hit: 'asteroid_hit_rock', break: 'asteroid_break_rock' },
    mineRequires: null,
  },

  // --- Tier 2 (Frontier) — needs Laser Mk2 ---
  titanium_t2: {
    id: 'titanium_t2', name: 'Titanium Asteroid', type: 'titanium', tier: 2, hardness: 2,
    hp: { min: 60, max: 85 },
    size: { min: 14, max: 22 },
    tint: 0xB8C6DB,
    drops: [
      { id: 'titanium', chance: 0.75, amount: [2, 3] },
      { id: 'iron', chance: 0.20, amount: [1, 2] },
    ],
    sounds: { hit: 'asteroid_hit_rock', break: 'asteroid_break_rock' },
    mineRequires: 'laser_mk2',
  },
  plasma_t2: {
    id: 'plasma_t2', name: 'Plasma Asteroid', type: 'plasma', tier: 2, hardness: 2,
    hp: { min: 55, max: 80 },
    size: { min: 13, max: 20 },
    tint: 0xe74c3c,
    drops: [
      { id: 'plasma', chance: 0.75, amount: [1, 3] },
      { id: 'carbon', chance: 0.20, amount: [1, 2] },
    ],
    sounds: { hit: 'asteroid_hit_rock', break: 'asteroid_break_dark' },
    mineRequires: 'laser_mk2',
  },
  cryo_t2: {
    id: 'cryo_t2', name: 'Cryo Asteroid', type: 'cryo', tier: 2, hardness: 2,
    hp: { min: 50, max: 75 },
    size: { min: 14, max: 22 },
    tint: 0x87CEEB,
    drops: [
      { id: 'cryo', chance: 0.75, amount: [1, 3] },
      { id: 'fuel', chance: 0.20, amount: [1, 2] },
    ],
    sounds: { hit: 'asteroid_hit_ice', break: 'asteroid_break_ice' },
    mineRequires: 'laser_mk2',
  },

  // --- Tier 3 (Outer Rim) — needs Cannon ---
  darkmatter_t3: {
    id: 'darkmatter_t3', name: 'Dark Matter Asteroid', type: 'darkmatter', tier: 3, hardness: 3,
    hp: { min: 140, max: 190 },
    size: { min: 16, max: 26 },
    tint: 0x8e44ad,
    drops: [
      { id: 'darkmatter', chance: 0.70, amount: [1, 2] },
      { id: 'titanium', chance: 0.25, amount: [1, 2] },
    ],
    sounds: { hit: 'asteroid_hit_rock', break: 'asteroid_break_dark' },
    mineRequires: 'cannon_mk1',
  },
  neutronium_t3: {
    id: 'neutronium_t3', name: 'Neutronium Asteroid', type: 'neutronium', tier: 3, hardness: 3,
    hp: { min: 150, max: 200 },
    size: { min: 15, max: 24 },
    tint: 0x2ecc71,
    drops: [
      { id: 'neutronium', chance: 0.70, amount: [1, 2] },
      { id: 'plasma', chance: 0.25, amount: [1, 2] },
    ],
    sounds: { hit: 'asteroid_hit_rock', break: 'asteroid_break_rock' },
    mineRequires: 'cannon_mk1',
  },
};
