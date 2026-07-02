import { characterPortraitKey } from '../entities/portraits.js';

const PAX    = characterPortraitKey('pax',    'neutral_2');
const PEPPER = characterPortraitKey('pepper', 'neutral_1');
const VERA_N1 = characterPortraitKey('vera', 'neutral_1');
const VERA_N2 = characterPortraitKey('vera', 'neutral_2');
const VERA_SMIRK = characterPortraitKey('vera', 'smirk_1');
const VERA_SAD = characterPortraitKey('vera', 'sad');

export default {
  id: 'vera_intro',
  name: 'vera_intro',
  label: 'THE OUTPOST',
  bg: 0,
  beats: [
    { tmpl: 'dialogue', spk: 'VERA', port: VERA_N1, side: 'left',
      portLeft: VERA_N1, portRight: PAX,
      line: "Well. Ain't every day two kids fall outta the sky in a ship older than me.",
      spd: 34, hold: 2800, sfx: 'none', enter: 'fade', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PAX', port: PAX, side: 'right',
      portLeft: VERA_N1, portRight: PAX,
      line: "She flies fine, ma'am. Mostly.",
      spd: 34, hold: 2200, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'VERA', port: VERA_SMIRK, side: 'left',
      portLeft: VERA_SMIRK, portRight: PAX,
      line: "Mostly's what gets people buried out here, kid.",
      spd: 34, hold: 2600, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER, side: 'right',
      portLeft: VERA_SMIRK, portRight: PEPPER,
      line: "We're lookin' for our folks. M.O.T.H.E.R. took 'em.",
      spd: 36, hold: 2600, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'VERA', port: VERA_SAD, side: 'left',
      portLeft: VERA_SAD, portRight: PEPPER,
      line: "...She takes a lot of folks. Took this whole sector's spine, one law at a time.",
      spd: 30, hold: 3200, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'VERA', port: VERA_N2, side: 'left',
      portLeft: VERA_N2, portRight: PEPPER,
      line: "Tell you what. Help me first, and I'll help you.",
      spd: 34, hold: 2800, sfx: 'none', enter: 'none', impact: 'none', trans: 'fade-black' },
  ],
};
