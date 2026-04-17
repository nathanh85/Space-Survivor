import { characterPortraitKey } from '../entities/portraits.js';

const PAX    = characterPortraitKey('pax',    'neutral_2');
const PEPPER = characterPortraitKey('pepper', 'neutral_2');

export default {
  id: 'act1_first_warp',
  name: 'act1_first_warp',
  label: 'FIRST WARP',
  bg: 0,
  beats: [
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER, side: 'right',
      portLeft: PAX, portRight: PEPPER,
      line: "Warp drive's online! Well... mostly online. It's making a sound I don't love.",
      spd: 38, hold: 2500, sfx: 'none', enter: 'fade', impact: 'shake', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER, side: 'right',
      portLeft: PAX, portRight: PEPPER,
      line: "Hold on to somethin', Pax!", spd: 42, hold: 1800,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PAX', port: PAX, side: 'left',
      portLeft: PAX, portRight: PEPPER,
      line: "...We made it! The Dustkicker flies!", spd: 36, hold: 2500,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER, side: 'right',
      portLeft: PAX, portRight: PEPPER,
      line: "Next stop: anywhere that ain't here.", spd: 34, hold: 3000,
      sfx: 'none', enter: 'none', impact: 'none', trans: 'fade-black' },
  ],
};
