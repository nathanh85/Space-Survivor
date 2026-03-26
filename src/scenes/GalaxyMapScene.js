// ============================================================
// Galaxy Map Scene — fog of war, minimal dots, content icons
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
    this.startingSystemId = data.startingSystemId || null;
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
        fontSize: '11px', fontFamily: FONT, color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setDepth(6).setVisible(false);
      this._sysLabels[s.id] = label;
    }

    // Content icon labels (per system)
    this._iconLabels = {};
    for (const s of this.universe) {
      const iconLabel = this.add.text(0, 0, '', {
        fontSize: '8px', fontFamily: FONT, color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setDepth(6).setVisible(false);
      this._iconLabels[s.id] = iconLabel;
    }

    this.add.text(W / 2, 24, '\u2B21 GALACTIC CHART', {
      fontSize: '14px', fontFamily: FONT, color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.add.text(W / 2, 42, '[M] Close   [Click system] Warp   [Drag] Pan', {
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
    this.input.keyboard.on('keydown-TAB', (e) => {
      e.preventDefault();
      this.closeMap();
      // Open inventory after returning to flight
      this.time.delayedCall(100, () => {
        const flight = this.scene.get('FlightScene');
        if (flight && flight.toggleInventory) flight.toggleInventory();
      });
    });

    // Pulse tween for current system dot
    this._currentPulse = { alpha: 0.7 };
    this.tweens.add({
      targets: this._currentPulse,
      alpha: 1.0,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
    // Build visible set to only allow clicking visible systems
    const visibleSystems = this._buildVisibleSet();
    for (const sys of this.universe) {
      if (!visibleSystems.has(sys.id)) continue;
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

  _buildVisibleSet() {
    // Fog of war 3 tiers:
    // - visited = full opacity
    // - adjacent-to-visited (1-hop) = 50% opacity
    // - everything else = hidden
    const visibleSystems = new Set();
    for (const s of this.universe) {
      if (this.visited.has(s.id)) {
        visibleSystems.add(s.id);
        // Also add all connected systems (1-hop neighbors)
        for (const cid of s.connections) {
          visibleSystems.add(cid);
        }
      }
    }
    // Hub system always visible
    if (this.startingSystemId) {
      visibleSystems.add(this.startingSystemId);
    }
    return visibleSystems;
  }

  update() {
    const { width: W, height: H } = this.cameras.main;
    const g = this.gfx;
    g.clear();

    const curSys = this.universe.find(s => s.id === this.currentId);
    const visibleSystems = this._buildVisibleSet();

    // Build lookup for quick access
    const sysById = {};
    for (const s of this.universe) sysById[s.id] = s;

    // Connection lines
    for (const s of this.universe) {
      if (!visibleSystems.has(s.id)) continue;
      const sp = this.getSystemScreenPos(s);
      if (sp.x < -200 || sp.x > W + 200 || sp.y < -200 || sp.y > H + 200) continue;

      for (const cid of s.connections) {
        if (cid <= s.id) continue; // avoid drawing duplicates
        const o = sysById[cid];
        if (!o || !visibleSystems.has(o.id)) continue;
        const op = this.getSystemScreenPos(o);

        // Is this connection adjacent to current system?
        const connectedToCurrent = (s.id === this.currentId || o.id === this.currentId);
        const bothVisited = this.visited.has(s.id) && this.visited.has(o.id);

        if (connectedToCurrent) {
          // Bright connection
          g.lineStyle(1.5, 0x00c8ff, 0.5);
        } else if (bothVisited) {
          // Dim visited connection
          g.lineStyle(0.5, 0x00c8ff, 0.15);
        } else {
          // Unvisited connection — hidden
          continue;
        }

        g.beginPath();
        g.moveTo(sp.x, sp.y);
        g.lineTo(op.x, op.y);
        g.strokePath();
      }
    }

    // Region labels
    const rcx = (UNIVERSE_COLS / 2) * HEX_W + this.mapOffset.x;
    const rcy = (UNIVERSE_ROWS / 2) * (HEX_H * 0.75) + this.mapOffset.y;
    if (!this._regionLabels) {
      this._regionLabels = [
        this.add.text(0, 0, 'CORE WORLDS', { fontSize: '14px', fontFamily: FONT, color: '#2ecc71' }).setOrigin(0.5).setAlpha(0.2).setDepth(5),
        this.add.text(0, 0, 'FRONTIER', { fontSize: '14px', fontFamily: FONT, color: '#f39c12' }).setOrigin(0.5).setAlpha(0.2).setDepth(5),
        this.add.text(0, 0, 'OUTER RIM', { fontSize: '14px', fontFamily: FONT, color: '#e74c3c' }).setOrigin(0.5).setAlpha(0.2).setDepth(5),
        this.add.text(0, 0, 'THE RIFT', { fontSize: '14px', fontFamily: FONT, color: '#8e44ad' }).setOrigin(0.5).setAlpha(0.2).setDepth(5),
      ];
    }
    this._regionLabels[0].setPosition(rcx, rcy - 50);
    this._regionLabels[1].setPosition(rcx + 300, rcy + 50);
    this._regionLabels[2].setPosition(rcx - 300, rcy + 200);
    this._regionLabels[3].setPosition(rcx + 300, rcy + 300);

    // Systems + labels
    for (const s of this.universe) {
      const pos = this.getSystemScreenPos(s);
      const label = this._sysLabels[s.id];
      const iconLabel = this._iconLabels[s.id];

      if (pos.x < -50 || pos.x > W + 50 || pos.y < -50 || pos.y > H + 50) {
        if (label) label.setVisible(false);
        if (iconLabel) iconLabel.setVisible(false);
        continue;
      }

      // Not visible in fog of war — hide entirely
      if (!visibleSystems.has(s.id)) {
        if (label) label.setVisible(false);
        if (iconLabel) iconLabel.setVisible(false);
        continue;
      }

      const isCur = s.id === this.currentId;
      const isVis = this.visited.has(s.id);
      const isHub = s.id === this.startingSystemId;
      const isHov = this.hoveredSystem && this.hoveredSystem.id === s.id;
      const isAdj = curSys && curSys.connections.includes(s.id);
      const regionColor = Phaser.Display.Color.HexStringToColor(s.region.color).color;

      // Fog opacity: visited = full, adjacent = 50%
      const fogAlpha = isVis ? 1.0 : 0.5;

      // Hub system: green dot
      const dotColor = isHub ? 0x2ecc71 : regionColor;

      // Dot size: current = 8px, normal = 4-6px
      const dotSize = isCur ? 8 : (isHub ? 6 : 4);

      // Current system: gentle pulse
      if (isCur) {
        g.fillStyle(dotColor, this._currentPulse.alpha);
        g.fillCircle(pos.x, pos.y, dotSize);
      } else {
        g.fillStyle(dotColor, fogAlpha * 0.9);
        g.fillCircle(pos.x, pos.y, dotSize);
      }

      // Hover highlight
      if (isHov) {
        g.lineStyle(1, 0x00d4ff, isAdj ? 0.8 : 0.4);
        g.strokeCircle(pos.x, pos.y, dotSize + 4);
      }

      // System name label
      if (label) {
        label.setPosition(pos.x, pos.y + dotSize + 6);
        label.setVisible(true);

        if (isCur) {
          label.setColor('#ffffff');
          label.setAlpha(1.0);
        } else if (isHub) {
          label.setColor('#2ecc71');
          label.setAlpha(fogAlpha);
        } else {
          const regionKey = s.region ? s.region.key : 'CORE';
          const regionColors = { CORE: '#2ecc71', FRONT: '#f39c12', OUTER: '#e74c3c', RIFT: '#9b59b6' };
          label.setColor(regionColors[regionKey] || '#ffffff');
          label.setAlpha(isVis ? 0.8 : 0.4);
        }
      }

      // Content icons below system name
      if (iconLabel) {
        const icons = [];
        if (s.hasStation) icons.push({ char: '\u25C6', color: '#00d4ff' }); // cyan diamond
        if (s.danger >= 4) icons.push({ char: '\u2694', color: '#e74c3c' }); // red crossed swords
        if (isHub) icons.push({ char: '\u2302', color: '#2ecc71' }); // green house

        if (icons.length > 0) {
          // Build colored icon string — since Phaser text doesn't support per-char color,
          // use the first icon's color for simplicity, or white for mixed
          const iconStr = icons.map(ic => ic.char).join(' ');
          const iconColor = icons.length === 1 ? icons[0].color : '#aaaaaa';
          iconLabel.setText(iconStr);
          iconLabel.setColor(iconColor);
          iconLabel.setPosition(pos.x, pos.y + dotSize + 18);
          iconLabel.setAlpha(fogAlpha * 0.7);
          iconLabel.setVisible(true);
        } else {
          iconLabel.setVisible(false);
        }
      }
    }

    // Hub marker: "THE OUTPOST" at starting system
    if (this.startingSystemId) {
      const hubSys = sysById[this.startingSystemId];
      if (hubSys && visibleSystems.has(hubSys.id)) {
        const hp = this.getSystemScreenPos(hubSys);
        if (!this._hubLabel) {
          this._hubLabel = this.add.text(0, 0, 'THE OUTPOST', {
            fontSize: '8px', fontFamily: FONT, color: '#2ecc71', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(7).setAlpha(0.9);
        }
        this._hubLabel.setPosition(hp.x, hp.y + 30).setVisible(true);
      }
    }
  }
}
