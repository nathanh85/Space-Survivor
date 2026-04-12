import act1_intro from './act1_intro.js';
import act1_first_warp from './act1_first_warp.js';

const CUTSCENE_REGISTRY = {
  game_start: act1_intro,         // triggered by story beat id 'game_start'
  act1_intro: act1_intro,
  act1_first_warp: act1_first_warp,
};

export function getCutsceneConfig(id) {
  return CUTSCENE_REGISTRY[id] || null;
}
