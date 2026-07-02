// Zone override — Ironvale (component pickup showcase)
// v0.9.d: Diamond Aperture inside a T1 horseshoe — the gate is navigation
// (a tight gap), not hardness, so the metroidvania chain stays sound:
// Aperture (nav gate) → Laser Mk2 → T2 rocks → Bore Assembly → Cannon.
// T2 rocks dress the outside of the horseshoe as a taste of what's next.

const APERTURE = { x: 3400, y: 2400 };

const horseshoe = [];
// T1 crackable ring with a tight NW opening
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  // opening toward NW (-3π/4): skip 2 slots
  let d = Math.abs(angle - (Math.PI * 1.25));
  if (d > Math.PI) d = Math.PI * 2 - d;
  if (d < 0.35) continue;
  horseshoe.push({
    configId: 'iron_t1',
    x: APERTURE.x + Math.cos(angle) * 220,
    y: APERTURE.y + Math.sin(angle) * 220,
  });
}

export default {
  type: 'standard',
  music: 'music_core',
  asteroids: { pool: ['iron_t1', 'carbon_t1'], count: { min: 12, max: 16 } },
  enemies: { pool: [], count: { min: 0, max: 0 } },
  star: { type: 'yellow_dwarf' },
  layout: {
    asteroids: [
      ...horseshoe,
      // T2 visual dressing behind the horseshoe
      { configId: 'titanium_t2', x: APERTURE.x + 420, y: APERTURE.y + 180 },
      { configId: 'titanium_t2', x: APERTURE.x + 380, y: APERTURE.y - 240 },
      { configId: 'cryo_t2',     x: APERTURE.x + 520, y: APERTURE.y - 40 },
      // The rest of the iron-rich field
      { configId: 'iron_t1',   x: 1200, y: 1000 },
      { configId: 'iron_t1',   x: 1500, y: 1400 },
      { configId: 'carbon_t1', x: 1900, y: 1100 },
      { configId: 'iron_t1',   x: 2200, y: 1600 },
      { configId: 'iron_t1',   x: 1000, y: 2200 },
      { configId: 'carbon_t1', x: 1600, y: 2500 },
      { configId: 'ice_t1',    x: 2600, y: 900 },
      { configId: 'ice_t1',    x: 900,  y: 2800 },
      { configId: 'iron_t1',   x: 2900, y: 1300 },
      { configId: 'carbon_t1', x: 2500, y: 2900 },
    ],
    componentPos: APERTURE,
  },
};
