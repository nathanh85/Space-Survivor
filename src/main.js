// ============================================================
// Block Survival: Space Pirates — Phaser 3 Entry Point
// ============================================================

import Phaser from 'phaser';
import FlightScene from './scenes/FlightScene.js';
import GalaxyMapScene from './scenes/GalaxyMapScene.js';
import WarpScene from './scenes/WarpScene.js';

const config = {
  type: Phaser.CANVAS,
  width: 1280,
  height: 800,
  backgroundColor: '#0a0a18',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [FlightScene, GalaxyMapScene, WarpScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
