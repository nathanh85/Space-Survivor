// ============================================================
// Block Survival: Space Pirates — Constants & Utilities
// ============================================================

// --- SEEDED RNG ---
export class RNG {
  constructor(seed) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  float(min, max) { return this.next() * (max - min) + min; }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  chance(pct) { return this.next() < pct; }
}

// --- WORLD DIMENSIONS ---
export const SYS_W = 4800;
export const SYS_H = 3600;
export const UNIVERSE_COLS = 12;
export const UNIVERSE_ROWS = 10;

// --- REGIONS ---
export const REGIONS = {
  CORE:  { key: 'CORE',  name: 'Core Worlds', color: '#2ecc71', danger: [1, 2],  minLevel: 0  },
  FRONT: { key: 'FRONT', name: 'Frontier',    color: '#f39c12', danger: [3, 5],  minLevel: 5  },
  OUTER: { key: 'OUTER', name: 'Outer Rim',   color: '#e74c3c', danger: [6, 8],  minLevel: 10 },
  RIFT:  { key: 'RIFT',  name: 'The Rift',    color: '#8e44ad', danger: [9, 10], minLevel: 20 },
};

// --- PLANET TYPES ---
export const PLANET_TYPES = [
  { name: 'Rocky',    color: '#8B7355', resources: ['iron_ore', 'silicon', 'carbon'] },
  { name: 'Ice',      color: '#87CEEB', resources: ['water_ice', 'cryo_crystals'] },
  { name: 'Volcanic', color: '#FF4500', resources: ['titanium', 'hydrogen_fuel'] },
  { name: 'Lush',     color: '#32CD32', resources: ['organic_compounds', 'exotic_spores'] },
  { name: 'Toxic',    color: '#ADFF2F', resources: ['dark_matter_shards', 'plasma_gel'] },
  { name: 'Barren',   color: '#A0A0A0', resources: ['copper_wire', 'salvage'] },
];

// --- SYSTEM NAMES ---
export const SYSTEM_NAMES = [
  'Arcturus','Vega','Polaris','Rigel','Sirius','Deneb','Altair','Antares',
  'Betelgeuse','Capella','Aldebaran','Spica','Procyon','Achernar','Canopus',
  'Bellatrix','Castor','Pollux','Regulus','Fomalhaut','Mizar','Alcyone',
  'Elnath','Saiph','Mintaka','Alnitak','Alnilam','Diphda','Hamal','Mirfak',
  'Rasalhague','Shaula','Sargas','Kaus','Nunki','Ascella','Alnasl','Etamin',
  'Eltanin','Thuban','Rastaban','Grumium','Tarazed','Sheliak','Sulafat',
  'Nekkar','Seginus','Izar','Muphrid','Zuben','Grafias','Dschubba','Lesath',
];

// --- DUNGEON TYPES ---
export const DUNGEON_TYPES = [
  'Derelict Fleet',
  'Pirate Stronghold',
  'Anomaly Zone',
  'Ancient Ruins',
];

// --- STATION NAME PARTS ---
export const STATION_PREFIXES = ['Trading Post', 'Refinery', 'Outpost', 'Depot', 'Hub', 'Beacon'];
export const STATION_SUFFIXES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Prime'];

// --- DANGER COLORS ---
export const DANGER_COLORS = [
  '#2ecc71','#2ecc71','#27ae60','#f1c40f','#f39c12',
  '#e67e22','#e74c3c','#c0392b','#8e44ad','#6c3483','#4a0e4e'
];

// --- PLAYER DEFAULTS ---
export const PLAYER_DEFAULTS = {
  speed: 220,       // pixels/sec (Phaser uses px/s not px/frame)
  drag: 0.94,
  accel: 400,       // acceleration in px/s²
  turnSmooth: 0.12,
  hull: 100,
  shield: 50,
  fuel: 100,
  xpNext: 100,
};

// --- COLORS ---
export const COLORS = {
  PRIMARY: 0x00d4ff,
  DANGER: 0xff00ff,
  BG: 0x0a0a18,
  HULL: 0xe74c3c,
  SHIELD: 0x3498db,
  FUEL: 0xf39c12,
  XP: 0x8e44ad,
};
