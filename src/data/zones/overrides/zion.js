// Zone override — Zion (starting hub)
export default {
  type: 'hub',
  music: 'music_core',
  asteroids: {
    pool: ['iron_t1', 'carbon_t1', 'common_t1'],
    count: { min: 20, max: 30 },
  },
  enemies: { pool: [], count: { min: 0, max: 0 } },
  star: { type: 'yellow_dwarf' },
  stations: [{ type: 'hub', name: 'The Outpost' }],
  planets: [{ type: 'lush', name: 'Zion', color: '#2ecc71', isHub: true }],
  extraPlanets: 0,
};
