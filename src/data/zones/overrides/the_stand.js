// Zone override — The Stand (calm before Harlan)
// v0.9.d: sparse and quiet — one outpost center, 4 rocks, dim star far S,
// no enemy spawns. The emotional beat plays on dock (v0.9.a cutscene).
export default {
  type: 'standard',
  music: 'music_frontier',
  asteroids: { pool: ['iron_t1'], count: { min: 4, max: 4 } },
  enemies: { pool: [], count: { min: 0, max: 0 } },
  star: { type: 'yellow_dwarf' },
  stations: [{ type: 'outpost', name: 'The Stand', x: 2400, y: 1800 }],
  extraPlanets: 0,
  layout: {
    star: { x: 2400, y: 3350 },
    asteroids: [
      { configId: 'iron_t1', x: 1700, y: 1300 },
      { configId: 'iron_t1', x: 3100, y: 1450 },
      { configId: 'ice_t1',  x: 2000, y: 2300 },
      { configId: 'ice_t1',  x: 2900, y: 2250 },
    ],
  },
};
