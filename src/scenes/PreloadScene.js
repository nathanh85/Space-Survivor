// ============================================================
// Preload Scene — loads all assets before TitleScene
// Boot sequence: PreloadScene → TitleScene → IntroScene → FlightScene
// ============================================================

import Phaser from 'phaser';
import { loadPortraits, PORTRAIT_MANIFEST } from '../data/entities/portraits.js';

// Legacy portrait keys still referenced by cutscene scripts + HUD portraits.
// These are scheduled for removal in Patch 2 (v0.7.d.2) once all story/beat
// files have been migrated to call characterPortraitKey() instead.
const LEGACY_PORTRAITS = [
  'pax_neutral', 'pepper_neutral', 'mother', 'marshal', 'judge',
  'grix', 'vera', 'informant', 'miner', 'smuggler', 'commander', 'mechanic',
];

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

    // --- Legacy portraits (kept until Patch 2 migrates cutscene scripts) ----
    LEGACY_PORTRAITS.forEach(p => {
      this.load.image(p, `assets/portraits/${p}.png`);
    });

    // --- New portrait manifest ---------------------------------------------
    loadPortraits(this);

    // Only warn about non-portrait misses — portrait misses are covered by
    // manifest validation at load time.
    this.load.on('loaderror', (file) => {
      if (!file.key.includes('__')) {
        console.warn('[PRELOAD] Failed:', file.key);
      }
    });
  }

  create() {
    // Apply LINEAR filtering to portrait textures so they scale cleanly
    // at the small display sizes used in cutscenes and HUD.
    const manifestKeys = PORTRAIT_MANIFEST.flatMap(entry =>
      entry.expressions.map(expr => `${entry.id}__${expr}`)
    );
    const allKeys = [...LEGACY_PORTRAITS, ...manifestKeys];

    let applied = 0;
    for (const key of allKeys) {
      if (this.textures.exists(key)) {
        const tex = this.textures.get(key);
        tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
        applied++;
      }
    }

    console.log(`[PRELOAD] Complete — ${applied}/${allKeys.length} portrait textures ready`);
    this.scene.start('TitleScene');
  }
}
