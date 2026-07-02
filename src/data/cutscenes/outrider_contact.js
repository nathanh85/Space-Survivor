import { characterPortraitKey } from '../entities/portraits.js';

const PAX      = characterPortraitKey('pax', 'neutral_2');
const PEPPER_S = characterPortraitKey('pepper', 'smirk_2');
const OUTRIDER = characterPortraitKey('outrider', 'neutral_2');
const OUTRIDER_SMIRK = characterPortraitKey('outrider', 'smirk_2');

export default {
  id: 'outrider_contact',
  name: 'outrider_contact',
  label: 'THE OUTRIDERS',
  bg: 0,
  beats: [
    { tmpl: 'dialogue', spk: 'OUTRIDER', port: OUTRIDER, side: 'left',
      portLeft: OUTRIDER, portRight: PAX,
      line: "Name's not important. We're Outriders — folks M.O.T.H.E.R. couldn't process. We ride the dark between her patrols.",
      spd: 32, hold: 3200, sfx: 'transmission_static', enter: 'fade', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PAX', port: PAX, side: 'right',
      portLeft: OUTRIDER, portRight: PAX,
      line: "You fight her?",
      spd: 36, hold: 1800, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'OUTRIDER', port: OUTRIDER, side: 'left',
      portLeft: OUTRIDER, portRight: PAX,
      line: "We *inconvenience* her. Fightin' comes later. You want your folks back? You'll need friends who know where the cameras ain't.",
      spd: 32, hold: 3400, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'OUTRIDER', port: OUTRIDER_SMIRK, side: 'left',
      portLeft: OUTRIDER_SMIRK, portRight: PEPPER_S,
      line: "Prove you can ride. There's a shipment sittin' in the Scrapyard with her logo on it. Bring it to us — she won't miss it. ...Probably.",
      spd: 32, hold: 3400, sfx: 'none', enter: 'none', impact: 'none', trans: 'none' },
    { tmpl: 'dialogue', spk: 'PEPPER', port: PEPPER_S, side: 'right',
      portLeft: OUTRIDER_SMIRK, portRight: PEPPER_S,
      line: "'Probably.' My favorite word in a plan.",
      spd: 36, hold: 2600, sfx: 'none', enter: 'none', impact: 'none', trans: 'fade-black' },
  ],
};
