// ============================================================
// Galaxy Map Scene — 49-system hex universe with fog of war
// v0.7.b: Axial hex coords from JSON, portal locks
// ============================================================

import Phaser from 'phaser';
import { RNG, FONT, HEX_NEIGHBORS } from '../config/constants.js';

const HEX_SIZE = 42;

// Axial hex to pixel (pointy-top)
function hexToPixel(q, r) {
  const x = HEX_SIZE * (3 / 2 * q);
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
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

// Make a sorted portal key from two system IDs
function portalKey(idA, idB) {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

export default class GalaxyMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GalaxyMapScene' });
  }

  init(data) {
    this.universe = data.universe;
    this.currentId = data.currentId;
    this.visited = data.visited;
    this.fog = data.fog;             // Set of visible system IDs
    this.onWarp = data.onWarp;
    this.startingSystemId = data.startingSystemId || null;
    this.clearedSystems = data.clearedSystems || [];
    this.questManager = data.questManager || null;
    this.checkWarpLock = data.checkWarpLock || (() => null);
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a14');

    this.mapOffset = { x: 0, y: 0 };
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.hoveredSystem = null;

    // Visible systems: visited + 1-hop neighbors of visited + starting system
    this.visibleSystems = new Set();
    for (const s of this.universe) {
      if (this.visited.has(s.id)) {
        this.visibleSystems.add(s.id);
        for (const cid of s.connections) this.visibleSystems.add(cid);
      }
    }
    if (this.startingSystemId) this.visibleSystems.add(this.startingSystemId);
    // Also add anything in fog set
    if (this.fog) {
      for (const id of this.fog) this.visibleSystems.add(id);
    }

    // Center map on current system
    const cur = this.universe.find(s => s.id === this.currentId);
    if (cur) {
      const hp = hexToPixel(cur.q, cur.r);
      this.mapOffset.x = W / 2 - hp.x;
      this.mapOffset.y = H / 2 - hp.y;
    }

    this.gfx = this.add.graphics();

    // System name labels
    this._sysLabels = {};
    for (const s of this.universe) {
      this._sysLabels[s.id] = this.add.text(0, 0, s.name || '', {
        fontSize: '7px', fontFamily: FONT, color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setDepth(6).setVisible(false);
    }

    // Service icon labels
    this._sysIcons = {};
    for (const s of this.universe) {
      this._sysIcons[s.id] = this.add.text(0, 0, '', {
        fontSize: '6px', fontFamily: FONT, color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setDepth(7).setVisible(false);
    }

    // Title bar
    this.add.text(W / 2, 24, '\u2B21 GALACTIC CHART', {
      fontSize: '14px', fontFamily: FONT, color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
    this.add.text(W / 2, 42, '[M] Close   [Click hex] Warp   [Drag] Pan', {
      fontSize: '10px', fontFamily: FONT, color: '#555555',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    // Legend
    this._buildLegend(W);

    // Tooltip
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
        if (dx < 5 && dy < 5) this.handleClick(pointer.x, pointer.y);
      }
      this.isDragging = false;
    });

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.input.keyboard.on('keydown-M', () => this.closeMap());
    this.input.keyboard.on('keydown-ESC', () => this.closeMap());
    const openInv = () => {
      this.closeMap();
      this.time.delayedCall(100, () => {
        const flight = this.scene.get('FlightScene');
        if (flight && flight.toggleInventory) flight.toggleInventory();
      });
    };
    this.input.keyboard.on('keydown-TAB', (e) => { e.preventDefault(); openInv(); });
    this.input.keyboard.on('keydown-I', openInv);
  }

  _buildLegend(W) {
    const lx = W - 160, ly = 60;
    const lg = this.add.graphics().setDepth(15);
    lg.fillStyle(0x000000, 0.7);
    lg.fillRect(lx, ly, 150, 120);
    lg.lineStyle(1, 0x444444, 0.5);
    lg.strokeRect(lx, ly, 150, 120);
    const items = [
      { icon: '\u2302', color: '#2ecc71', text: 'Hub' },
      { icon: '\u25C6', color: '#00d4ff', text: 'Station' },
      { icon: '\u2694', color: '#e74c3c', text: 'Danger 4+' },
      { icon: '\uD83D\uDD12', color: '#ff4444', text: 'Locked' },
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
    const hp = hexToPixel(sys.q, sys.r);
    return { x: hp.x + this.mapOffset.x, y: hp.y + this.mapOffset.y };
  }

  findSystemAtPoint(mx, my) {
    for (const sys of this.universe) {
      if (!this.visibleSystems.has(sys.id)) continue;
      const pos = this.getSystemScreenPos(sys);
      if (pointInHex(mx, my, pos.x, pos.y, HEX_SIZE * 0.95)) return sys;
    }
    return null;
  }

  isLocked(fromId, toId) {
    return !!this.checkWarpLock(fromId, toId);
  }

  handleClick(mx, my) {
    const clicked = this.findSystemAtPoint(mx, my);
    if (!clicked) return;

    const cur = this.universe.find(s => s.id === this.currentId);
    if (!cur || !cur.connections.includes(clicked.id)) return;

    // Quest warp lock (Supply Run)
    if (this.questManager) {
      const done = this.questManager.completedQuests.includes('quest_supply_run');
      if (!done) {
        this.scene.stop('GalaxyMapScene');
        const active = this.questManager.activeQuests.some(q => q.id === 'quest_supply_run');
        if (this.onWarp) this.onWarp(null, active ? 'active' : 'inactive');
        return;
      }
    }

    // Portal lock check — pass lock object (has bark text)
    const lock = this.checkWarpLock(cur.id, clicked.id);
    if (lock) {
      this.scene.stop('GalaxyMapScene');
      if (this.onWarp) this.onWarp(null, lock);
      return;
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
    if (sys.station === 'hub') icons.push({ char: '\u2302', color: '#2ecc71' });
    if (sys.station && sys.station !== 'none') icons.push({ char: '\u25C6', color: '#00d4ff' });
    if (sys.danger >= 4) icons.push({ char: '\u2694', color: '#e74c3c' });
    if (this.questManager && this.questManager.activeQuests.length > 0) {
      icons.push({ char: '\u2605', color: '#f1c40f' });
    }
    if (this.clearedSystems.includes(sys.id)) icons.push({ char: '\u2713', color: '#558855' });
    return icons;
  }

  update() {
    const { width: W, height: H } = this.cameras.main;
    const g = this.gfx;
    g.clear();

    const curSys = this.universe.find(s => s.id === this.currentId);

    // Draw hexes for each system
    for (const sys of this.universe) {
      const pos = this.getSystemScreenPos(sys);
      if (pos.x < -80 || pos.x > W + 80 || pos.y < -80 || pos.y > H + 80) continue;

      const tier = this._getSystemTier(sys);
      const regionColor = REGION_COLORS_HEX[sys.region.key] || 0x2ecc71;

      if (tier === 'VISITED') {
        fillHex(g, pos.x, pos.y, HEX_SIZE * 0.9, regionColor, 0.12);
        drawHexOutline(g, pos.x, pos.y, HEX_SIZE * 0.95, 0x00c8ff, 0.3, 1.5);
      } else if (tier === 'ADJACENT') {
        fillHex(g, pos.x, pos.y, HEX_SIZE * 0.9, regionColor, 0.04);
        drawHexOutline(g, pos.x, pos.y, HEX_SIZE * 0.95, 0x00c8ff, 0.1, 1);
      } else {
        // Hidden — barely visible outline
        drawHexOutline(g, pos.x, pos.y, HEX_SIZE * 0.95, 0xffffff, 0.03, 1);
      }
    }

    // Connection lines
    const drawnConnections = new Set();
    for (const s of this.universe) {
      const sTier = this._getSystemTier(s);
      if (sTier === 'HIDDEN') continue;
      const sp = this.getSystemScreenPos(s);
      for (const cid of s.connections) {
        const key = portalKey(s.id, cid);
        if (drawnConnections.has(key)) continue;
        drawnConnections.add(key);

        const o = this.universe.find(u => u.id === cid);
        if (!o) continue;
        const oTier = this._getSystemTier(o);
        if (oTier === 'HIDDEN') continue;
        const op = this.getSystemScreenPos(o);

        const locked = this.isLocked(s.id, cid);
        const isCurrentConn = curSys && (
          (curSys.id === s.id && curSys.connections.includes(o.id)) ||
          (curSys.id === o.id && curSys.connections.includes(s.id))
        );

        if (locked) {
          // Red dashed line for locked portals
          g.lineStyle(1.5, 0xff4444, 0.4);
          const dx = op.x - sp.x, dy = op.y - sp.y;
          const len = Math.hypot(dx, dy);
          const dashLen = 6;
          for (let d = 0; d < len; d += dashLen * 2) {
            const t1 = d / len, t2 = Math.min((d + dashLen) / len, 1);
            g.beginPath();
            g.moveTo(sp.x + dx * t1, sp.y + dy * t1);
            g.lineTo(sp.x + dx * t2, sp.y + dy * t2);
            g.strokePath();
          }
        } else if (isCurrentConn) {
          g.lineStyle(1.5, 0x00c8ff, 0.5);
          g.beginPath(); g.moveTo(sp.x, sp.y); g.lineTo(op.x, op.y); g.strokePath();
        } else if (sTier === 'VISITED' && oTier === 'VISITED') {
          g.lineStyle(1, 0x00c8ff, 0.15);
          g.beginPath(); g.moveTo(sp.x, sp.y); g.lineTo(op.x, op.y); g.strokePath();
        }
      }
    }

    // System dots, labels, icons
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

      // Hover highlight
      if (isHov) {
        fillHex(g, pos.x, pos.y, HEX_SIZE * 0.9, 0x00d4ff, isAdj ? 0.12 : 0.06);
        drawHexOutline(g, pos.x, pos.y, HEX_SIZE * 0.95, 0x00d4ff, isAdj ? 0.5 : 0.2, 1.5);
      }

      // Current system pulse
      if (isCur) {
        const pulseAlpha = 0.1 + Math.sin(this.time.now * 0.003) * 0.05;
        fillHex(g, pos.x, pos.y, HEX_SIZE * 0.9, 0x00d4ff, pulseAlpha);
        const glow = 0.12 + Math.sin(this.time.now * 0.003) * 0.06;
        g.fillStyle(0x00d4ff, glow);
        g.fillCircle(pos.x, pos.y, 14);
      }

      // System dot
      const dotSize = isCur ? 8 : 5;
      g.fillStyle(regionColor, isVis ? 1 : 0.45);
      g.fillCircle(pos.x, pos.y, dotSize);

      // Current ring
      if (isCur) {
        g.lineStyle(1.5, 0x00d4ff, 1);
        g.strokeCircle(pos.x, pos.y, 10);
      }

      // Name label
      if (label) {
        label.setPosition(pos.x, pos.y + dotSize + 6).setVisible(true);
        if (isCur) {
          label.setColor('#ffffff');
          label.setAlpha(0.8 + Math.sin(this.time.now * 0.004) * 0.2);
        } else if (isVis) {
          label.setColor(regionColorStr).setAlpha(1.0);
        } else {
          label.setColor(regionColorStr).setAlpha(0.5);
        }
      }

      // Service icons (visited only)
      if (iconLabel) {
        if (isVis) {
          const icons = this._getServiceIcons(s);
          if (icons.length > 0) {
            iconLabel.setText(icons.map(i => i.char).join(' '));
            iconLabel.setColor(icons[0].color);
            iconLabel.setPosition(pos.x, pos.y + dotSize + 18).setVisible(true);
          } else {
            iconLabel.setVisible(false);
          }
        } else {
          iconLabel.setText('?').setColor('#666666');
          iconLabel.setPosition(pos.x, pos.y + dotSize + 18).setVisible(true);
        }
      }
    }

    // Hub marker
    if (this.startingSystemId) {
      const hubSys = this.universe.find(s => s.id === this.startingSystemId);
      if (hubSys && this.visibleSystems.has(hubSys.id)) {
        const hp = this.getSystemScreenPos(hubSys);
        g.fillStyle(0x2ecc71, 0.9);
        g.beginPath();
        g.moveTo(hp.x, hp.y + 16); g.lineTo(hp.x + 4, hp.y + 20);
        g.lineTo(hp.x, hp.y + 24); g.lineTo(hp.x - 4, hp.y + 20);
        g.closePath(); g.fillPath();
        if (!this._hubLabel) {
          this._hubLabel = this.add.text(0, 0, 'THE OUTPOST', {
            fontSize: '6px', fontFamily: FONT, color: '#2ecc71', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(7).setAlpha(0.9);
        }
        this._hubLabel.setPosition(hp.x, hp.y + 30).setVisible(true);
      }
    }

    // Tooltip
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
    const tx = pos.x + 30;
    const ty = Math.min(pos.y - 20, H - 120);
    const tw = 180;

    if (isVis) {
      const stationLabel = sys.station === 'hub' ? 'Hub' : sys.station === 'trading' ? 'Trading Post'
        : sys.station === 'refinery' ? 'Refinery' : sys.station === 'outpost' ? 'Outpost' : 'None';
      const statusLabel = this.clearedSystems.includes(sys.id) ? 'CLEARED'
        : sys.danger <= 2 ? 'Safe' : sys.danger <= 4 ? 'Contested'
        : sys.danger <= 7 ? 'Hostile' : 'Deadly';
      const lines = [
        sys.name,
        'Region: ' + sys.region.name,
        'Danger: ' + sys.danger + '/10',
        'Station: ' + stationLabel,
        'Status: ' + statusLabel,
      ];
      const th = 14 + lines.length * 16;
      this.tooltipGfx.fillStyle(0x0a0a1a, 0.92);
      this.tooltipGfx.fillRect(tx, ty, tw, th);
      this.tooltipGfx.lineStyle(1, 0x00d4ff, 0.4);
      this.tooltipGfx.strokeRect(tx, ty, tw, th);
      for (let i = 0; i < lines.length; i++) {
        const t = this.add.text(tx + 8, ty + 6 + i * 16, lines[i], {
          fontSize: '9px', fontFamily: FONT, color: i === 0 ? '#00d4ff' : '#aaa',
        }).setDepth(21);
        this.tooltipTexts.push(t);
      }
    } else {
      const th = 30;
      this.tooltipGfx.fillStyle(0x0a0a1a, 0.92);
      this.tooltipGfx.fillRect(tx, ty, tw, th);
      this.tooltipGfx.lineStyle(1, 0x444444, 0.4);
      this.tooltipGfx.strokeRect(tx, ty, tw, th);
      const t = this.add.text(tx + 8, ty + 8, sys.name || 'UNEXPLORED', {
        fontSize: '9px', fontFamily: FONT, color: '#666',
      }).setDepth(21);
      this.tooltipTexts.push(t);
    }
  }
}
