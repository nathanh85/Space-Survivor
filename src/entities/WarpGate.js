// ============================================================
// Warp Gate Entity — pulsing ring with overlap trigger
// ============================================================

import Phaser from 'phaser';

export default class WarpGate extends Phaser.GameObjects.Container {
  constructor(scene, gateData) {
    super(scene, gateData.x, gateData.y);
    scene.add.existing(this);

    this.gateData = gateData;
    this.gateSize = gateData.size;
    this.isDungeon = gateData.isDungeon;
    this.targetId = gateData.targetId;
    this.targetName = gateData.targetName;

    // Graphics
    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    // Label
    const labelText = this.targetName + (this.isDungeon ? ' \u26A0' : '');
    const label = scene.add.text(0, this.gateSize + 13, labelText, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: this.isDungeon ? '#ff00ff' : '#00d4ff',
      align: 'center',
    }).setOrigin(0.5, 0).setAlpha(0.7);
    this.add(label);

    // Physics body for overlap detection
    scene.physics.add.existing(this, true);
    this.body.setCircle(this.gateSize + 30, -(this.gateSize + 30), -(this.gateSize + 30));

    this.setDepth(30);
  }

  preUpdate(time, delta) {
    const g = this.gfx;
    const s = this.gateSize;
    const frame = time / 16.67;
    const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;
    const color = this.isDungeon ? 0xff00ff : 0x00d4ff;

    g.clear();

    // Outer ring
    g.lineStyle(2, color, pulse);
    g.strokeCircle(0, 0, s);

    // Inner glow
    g.fillStyle(color, 0.15 * pulse);
    g.fillCircle(0, 0, s);

    // Spinning corner bits
    for (let i = 0; i < 4; i++) {
      const a = frame * 0.03 + i * Math.PI / 2;
      g.fillStyle(color, pulse);
      g.fillRect(Math.cos(a) * s * 0.7 - 2, Math.sin(a) * s * 0.7 - 2, 4, 4);
    }
  }
}
