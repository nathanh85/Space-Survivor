// ============================================================
// P.E.S.T.S. — A Space Western — Phaser 3 Entry Point
// ============================================================

import Phaser from 'phaser';
import TitleScene from './scenes/TitleScene.js';
import IntroScene from './scenes/IntroScene.js';
import FlightScene from './scenes/FlightScene.js';
import GalaxyMapScene from './scenes/GalaxyMapScene.js';
import WarpScene from './scenes/WarpScene.js';
import CutsceneScene from './scenes/CutsceneScene.js';
import HubScene from './scenes/HubScene.js';

const config = {
  type: Phaser.CANVAS,
  width: 1760,
  height: 1100,
  resolution: window.devicePixelRatio || 1,
  backgroundColor: '#050510',
  render: {
    pixelArt: true,
    antialias: false,
  },
  input: {
    gamepad: true,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [TitleScene, IntroScene, FlightScene, GalaxyMapScene, WarpScene, CutsceneScene, HubScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
