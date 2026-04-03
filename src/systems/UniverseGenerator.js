// ============================================================
// Universe & Solar System Generation
// ============================================================

import {
  RNG, SYS_W, SYS_H, UNIVERSE_COLS, UNIVERSE_ROWS,
  REGIONS, PLANET_TYPES, SYSTEM_NAMES, DUNGEON_TYPES,
  STATION_PREFIXES, STATION_SUFFIXES
} from '../config/constants.js';
import { getAvailableResources } from '../data/resources.js';

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

  // Mark the first CORE system (closest to grid center) as the starting system
  const coreSystems = systems.filter(s => s.region.key === 'CORE');
  if (coreSystems.length > 0) {
    const cx = UNIVERSE_COLS / 2, cy = UNIVERSE_ROWS / 2;
    coreSystems.sort((a, b) =>
      Math.hypot(a.col - cx, a.row - cy) - Math.hypot(b.col - cx, b.row - cy)
    );
    coreSystems[0].isStarting = true;
  } else if (systems.length > 0) {
    systems[0].isStarting = true;
  }

  // B21: Guarantee at least one FRONT system is reachable within 2 jumps of starter.
  // Grid-adjacency alone can leave the starter surrounded by CORE systems if RNG drops
  // the border cells. If no FRONT system is within 2 hops, force-connect the nearest one.
  const startSys = systems.find(s => s.isStarting);
  if (startSys) {
    const within2 = new Set([startSys.id]);
    for (const id1 of startSys.connections) {
      within2.add(id1);
      const hop1 = systems.find(s => s.id === id1);
      if (hop1) for (const id2 of hop1.connections) within2.add(id2);
    }
    const hasFrontier = systems.some(s => within2.has(s.id) && s.region.key === 'FRONT');
    if (!hasFrontier) {
      const frontSystems = systems.filter(s => s.region.key === 'FRONT');
      if (frontSystems.length > 0) {
        frontSystems.sort((a, b) =>
          Math.hypot(a.col - startSys.col, a.row - startSys.row) -
          Math.hypot(b.col - startSys.col, b.row - startSys.row)
        );
        const target = frontSystems[0];
        if (!startSys.connections.includes(target.id)) startSys.connections.push(target.id);
        if (!target.connections.includes(startSys.id)) target.connections.push(startSys.id);
      }
    }
  }

  // B23/FIX1: Guarantee at least one trading post per region so fuel is always purchasable.
  // Mark one system per region as hasTradingPost=true; generateSystem() will honour this flag.
  for (const regionKey of ['CORE', 'FRONT', 'OUTER', 'RIFT']) {
    const regionSystems = systems.filter(s => s.region.key === regionKey && !s.isStarting);
    if (regionSystems.length === 0) continue;
    // Pick the system closest to the center of its region to be the guaranteed trade hub
    const cx = UNIVERSE_COLS / 2, cy = UNIVERSE_ROWS / 2;
    regionSystems.sort((a, b) =>
      Math.hypot(a.col - cx, a.row - cy) - Math.hypot(b.col - cx, b.row - cy)
    );
    regionSystems[0].hasTradingPost = true;
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

  // Asteroids — density scales by region, typed for visual + drop variety
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

  // B26: doubled counts and spread to fill the system
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
      x: ax, y: ay,
      size: aSize,
      hp: aSize * 3,
      maxHp: aSize * 3,
      asteroidType: aType,
      color: rng.pick(typeData.colors),
      rotation: rng.float(0, Math.PI * 2),
      rotSpeed: rng.float(-0.015, 0.015),
      shapeSeed: rng.int(1, 999999),
      resourceId: resId,
      mined: false,
    });
  }

  // Stations — typed: trading_post, outpost, refinery
  const STATION_TYPES = ['trading_post', 'outpost', 'refinery'];

  // Hub/starting system: always add a trading post
  if (sysData.isStarting) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(500, 800);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: 'Grix Trading Co.',
      size: 16,
      stationType: 'trading_post',
    });
  }

  // B23/FIX1: Region-guaranteed trading post (hasTradingPost flag set by generateUniverse)
  if (!sysData.isStarting && sysData.hasTradingPost) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(450, 800);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: rng.pick(STATION_PREFIXES) + ' ' + rng.pick(STATION_SUFFIXES),
      size: 16,
      stationType: 'trading_post',
    });
  }

  // Core Worlds: 30% chance of an extra trading post
  const addTradingPost = !sysData.isStarting && !sysData.hasTradingPost && sysData.region.key === 'CORE' && rng.chance(0.3);
  if (addTradingPost) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(450, 850);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: rng.pick(STATION_PREFIXES) + ' ' + rng.pick(STATION_SUFFIXES),
      size: 16,
      stationType: 'trading_post',
    });
  }

  const numStations = rng.int(0, 2);
  for (let i = 0; i < numStations; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.int(400, 900);
    const sType = rng.pick(STATION_TYPES);
    system.stations.push({
      x: system.star.x + Math.cos(angle) * dist,
      y: system.star.y + Math.sin(angle) * dist,
      name: rng.pick(STATION_PREFIXES) + ' ' + rng.pick(STATION_SUFFIXES),
      size: 16,
      stationType: sType,
    });
  }

  // B23/FIX1: Non-trading-post systems always have at least 4 ice asteroids so the
  // player can mine fuel even if no shop is present.
  if (!sysData.isStarting && !sysData.hasTradingPost) {
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
        x: ax, y: ay,
        size: aSize,
        hp: aSize * 3,
        maxHp: aSize * 3,
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
