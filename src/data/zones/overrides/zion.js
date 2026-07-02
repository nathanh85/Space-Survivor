// Zone override — Zion (starting hub)
// v0.9.d: tutorial cradle layout per LEVEL_DESIGN_PACK — star offset NW,
// planet + Outpost SE, 8-rock tutorial arc between spawn and the planet.
// System coords: 4800x3600, center (2400,1800).
export default {
  type: 'hub',
  music: 'music_core',
  asteroids: {
    pool: ['iron_t1', 'carbon_t1', 'common_t1'],
    count: { min: 20, max: 30 },
  },
  enemies: { pool: [], count: { min: 0, max: 0 } },
  star: { type: 'yellow_dwarf' },
  stations: [{ type: 'hub', name: 'The Outpost', x: 3050, y: 2350 }],
  planets: [{ type: 'lush', name: 'Zion', color: '#2ecc71', isHub: true, x: 3350, y: 2650 }],
  extraPlanets: 0,
  layout: {
    star: { x: 1200, y: 900 },
    // Tutorial ring: 8 T1 rocks in a loose arc between spawn (near star)
    // and Planet Zion — the Supply Run practically mines itself.
    asteroids: [
      { configId: 'iron_t1',   x: 1850, y: 1250 },
      { configId: 'carbon_t1', x: 2100, y: 1450 },
      { configId: 'iron_t1',   x: 2350, y: 1600 },
      { configId: 'common_t1', x: 2600, y: 1800 },
      { configId: 'iron_t1',   x: 2800, y: 2000 },
      { configId: 'carbon_t1', x: 2950, y: 2200 },
      { configId: 'iron_t1',   x: 2500, y: 1400 },
      { configId: 'carbon_t1', x: 2750, y: 1650 },
      // A few scattered extras so the system isn't empty off the path
      { configId: 'common_t1', x: 1400, y: 2400 },
      { configId: 'iron_t1',   x: 1800, y: 2800 },
      { configId: 'ice_t1',    x: 3600, y: 1000 },
      { configId: 'ice_t1',    x: 3900, y: 1300 },
      { configId: 'common_t1', x: 900,  y: 1900 },
      { configId: 'ice_t1',    x: 1100, y: 2700 },
    ],
  },
};
