// Enemy type configurations
import { RANK_MODIFIERS } from './entities/enemies.js';

// E3 rank weights by system danger (v0.7.g.1).
// D1-2 never spawns (handled upstream); D7+ wandering spawns lean veteran.
export function pickRankForDanger(danger) {
  const roll = Math.random();
  let table;
  if (danger <= 4) {
    table = [[0.70, 'standard_0'], [0.25, 'standard_1'], [0.05, 'standard_2']];
  } else if (danger <= 6) {
    table = [[0.60, 'standard_0'], [0.20, 'standard_1'], [0.05, 'standard_2'], [0.15, 'veteran_0']];
  } else {
    table = [[0.45, 'standard_0'], [0.25, 'standard_1'], [0.10, 'standard_2'],
             [0.15, 'veteran_0'], [0.05, 'veteran_1']];
  }
  let acc = 0;
  for (const [w, key] of table) {
    acc += w;
    if (roll < acc) return { key, ...RANK_MODIFIERS[key] };
  }
  return { key: 'standard_0', ...RANK_MODIFIERS.standard_0 };
}

export const TIN_BADGE = {
  id: 'tin_badge',
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
  id: 'scout',
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

// Enforcer — slow, tanky, 3-pellet shotgun spread (v0.7.g.3, E1)
export const ENFORCER = {
  id: 'enforcer',
  name: 'Enforcer',
  width: 30,
  height: 30,
  color: 0x5d7e9e,
  hp: 70,
  damage: 6,          // per pellet
  speed: 60,
  detectRange: 320,
  attackRange: 210,
  fireRate: 2200,
  projectileSpeed: 260,
  pellets: 3,
  spreadRad: 0.35,
  loot: { credits: [15, 30], resources: ['iron', 'titanium'], resourceChance: 0.4 },
  xp: 18,
};

// Stinger — fast, fragile, melee dive (v0.7.g.3, E1)
export const STINGER = {
  id: 'stinger',
  name: 'Stinger',
  width: 14,
  height: 14,
  color: 0xadff2f,
  hp: 12,
  damage: 6,          // contact damage
  speed: 200,
  detectRange: 500,
  attackRange: 240,
  fireRate: 1800,     // min ms between contact hits
  projectileSpeed: 0,
  melee: true,
  loot: { credits: [3, 8], resources: ['carbon'], resourceChance: 0.25 },
  xp: 8,
};

export const ENEMY_TYPE_MAP = {
  tin_badge: TIN_BADGE, scout: SCOUT, enforcer: ENFORCER, stinger: STINGER,
};

// Regional enemy drop tables (v0.7.g.2).
// Rows are Code's call — ENEMY_DROP_TABLE doc not in repo.
// veteranOnly rows require a Veteran(gold)+ rank kill.
export const ENEMY_DROP_TABLES = {
  CORE: [
    { id: 'iron', chance: 0.25, amount: [1, 2] },
    { id: 'carbon', chance: 0.15, amount: [1, 2] },
  ],
  FRONT: [
    { id: 'iron', chance: 0.15, amount: [1, 2] },
    { id: 'titanium', chance: 0.15, amount: [1, 2] },
    { id: 'plasma', chance: 0.10, amount: [1, 1] },
    { id: 'cryo', chance: 0.08, amount: [1, 1] },
    { id: 'heavy_plasma_gel', chance: 0.25, amount: [1, 1], veteranOnly: true },
  ],
  OUTER: [
    { id: 'titanium', chance: 0.15, amount: [1, 2] },
    { id: 'plasma', chance: 0.12, amount: [1, 2] },
    { id: 'darkmatter', chance: 0.08, amount: [1, 1] },
    { id: 'heavy_plasma_gel', chance: 0.30, amount: [1, 1], veteranOnly: true },
  ],
  RIFT: [
    { id: 'plasma', chance: 0.12, amount: [1, 2] },
    { id: 'darkmatter', chance: 0.12, amount: [1, 1] },
    { id: 'neutronium', chance: 0.10, amount: [1, 1] },
    { id: 'heavy_plasma_gel', chance: 0.35, amount: [1, 2], veteranOnly: true },
  ],
};

// Danger rating → spawn config
// H2: Danger 1-2 → no spawns (handled by early return in EnemyManager)
// v0.7.g.3 (E3): max concurrent = 2 + D/2 (floored)
export const SPAWN_CONFIG = {
  1:  { max: 0, interval: 0 },
  2:  { max: 0, interval: 0 },
  3:  { max: 3, interval: 8000 },
  4:  { max: 4, interval: 7000 },
  5:  { max: 4, interval: 6000 },
  6:  { max: 5, interval: 5000 },
  7:  { max: 5, interval: 4500 },
  8:  { max: 6, interval: 4000 },
  9:  { max: 6, interval: 3500 },
  10: { max: 7, interval: 3000 },
};
