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
export const SPAWN_CONFIG = {
  1:  { max: 0,  interval: 0 },
  2:  { max: 0,  interval: 0 },
  3:  { max: 2,  interval: 14000 },
  4:  { max: 2,  interval: 12000 },
  5:  { max: 3,  interval: 9000 },
  6:  { max: 4,  interval: 8000 },
  7:  { max: 5,  interval: 7000 },
  8:  { max: 6,  interval: 5500 },
  9:  { max: 7,  interval: 4500 },
  10: { max: 8,  interval: 3500 },
};
