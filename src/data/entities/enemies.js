// Entity configs — Enemies + rank modifiers
export const ENEMY_ENTITY_CONFIGS = {
  tin_badge: {
    id: 'tin_badge', name: 'Tin Badge', tier: 1,
    behavior: 'chase', baseHp: 30, baseDamage: 8, baseSpeed: 100,
    xp: 10, size: 1,
    loot: { credits: [5, 15], resources: ['iron', 'carbon'], resourceChance: 0.4 },
    sounds: { hit: 'enemy_hit', death: 'enemy_death_small' },
  },
  scout: {
    id: 'scout', name: 'Scout', tier: 1,
    behavior: 'fast', baseHp: 22, baseDamage: 5, baseSpeed: 160,
    xp: 8, size: 1,
    loot: { credits: [5, 10], resources: ['carbon'], resourceChance: 0.3 },
    sounds: { hit: 'enemy_hit', death: 'enemy_death_small' },
  },
};

export const RANK_MODIFIERS = {
  standard_0: { hpMult: 1.0, dmgMult: 1.0, spdMult: 1.0, color: 0xff4444, stripes: 0 },
  standard_1: { hpMult: 1.3, dmgMult: 1.1, spdMult: 1.05, color: 0xff4444, stripes: 1 },
  standard_2: { hpMult: 1.6, dmgMult: 1.2, spdMult: 1.1, color: 0xff4444, stripes: 2 },
  veteran_0:  { hpMult: 2.0, dmgMult: 1.4, spdMult: 1.1, color: 0xffd700, stripes: 0 },
  veteran_1:  { hpMult: 2.3, dmgMult: 1.5, spdMult: 1.15, color: 0xffd700, stripes: 1 },
  veteran_2:  { hpMult: 2.6, dmgMult: 1.6, spdMult: 1.2, color: 0xffd700, stripes: 2 },
  elite_0:    { hpMult: 3.0, dmgMult: 1.8, spdMult: 1.2, color: 0x9932CC, stripes: 0 },
  elite_1:    { hpMult: 3.3, dmgMult: 1.9, spdMult: 1.25, color: 0x9932CC, stripes: 1 },
  elite_2:    { hpMult: 3.6, dmgMult: 2.0, spdMult: 1.3, color: 0x9932CC, stripes: 2 },
};
