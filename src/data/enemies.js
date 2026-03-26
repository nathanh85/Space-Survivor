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

// Danger rating → spawn config
export const SPAWN_CONFIG = {
  1:  { max: 0,  interval: 0 },
  2:  { max: 3,  interval: 15000 },
  3:  { max: 4,  interval: 12000 },
  4:  { max: 5,  interval: 10000 },
  5:  { max: 7,  interval: 8000 },
  6:  { max: 8,  interval: 7000 },
  7:  { max: 9,  interval: 6000 },
  8:  { max: 10, interval: 5000 },
  9:  { max: 13, interval: 4000 },
  10: { max: 15, interval: 3000 },
};
