// ============================================================
// Resource Definitions — v3.1 streamlined (10 resources)
// ============================================================

export const RESOURCE_TIERS = {
  COMMON:    { level: 1, name: 'Common',    color: '#aaaaaa', glowColor: '#888888' },
  UNCOMMON:  { level: 2, name: 'Uncommon',  color: '#2ecc71', glowColor: '#27ae60' },
  RARE:      { level: 3, name: 'Rare',      color: '#3498db', glowColor: '#2980b9' },
  LEGENDARY: { level: 4, name: 'Legendary', color: '#f39c12', glowColor: '#e67e22' },
};

export const RESOURCES = {
  // Tier 1 — Common (Core Worlds)
  iron:    { id: 'iron',    name: 'Iron Ore',      tier: RESOURCE_TIERS.COMMON, color: '#A0A0A0', value: 5,   maxStack: 50, description: 'Basic structural metal ore' },
  carbon:  { id: 'carbon',  name: 'Carbon',        tier: RESOURCE_TIERS.COMMON, color: '#4a4a4a', value: 4,   maxStack: 50, description: 'Fundamental element for composites' },
  fuel:    { id: 'fuel',    name: 'Hydrogen Fuel',  tier: RESOURCE_TIERS.COMMON, color: '#f1c40f', value: 6,   maxStack: 50, description: 'Standard starship fuel' },

  // Tier 2 — Uncommon (Frontier)
  titanium: { id: 'titanium', name: 'Titanium',     tier: RESOURCE_TIERS.UNCOMMON, color: '#B8C6DB', value: 15, maxStack: 30, description: 'Lightweight armor-grade metal' },
  plasma:   { id: 'plasma',   name: 'Plasma Gel',    tier: RESOURCE_TIERS.UNCOMMON, color: '#e74c3c', value: 18, maxStack: 30, description: 'Conductive gel for energy systems' },
  cryo:     { id: 'cryo',     name: 'Cryo Crystals', tier: RESOURCE_TIERS.UNCOMMON, color: '#87CEEB', value: 12, maxStack: 30, description: 'Sub-zero crystalline formations' },

  // Tier 3 — Rare (Outer Rim)
  darkmatter:  { id: 'darkmatter',  name: 'Dark Matter',  tier: RESOURCE_TIERS.RARE, color: '#8e44ad', value: 50, maxStack: 15, description: 'Condensed dark matter fragments' },
  neutronium:  { id: 'neutronium',  name: 'Neutronium',   tier: RESOURCE_TIERS.RARE, color: '#2ecc71', value: 55, maxStack: 15, description: 'Ultra-dense neutron star material' },

  // Tier 4 — Legendary (Dungeon-only)
  singularity: { id: 'singularity', name: 'Singularity Core', tier: RESOURCE_TIERS.LEGENDARY, color: '#ff00ff', value: 250, maxStack: 5, description: 'Collapsed star fragment with immense energy' },
  starfrag:    { id: 'starfrag',    name: 'Star Fragment',    tier: RESOURCE_TIERS.LEGENDARY, color: '#FFD700', value: 300, maxStack: 5, description: 'Piece of a dying star, radiates heat' },
};

// Region distribution — updated weights per v3.1
export const REGION_RESOURCES = {
  CORE:  { tiers: [1], weights: [1] },
  FRONT: { tiers: [1, 2], weights: [0.6, 0.4] },
  OUTER: { tiers: [1, 2, 3], weights: [0.25, 0.4, 0.35] },
  RIFT:  { tiers: [1, 2, 3], weights: [0.1, 0.3, 0.6] },
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

  // Fallback to random common resource
  if (available.length === 0) {
    const commons = Object.values(RESOURCES).filter(r => r.tier.level === 1);
    available.push(commons[Math.floor(Math.random() * commons.length)]);
  }

  return available;
}
