// Zone config system — template + override merge
import { ZONE_TEMPLATES } from './templates.js';
import UNIVERSE_DATA from '../universe.json';
import zion from './overrides/zion.js';

const ZONE_OVERRIDES = {
  'hex_0_0': zion,  // Zion is at q:0, r:0
};

/**
 * Get the merged zone config for a system.
 * Override fields replace template fields entirely (shallow merge).
 */
export function getZoneConfig(systemId) {
  const sys = UNIVERSE_DATA.find(s => `hex_${s.q}_${s.r}` === systemId);
  if (!sys) return { ...ZONE_TEMPLATES.core, id: systemId, name: 'Unknown', region: 'core', danger: 1 };

  const template = ZONE_TEMPLATES[sys.region] || ZONE_TEMPLATES.core;
  const override = ZONE_OVERRIDES[systemId] || {};

  return {
    id: systemId,
    name: sys.name,
    region: sys.region,
    danger: sys.danger,
    ...template,
    ...override,
  };
}
