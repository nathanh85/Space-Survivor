// ============================================================
// Minimap — tactical overlay showing system layout
// ============================================================

import Phaser from 'phaser';
import { SYS_W, SYS_H } from '../config/constants.js';

export default class Minimap extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setScrollFactor(0);
    this.setDepth(500);

    this.mapW = 160;
    this.mapH = 120;

    this.gfx = scene.add.graphics();
    this.add(this.gfx);
  }

  update(system, player, camera, W, H) {
    const mx = W - this.mapW - 10;
    const my = 10;
    const sx = this.mapW / SYS_W;
    const sy = this.mapH / SYS_H;

    const g = this.gfx;
    g.clear();

    // Background
    g.fillStyle(0x000000, 0.7);
    g.fillRect(mx, my, this.mapW, this.mapH);
    g.lineStyle(1, 0x00c8ff, 0.25);
    g.strokeRect(mx, my, this.mapW, this.mapH);

    // Star
    g.fillStyle(Phaser.Display.Color.HexStringToColor(system.star.color).color);
    g.fillCircle(mx + system.star.x * sx, my + system.star.y * sy, 2.5);

    // Planets
    for (const p of system.planets) {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(p.type.color).color);
      g.fillCircle(mx + p.x * sx, my + p.y * sy, 2);
    }

    // Stations
    for (const s of system.stations) {
      g.fillStyle(0xffffff);
      g.fillRect(mx + s.x * sx - 1, my + s.y * sy - 1, 3, 3);
    }

    // Gates
    for (const ga of system.gates) {
      g.fillStyle(ga.isDungeon ? 0xff00ff : 0x00d4ff);
      g.fillCircle(mx + ga.x * sx, my + ga.y * sy, 1.5);
    }

    // Player
    g.fillStyle(0x00ff00);
    g.fillRect(mx + player.x * sx - 2, my + player.y * sy - 2, 4, 4);

    // Viewport indicator
    g.lineStyle(1, 0x00ff00, 0.2);
    g.strokeRect(
      mx + camera.scrollX * sx,
      my + camera.scrollY * sy,
      W * sx,
      H * sy
    );
  }
}
