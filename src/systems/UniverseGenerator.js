// ============================================================
// Universe & Solar System Generation
// ============================================================

import {
  RNG, SYS_W, SYS_H, UNIVERSE_COLS, UNIVERSE_ROWS,
  REGIONS, PLANET_TYPES, SYSTEM_NAMES, DUNGEON_TYPES,
  STATION_PREFIXES, STATION_SUFFIXES
} from '../config/constants.js';

export function generateUniverse(seed = 42) {
  const rng = new RNG(seed);
  const systems = [];
  const usedNames = new Set();

  for (let row = 0; row < UNIVERSE_ROWS; row++) {
    for (let col = 0; col < UNIVERSE_COLS; col++) {
      if (rng.next() > 0.72) continue;

      let name;
      if (usedNames.size < SYSTEM_NAMES.length) {
        do { name = rng.pick(SYSTEM_NAMES); } while (usedNames.has(name));
      } else {
        // Fallback: generate unique name with suffix
        name = rng.pick(SYSTEM_NAMES) + '-' + (usedNames.size + 1);
      }
      usedNames.add(name);

      const dist = Math.sqrt((col - UNIVERSE_COLS / 2) ** 2 + (row - UNIVERSE_ROWS / 2) ** 2);
      let region;
      if (dist < 2.5)      region = REGIONS.CORE;
      else if (dist < 4.5) region = REGIONS.FRONT;
      else if (dist < 6)   region = REGIONS.OUTER;
      else                  region = REGIONS.RIFT;

      const danger = rng.int(region.danger[0], region.danger[1]);

      systems.push({
        id: `sys_${col}_${row}`,
        name,
        col, row,
        region,
        danger,
        hasDungeon: danger >= 6 && rng.chance(0.5),
        seed: rng.int(1, 999999),
        connections: [],
      });
    }
  }

  for (const sys of systems) {
    for (const other of systems) {
      if (sys === other) continue;
      const dc = Math.abs(sys.col - other.col);
      const dr = Math.abs(sys.row - other.row);
      if (dc <= 1 && dr <= 1) {
        sys.connections.push(other.id);
      }
    }
  }

  return systems;
}

export function generateSystem(sysData, universeData) {
  const rng = new RNG(sysData.seed);
  const cx = SYS_W / 2;
  const cy = SYS_H / 2;

  const system = {
    data: sysData,
    star: {
      x: cx + rng.int(-100, 100),
      y: cy + rng.int(-100, 100),
      radius: rng.int(50, 80),
      color: rng.pick(['#FFD700', '#FFA500', '#FF6347', '#87CEEB', '#FFFFFF']),
    },
    planets: [],
    asteroids: [],
    stations: [],
    gates: [],
    bgStars: [],
  };

  // Planets
  const numPlanets = rng.int(1, 5);
  for (let i = 0; i < numPlanets; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(250, 1000);
    system.planets.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      radius: rng.int(25, 45),
      type: rng.pick(PLANET_TYPES),
      orbitDist: dist,
    });
  }

  // Asteroids — density scales by region
  const maxByRegion = { CORE: 25, FRONT: 35, OUTER: 45, RIFT: 55 };
  const maxAsteroids = maxByRegion[sysData.region.key] || 35;
  const targetAsteroids = rng.int(10, maxAsteroids);
  for (let i = 0; i < targetAsteroids; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(300, 1200);
    const ax = system.star.x + Math.cos(angle) * dist + rng.int(-60, 60);
    const ay = system.star.y + Math.sin(angle) * dist + rng.int(-60, 60);
    // Minimum spacing: skip if too close to existing asteroid
    const tooClose = system.asteroids.some(e => Math.hypot(ax - e.x, ay - e.y) < 40);
    if (tooClose) continue;
    system.asteroids.push({
      x: ax, y: ay,
      size: rng.int(10, 23),
      color: rng.pick(['#8B7355', '#A0A0A0', '#6B6B6B', '#9B7653']),
      rotation: rng.float(0, Math.PI * 2),
      rotSpeed: rng.float(-0.015, 0.015),
      shapeSeed: rng.int(1, 999999),
    });
  }

  // Stations
  const numStations = rng.int(0, 2);
  for (let i = 0; i < numStations; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(400, 900);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: rng.pick(STATION_PREFIXES) + ' ' + rng.pick(STATION_SUFFIXES),
      size: 16,
    });
  }

  // Warp gates
  for (const connId of sysData.connections) {
    const other = universeData.find(s => s.id === connId);
    if (!other) continue;
    const dx = other.col - sysData.col;
    const dy = other.row - sysData.row;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const gateX = cx + (dx / mag) * (SYS_W / 2 - 200) + rng.int(-40, 40);
    const gateY = cy + (dy / mag) * (SYS_H / 2 - 200) + rng.int(-40, 40);
    system.gates.push({
      x: gateX, y: gateY,
      targetId: connId,
      targetName: other.name,
      isDungeon: false,
      size: 18,
    });
  }

  // Dungeon gate
  if (sysData.hasDungeon) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(500, 900);
    system.gates.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      targetId: null,
      targetName: rng.pick(DUNGEON_TYPES),
      isDungeon: true,
      size: 20,
    });
  }

  // Background stars
  for (let i = 0; i < 250; i++) {
    system.bgStars.push({
      x: rng.float(0, SYS_W),
      y: rng.float(0, SYS_H),
      size: rng.float(0.3, 2),
      brightness: rng.float(0.2, 0.7),
      twinkleSpeed: rng.float(0.005, 0.025),
    });
  }

  return system;
}
