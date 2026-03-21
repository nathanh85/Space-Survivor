// ============================================================
// Station Entity — dockable stations with visual
// ============================================================

import Phaser from 'phaser';

export default class Station extends Phaser.GameObjects.Container {
  constructor(scene, stationData) {
    super(scene, stationData.x, stationData.y);
    scene.add.existing(this);

    this.stationData = stationData;
    this.stationSize = stationData.size;

    // Graphics
    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    // Label
    const label = scene.add.text(0, this.stationSize + 12, stationData.name, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#00d4ff',
      align: 'center',
    }).setOrigin(0.5, 0);
    this.add(label);

    // Physics body for overlap
    scene.physics.add.existing(this, true);
    this.body.setCircle(this.stationSize + 10, -(this.stationSize + 10), -(this.stationSize + 10));

    this.setDepth(25);
  }

  preUpdate(time, delta) {
    const g = this.gfx;
    const s = this.stationSize;
    const frame = time / 16.67;

    g.clear();

    // Station body
    g.fillStyle(0xcccccc);
    g.fillRect(-s / 2, -s / 2, s, s);
    // Border
    g.lineStyle(1, 0x00d4ff);
    g.strokeRect(-s / 2 - 3, -s / 2 - 3, s + 6, s + 6);
    // Docking lights
    const lightOn = Math.floor(frame) % 60 < 30;
    g.fillStyle(lightOn ? 0x00ff00 : 0x006600);
    g.fillRect(-s / 2 - 1, -2, 3, 4);
    g.fillRect(s / 2 - 2, -2, 3, 4);

    this.setRotation(frame * 0.005);
  }
}
