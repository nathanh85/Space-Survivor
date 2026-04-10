// Entity configs — Ship upgrades (proof-of-concept stubs)
export const SHIP_UPGRADES = {
  engine_mk1: { id: 'engine_mk1', system: 'engine', tier: 1, stat: 'moveSpeed', value: 250, component: null, materials: {} },
  armor_mk1:  { id: 'armor_mk1', system: 'armor', tier: 1, stat: 'maxHull', value: 125, component: 'plating_shard', materials: { iron: 8, carbon: 4 } },
};
