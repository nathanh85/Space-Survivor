// ============================================================
// Resource Definitions — All tiers from design doc
// ============================================================

export const RESOURCE_TIERS = {
  COMMON: { level: 1, name: 'Common', color: '#aaaaaa', glowColor: '#888888' },
  UNCOMMON: { level: 2, name: 'Uncommon', color: '#2ecc71', glowColor: '#27ae60' },
  RARE: { level: 3, name: 'Rare', color: '#3498db', glowColor: '#2980b9' },
  LEGENDARY: { level: 4, name: 'Legendary', color: '#f39c12', glowColor: '#e67e22' },
};

export const RESOURCES = {
  // Tier 1 — Common (Core Worlds)
  iron_ore:       { id: 'iron_ore',       name: 'Iron Ore',       tier: RESOURCE_TIERS.COMMON,    color: '#8B7355', value: 5,   maxStack: 50, description: 'Basic structural metal ore' },
  carbon:         { id: 'carbon',         name: 'Carbon',         tier: RESOURCE_TIERS.COMMON,    color: '#333333', value: 4,   maxStack: 50, description: 'Fundamental element for composites' },
  silicon:        { id: 'silicon',        name: 'Silicon',        tier: RESOURCE_TIERS.COMMON,    color: '#7B68AE', value: 5,   maxStack: 50, description: 'Used in electronics and glass' },
  water_ice:      { id: 'water_ice',      name: 'Water Ice',      tier: RESOURCE_TIERS.COMMON,    color: '#B0E0E6', value: 3,   maxStack: 50, description: 'Frozen water, essential for life support' },
  hydrogen_fuel:  { id: 'hydrogen_fuel',  name: 'Hydrogen Fuel',  tier: RESOURCE_TIERS.COMMON,    color: '#00CED1', value: 6,   maxStack: 50, description: 'Standard starship fuel' },

  // Tier 2 — Uncommon (Frontier)
  titanium:           { id: 'titanium',           name: 'Titanium',           tier: RESOURCE_TIERS.UNCOMMON, color: '#C0C0C0', value: 15,  maxStack: 30, description: 'Lightweight armor-grade metal' },
  plasma_gel:         { id: 'plasma_gel',         name: 'Plasma Gel',         tier: RESOURCE_TIERS.UNCOMMON, color: '#FF69B4', value: 18,  maxStack: 30, description: 'Conductive gel for energy systems' },
  cryo_crystals:      { id: 'cryo_crystals',      name: 'Cryo Crystals',      tier: RESOURCE_TIERS.UNCOMMON, color: '#00BFFF', value: 20,  maxStack: 30, description: 'Sub-zero crystalline formations' },
  organic_compounds:  { id: 'organic_compounds',  name: 'Organic Compounds',  tier: RESOURCE_TIERS.UNCOMMON, color: '#90EE90', value: 12,  maxStack: 30, description: 'Biological matter for synthesis' },
  copper_wire:        { id: 'copper_wire',        name: 'Copper Wire',        tier: RESOURCE_TIERS.UNCOMMON, color: '#B87333', value: 10,  maxStack: 30, description: 'Conductive wiring for electronics' },

  // Tier 3 — Rare (Outer Rim)
  dark_matter_shards: { id: 'dark_matter_shards', name: 'Dark Matter Shards', tier: RESOURCE_TIERS.RARE, color: '#4B0082', value: 50,  maxStack: 15, description: 'Fragments of condensed dark matter' },
  neutronium:         { id: 'neutronium',         name: 'Neutronium',         tier: RESOURCE_TIERS.RARE, color: '#FFD700', value: 60,  maxStack: 15, description: 'Ultra-dense neutron star material' },
  quantum_flux:       { id: 'quantum_flux',       name: 'Quantum Flux',       tier: RESOURCE_TIERS.RARE, color: '#00FFFF', value: 55,  maxStack: 15, description: 'Unstable quantum energy medium' },
  exotic_spores:      { id: 'exotic_spores',      name: 'Exotic Spores',      tier: RESOURCE_TIERS.RARE, color: '#DA70D6', value: 45,  maxStack: 15, description: 'Alien biological specimens' },
  void_glass:         { id: 'void_glass',         name: 'Void Glass',         tier: RESOURCE_TIERS.RARE, color: '#191970', value: 65,  maxStack: 15, description: 'Transparent material from the void' },

  // Tier 4 — Legendary (Dungeon-only)
  singularity_core:   { id: 'singularity_core',   name: 'Singularity Core',   tier: RESOURCE_TIERS.LEGENDARY, color: '#FF4500', value: 200, maxStack: 5, description: 'Collapsed star fragment with immense energy' },
  precursor_alloy:    { id: 'precursor_alloy',    name: 'Precursor Alloy',    tier: RESOURCE_TIERS.LEGENDARY, color: '#E6E6FA', value: 250, maxStack: 5, description: 'Ancient alien metal of unknown composition' },
  living_crystal:     { id: 'living_crystal',     name: 'Living Crystal',     tier: RESOURCE_TIERS.LEGENDARY, color: '#7FFFD4', value: 220, maxStack: 5, description: 'Self-replicating crystalline organism' },
  star_fragment:      { id: 'star_fragment',      name: 'Star Fragment',      tier: RESOURCE_TIERS.LEGENDARY, color: '#FFF8DC', value: 280, maxStack: 5, description: 'Piece of a dying star, radiates heat' },
  chrono_dust:        { id: 'chrono_dust',        name: 'Chrono Dust',        tier: RESOURCE_TIERS.LEGENDARY, color: '#DDA0DD', value: 300, maxStack: 5, description: 'Time-distorted particles from anomalies' },

  // Special
  salvage:            { id: 'salvage',            name: 'Salvage',            tier: RESOURCE_TIERS.COMMON, color: '#808080', value: 8, maxStack: 50, description: 'Scrap metal and components' },
};

// Which resource tiers are available in each region
export const REGION_RESOURCES = {
  CORE:  { tiers: [1], weights: [1] },
  FRONT: { tiers: [1, 2], weights: [0.6, 0.4] },
  OUTER: { tiers: [1, 2, 3], weights: [0.3, 0.4, 0.3] },
  RIFT:  { tiers: [1, 2, 3], weights: [0.15, 0.35, 0.5] },
  // Tier 4 only from dungeon bosses
};

// Get resources available for a given planet type and region
export function getAvailableResources(planetType, regionKey) {
  const regionConfig = REGION_RESOURCES[regionKey];
  if (!regionConfig) return [];

  const available = [];
  for (const resId of planetType.resources) {
    const res = RESOURCES[resId];
    if (res && regionConfig.tiers.includes(res.tier.level)) {
      available.push(res);
    }
  }

  // If no tier-appropriate resources from planet type, fall back to common
  if (available.length === 0) {
    const commons = Object.values(RESOURCES).filter(r => r.tier.level === 1);
    available.push(commons[Math.floor(Math.random() * commons.length)]);
  }

  return available;
}
