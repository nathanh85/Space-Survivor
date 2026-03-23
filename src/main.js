// ============================================================
// Block Survival: Space Pirates — Phaser 3 Entry Point
// ============================================================

import Phaser from 'phaser';
import TitleScene from './scenes/TitleScene.js';
import FlightScene from './scenes/FlightScene.js';
import GalaxyMapScene from './scenes/GalaxyMapScene.js';
import WarpScene from './scenes/WarpScene.js';
import CutsceneScene from './scenes/CutsceneScene.js';
import HubScene from './scenes/HubScene.js';

const config = {
  type: Phaser.CANVAS,
  width: 1280,
  height: 800,
  backgroundColor: '#050510',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [TitleScene, FlightScene, GalaxyMapScene, WarpScene, CutsceneScene, HubScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
