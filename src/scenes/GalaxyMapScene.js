// ============================================================
// Galaxy Map Scene — universe overview with fog of war
// ============================================================

import Phaser from 'phaser';
import { UNIVERSE_COLS, UNIVERSE_ROWS, REGIONS, DANGER_COLORS } from '../config/constants.js';

export default class GalaxyMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GalaxyMapScene' });
  }

  init(data) {
    this.universe = data.universe;
    this.currentId = data.currentId;
    this.visited = data.visited;
    this.fog = data.fog;
    this.onWarp = data.onWarp; // callback
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a14');

    this.mapOffset = { x: 0, y: 0 };
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.cellW = 160;
    this.cellH = 140;

    // Center map on current system
    const cur = this.universe.find(s => s.id === this.currentId);
    if (cur) {
      this.mapOffset.x = W / 2 - (cur.col + 0.5) * this.cellW;
      this.mapOffset.y = H / 2 - (cur.row + 0.5) * this.cellH;
    }

    this.gfx = this.add.graphics();

    // Title
    this.add.text(W / 2, 24, '\u2B21 GALACTIC CHART', {
      fontSize: '13px', fontFamily: 'monospace', color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.add.text(W / 2, 40, '[M] Close   [Click] Warp to adjacent   [Drag] Pan', {
      fontSize: '9px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    // Input
    this.input.on('pointerdown', (pointer) => {
      this.isDragging = true;
      this.dragStart = { x: pointer.x - this.mapOffset.x, y: pointer.y - this.mapOffset.y };
      this.pointerDownPos = { x: pointer.x, y: pointer.y };
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isDragging) {
        this.mapOffset.x = pointer.x - this.dragStart.x;
        this.mapOffset.y = pointer.y - this.dragStart.y;
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (this.isDragging) {
        const dx = Math.abs(pointer.x - this.pointerDownPos.x);
        const dy = Math.abs(pointer.y - this.pointerDownPos.y);

        // Click (minimal drag)
        if (dx < 5 && dy < 5) {
          this.handleClick(pointer.x, pointer.y);
        }
      }
      this.isDragging = false;
    });

    // M key to close
    this.input.keyboard.on('keydown-M', () => {
      this.closeMap();
    });
    this.input.keyboard.on('keydown-ESC', () => {
      this.closeMap();
    });
  }

  closeMap() {
    this.scene.stop('GalaxyMapScene');
    this.scene.resume('FlightScene');
  }

  handleClick(mx, my) {
    for (const sys of this.universe) {
      if (!this.fog.has(`${sys.col}_${sys.row}`)) continue;
      const sx = (sys.col + 0.5) * this.cellW + this.mapOffset.x;
      const sy = (sys.row + 0.5) * this.cellH + this.mapOffset.y;
      if (Phaser.Math.Distance.Between(mx, my, sx, sy) < 20) {
        const cur = this.universe.find(s => s.id === this.currentId);
        if (cur && cur.connections.includes(sys.id)) {
          this.scene.stop('GalaxyMapScene');
          if (this.onWarp) this.onWarp(sys.id);
        }
        break;
      }
    }
  }

  update() {
    const { width: W, height: H } = this.cameras.main;
    const g = this.gfx;
    g.clear();

    // Grid lines
    g.lineStyle(1, 0x00c8ff, 0.03);
    for (let c = 0; c <= UNIVERSE_COLS; c++) {
      const x = c * this.cellW + this.mapOffset.x;
      g.beginPath(); g.moveTo(x, 50); g.lineTo(x, H); g.strokePath();
    }
    for (let r = 0; r <= UNIVERSE_ROWS; r++) {
      const y = r * this.cellH + this.mapOffset.y;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath();
    }

    // Connections
    for (const s of this.universe) {
      if (!this.fog.has(`${s.col}_${s.row}`)) continue;
      const sx = (s.col + 0.5) * this.cellW + this.mapOffset.x;
      const sy = (s.row + 0.5) * this.cellH + this.mapOffset.y;
      for (const cid of s.connections) {
        const o = this.universe.find(u => u.id === cid);
        if (!o || !this.fog.has(`${o.col}_${o.row}`)) continue;
        g.lineStyle(1, 0x00c8ff, 0.1);
        g.beginPath(); g.moveTo(sx, sy);
        g.lineTo((o.col + 0.5) * this.cellW + this.mapOffset.x,
                 (o.row + 0.5) * this.cellH + this.mapOffset.y);
        g.strokePath();
      }
    }

    // Systems
    for (const s of this.universe) {
      const sx = (s.col + 0.5) * this.cellW + this.mapOffset.x;
      const sy = (s.row + 0.5) * this.cellH + this.mapOffset.y;
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;

      if (!this.fog.has(`${s.col}_${s.row}`)) {
        g.fillStyle(0xffffff, 0.03);
        g.fillCircle(sx, sy, 3);
        continue;
      }

      const isCur = s.id === this.currentId;
      const isVis = this.visited.has(s.id);
      const regionColor = Phaser.Display.Color.HexStringToColor(s.region.color).color;

      // Current system glow
      if (isCur) {
        g.fillStyle(0x00d4ff, 0.15);
        g.fillCircle(sx, sy, 16);
      }

      // System dot
      g.fillStyle(regionColor, isVis ? 1 : 0.45);
      g.fillCircle(sx, sy, isCur ? 9 : 6);

      // Dungeon indicator
      if (s.hasDungeon) {
        g.fillStyle(0xff00ff, 1);
        g.fillCircle(sx + 10, sy - 8, 2.5);
      }

      // Current system ring
      if (isCur) {
        g.lineStyle(1.5, 0x00d4ff, 1);
        g.strokeCircle(sx, sy, 13);
      }
    }

    // Region labels
    const rcx = UNIVERSE_COLS / 2 * this.cellW + this.mapOffset.x;
    const rcy = UNIVERSE_ROWS / 2 * this.cellH + this.mapOffset.y;

    // These are drawn as graphics text equivalent — we'll use scene text objects
    // (created once in create, not here — for perf we just draw the dots/circles)
  }
}
