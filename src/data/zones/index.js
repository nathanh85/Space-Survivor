// Zone config system — template + override merge
import { ZONE_TEMPLATES } from './templates.js';
import UNIVERSE_DATA from '../universe.json';
import zion from './overrides/zion.js';
import scrapyard from './overrides/scrapyard.js';
import the_stand from './overrides/the_stand.js';
import harlans_reach from './overrides/harlans_reach.js';
import ironvale from './overrides/ironvale.js';

const ZONE_OVERRIDES = {
  'hex_0_0': zion,            // Zion
  'hex_3_-2': scrapyard,      // Scrapyard (The Heist)
  'hex_5_-3': the_stand,      // The Stand
  'hex_5_-2': harlans_reach,  // Harlan's Reach (boss arena)
  'hex_-1_1': ironvale,       // Ironvale (Diamond Aperture)
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
