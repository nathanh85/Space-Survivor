// ============================================================
// Galaxy Map Scene — hex grid universe overview with fog of war
// ============================================================

import Phaser from 'phaser';
import { UNIVERSE_COLS, UNIVERSE_ROWS, RNG } from '../config/constants.js';

const HEX_SIZE = 70;
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_H = HEX_SIZE * 2;

function hexPosition(col, row) {
  const x = col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0);
  const y = row * (HEX_H * 0.75);
  return { x, y };
}

function getHexNeighbors(col, row) {
  const isOdd = row % 2 === 1;
  const offsets = isOdd
    ? [[0, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [1, 1]]
    : [[-1, -1], [0, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]];
  return offsets.map(([dc, dr]) => [col + dc, row + dr]);
}

function drawHexOutline(gfx, cx, cy, size, color, alpha) {
  gfx.lineStyle(1, color, alpha);
  gfx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (i === 0) gfx.moveTo(px, py);
    else gfx.lineTo(px, py);
  }
  gfx.closePath();
  gfx.strokePath();
}

function fillHex(gfx, cx, cy, size, color, alpha) {
  gfx.fillStyle(color, alpha);
  gfx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (i === 0) gfx.moveTo(px, py);
    else gfx.lineTo(px, py);
  }
  gfx.closePath();
  gfx.fillPath();
}

export default class GalaxyMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GalaxyMapScene' });
  }

  init(data) {
    this.universe = data.universe;
    this.currentId = data.currentId;
    this.visited = data.visited;
    this.fog = data.fog;
    this.onWarp = data.onWarp;
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a14');

    this.mapOffset = { x: 0, y: 0 };
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    // Compute seeded offsets for each system
    this.systemOffsets = {};
    for (const s of this.universe) {
      const rng = new RNG(s.seed + 9999);
      this.systemOffsets[s.id] = { x: rng.int(-15, 15), y: rng.int(-15, 15) };
    }

    // Center map on current system
    const cur = this.universe.find(s => s.id === this.currentId);
    if (cur) {
      const hp = hexPosition(cur.col, cur.row);
      const off = this.systemOffsets[cur.id];
      this.mapOffset.x = W / 2 - hp.x - off.x;
      this.mapOffset.y = H / 2 - hp.y - off.y;
    }

    this.gfx = this.add.graphics();

    this.add.text(W / 2, 24, '\u2B21 GALACTIC CHART', {
      fontSize: '14px', fontFamily: 'monospace', color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.add.text(W / 2, 42, '[M] Close   [Click] Warp to adjacent   [Drag] Pan', {
      fontSize: '10px', fontFamily: 'monospace', color: '#555555',
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
        if (dx < 5 && dy < 5) {
          this.handleClick(pointer.x, pointer.y);
        }
      }
      this.isDragging = false;
    });

    this.input.keyboard.on('keydown-M', () => this.closeMap());
    this.input.keyboard.on('keydown-ESC', () => this.closeMap());
  }

  closeMap() {
    this.scene.stop('GalaxyMapScene');
    this.scene.resume('FlightScene');
  }

  getSystemScreenPos(sys) {
    const hp = hexPosition(sys.col, sys.row);
    const off = this.systemOffsets[sys.id] || { x: 0, y: 0 };
    return {
      x: hp.x + off.x + this.mapOffset.x,
      y: hp.y + off.y + this.mapOffset.y,
    };
  }

  handleClick(mx, my) {
    for (const sys of this.universe) {
      if (!this.fog.has(`${sys.col}_${sys.row}`)) continue;
      const pos = this.getSystemScreenPos(sys);
      if (Phaser.Math.Distance.Between(mx, my, pos.x, pos.y) < 22) {
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

    // Draw hex outlines for revealed cells
    for (let r = 0; r < UNIVERSE_ROWS; r++) {
      for (let c = 0; c < UNIVERSE_COLS; c++) {
        const key = `${c}_${r}`;
        if (!this.fog.has(key)) continue;
        const hp = hexPosition(c, r);
        const sx = hp.x + this.mapOffset.x;
        const sy = hp.y + this.mapOffset.y;
        if (sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) continue;
        drawHexOutline(g, sx, sy, HEX_SIZE * 0.95, 0x00c8ff, 0.04);
      }
    }

    // Connections
    for (const s of this.universe) {
      if (!this.fog.has(`${s.col}_${s.row}`)) continue;
      const sp = this.getSystemScreenPos(s);
      for (const cid of s.connections) {
        const o = this.universe.find(u => u.id === cid);
        if (!o || !this.fog.has(`${o.col}_${o.row}`)) continue;
        const op = this.getSystemScreenPos(o);
        g.lineStyle(1, 0x00c8ff, 0.1);
        // Slight curve using quadratic bezier
        const midX = (sp.x + op.x) / 2 + (op.y - sp.y) * 0.08;
        const midY = (sp.y + op.y) / 2 - (op.x - sp.x) * 0.08;
        g.beginPath();
        g.moveTo(sp.x, sp.y);
        // Phaser graphics doesn't have quadratic, use line
        g.lineTo(midX, midY);
        g.lineTo(op.x, op.y);
        g.strokePath();
      }
    }

    // Systems
    for (const s of this.universe) {
      const pos = this.getSystemScreenPos(s);
      if (pos.x < -50 || pos.x > W + 50 || pos.y < -50 || pos.y > H + 50) continue;

      if (!this.fog.has(`${s.col}_${s.row}`)) {
        g.fillStyle(0xffffff, 0.03);
        g.fillCircle(pos.x, pos.y, 3);
        continue;
      }

      const isCur = s.id === this.currentId;
      const isVis = this.visited.has(s.id);
      const regionColor = Phaser.Display.Color.HexStringToColor(s.region.color).color;

      // Subtle region hex fill for visited systems
      if (isVis) {
        const hp = hexPosition(s.col, s.row);
        fillHex(g, hp.x + this.mapOffset.x, hp.y + this.mapOffset.y, HEX_SIZE * 0.9, regionColor, 0.04);
      }

      // Current system glow
      if (isCur) {
        g.fillStyle(0x00d4ff, 0.15);
        g.fillCircle(pos.x, pos.y, 18);
      }

      // System dot — larger for systems with more content
      const dotSize = isCur ? 10 : 7;
      g.fillStyle(regionColor, isVis ? 1 : 0.45);
      g.fillCircle(pos.x, pos.y, dotSize);

      // Dungeon indicator
      if (s.hasDungeon) {
        g.fillStyle(0xff00ff, 1);
        g.fillCircle(pos.x + 12, pos.y - 10, 3);
      }

      // Current system ring
      if (isCur) {
        g.lineStyle(1.5, 0x00d4ff, 1);
        g.strokeCircle(pos.x, pos.y, 15);
      }
    }
  }
}
