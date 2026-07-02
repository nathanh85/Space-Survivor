import act1_intro from './act1_intro.js';
import act1_first_warp from './act1_first_warp.js';
import vera_intro from './vera_intro.js';
import outrider_contact from './outrider_contact.js';
import the_stand from './the_stand.js';
import harlan_victory from './harlan_victory.js';

const CUTSCENE_REGISTRY = {
  game_start: act1_intro,         // triggered by story beat id 'game_start'
  act1_intro: act1_intro,
  act1_first_warp: act1_first_warp,
  vera_intro: vera_intro,
  outrider_contact: outrider_contact,
  the_stand: the_stand,
  harlan_victory: harlan_victory,
};

export function getCutsceneConfig(id) {
  return CUTSCENE_REGISTRY[id] || null;
}
