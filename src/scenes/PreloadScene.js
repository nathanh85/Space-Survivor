// ============================================================
// Preload Scene — loads all assets before TitleScene
// Boot sequence: PreloadScene → TitleScene → IntroScene → FlightScene
// ============================================================

import Phaser from 'phaser';
import { loadPortraits, PORTRAIT_MANIFEST } from '../data/entities/portraits.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Loading text
    this.add.text(W / 2, H / 2 - 20, 'LOADING...', {
      fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: '#1a3a4a',
    }).setOrigin(0.5);

    // Progress bar — simple two-rectangle approach, fill drives from progress event
    const barW = 300, barH = 8;
    const barX = W / 2 - barW / 2;
    const barY = H / 2 + 10;
    this.add.rectangle(barX, barY, barW, barH, 0x0a1a2a).setOrigin(0, 0);
    const barFill = this.add.rectangle(barX, barY, 0, barH, 0x00d4ff).setOrigin(0, 0);
    this.load.on('progress', (value) => {
      barFill.width = barW * value;
    });

    // --- Portrait manifest -------------------------------------------------
    loadPortraits(this);

    this.load.on('loaderror', (file) => {
      console.warn('[PRELOAD] Failed:', file.key);
    });
  }

  create() {
    // Apply LINEAR filtering to portrait textures so they scale cleanly
    // at the small display sizes used in cutscenes and HUD.
    const manifestKeys = PORTRAIT_MANIFEST.flatMap(entry =>
      entry.expressions.map(expr => `${entry.id}__${expr}`)
    );

    let applied = 0;
    for (const key of manifestKeys) {
      if (this.textures.exists(key)) {
        const tex = this.textures.get(key);
        tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
        applied++;
      }
    }

    console.log(`[PRELOAD] Complete — ${applied}/${manifestKeys.length} portrait textures ready`);
    this.scene.start('TitleScene');
  }
}
