// ============================================================
// Universe & Solar System Generation
// v0.7.b: Universe loaded from JSON, interiors still procedural
// ============================================================

import {
  RNG, SYS_W, SYS_H,
  REGIONS, PLANET_TYPES, DUNGEON_TYPES,
  STATION_PREFIXES, STATION_SUFFIXES,
  HEX_NEIGHBORS, REGION_MAP,
} from '../config/constants.js';
import { getAvailableResources } from '../data/resources.js';
import UNIVERSE_DATA from '../data/universe.json';

// Hash q/r to a deterministic seed
function hashQR(q, r) {
  return Math.abs(((q * 73856093) ^ (r * 19349663)) % 999999) + 1;
}

// Convert axial hex coords to pixel direction (for gate placement)
function hexDirection(fromQ, fromR, toQ, toR) {
  const HEX_SZ = 1; // unit scale — we just need the direction
  const fx = HEX_SZ * (3 / 2 * fromQ);
  const fy = HEX_SZ * (Math.sqrt(3) / 2 * fromQ + Math.sqrt(3) * fromR);
  const tx = HEX_SZ * (3 / 2 * toQ);
  const ty = HEX_SZ * (Math.sqrt(3) / 2 * toQ + Math.sqrt(3) * toR);
  const dx = tx - fx;
  const dy = ty - fy;
  const mag = Math.sqrt(dx * dx + dy * dy) || 1;
  return { dx: dx / mag, dy: dy / mag };
}

/**
 * Load the 49-system hex universe from JSON.
 * Returns an array of system metadata objects (same shape as old generateUniverse).
 */
export function loadUniverse() {
  const systems = UNIVERSE_DATA.map(entry => ({
    id: `hex_${entry.q}_${entry.r}`,
    name: entry.name,
    q: entry.q,
    r: entry.r,
    // Keep col/row as aliases for any legacy code
    col: entry.q,
    row: entry.r,
    region: REGION_MAP[entry.region] || REGIONS.CORE,
    danger: entry.danger,
    station: entry.station,  // 'hub'|'trading'|'refinery'|'outpost'|'none'
    act: entry.act || '',
    beat: entry.beat || '',
    hasDungeon: entry.danger >= 6,
    seed: hashQR(entry.q, entry.r),
    connections: [],
    isStarting: entry.name === 'Zion',
    hasTradingPost: entry.station === 'trading' || entry.station === 'hub',
  }));

  // Build connections via hex adjacency
  for (const sys of systems) {
    for (const other of systems) {
      if (sys === other) continue;
      const isAdj = HEX_NEIGHBORS.some(
        n => other.q === sys.q + n.dq && other.r === sys.r + n.dr
      );
      if (isAdj) sys.connections.push(other.id);
    }
  }

  return systems;
}

// Keep old name as alias for any import that uses it
export const generateUniverse = loadUniverse;

/**
 * Generate the interior of a system (star, planets, asteroids, stations, gates).
 * System identity (name, region, danger, station) comes from JSON metadata.
 * Interior layout is procedural from a deterministic seed.
 */
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
  const ASTEROID_TYPES = {
    iron:   { colors: ['#8B4513', '#A0522D', '#CD853F'], drops: { iron: 0.70, carbon: 0.20, nothing: 0.10 } },
    carbon: { colors: ['#2F2F2F', '#3D3D3D', '#1A1A1A'], drops: { carbon: 0.70, iron: 0.20, nothing: 0.10 } },
    ice:    { colors: ['#87CEEB', '#B0E0E6', '#ADD8E6'], drops: { fuel: 0.60, cryo: 0.20, nothing: 0.20 } },
    common: { colors: ['#8B7355', '#A0A0A0', '#6B6B6B'], drops: { iron: 0.30, carbon: 0.30, fuel: 0.20, nothing: 0.20 } },
  };
  const typeWeights = {
    CORE:  { common: 50, iron: 35, carbon: 10, ice: 5 },
    FRONT: { common: 25, iron: 25, carbon: 25, ice: 25 },
    OUTER: { common: 20, iron: 25, carbon: 25, ice: 30 },
    RIFT:  { common: 15, iron: 25, carbon: 30, ice: 30 },
  };
  const weights = typeWeights[sysData.region.key] || typeWeights.CORE;
  function pickAsteroidType(rng) {
    const roll = rng.int(0, 99);
    let acc = 0;
    for (const [type, weight] of Object.entries(weights)) {
      acc += weight;
      if (roll < acc) return type;
    }
    return 'common';
  }
  function pickDrop(rng, drops) {
    const roll = rng.float(0, 1);
    let acc = 0;
    for (const [res, chance] of Object.entries(drops)) {
      acc += chance;
      if (roll < acc) return res === 'nothing' ? null : res;
    }
    return 'iron';
  }

  const maxByRegion = { CORE: 50, FRONT: 70, OUTER: 90, RIFT: 110 };
  const maxAsteroids = maxByRegion[sysData.region.key] || 70;
  const targetAsteroids = rng.int(Math.floor(maxAsteroids / 2), maxAsteroids);
  for (let i = 0; i < targetAsteroids; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(400, 2200);
    const ax = system.star.x + Math.cos(angle) * dist + rng.int(-60, 60);
    const ay = system.star.y + Math.sin(angle) * dist + rng.int(-60, 60);
    const tooClose = system.asteroids.some(e => Math.hypot(ax - e.x, ay - e.y) < 40);
    if (tooClose) continue;
    const aSize = rng.int(10, 23);
    const aType = pickAsteroidType(rng);
    const typeData = ASTEROID_TYPES[aType];
    const resId = pickDrop(rng, typeData.drops) || 'iron';
    system.asteroids.push({
      x: ax, y: ay, size: aSize,
      hp: aSize * 3, maxHp: aSize * 3,
      asteroidType: aType,
      color: rng.pick(typeData.colors),
      rotation: rng.float(0, Math.PI * 2),
      rotSpeed: rng.float(-0.015, 0.015),
      shapeSeed: rng.int(1, 999999),
      resourceId: resId,
      mined: false,
    });
  }

  // --- STATIONS from JSON station field ---
  const stationType = sysData.station || 'none';

  if (stationType === 'hub' && sysData.isStarting) {
    // Zion starting hub — Grix Trading Co.
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(500, 800);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: 'Grix Trading Co.',
      size: 16,
      stationType: 'trading_post',
    });
  } else if (stationType === 'hub') {
    // Non-Zion hub (Ashfall) — hub station with distinct type
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(500, 800);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: sysData.name + ' Hub',
      size: 16,
      stationType: 'hub',
    });
  } else if (stationType === 'trading') {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(450, 800);
    // Use system name for the trading post for flavor
    const tpName = sysData.name === 'Grix Station' ? 'Grix Trading Co.'
      : rng.pick(STATION_PREFIXES) + ' ' + rng.pick(STATION_SUFFIXES);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: tpName,
      size: 16,
      stationType: 'trading_post',
    });
  } else if (stationType === 'refinery') {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(450, 800);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: 'Refinery ' + rng.pick(STATION_SUFFIXES),
      size: 16,
      stationType: 'refinery',
    });
  } else if (stationType === 'outpost') {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(450, 800);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: 'Outpost ' + rng.pick(STATION_SUFFIXES),
      size: 16,
      stationType: 'outpost',
    });
  }
  // stationType === 'none' → no station

  // Guarantee ice asteroids in systems without trading
  if (stationType !== 'trading' && stationType !== 'hub') {
    const iceType = ASTEROID_TYPES.ice;
    let iceCount = 0;
    for (const a of system.asteroids) { if (a.asteroidType === 'ice') iceCount++; }
    while (iceCount < 4) {
      const angle = rng.float(0, Math.PI * 2);
      const dist = rng.int(350, 1100);
      const ax = system.star.x + Math.cos(angle) * dist + rng.int(-50, 50);
      const ay = system.star.y + Math.sin(angle) * dist + rng.int(-50, 50);
      const aSize = rng.int(12, 22);
      system.asteroids.push({
        x: ax, y: ay, size: aSize,
        hp: aSize * 3, maxHp: aSize * 3,
        asteroidType: 'ice',
        color: rng.pick(iceType.colors),
        rotation: rng.float(0, Math.PI * 2),
        rotSpeed: rng.float(-0.015, 0.015),
        shapeSeed: rng.int(1, 999999),
        resourceId: pickDrop(rng, iceType.drops) || 'fuel',
        mined: false,
      });
      iceCount++;
    }
  }

  // Warp gates — hex-direction based positioning
  for (const connId of sysData.connections) {
    const other = universeData.find(s => s.id === connId);
    if (!other) continue;
    const dir = hexDirection(sysData.q, sysData.r, other.q, other.r);
    const gateX = cx + dir.dx * (SYS_W / 2 - 200) + rng.int(-40, 40);
    const gateY = cy + dir.dy * (SYS_H / 2 - 200) + rng.int(-40, 40);
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
