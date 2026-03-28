// ============================================================
// Galaxy Map Scene — hex grid universe overview with fog of war
// v0.6.0: 3-tier fog, service icons, legend, hover tooltip
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

function drawHexOutline(gfx, cx, cy, size, color, alpha, lineWidth) {
  gfx.lineStyle(lineWidth || 1, color, alpha);
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

const REGION_COLORS_HEX = { CORE: 0x2ecc71, FRONT: 0xf39c12, OUTER: 0xe74c3c, RIFT: 0x9b59b6 };
const REGION_COLORS_STR = { CORE: '#2ecc71', FRONT: '#f39c12', OUTER: '#e74c3c', RIFT: '#9b59b6' };

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
    this.startingSystemId = data.startingSystemId || null;
    this.clearedSystems = data.clearedSystems || [];
    this.questManager = data.questManager || null;
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a14');

    this.mapOffset = { x: 0, y: 0 };
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.hoveredSystem = null;

    // Compute visible systems: visited + 1-hop neighbors of visited + hub always
    this.visibleSystems = new Set();
    for (const s of this.universe) {
      if (this.visited.has(s.id)) {
        this.visibleSystems.add(s.id);
        for (const cid of s.connections) this.visibleSystems.add(cid);
      }
    }
    if (this.startingSystemId) this.visibleSystems.add(this.startingSystemId);

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

    // System name labels
    this._sysLabels = {};
    for (const s of this.universe) {
      const label = this.add.text(0, 0, s.name || '', {
        fontSize: '10px', fontFamily: FONT, color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setDepth(6).setVisible(false);
      this._sysLabels[s.id] = label;
    }

    // Service icon labels
    this._sysIcons = {};
    for (const s of this.universe) {
      const icon = this.add.text(0, 0, '', {
        fontSize: '8px', fontFamily: FONT, color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setDepth(7).setVisible(false);
      this._sysIcons[s.id] = icon;
    }

    // Title bar
    this.add.text(W / 2, 24, '\u2B21 GALACTIC CHART', {
      fontSize: '14px', fontFamily: FONT, color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.add.text(W / 2, 42, '[M] Close   [Click hex] Warp   [Drag] Pan', {
      fontSize: '10px', fontFamily: FONT, color: '#555555',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    // Legend panel (top-right)
    this._buildLegend(W);

    // Tooltip container
    this.tooltipGfx = this.add.graphics().setDepth(20);
    this.tooltipTexts = [];

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
    this.input.keyboard.on('keydown-TAB', (e) => {
      e.preventDefault();
      this.closeMap();
      this.time.delayedCall(100, () => {
        const flight = this.scene.get('FlightScene');
        if (flight && flight.toggleInventory) flight.toggleInventory();
      });
    });
  }

  _buildLegend(W) {
    const lx = W - 160, ly = 60;
    const lg = this.add.graphics().setDepth(15);
    lg.fillStyle(0x000000, 0.7);
    lg.fillRect(lx, ly, 150, 100);
    lg.lineStyle(1, 0x444444, 0.5);
    lg.strokeRect(lx, ly, 150, 100);

    const items = [
      { icon: '\u2302', color: '#2ecc71', text: 'Hub' },
      { icon: '\u25C6', color: '#00d4ff', text: 'Station' },
      { icon: '\u2694', color: '#e74c3c', text: 'Danger 4+' },
      { icon: '\u2605', color: '#f1c40f', text: 'Quest' },
      { icon: '\u2713', color: '#558855', text: 'Cleared' },
    ];
    for (let i = 0; i < items.length; i++) {
      this.add.text(lx + 10, ly + 8 + i * 18, items[i].icon, {
        fontSize: '9px', fontFamily: FONT, color: items[i].color,
      }).setDepth(16);
      this.add.text(lx + 26, ly + 8 + i * 18, items[i].text, {
        fontSize: '9px', fontFamily: FONT, color: '#888',
      }).setDepth(16);
    }
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
    return { x: hp.x + off.x + this.mapOffset.x, y: hp.y + off.y + this.mapOffset.y };
  }

  getHexScreenPos(col, row) {
    const hp = hexPosition(col, row);
    return { x: hp.x + this.mapOffset.x, y: hp.y + this.mapOffset.y };
  }

  findSystemAtPoint(mx, my) {
    for (const sys of this.universe) {
      if (!this.visibleSystems.has(sys.id)) continue;
      const hp = this.getHexScreenPos(sys.col, sys.row);
      if (pointInHex(mx, my, hp.x, hp.y, HEX_SIZE * 0.95)) return sys;
    }
    return null;
  }

  handleClick(mx, my) {
    const clicked = this.findSystemAtPoint(mx, my);
    if (!clicked) return;

    const cur = this.universe.find(s => s.id === this.currentId);
    if (!cur || !cur.connections.includes(clicked.id)) return;

    // v0.6.4.2: Same warp lock as the physical gate
    if (this.questManager) {
      const done = this.questManager.completedQuests.includes('quest_supply_run');
      if (!done) {
        this.scene.stop('GalaxyMapScene');
        const active = this.questManager.activeQuests.some(q => q.id === 'quest_supply_run');
        if (this.onWarp) this.onWarp(null, active ? 'active' : 'inactive');
        return;
      }
    }

    this.scene.stop('GalaxyMapScene');
    if (this.onWarp) this.onWarp(clicked.id);
  }

  _getSystemTier(sys) {
    if (this.visited.has(sys.id)) return 'VISITED';
    if (this.visibleSystems.has(sys.id)) return 'ADJACENT';
    return 'HIDDEN';
  }

  _getServiceIcons(sys) {
    const icons = [];
    if (sys.id === this.startingSystemId) icons.push({ char: '\u2302', color: '#2ecc71' });
    if (sys.hasStation) icons.push({ char: '\u25C6', color: '#00d4ff' });
    if (sys.danger >= 4) icons.push({ char: '\u2694', color: '#e74c3c' });
    // Quest available
    if (this.questManager) {
      const available = this.questManager.getAvailableQuestForNPC && this.questManager.activeQuests;
      // Simple check: if any active quest has objectives incomplete
      if (this.questManager.activeQuests.length > 0) {
        icons.push({ char: '\u2605', color: '#f1c40f' });
      }
    }
    if (this.clearedSystems.includes(sys.id)) icons.push({ char: '\u2713', color: '#558855' });
    return icons;
  }

  update() {
    const { width: W, height: H } = this.cameras.main;
    const g = this.gfx;
    g.clear();

    const curSys = this.universe.find(s => s.id === this.currentId);

    // Draw hex grid
    for (let r = 0; r < UNIVERSE_ROWS; r++) {
      for (let c = 0; c < UNIVERSE_COLS; c++) {
        const hp = this.getHexScreenPos(c, r);
        if (hp.x < -100 || hp.x > W + 100 || hp.y < -100 || hp.y > H + 100) continue;

        // Find system at this hex cell
        const sys = this.universe.find(s => s.col === c && s.row === r);
        const tier = sys ? this._getSystemTier(sys) : 'HIDDEN';

        const dist = Math.sqrt((c - UNIVERSE_COLS / 2) ** 2 + (r - UNIVERSE_ROWS / 2) ** 2);
        let regionColor = 0x2ecc71;
        if (dist >= 6) regionColor = 0x8e44ad;
        else if (dist >= 4.5) regionColor = 0xe74c3c;
        else if (dist >= 2.5) regionColor = 0xf39c12;

        if (tier === 'VISITED') {
          fillHex(g, hp.x, hp.y, HEX_SIZE * 0.9, regionColor, 0.12);
          drawHexOutline(g, hp.x, hp.y, HEX_SIZE * 0.95, 0x00c8ff, 0.3, 1.5);
        } else if (tier === 'ADJACENT') {
          fillHex(g, hp.x, hp.y, HEX_SIZE * 0.9, regionColor, 0.04);
          drawHexOutline(g, hp.x, hp.y, HEX_SIZE * 0.95, 0x00c8ff, 0.1, 1);
        } else {
          drawHexOutline(g, hp.x, hp.y, HEX_SIZE * 0.95, 0xffffff, 0.05, 1);
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
      const sTier = this._getSystemTier(s);
      if (sTier === 'HIDDEN') continue;
      const sp = this.getSystemScreenPos(s);
      const isConnectedToCurrent = curSys && (curSys.id === s.id || curSys.connections.includes(s.id));
      for (const cid of s.connections) {
        const o = this.universe.find(u => u.id === cid);
        if (!o) continue;
        const oTier = this._getSystemTier(o);
        if (oTier === 'HIDDEN') continue;
        const op = this.getSystemScreenPos(o);

        // Brightness based on whether connected to current
        const isCurrentConnection = curSys && (
          (curSys.id === s.id && curSys.connections.includes(o.id)) ||
          (curSys.id === o.id && curSys.connections.includes(s.id))
        );
        if (isCurrentConnection) {
          g.lineStyle(1.5, 0x00c8ff, 0.5);
        } else if (sTier === 'VISITED' && oTier === 'VISITED') {
          g.lineStyle(1, 0x00c8ff, 0.15);
        } else {
          continue; // Don't draw connections to unvisited
        }
        g.beginPath();
        g.moveTo(sp.x, sp.y);
        g.lineTo(op.x, op.y);
        g.strokePath();
      }
    }

    // Systems + labels + icons
    for (const s of this.universe) {
      const tier = this._getSystemTier(s);
      const pos = this.getSystemScreenPos(s);
      const label = this._sysLabels[s.id];
      const iconLabel = this._sysIcons[s.id];

      if (pos.x < -50 || pos.x > W + 50 || pos.y < -50 || pos.y > H + 50) {
        if (label) label.setVisible(false);
        if (iconLabel) iconLabel.setVisible(false);
        continue;
      }

      if (tier === 'HIDDEN') {
        g.fillStyle(0xffffff, 0.03);
        g.fillCircle(pos.x, pos.y, 2);
        if (label) label.setVisible(false);
        if (iconLabel) iconLabel.setVisible(false);
        continue;
      }

      const isCur = s.id === this.currentId;
      const isVis = this.visited.has(s.id);
      const isHov = this.hoveredSystem && this.hoveredSystem.id === s.id;
      const isAdj = curSys && curSys.connections.includes(s.id);
      const regionColor = REGION_COLORS_HEX[s.region.key] || 0x2ecc71;
      const regionColorStr = REGION_COLORS_STR[s.region.key] || '#2ecc71';

      // Hovered hex highlight
      if (isHov) {
        const hp = this.getHexScreenPos(s.col, s.row);
        fillHex(g, hp.x, hp.y, HEX_SIZE * 0.9, 0x00d4ff, isAdj ? 0.12 : 0.06);
        drawHexOutline(g, hp.x, hp.y, HEX_SIZE * 0.95, 0x00d4ff, isAdj ? 0.5 : 0.2, 1.5);
      }

      // Current system pulse
      if (isCur) {
        const hp = this.getHexScreenPos(s.col, s.row);
        const pulseAlpha = 0.1 + Math.sin(this.time.now * 0.003) * 0.05;
        fillHex(g, hp.x, hp.y, HEX_SIZE * 0.9, 0x00d4ff, pulseAlpha);

        const glowPulse = 0.12 + Math.sin(this.time.now * 0.003) * 0.06;
        g.fillStyle(0x00d4ff, glowPulse);
        g.fillCircle(pos.x, pos.y, 22);
        g.fillStyle(0x00d4ff, glowPulse * 0.5);
        g.fillCircle(pos.x, pos.y, 30);
      }

      // System dot
      const numPlanets = s.numPlanets || 2;
      const baseDot = 3 + Math.min(numPlanets, 5);
      const dotSize = isCur ? baseDot + 3 : baseDot;
      g.fillStyle(regionColor, isVis ? 1 : 0.45);
      g.fillCircle(pos.x, pos.y, dotSize);

      // Station indicator
      if (s.hasStation && isVis) {
        g.fillStyle(0x00d4ff, 0.6);
        g.fillRect(pos.x - dotSize - 6, pos.y - 2, 4, 4);
      }

      // Current system ring
      if (isCur) {
        g.lineStyle(1.5, 0x00d4ff, 1);
        g.strokeCircle(pos.x, pos.y, 13);
      }

      // System name label
      if (label) {
        label.setPosition(pos.x, pos.y + dotSize + 8).setVisible(true);
        if (isCur) {
          label.setColor('#ffffff');
          const pulse = 0.8 + Math.sin(this.time.now * 0.004) * 0.2;
          label.setAlpha(pulse);
        } else if (isVis) {
          label.setColor(regionColorStr);
          label.setAlpha(1.0);
        } else {
          // Adjacent — dim name with "?"
          label.setColor(regionColorStr);
          label.setAlpha(0.5);
        }
      }

      // Service icons (only for visited systems)
      if (iconLabel) {
        if (isVis) {
          const icons = this._getServiceIcons(s);
          if (icons.length > 0) {
            iconLabel.setText(icons.map(i => i.char).join(' '));
            // Use the color of the first icon
            iconLabel.setColor(icons[0].color);
            iconLabel.setPosition(pos.x, pos.y + dotSize + 22).setVisible(true);
          } else {
            iconLabel.setVisible(false);
          }
        } else {
          // Adjacent: show "?" icon
          iconLabel.setText('?');
          iconLabel.setColor('#666666');
          iconLabel.setPosition(pos.x, pos.y + dotSize + 22).setVisible(true);
        }
      }
    }

    // Hub marker
    if (this.startingSystemId) {
      const hubSys = this.universe.find(s => s.id === this.startingSystemId);
      if (hubSys && this.visibleSystems.has(hubSys.id)) {
        const hp = this.getSystemScreenPos(hubSys);
        // Green diamond marker
        g.fillStyle(0x2ecc71, 0.9);
        g.beginPath();
        g.moveTo(hp.x, hp.y + 22);
        g.lineTo(hp.x + 5, hp.y + 27);
        g.lineTo(hp.x, hp.y + 32);
        g.lineTo(hp.x - 5, hp.y + 27);
        g.closePath();
        g.fillPath();
        if (!this._hubLabel) {
          this._hubLabel = this.add.text(0, 0, 'THE OUTPOST', {
            fontSize: '8px', fontFamily: FONT, color: '#2ecc71', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(7).setAlpha(0.9);
        }
        this._hubLabel.setPosition(hp.x, hp.y + 40).setVisible(true);
      }
    }

    // Hover tooltip
    this._drawTooltip(W, H);
  }

  _drawTooltip(W, H) {
    this.tooltipGfx.clear();
    for (const t of this.tooltipTexts) t.destroy();
    this.tooltipTexts = [];

    if (!this.hoveredSystem) return;
    const sys = this.hoveredSystem;
    const pos = this.getSystemScreenPos(sys);
    const isVis = this.visited.has(sys.id);

    const tx = pos.x + 40;
    const ty = Math.min(pos.y - 20, H - 120);
    const tw = 180;

    if (isVis) {
      const lines = [
        sys.name,
        'Region: ' + sys.region.name,
        'Danger: ' + sys.danger + '/10',
        sys.hasStation ? 'Station: Yes' : '',
        this.clearedSystems.includes(sys.id) ? 'Status: CLEARED' :
          sys.danger <= 2 ? 'Status: Safe' :
          sys.danger <= 4 ? 'Status: Contested' :
          sys.danger <= 7 ? 'Status: Hostile' : 'Status: Deadly',
      ].filter(l => l);
      const th = 14 + lines.length * 16;

      this.tooltipGfx.fillStyle(0x0a0a1a, 0.92);
      this.tooltipGfx.fillRect(tx, ty, tw, th);
      this.tooltipGfx.lineStyle(1, 0x00d4ff, 0.4);
      this.tooltipGfx.strokeRect(tx, ty, tw, th);

      for (let i = 0; i < lines.length; i++) {
        const color = i === 0 ? '#00d4ff' : '#aaa';
        const t = this.add.text(tx + 8, ty + 6 + i * 16, lines[i], {
          fontSize: '9px', fontFamily: FONT, color: color,
        }).setDepth(21);
        this.tooltipTexts.push(t);
      }
    } else {
      // Adjacent/unknown
      const th = 30;
      this.tooltipGfx.fillStyle(0x0a0a1a, 0.92);
      this.tooltipGfx.fillRect(tx, ty, tw, th);
      this.tooltipGfx.lineStyle(1, 0x444444, 0.4);
      this.tooltipGfx.strokeRect(tx, ty, tw, th);

      const t = this.add.text(tx + 8, ty + 8, 'UNEXPLORED', {
        fontSize: '9px', fontFamily: FONT, color: '#666',
      }).setDepth(21);
      this.tooltipTexts.push(t);
    }
  }
}
