import { characterPortraitKey } from '../entities/portraits.js';

const PAX_SMILE = characterPortraitKey('pax', 'smile_1');
const PEP_SMILE = characterPortraitKey('pepper', 'smile_2');
const PEP_SMIRK = characterPortraitKey('pepper', 'smirk_2');

export default {
  id: 'harlan_victory',
  name: 'harlan_victory',
  label: 'END OF ACT I',
  bg: 0,
  beats: [
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEP_SMILE, side: 'right',
      portLeft: PAX_SMILE, portRight: PEP_SMILE,
      line: "The booster's ours. Gate to the Outer Rim's open, Pax.",
      spd: 34, hold: 2800, sfx: 'none', enter: 'fade', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PAX', port: PAX_SMILE, side: 'left',
      portLeft: PAX_SMILE, portRight: PEP_SMILE,
      line: "Act one of the great Dustkicker rescue: complete.",
      spd: 34, hold: 2600, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEP_SMIRK, side: 'right',
      portLeft: PAX_SMILE, portRight: PEP_SMIRK,
      line: "Don't name things. Every time you name things, they explode.",
      spd: 36, hold: 3000, sfx: 'none', enter: 'none', impact: 'none', trans: 'fade-black' },
  ],
};
