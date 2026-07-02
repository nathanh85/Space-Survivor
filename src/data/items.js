// ============================================================
// Item Definitions — components, consumables, quest items
// (non-resource inventory items; resources live in resources.js)
// ============================================================

import { RESOURCES } from './resources.js';

export const ITEM_TYPES = {
  COMPONENT: 'component',    // unique crafting components (owned, not stacked in inventory)
  CONSUMABLE: 'consumable',  // usable from inventory
  QUEST: 'quest',            // story items
};

export const ITEMS = {
  // --- Unique components (Act 1) ---
  diamond_aperture: {
    id: 'diamond_aperture', name: 'Diamond Aperture', type: ITEM_TYPES.COMPONENT,
    color: '#00e5ff', value: 0, maxStack: 1, sellable: false,
    description: "A flawless focusing crystal. Pepper says it's exactly what the laser needs.",
  },
  bore_assembly: {
    id: 'bore_assembly', name: 'Bore Assembly', type: ITEM_TYPES.COMPONENT,
    color: '#f39c12', value: 0, maxStack: 1, sellable: false,
    description: "Heavy cannon barrel machinery, scrapyard-grade. Still good.",
  },

  // --- Consumables ---
  repair_kit: {
    id: 'repair_kit', name: 'Repair Kit', type: ITEM_TYPES.CONSUMABLE,
    color: '#e74c3c', value: 30, maxStack: 5, sellable: true,
    use: { stat: 'hull', amount: 50 },
    description: "Hull patches, sealant, and hope. Restores 50 hull.",
  },
  fuel_cell: {
    id: 'fuel_cell', name: 'Fuel Cell', type: ITEM_TYPES.CONSUMABLE,
    color: '#f1c40f', value: 25, maxStack: 5, sellable: true,
    use: { stat: 'fuel', amount: 40 },
    description: "Pressurized hydrogen cell. Restores 40 fuel.",
  },

  // --- Quest items ---
  radio_booster: {
    id: 'radio_booster', name: 'Radio Booster', type: ITEM_TYPES.QUEST,
    color: '#2ecc71', value: 0, maxStack: 1, sellable: false,
    description: "Shouts past M.O.T.H.E.R.'s jammers. Harlan won't need it anymore.",
  },
};

// Unified lookup: resources first, then items.
// Everything in the inventory resolves through this.
export function getItemDef(id) {
  return RESOURCES[id] || ITEMS[id] || null;
}
