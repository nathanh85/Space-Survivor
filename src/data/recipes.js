// ============================================================
// Crafting Recipes — v0.7.e.1 Act 1 subset
// Costs are Code's call (CRAFTING_PROGRESSION_TRACKER not in repo) —
// every material is verifiably obtainable in Act 1 space:
//   T1 (Core): iron, carbon, fuel · T2 (Frontier): titanium, plasma, cryo
// result.type: 'weapon' → owned weapon | 'upgrade' → ship stat tier
//              'item'   → inventory consumable
// component: unique component that must be owned before recipe unlocks
// requires:  recipe id that must be crafted first (upgrade chains)
// ============================================================

export const RECIPES = [
  // --- WEAPONS ---
  {
    id: 'laser_mk2', name: 'Laser Mk2', category: 'weapons',
    result: { type: 'weapon', id: 'laser_mk2' },
    component: 'diamond_aperture', requires: null,
    materials: { titanium: 10, plasma: 6, iron: 8 },
    description: "Twice the punch, cracks T2 rock. Needs the Diamond Aperture.",
  },
  {
    id: 'cannon_mk1', name: 'Cannon Mk1', category: 'weapons',
    result: { type: 'weapon', id: 'cannon_mk1' },
    component: 'bore_assembly', requires: null,
    materials: { titanium: 12, plasma: 8, carbon: 6 },
    description: "Slow, heavy, satisfying. Cracks T3 rock. Needs the Bore Assembly.",
  },

  // --- SHIP ---
  {
    id: 'hull_mk1', name: 'Hull Plating Mk1', category: 'ship',
    result: { type: 'upgrade', system: 'hull', tier: 1, stat: 'maxHull', amount: 25 },
    component: null, requires: null,
    materials: { iron: 10, carbon: 6 },
    description: "+25 max hull. The Dustkicker stops rattling. Slightly.",
  },
  {
    id: 'hull_mk2', name: 'Hull Plating Mk2', category: 'ship',
    result: { type: 'upgrade', system: 'hull', tier: 2, stat: 'maxHull', amount: 25 },
    component: null, requires: 'hull_mk1',
    materials: { titanium: 8, iron: 10 },
    description: "+25 max hull. Titanium-reinforced.",
  },
  {
    id: 'shield_mk1', name: 'Shield Array Mk1', category: 'ship',
    result: { type: 'upgrade', system: 'shield', tier: 1, stat: 'maxShield', amount: 25 },
    component: null, requires: null,
    materials: { cryo: 6, iron: 8 },
    description: "+25 max shield. Cryo-cooled emitters.",
  },
  {
    id: 'shield_mk2', name: 'Shield Array Mk2', category: 'ship',
    result: { type: 'upgrade', system: 'shield', tier: 2, stat: 'maxShield', amount: 25 },
    component: null, requires: 'shield_mk1',
    materials: { titanium: 8, cryo: 6 },
    description: "+25 max shield. Don't ask Pepper how it works.",
  },
  {
    id: 'engine_mk1', name: 'Engine Tune Mk1', category: 'ship',
    result: { type: 'upgrade', system: 'engine', tier: 1, stat: 'speedMult', amount: 0.15 },
    component: null, requires: null,
    materials: { carbon: 8, fuel: 4 },
    description: "+15% speed. She still rattles, but faster.",
  },
  {
    id: 'engine_mk2', name: 'Engine Tune Mk2', category: 'ship',
    result: { type: 'upgrade', system: 'engine', tier: 2, stat: 'speedMult', amount: 0.15 },
    component: null, requires: 'engine_mk1',
    materials: { titanium: 6, plasma: 6 },
    description: "+15% more speed. Pepper voided the warranty.",
  },

  // --- CONSUMABLES ---
  {
    id: 'repair_kit', name: 'Repair Kit', category: 'consumables',
    result: { type: 'item', id: 'repair_kit', qty: 1 },
    component: null, requires: null,
    materials: { iron: 4, carbon: 2 },
    description: "Restores 50 hull. Craft a few before a fight.",
  },
  {
    id: 'fuel_cell', name: 'Fuel Cell', category: 'consumables',
    result: { type: 'item', id: 'fuel_cell', qty: 1 },
    component: null, requires: null,
    materials: { fuel: 3, cryo: 1 },
    description: "Restores 40 fuel. Never get stranded again.",
  },
];

export function getRecipe(id) {
  return RECIPES.find(r => r.id === id);
}

export function getRecipesByCategory(category) {
  return RECIPES.filter(r => r.category === category);
}
