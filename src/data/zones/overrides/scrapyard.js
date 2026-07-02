// Zone override — Scrapyard (The Heist)
// v0.9.d: dense wreck corridor W→E per LEVEL_DESIGN_PACK. Heist freighter
// at the E dead-end; player runs the corridor back out through pursuers.
// Challenge-zone anomaly parked at the N edge (visual + locked bark only).

// Two wreck walls forming a 3-lane corridor, y≈1500 and y≈2150
const wrecks = [];
for (let x = 700; x <= 4300; x += 240) {
  wrecks.push({ x, y: 1480 + (x % 480 === 0 ? -40 : 20), scale: 2 });
  wrecks.push({ x, y: 2160 + (x % 480 === 0 ? 40 : -20), scale: 2 });
}
// E dead-end wall behind the freighter
for (let y = 1560; y <= 2080; y += 130) {
  wrecks.push({ x: 4480, y, scale: 2 });
}

export default {
  type: 'standard',
  music: 'music_frontier',
  asteroids: {
    pool: ['iron_t1', 'carbon_t1', 'titanium_t2'],
    count: { min: 10, max: 14 },
  },
  enemies: { pool: ['tin_badge'], count: { min: 1, max: 3 } },
  star: { type: 'yellow_dwarf' },
  layout: {
    star: { x: 600, y: 500 },
    wrecks,
    // Loose debris inside the corridor lanes
    asteroids: [
      { configId: 'iron_t1',     x: 1300, y: 1750 },
      { configId: 'carbon_t1',   x: 1900, y: 1950 },
      { configId: 'iron_t1',     x: 2500, y: 1700 },
      { configId: 'titanium_t2', x: 3100, y: 1900 },
      { configId: 'carbon_t1',   x: 3600, y: 1750 },
      { configId: 'titanium_t2', x: 4000, y: 1950 },
      { configId: 'iron_t1',     x: 1600, y: 1850 },
      { configId: 'carbon_t1',   x: 2800, y: 1820 },
    ],
    // Derelict freighter prop position (heist pickup)
    heistPos: { x: 4180, y: 1820 },
    // Bore Assembly sits mid-corridor behind a T2 pocket (obtainable after Laser Mk2)
    componentPos: { x: 3350, y: 1620 },
    // Challenge-zone anomaly teaser (interior is post-1.0)
    anomaly: { x: 2400, y: 350 },
  },
};
