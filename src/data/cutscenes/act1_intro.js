import { characterPortraitKey } from '../entities/portraits.js';

const PAX    = characterPortraitKey('pax',    'neutral_2');
const PEPPER = characterPortraitKey('pepper', 'neutral_2');
const PAX_N1 = characterPortraitKey('pax', 'neutral_1');
const PEPPER_SAD = characterPortraitKey('pepper', 'sad');
const PEPPER_SMIRK = characterPortraitKey('pepper', 'smirk_1');

export default {
  id: 'act1_intro',
  name: 'act1_intro',
  label: 'ACT I \u2014 DUST AND RUST',
  bg: 0,
  beats: [
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER, side: 'right',
      portLeft: PAX, portRight: PEPPER,
      line: "Well Pax... we're alive.", spd: 36, hold: 2200,
      sfx: 'none', enter: 'fade', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER, side: 'right',
      portLeft: PAX, portRight: PEPPER,
      line: "That's somethin'.", spd: 42, hold: 2800,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    // v0.9.a: +3 beats from DIALOGUE_SCRIPT_FINAL
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER_SAD, side: 'right',
      portLeft: PAX, portRight: PEPPER_SAD,
      line: "Half the hull's held on with hope and hull tape.", spd: 38, hold: 2800,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PAX', port: PAX_N1, side: 'left',
      portLeft: PAX_N1, portRight: PEPPER_SAD,
      line: "Then it's a good thing hope's free.", spd: 34, hold: 2400,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER_SMIRK, side: 'right',
      portLeft: PAX_N1, portRight: PEPPER_SMIRK,
      line: "Fuel ain't. Remember that before you go flyin' fancy.", spd: 38, hold: 2800,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PAX', port: PAX, side: 'left',
      portLeft: PAX, portRight: PEPPER,
      line: "...The Dustkicker. She made it.", spd: 34, hold: 2400,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER, side: 'right',
      portLeft: PAX, portRight: PEPPER,
      line: "She rattles. That ain't the same as made it.", spd: 38, hold: 3000,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PAX', port: PAX, side: 'left',
      portLeft: PAX, portRight: PEPPER,
      line: "Mom. Dad. We're gonna get you back.", spd: 32, hold: 3500,
      sfx: 'none', enter: 'none', impact: 'shake', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER, side: 'right',
      portLeft: PAX, portRight: PEPPER,
      line: "...Yeah. We are.", spd: 36, hold: 2800,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'fade-black' },
  ],
};
