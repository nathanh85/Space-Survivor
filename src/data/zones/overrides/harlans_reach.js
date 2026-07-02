// Zone override — Harlan's Reach (boss arena)
// v0.9.d: ring of wrecks r≈1400 at system center with a N gap for entry.
// Star far outside the ring so gravity never interferes with the fight.
// (Design pack says r≈1800; clamped to 1400 so the ring fits the 3600px
// system height with margin — flag if the bigger ring matters.)

const wrecks = [];
const CX = 2400, CY = 1800, R = 1400;
const GAP_CENTER = -Math.PI / 2; // due N
const GAP_HALF = 0.30;           // ~34° opening
for (let i = 0; i < 30; i++) {
  const angle = (i / 30) * Math.PI * 2;
  // Leave the N gap open
  let d = Math.abs(angle - (GAP_CENTER + Math.PI * 2) % (Math.PI * 2));
  if (d > Math.PI) d = Math.PI * 2 - d;
  if (d < GAP_HALF) continue;
  wrecks.push({
    x: CX + Math.cos(angle) * R,
    y: CY + Math.sin(angle) * R,
    scale: 2.2,
  });
}

export default {
  type: 'standard',
  music: 'music_frontier',
  asteroids: { pool: ['iron_t1'], count: { min: 3, max: 3 } },
  // Wandering spawns off — the fight controls its own adds (E3: D7 fight-controlled)
  enemies: { pool: [], count: { min: 0, max: 0 } },
  star: { type: 'yellow_dwarf' },
  extraPlanets: 0,
  layout: {
    star: { x: 350, y: 350 },
    wrecks,
    asteroids: [
      { configId: 'iron_t1', x: 700, y: 2900 },
      { configId: 'ice_t1',  x: 4200, y: 2800 },
      { configId: 'ice_t1',  x: 4100, y: 600 },
    ],
    // Arena seal positions: 2 wrecks slide into the N gap when the fight starts
    arenaSeal: [
      { x: CX - 250, y: CY - R, scale: 2.2 },
      { x: CX + 250, y: CY - R, scale: 2.2 },
    ],
  },
};
