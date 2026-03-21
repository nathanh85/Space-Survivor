// ============================================================
// Asteroid Entity — rotating cube, mineable
// ============================================================

import Phaser from 'phaser';

export default class Asteroid extends Phaser.GameObjects.Container {
  constructor(scene, asteroidData, index) {
    super(scene, asteroidData.x, asteroidData.y);
    scene.add.existing(this);

    this.asteroidData = asteroidData;
    this.asteroidSize = asteroidData.size;
    this.rotSpeed = asteroidData.rotSpeed;
    this.asteroidIndex = index;

    // Resource node state (set by ResourceSystem)
    this.resourceId = null;
    this.mineProgress = 0;
    this.mined = false;
    this.mineTime = 1.5; // seconds to mine

    // Graphics
    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.drawAsteroid();

    // Physics body for overlap
    scene.physics.add.existing(this, true);
    this.body.setCircle(
      Math.max(this.asteroidSize, 8),
      -Math.max(this.asteroidSize, 8),
      -Math.max(this.asteroidSize, 8)
    );

    this.setDepth(15);
  }

  drawAsteroid() {
    const g = this.gfx;
    const s = this.asteroidSize;
    g.clear();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(this.asteroidData.color).color);
    g.fillRect(-s / 2, -s / 2, s, s * 0.8);
  }

  drawMiningHighlight(progress) {
    const g = this.gfx;
    const s = this.asteroidSize;
    g.clear();

    // Highlight ring
    g.lineStyle(1.5, 0x00d4ff, 0.6);
    g.strokeCircle(0, 0, s + 3);

    // Base asteroid
    g.fillStyle(Phaser.Display.Color.HexStringToColor(this.asteroidData.color).color);
    g.fillRect(-s / 2, -s / 2, s, s * 0.8);

    // Progress bar
    if (progress > 0) {
      const bw = s * 2;
      const bh = 3;
      g.fillStyle(0x333333, 0.8);
      g.fillRect(-bw / 2, s + 4, bw, bh);
      g.fillStyle(0x00d4ff);
      g.fillRect(-bw / 2, s + 4, bw * progress, bh);
    }
  }

  preUpdate(time, delta) {
    this.setRotation(this.rotation + this.rotSpeed);
  }
}
