// Entity config registry — central access point
import { ASTEROID_CONFIGS } from './asteroids.js';
import { ENEMY_ENTITY_CONFIGS, RANK_MODIFIERS } from './enemies.js';
import { WEAPON_CONFIGS } from './weapons.js';
import { SHIP_UPGRADES } from './ship.js';
import { STATION_CONFIGS } from './stations.js';
import { STAR_CONFIGS } from './stars.js';
import { PLANET_CONFIGS } from './planets.js';
import { SOUND_CONFIGS } from './sounds.js';
import {
  PORTRAIT_MANIFEST, CHARACTER_MAP, loadPortraits,
  getPortraitKey, portraitKey, characterPortraitKey,
  getCharacterIds, getExpressions,
} from './portraits.js';

const REGISTRY = {
  asteroids: ASTEROID_CONFIGS,
  enemies: ENEMY_ENTITY_CONFIGS,
  weapons: WEAPON_CONFIGS,
  ship: SHIP_UPGRADES,
  stations: STATION_CONFIGS,
  stars: STAR_CONFIGS,
  planets: PLANET_CONFIGS,
  sounds: SOUND_CONFIGS,
  ranks: RANK_MODIFIERS,
};

export function getEntityConfig(type, id) {
  return REGISTRY[type] ? REGISTRY[type][id] : null;
}

export function getSoundConfig(key) {
  return SOUND_CONFIGS[key] || null;
}

export {
  ASTEROID_CONFIGS, ENEMY_ENTITY_CONFIGS, RANK_MODIFIERS,
  WEAPON_CONFIGS, SHIP_UPGRADES, STATION_CONFIGS, STAR_CONFIGS,
  PLANET_CONFIGS, SOUND_CONFIGS, PORTRAIT_MANIFEST, loadPortraits,
  getPortraitKey,
};
