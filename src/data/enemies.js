// Enemy type configurations

export const TIN_BADGE = {
  name: 'Tin Badge',
  width: 24,
  height: 24,
  color: 0xe74c3c,
  hp: 30,
  damage: 5,
  speed: 80,
  detectRange: 350,
  attackRange: 180,
  fireRate: 1500,
  projectileSpeed: 300,
  loot: { credits: [5, 15], resources: ['iron', 'carbon'], resourceChance: 0.4 },
  xp: 10,
};

// Scout — faster, weaker, higher fire rate (danger 5+)
export const SCOUT = {
  name: 'Scout',
  width: 18,
  height: 18,
  color: 0xf39c12,
  hp: 20,
  damage: 4,
  speed: 130,
  detectRange: 450,
  attackRange: 220,
  fireRate: 1000,
  projectileSpeed: 380,
  loot: { credits: [3, 10], resources: ['fuel', 'iron'], resourceChance: 0.3 },
  xp: 14,
};

// Danger rating → spawn config
// H2: Danger 1-2 → no spawns (handled by early return in EnemyManager)
// B22: max counts raised to match spec; intervals shortened so enemies appear promptly
export const SPAWN_CONFIG = {
  1:  { max: 0,  interval: 0 },
  2:  { max: 0,  interval: 0 },
  3:  { max: 3,  interval: 8000 },
  4:  { max: 4,  interval: 7000 },
  5:  { max: 5,  interval: 6000 },
  6:  { max: 6,  interval: 5000 },
  7:  { max: 7,  interval: 4500 },
  8:  { max: 8,  interval: 4000 },
  9:  { max: 9,  interval: 3500 },
  10: { max: 10, interval: 3000 },
};
