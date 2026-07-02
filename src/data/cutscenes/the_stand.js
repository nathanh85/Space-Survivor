import { characterPortraitKey } from '../entities/portraits.js';

const PAX_N1 = characterPortraitKey('pax', 'neutral_1');
const PAX_N2 = characterPortraitKey('pax', 'neutral_2');
const PAX_SMILE = characterPortraitKey('pax', 'smile_1');
const PEP_SAD = characterPortraitKey('pepper', 'sad');
const PEP_N2 = characterPortraitKey('pepper', 'neutral_2');
const PEP_SMIRK = characterPortraitKey('pepper', 'smirk_1');

// The emotional beat — slow speeds, long holds per DIALOGUE_SCRIPT_FINAL
export default {
  id: 'the_stand',
  name: 'the_stand',
  label: 'THE STAND',
  bg: 0,
  beats: [
    { tmpl: 'dialogue', spk: 'PAX', port: PAX_N1, side: 'left',
      portLeft: PAX_N1, portRight: PEP_SAD,
      line: "Pepper. Before Harlan. ...You think they're okay? Really?",
      spd: 30, hold: 3000, sfx: 'none', enter: 'fade', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEP_SAD, side: 'right',
      portLeft: PAX_N1, portRight: PEP_SAD,
      line: "...",
      spd: 10, hold: 2000, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEP_SAD, side: 'right',
      portLeft: PAX_N1, portRight: PEP_SAD,
      line: "I think Dad's drivin' the guards crazy correctin' their grammar. I think Mom's already built a radio outta spoons.",
      spd: 32, hold: 3400, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PAX', port: PAX_SMILE, side: 'left',
      portLeft: PAX_SMILE, portRight: PEP_SAD,
      line: "That does sound like them.",
      spd: 30, hold: 2400, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEP_SAD, side: 'right',
      portLeft: PAX_SMILE, portRight: PEP_SAD,
      line: "I'm scared, Pax. There. I said it. You happy?",
      spd: 30, hold: 3400, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PAX', port: PAX_N2, side: 'left',
      portLeft: PAX_N2, portRight: PEP_SAD,
      line: "Yeah, well — I'm scared too. But I got you, and you got me, and Harlan's only got a badge.",
      spd: 32, hold: 3200, sfx: 'none', enter: 'none', impact: 'shake', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEP_N2, side: 'right',
      portLeft: PAX_N2, portRight: PEP_N2,
      line: "...Alright.",
      spd: 30, hold: 2200, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEP_SMIRK, side: 'right',
      portLeft: PAX_N2, portRight: PEP_SMIRK,
      line: "Alright. Let's go ruin a deputy's whole career.",
      spd: 34, hold: 3000, sfx: 'none', enter: 'none', impact: 'none', trans: 'fade-black' },
  ],
};
