// ============================================================
// Intro Scene — text crawl, title card, then cutscene
// ============================================================

import Phaser from 'phaser';

const CRAWL_LINES = [
  "In the year 2847, the galaxy belongs to M.O.T.H.E.R.",
  "A machine that calls itself law. A system that calls itself order.",
  "Two kids from Planet Zion called it something else.",
  "They called it theft.",
];

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#000000');
    this.skipped = false;

    // Skip input
    this._padALast = false;
    this.input.keyboard.on('keydown-SPACE', () => this.skip());
    this.input.on('pointerdown', () => this.skip());
    // Gamepad A to skip (polled since IntroScene has no update loop)
    this.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        if (this.input.gamepad && this.input.gamepad.total > 0) {
          const gpad = this.input.gamepad.getPad(0);
          const padA = gpad && gpad.A;
          if (padA && !this._padALast) this.skip();
          this._padALast = !!padA;
        }
      },
    });

    // Phase 1: Black pause, then text crawl
    let delay = 1000;
    this.crawlTexts = [];

    for (let i = 0; i < CRAWL_LINES.length; i++) {
      const t = this.add.text(W / 2, H * 0.35 + i * 36, CRAWL_LINES[i], {
        fontSize: '10px', fontFamily: '"Press Start 2P", monospace', color: '#ffffff',
        wordWrap: { width: W * 0.7 },
      }).setOrigin(0.5).setAlpha(0);
      this.crawlTexts.push(t);

      this.time.delayedCall(delay, () => {
        if (this.skipped) return;
        this.tweens.add({ targets: t, alpha: 1, duration: 800 });
      });
      delay += 1500;
    }

    // Phase 2: Pause, fade out crawl, show title
    this.time.delayedCall(delay + 1000, () => {
      if (this.skipped) return;
      // Fade out crawl
      for (const t of this.crawlTexts) {
        this.tweens.add({ targets: t, alpha: 0, duration: 600 });
      }
    });

    const titleDelay = delay + 2000;

    // Title card
    this.titleText = this.add.text(W / 2, H * 0.4, 'P.E.S.T.S.', {
      fontSize: '48px', fontFamily: '"Rye", "Press Start 2P", monospace', color: '#00d4ff',
    }).setOrigin(0.5).setAlpha(0);

    this.subtitleText = this.add.text(W / 2, H * 0.5, 'A Space Western', {
      fontSize: '10px', fontFamily: '"Press Start 2P", monospace', color: '#f39c12',
    }).setOrigin(0.5).setAlpha(0);

    this.time.delayedCall(titleDelay, () => {
      if (this.skipped) return;
      this.tweens.add({ targets: this.titleText, alpha: 1, duration: 800 });
    });

    this.time.delayedCall(titleDelay + 600, () => {
      if (this.skipped) return;
      this.tweens.add({ targets: this.subtitleText, alpha: 1, duration: 600 });
    });

    // Phase 3: Hold, then fade to black, then cutscene
    this.time.delayedCall(titleDelay + 3000, () => {
      if (this.skipped) return;
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.goToCutscene();
      });
    });
  }

  skip() {
    if (this.skipped) return;
    this.skipped = true;
    this.goToCutscene();
  }

  goToCutscene() {
    // Start FlightScene, which fires the game_start cutscene
    this.scene.start('FlightScene');
  }
}
