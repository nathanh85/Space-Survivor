// Entity configs — Asteroids (4 T1 proof-of-concept)
export const ASTEROID_CONFIGS = {
  iron_t1: {
    id: 'iron_t1', name: 'Iron Asteroid', type: 'iron', tier: 1, hardness: 1,
    hp: { min: 20, max: 35 },
    size: { min: 12, max: 20 },
    tint: 0x8B4513,
    drops: [
      { id: 'iron', chance: 0.70, amount: [2, 4] },
      { id: 'carbon', chance: 0.20, amount: [1, 2] },
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
};
