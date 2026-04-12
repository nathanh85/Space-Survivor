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
import { ASTEROID_CONFIGS } from '../data/entities/asteroids.js';
import { STAR_CONFIGS } from '../data/entities/stars.js';
import { getZoneConfig } from '../data/zones/index.js';

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
// Roll one resource from an entity config drop table
function rollDrop(rng, drops) {
  const roll = rng.float(0, 1);
  let acc = 0;
  for (const drop of drops) {
    acc += drop.chance;
    if (roll < acc) return drop.id;
  }
  return drops.length > 0 ? drops[0].id : 'iron';
}

export function generateSystem(sysData, universeData, galaxySeed = 0) {
  const rng = new RNG(sysData.seed + galaxySeed);
  const cx = SYS_W / 2;
  const cy = SYS_H / 2;

  // Zone config (template + override merge)
  const zoneConfig = getZoneConfig(sysData.id);

  // Star — from zone config star type
  const starType = zoneConfig.star ? STAR_CONFIGS[zoneConfig.star.type] : null;
  const starRadius = starType
    ? rng.int(starType.radius.min, starType.radius.max)
    : rng.int(50, 80);
  const starColor = starType
    ? rng.pick(starType.colors)
    : rng.pick(['#FFD700', '#FFA500', '#FF6347', '#87CEEB', '#FFFFFF']);

  const system = {
    data: sysData,
    zoneConfig: zoneConfig,
    star: {
      x: cx + rng.int(-100, 100),
      y: cy + rng.int(-100, 100),
      radius: starRadius,
      color: starColor,
      configId: zoneConfig.star ? zoneConfig.star.type : 'yellow_dwarf',
    },
    planets: [],
    asteroids: [],
    stations: [],
    gates: [],
    bgStars: [],
  };

  // Planets — 3-layer: override > template extraPlanets > procedural fallback
  if (zoneConfig.planets && zoneConfig.planets.length > 0) {
    for (const pDef of zoneConfig.planets) {
      const angle = rng.float(0, Math.PI * 2);
      const dist = rng.int(250, 500);
      system.planets.push({
        x: system.star.x + Math.cos(angle) * dist,
        y: system.star.y + Math.sin(angle) * dist,
        radius: rng.int(25, 45),
        type: { name: pDef.name || pDef.type, color: pDef.color || '#888888', resources: [] },
        orbitDist: dist,
        isHub: pDef.isHub || false,
        name: pDef.name,
      });
    }
  }
  // Extra procedural planets (0 if override specified planets, 1-4 otherwise)
  const extraPlanets = zoneConfig.extraPlanets !== undefined
    ? (typeof zoneConfig.extraPlanets === 'number'
        ? zoneConfig.extraPlanets
        : rng.int(zoneConfig.extraPlanets.min, zoneConfig.extraPlanets.max))
    : (zoneConfig.planets && zoneConfig.planets.length > 0
        ? 0
        : rng.int(1, 4));
  for (let i = 0; i < extraPlanets; i++) {
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

  // Asteroids — from zone config pool + entity configs
  const asteroidPool = zoneConfig.asteroids ? zoneConfig.asteroids.pool : ['common_t1'];
  const astCount = zoneConfig.asteroids
    ? rng.int(zoneConfig.asteroids.count.min, zoneConfig.asteroids.count.max)
    : rng.int(30, 50);

  for (let i = 0; i < astCount; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(400, 2200);
    const ax = system.star.x + Math.cos(angle) * dist + rng.int(-60, 60);
    const ay = system.star.y + Math.sin(angle) * dist + rng.int(-60, 60);
    const tooClose = system.asteroids.some(e => Math.hypot(ax - e.x, ay - e.y) < 40);
    if (tooClose) continue;

    // Pick from zone pool, look up entity config
    const configId = rng.pick(asteroidPool);
    const astConfig = ASTEROID_CONFIGS[configId];
    if (!astConfig) continue;

    const aSize = rng.int(astConfig.size.min, astConfig.size.max);
    const hp = rng.int(astConfig.hp.min, astConfig.hp.max);
    const resourceId = rollDrop(rng, astConfig.drops);

    system.asteroids.push({
      x: ax, y: ay, size: aSize,
      hp: hp, maxHp: hp,
      configId: configId,
      asteroidType: astConfig.type,
      color: '#' + astConfig.tint.toString(16).padStart(6, '0'),
      rotation: rng.float(0, Math.PI * 2),
      rotSpeed: rng.float(-0.015, 0.015),
      shapeSeed: rng.int(1, 999999),
      resourceId: resourceId,
      sounds: astConfig.sounds,
      mined: false,
    });
  }

  // --- STATIONS: zone override first, then JSON station field fallback ---
  const stationType = sysData.station || 'none';

  if (zoneConfig.stations && zoneConfig.stations.length > 0) {
    // Zone override defines stations explicitly
    for (const stDef of zoneConfig.stations) {
      const angle = rng.float(0, Math.PI * 2);
      const dist = rng.int(500, 800);
      system.stations.push({
        x: system.star.x + Math.cos(angle) * dist,
        y: system.star.y + Math.sin(angle) * dist,
        name: stDef.name || sysData.name + ' Station',
        size: 16,
        stationType: stDef.type || stationType,
        npcOverride: stDef.npc || null,
      });
    }
  } else if (stationType === 'hub') {
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

  // Guarantee ice asteroids in systems without trading (fuel backup)
  if (stationType !== 'trading' && stationType !== 'hub') {
    const iceConfig = ASTEROID_CONFIGS.ice_t1;
    let iceCount = 0;
    for (const a of system.asteroids) { if (a.asteroidType === 'ice') iceCount++; }
    while (iceCount < 4) {
      const angle = rng.float(0, Math.PI * 2);
      const dist = rng.int(350, 1100);
      const ax = system.star.x + Math.cos(angle) * dist + rng.int(-50, 50);
      const ay = system.star.y + Math.sin(angle) * dist + rng.int(-50, 50);
      const aSize = rng.int(iceConfig.size.min, iceConfig.size.max);
      const hp = rng.int(iceConfig.hp.min, iceConfig.hp.max);
      system.asteroids.push({
        x: ax, y: ay, size: aSize,
        hp: hp, maxHp: hp,
        configId: 'ice_t1',
        asteroidType: 'ice',
        color: '#' + iceConfig.tint.toString(16).padStart(6, '0'),
        rotation: rng.float(0, Math.PI * 2),
        rotSpeed: rng.float(-0.015, 0.015),
        shapeSeed: rng.int(1, 999999),
        resourceId: rollDrop(rng, iceConfig.drops),
        sounds: iceConfig.sounds,
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
