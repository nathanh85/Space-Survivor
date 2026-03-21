// ============================================================
// Warp Transition Scene — star streaks animation
// ============================================================

import Phaser from 'phaser';

export default class WarpScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WarpScene' });
  }

  init(data) {
    this.targetName = data.targetName || 'Unknown';
    this.targetId = data.targetId;
    this.warpDuration = 2000; // ms
    this.elapsed = 0;
  }

  create() {
    const { width: W, height: H } = this.cameras.main;

    // Black background
    this.cameras.main.setBackgroundColor('#000000');

    // Generate streak data (persistent for this transition)
    this.streaks = [];
    for (let i = 0; i < 80; i++) {
      this.streaks.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * Math.max(W, H) * 0.6,
        speed: 0.5 + Math.random() * 1.5,
        r: 150 + Math.floor(Math.random() * 105),
        g: 200 + Math.floor(Math.random() * 55),
        alpha: 0.3 + Math.random() * 0.5,
        width: Math.random() * 2 + 0.5,
      });
    }

    // Streak graphics
    this.streakGfx = this.add.graphics();

    // Text
    this.warpText = this.add.text(W / 2, H / 2, 'W A R P I N G', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.targetText = this.add.text(W / 2, H / 2 + 24, '\u2192 ' + this.targetName, {
      fontSize: '11px', fontFamily: 'monospace', color: '#00aaff',
    }).setOrigin(0.5);
  }

  update(time, delta) {
    this.elapsed += delta;
    const prog = Math.min(this.elapsed / this.warpDuration, 1);

    const { width: W, height: H } = this.cameras.main;
    const g = this.streakGfx;
    g.clear();

    // Draw streaks
    for (const s of this.streaks) {
      const sx = W / 2 + Math.cos(s.angle) * s.dist;
      const sy = H / 2 + Math.sin(s.angle) * s.dist;
      const len = 20 + prog * 100;

      g.lineStyle(s.width, Phaser.Display.Color.GetColor(s.r, s.g, 255), s.alpha);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + Math.cos(s.angle) * len, sy + Math.sin(s.angle) * len);
      g.strokePath();
    }

    // Pulsing text
    this.warpText.setAlpha(Math.sin(time * 0.008) > 0 ? 1 : 0.3);

    // Complete
    if (this.elapsed >= this.warpDuration) {
      this.scene.stop('WarpScene');
      this.scene.get('FlightScene').completeWarp(this.targetId);
    }
  }
}
