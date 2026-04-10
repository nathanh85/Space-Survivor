// Entity configs — Star types
export const STAR_CONFIGS = {
  yellow_dwarf: {
    id: 'yellow_dwarf', name: 'Yellow Dwarf',
    radius: { min: 40, max: 60 },
    colors: ['#FFD700', '#FFA500'],
    gravity: { radiusMult: 2.5, strength: 15 },
    damage: { radiusMult: 1.2, dps: 10 },
    sounds: { ambient: 'star_hum_warm' },
  },
  neutron_star: {
    id: 'neutron_star', name: 'Neutron Star',
    radius: { min: 20, max: 30 },
    colors: ['#FFFFFF', '#CCCCFF'],
    gravity: { radiusMult: 4.0, strength: 30 },
    damage: { radiusMult: 2.0, dps: 25 },
    sounds: { ambient: 'star_pulse' },
  },
};
