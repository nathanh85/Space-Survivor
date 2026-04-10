// Entity configs — Planet types (extracted from constants.js PLANET_TYPES)
export const PLANET_CONFIGS = {
  rocky:    { id: 'rocky',    name: 'Rocky',    color: '#8B7355', resources: ['iron', 'carbon'] },
  ice:      { id: 'ice',      name: 'Ice',      color: '#87CEEB', resources: ['cryo', 'fuel'] },
  volcanic: { id: 'volcanic', name: 'Volcanic', color: '#FF4500', resources: ['titanium', 'plasma'] },
  lush:     { id: 'lush',     name: 'Lush',     color: '#32CD32', resources: ['carbon', 'fuel'] },
  toxic:    { id: 'toxic',    name: 'Toxic',     color: '#ADFF2F', resources: ['darkmatter', 'plasma'] },
  barren:   { id: 'barren',   name: 'Barren',    color: '#A0A0A0', resources: ['iron', 'neutronium'] },
};
