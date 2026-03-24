// ============================================================
// Galaxy Map Scene — hex grid universe overview with fog of war
// ============================================================

import Phaser from 'phaser';
import { UNIVERSE_COLS, UNIVERSE_ROWS, RNG, FONT } from '../config/constants.js';

const HEX_SIZE = 70;
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_H = HEX_SIZE * 2;

function hexPosition(col, row) {
  const x = col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0);
  const y = row * (HEX_H * 0.75);
  return { x, y };
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

function pointInHex(px, py, cx, cy, size) {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  if (dx > size * Math.sqrt(3) / 2 || dy > size) return false;
  return size * Math.sqrt(3) / 2 - dx > (dy - size / 2) * Math.sqrt(3) / 2;
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
    this.hoveredSystem = null;

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

    // System name labels (created once, updated each frame)
    this._sysLabels = {};
    for (const s of this.universe) {
      const label = this.add.text(0, 0, s.name || '', {
        fontSize: '6px', fontFamily: FONT, color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setDepth(6).setVisible(false);
      this._sysLabels[s.id] = label;
    }

    // Danger dots (per system)
    this._dangerDots = {};

    this.add.text(W / 2, 24, '\u2B21 GALACTIC CHART', {
      fontSize: '14px', fontFamily: FONT, color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.add.text(W / 2, 42, '[M] Close   [Click hex] Warp   [Drag] Pan', {
      fontSize: '10px', fontFamily: FONT, color: '#555555',
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
      // Hover detection
      this.hoveredSystem = this.findSystemAtPoint(pointer.x, pointer.y);
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

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.input.keyboard.on('keydown-M', () => this.closeMap());
    this.input.keyboard.on('keydown-ESC', () => this.closeMap());
  }

  closeMap() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('GalaxyMapScene');
      this.scene.resume('FlightScene');
    });
  }

  getSystemScreenPos(sys) {
    const hp = hexPosition(sys.col, sys.row);
    const off = this.systemOffsets[sys.id] || { x: 0, y: 0 };
    return {
      x: hp.x + off.x + this.mapOffset.x,
      y: hp.y + off.y + this.mapOffset.y,
    };
  }

  getHexScreenPos(col, row) {
    const hp = hexPosition(col, row);
    return {
      x: hp.x + this.mapOffset.x,
      y: hp.y + this.mapOffset.y,
    };
  }

  findSystemAtPoint(mx, my) {
    for (const sys of this.universe) {
      if (!this.fog.has(`${sys.col}_${sys.row}`)) continue;
      const hp = this.getHexScreenPos(sys.col, sys.row);
      if (pointInHex(mx, my, hp.x, hp.y, HEX_SIZE * 0.95)) return sys;
    }
    return null;
  }

  handleClick(mx, my) {
    const clicked = this.findSystemAtPoint(mx, my);
    if (!clicked) return;

    const cur = this.universe.find(s => s.id === this.currentId);
    if (cur && cur.connections.includes(clicked.id)) {
      this.scene.stop('GalaxyMapScene');
      if (this.onWarp) this.onWarp(clicked.id);
    }
  }

  update() {
    const { width: W, height: H } = this.cameras.main;
    const g = this.gfx;
    g.clear();

    // Draw hex outlines + region fills
    for (let r = 0; r < UNIVERSE_ROWS; r++) {
      for (let c = 0; c < UNIVERSE_COLS; c++) {
        const hp = this.getHexScreenPos(c, r);
        if (hp.x < -100 || hp.x > W + 100 || hp.y < -100 || hp.y > H + 100) continue;

        const isRevealed = this.fog.has(`${c}_${r}`);
        const dist = Math.sqrt((c - UNIVERSE_COLS / 2) ** 2 + (r - UNIVERSE_ROWS / 2) ** 2);
        let regionColor = 0x2ecc71;
        if (dist >= 6) regionColor = 0x8e44ad;
        else if (dist >= 4.5) regionColor = 0xe74c3c;
        else if (dist >= 2.5) regionColor = 0xf39c12;

        if (isRevealed) {
          fillHex(g, hp.x, hp.y, HEX_SIZE * 0.9, regionColor, 0.04);
          drawHexOutline(g, hp.x, hp.y, HEX_SIZE * 0.95, 0x00c8ff, 0.08);
        } else {
          drawHexOutline(g, hp.x, hp.y, HEX_SIZE * 0.95, 0xffffff, 0.03);
        }
      }
    }

    // Region labels
    const rcx = (UNIVERSE_COLS / 2) * HEX_W + this.mapOffset.x;
    const rcy = (UNIVERSE_ROWS / 2) * (HEX_H * 0.75) + this.mapOffset.y;
    if (!this._regionLabels) {
      this._regionLabels = [
        this.add.text(0, 0, 'CORE WORLDS', { fontSize: '12px', fontFamily: FONT, color: '#2ecc71' }).setOrigin(0.5).setAlpha(0.2).setDepth(5),
        this.add.text(0, 0, 'FRONTIER', { fontSize: '12px', fontFamily: FONT, color: '#f39c12' }).setOrigin(0.5).setAlpha(0.2).setDepth(5),
        this.add.text(0, 0, 'OUTER RIM', { fontSize: '12px', fontFamily: FONT, color: '#e74c3c' }).setOrigin(0.5).setAlpha(0.2).setDepth(5),
        this.add.text(0, 0, 'THE RIFT', { fontSize: '12px', fontFamily: FONT, color: '#8e44ad' }).setOrigin(0.5).setAlpha(0.2).setDepth(5),
      ];
    }
    this._regionLabels[0].setPosition(rcx, rcy - 50);
    this._regionLabels[1].setPosition(rcx + 300, rcy + 50);
    this._regionLabels[2].setPosition(rcx - 300, rcy + 200);
    this._regionLabels[3].setPosition(rcx + 300, rcy + 300);

    // Connections
    for (const s of this.universe) {
      if (!this.fog.has(`${s.col}_${s.row}`)) continue;
      const sp = this.getSystemScreenPos(s);
      for (const cid of s.connections) {
        const o = this.universe.find(u => u.id === cid);
        if (!o || !this.fog.has(`${o.col}_${o.row}`)) continue;
        const op = this.getSystemScreenPos(o);
        g.lineStyle(1, 0x00c8ff, 0.1);
        const midX = (sp.x + op.x) / 2 + (op.y - sp.y) * 0.08;
        const midY = (sp.y + op.y) / 2 - (op.x - sp.x) * 0.08;
        g.beginPath();
        g.moveTo(sp.x, sp.y);
        g.lineTo(midX, midY);
        g.lineTo(op.x, op.y);
        g.strokePath();
      }
    }

    // Systems + labels
    const curSys = this.universe.find(s => s.id === this.currentId);

    for (const s of this.universe) {
      const pos = this.getSystemScreenPos(s);
      const label = this._sysLabels[s.id];
      if (pos.x < -50 || pos.x > W + 50 || pos.y < -50 || pos.y > H + 50) {
        if (label) label.setVisible(false);
        continue;
      }

      if (!this.fog.has(`${s.col}_${s.row}`)) {
        g.fillStyle(0xffffff, 0.03);
        g.fillCircle(pos.x, pos.y, 3);
        if (label) label.setVisible(false);
        continue;
      }

      const isCur = s.id === this.currentId;
      const isVis = this.visited.has(s.id);
      const isHov = this.hoveredSystem && this.hoveredSystem.id === s.id;
      const isAdj = curSys && curSys.connections.includes(s.id);
      const regionColor = Phaser.Display.Color.HexStringToColor(s.region.color).color;

      // Hovered hex highlight
      if (isHov) {
        const hp = this.getHexScreenPos(s.col, s.row);
        fillHex(g, hp.x, hp.y, HEX_SIZE * 0.9, 0x00d4ff, isAdj ? 0.12 : 0.06);
        drawHexOutline(g, hp.x, hp.y, HEX_SIZE * 0.95, 0x00d4ff, isAdj ? 0.5 : 0.2);
      }

      // Current system glow
      if (isCur) {
        g.fillStyle(0x00d4ff, 0.15);
        g.fillCircle(pos.x, pos.y, 18);
      }

      // System dot
      const dotSize = isCur ? 8 : 5;
      g.fillStyle(regionColor, isVis ? 1 : 0.45);
      g.fillCircle(pos.x, pos.y, dotSize);

      // Danger dots (colored pips below name)
      const danger = s.danger || 1;
      const dotCount = Math.min(danger, 10);
      const dotY = pos.y + 18;
      const dotSpacing = 4;
      const dotStartX = pos.x - (dotCount - 1) * dotSpacing / 2;
      for (let d = 0; d < dotCount; d++) {
        let dotColor = 0x2ecc71; // green
        if (danger >= 7) dotColor = 0xe74c3c;      // red
        else if (danger >= 4) dotColor = 0xf39c12;  // orange
        g.fillStyle(dotColor, isVis ? 0.8 : 0.3);
        g.fillCircle(dotStartX + d * dotSpacing, dotY, 1.5);
      }

      // Dungeon indicator
      if (s.hasDungeon) {
        g.fillStyle(0xff00ff, 0.8);
        g.fillCircle(pos.x + 14, pos.y - 12, 3);
      }

      // Current system ring
      if (isCur) {
        g.lineStyle(1.5, 0x00d4ff, 1);
        g.strokeCircle(pos.x, pos.y, 13);
      }

      // System name label
      if (label) {
        label.setPosition(pos.x, pos.y + 10);
        label.setVisible(true);
        label.setAlpha(isVis ? 0.7 : 0.3);
        if (isCur) {
          label.setColor('#00d4ff');
          label.setAlpha(1);
        } else {
          label.setColor('#ffffff');
        }
      }
    }
  }
}
