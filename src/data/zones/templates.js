// Zone templates — regional defaults
// Each system inherits from its region template, then applies overrides
export const ZONE_TEMPLATES = {
  core: {
    type: 'standard',
    music: 'music_core',
    asteroids: {
      pool: ['iron_t1', 'carbon_t1', 'ice_t1', 'common_t1'],
      count: { min: 15, max: 25 },
    },
    enemies: { pool: [], count: { min: 0, max: 0 }, rankWeights: {} },
    star: { type: 'yellow_dwarf' },
  },
  frontier: {
    type: 'standard',
    music: 'music_frontier',
    asteroids: {
      // ~60% T1 / 40% T2 via pool repetition (REGION_RESOURCES FRONT weights)
      pool: ['iron_t1', 'carbon_t1', 'ice_t1', 'common_t1', 'common_t1', 'common_t1',
             'titanium_t2', 'titanium_t2', 'plasma_t2', 'cryo_t2'],
      count: { min: 20, max: 30 },
    },
    enemies: {
      pool: ['tin_badge', 'scout'],
      count: { min: 2, max: 5 },
      rankWeights: { standard_0: 0.6, standard_1: 0.3, standard_2: 0.1 },
      respawnTime: 90000,
    },
    star: { type: 'yellow_dwarf' },
  },
  outer: {
    type: 'standard',
    music: 'music_outer',
    asteroids: {
      // ~25% T1 / 40% T2 / 35% T3 (REGION_RESOURCES OUTER weights)
      pool: ['iron_t1', 'ice_t1',
             'titanium_t2', 'plasma_t2', 'cryo_t2',
             'darkmatter_t3', 'darkmatter_t3', 'neutronium_t3'],
      count: { min: 15, max: 25 },
    },
    enemies: {
      pool: ['tin_badge', 'scout'],
      count: { min: 4, max: 7 },
      rankWeights: { standard_1: 0.3, standard_2: 0.3, veteran_0: 0.3, veteran_1: 0.1 },
      respawnTime: 90000,
    },
    star: { type: 'yellow_dwarf' },
  },
  rift: {
    type: 'standard',
    music: 'music_rift',
    asteroids: {
      // ~10% T1 / 30% T2 / 60% T3 (REGION_RESOURCES RIFT weights)
      pool: ['ice_t1',
             'titanium_t2', 'plasma_t2', 'cryo_t2',
             'darkmatter_t3', 'darkmatter_t3', 'darkmatter_t3',
             'neutronium_t3', 'neutronium_t3', 'neutronium_t3'],
      count: { min: 10, max: 20 },
    },
    enemies: {
      pool: ['tin_badge', 'scout'],
      count: { min: 6, max: 10 },
      rankWeights: { veteran_1: 0.3, veteran_2: 0.3, elite_0: 0.3, elite_1: 0.1 },
      respawnTime: 60000,
    },
    star: { type: 'neutron_star' },
  },
};
