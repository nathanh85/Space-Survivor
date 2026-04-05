// ============================================================
// Debug Manager — dev overlay for QA and playtesting
// Toggle: Ctrl+Shift+D   |   NOT saved between sessions
// ============================================================

import { FONT } from '../config/constants.js';
import { RESOURCES } from '../data/resources.js';

const PANEL_W = 290;
const PANEL_X = 4;
const PANEL_Y = 180;
const LINE_H = 14;
const DEPTH = 900;
const GREEN = '#00ff00';
const DIM = '#338833';
const YELLOW = '#f1c40f';
const RED = '#ff4444';

export default class DebugManager {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.godMode = false;
    this.infiniteFuel = false;

    // Teleport menu
    this.teleportOpen = false;
    this.teleportPage = 0;
    this.teleportPageSize = 9;

    // Command bar
    this.commandBarOpen = false;
    this.commandText = '';
    this.commandLog = []; // last 3 commands
    this.inputCaptured = false; // true = debug is eating keyboard, game should ignore

    // Graphics layer
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH).setVisible(false);

    // Text objects pool (reused each frame)
    this._texts = [];

    // Badge (always visible when debug active, even if panel closed)
    this.badge = scene.add.text(0, 0, '', {
      fontSize: '8px', fontFamily: FONT, color: GREEN,
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 4, y: 2 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH).setVisible(false);

    // Keyboard listener for commands when command bar is open
    this._keyHandler = (e) => this._onKeyDown(e);
    scene.input.keyboard.on('keydown', this._keyHandler);
  }

  toggle() {
    this.visible = !this.visible;
    this.gfx.setVisible(this.visible);
    if (!this.visible) {
      this.teleportOpen = false;
      this.commandBarOpen = false;
      this.commandText = '';
      this.inputCaptured = false;
      this._clearTexts();
    }
    this._updateBadge();
    console.log('[DEBUG]', this.visible ? 'ON' : 'OFF');
  }

  _updateBadge() {
    const parts = ['DEBUG'];
    if (this.godMode) parts.push('GOD');
    if (this.infiniteFuel) parts.push('FUEL∞');
    const W = this.scene.cameras.main.width;
    this.badge.setText(parts.join(' | ')).setPosition(W - 170, 12);
    this.badge.setVisible(this.godMode || this.infiniteFuel || this.visible);
  }

  _onKeyDown(e) {
    // Command bar input capture
    if (this.commandBarOpen) {
      if (e.key === 'Escape') {
        this.commandBarOpen = false;
        this.commandText = '';
        this.inputCaptured = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'Enter') {
        if (this.commandText.trim()) {
          this._executeCommand(this.commandText.trim());
        }
        this.commandBarOpen = false;
        this.commandText = '';
        this.inputCaptured = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'Backspace') {
        this.commandText = this.commandText.slice(0, -1);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key.length === 1) {
        this.commandText += e.key;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      return;
    }

    // Teleport menu input capture
    if (this.teleportOpen && this.visible) {
      if (e.key === 'Escape') {
        this.teleportOpen = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const idx = this.teleportPage * this.teleportPageSize + (num - 1);
        const systems = this.scene.universe;
        if (idx < systems.length) {
          this._teleport(systems[idx].id);
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'n') {
        const maxPage = Math.ceil(this.scene.universe.length / this.teleportPageSize) - 1;
        this.teleportPage = Math.min(this.teleportPage + 1, maxPage);
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'p') {
        this.teleportPage = Math.max(this.teleportPage - 1, 0);
        e.preventDefault();
        return;
      }
      return;
    }

    // Hotkeys only when overlay is visible
    if (!this.visible) return;

    if (e.key === 'g' || e.key === 'G') {
      this.godMode = !this.godMode;
      this._updateBadge();
      console.log('[DEBUG] God mode:', this.godMode ? 'ON' : 'OFF');
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === 'u' || e.key === 'U') {
      this.infiniteFuel = !this.infiniteFuel;
      this._updateBadge();
      console.log('[DEBUG] Infinite fuel:', this.infiniteFuel ? 'ON' : 'OFF');
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === 't' || e.key === 'T') {
      this.teleportOpen = !this.teleportOpen;
      this.teleportPage = 0;
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === '`') {
      this.commandBarOpen = true;
      this.commandText = '';
      this.inputCaptured = true;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ========== COMMANDS ==========

  _executeCommand(cmd) {
    const parts = cmd.toLowerCase().split(/\s+/);
    const action = parts[0];
    let result = '';

    if (action === 'give') {
      const resId = parts[1];
      const amount = parseInt(parts[2]) || 1;
      if (RESOURCES[resId]) {
        const added = this.scene.inventory.addItem(resId, amount);
        result = `+${added} ${RESOURCES[resId].name}`;
      } else {
        result = `Unknown resource: ${resId}`;
      }
    } else if (action === 'credits' || action === 'cr') {
      const val = parseInt(parts[1]);
      if (!isNaN(val)) {
        this.scene.player.credits = val;
        result = `Credits → ${val}`;
      }
    } else if (action === 'fuel') {
      const val = parseInt(parts[1]);
      if (!isNaN(val)) {
        this.scene.player.fuel = Math.min(val, this.scene.player.maxFuel);
        result = `Fuel → ${this.scene.player.fuel}`;
      }
    } else if (action === 'hull') {
      const val = parseInt(parts[1]);
      if (!isNaN(val)) {
        this.scene.player.hull = Math.min(val, this.scene.player.maxHull);
        result = `Hull → ${this.scene.player.hull}`;
      }
    } else if (action === 'shield') {
      const val = parseInt(parts[1]);
      if (!isNaN(val)) {
        this.scene.player.shield = Math.min(val, this.scene.player.maxShield);
        result = `Shield → ${this.scene.player.shield}`;
      }
    } else if (action === 'fill') {
      const p = this.scene.player;
      p.fuel = p.maxFuel;
      p.hull = p.maxHull;
      p.shield = p.maxShield;
      p.credits = Math.max(p.credits, 9999);
      for (const id of ['iron', 'carbon', 'fuel', 'titanium', 'plasma', 'cryo']) {
        this.scene.inventory.addItem(id, 50);
      }
      result = 'All stats maxed + materials added';
    } else if (action === 'tp' || action === 'teleport') {
      const name = parts.slice(1).join(' ');
      const sys = this.scene.universe.find(s => s.name.toLowerCase().includes(name));
      if (sys) {
        this._teleport(sys.id);
        result = `Teleport → ${sys.name}`;
      } else {
        result = `System not found: ${name}`;
      }
    } else if (action === 'god' || action === 'godmode') {
      this.godMode = !this.godMode;
      this._updateBadge();
      result = `God mode: ${this.godMode ? 'ON' : 'OFF'}`;
    } else if (action === 'infuel' || action === 'nofuel') {
      this.infiniteFuel = !this.infiniteFuel;
      this._updateBadge();
      result = `Infinite fuel: ${this.infiniteFuel ? 'ON' : 'OFF'}`;
    } else if (action === 'help') {
      result = 'give/credits/fuel/hull/shield/fill/tp/god/infuel';
    } else {
      result = `Unknown: ${action}. Type "help"`;
    }

    console.log('[DEBUG CMD]', cmd, '→', result);
    this.commandLog.unshift(result);
    if (this.commandLog.length > 3) this.commandLog.pop();
  }

  _teleport(sysId) {
    console.log('[DEBUG] Teleport →', sysId);
    this.teleportOpen = false;
    this.scene.enterSystem(sysId);
  }

  // ========== RENDERING ==========

  update(W, H) {
    this._updateBadge();
    if (!this.visible) return;

    this._clearTexts();
    const g = this.gfx;
    g.clear();

    if (this.teleportOpen) {
      this._drawTeleportMenu(W, H);
      return;
    }

    this._drawOverlay(W, H);
  }

  _drawOverlay(W, H) {
    const g = this.gfx;
    const s = this.scene;
    const p = s.player;
    const sys = s.currentSystem;
    const sd = sys ? sys.data : null;
    let y = PANEL_Y;

    // Background
    const panelH = this.commandBarOpen ? 380 : 340;
    g.fillStyle(0x000000, 0.8);
    g.fillRect(PANEL_X, PANEL_Y, PANEL_W, panelH);
    g.lineStyle(1, 0x00ff00, 0.5);
    g.strokeRect(PANEL_X, PANEL_Y, PANEL_W, panelH);

    // Title + FPS
    const fps = Math.round(s.game.loop.actualFps);
    const fpsColor = fps >= 55 ? GREEN : fps >= 30 ? YELLOW : RED;
    this._text(PANEL_X + 6, y + 4, 'DEBUG', GREEN, '9px');
    this._text(PANEL_X + PANEL_W - 6, y + 4, fps + ' FPS', fpsColor, '9px').setOrigin(1, 0);
    y += 20;

    // Divider
    g.lineStyle(1, 0x00ff00, 0.3);
    g.beginPath(); g.moveTo(PANEL_X + 4, y); g.lineTo(PANEL_X + PANEL_W - 4, y); g.strokePath();
    y += 6;

    // System info
    if (sd) {
      this._text(PANEL_X + 6, y, `SYS: ${sd.name}`, GREEN);
      y += LINE_H;
      this._text(PANEL_X + 6, y, `REGION: ${sd.region.name}  DANGER: ${sd.danger}`, DIM);
      y += LINE_H;
    }
    this._text(PANEL_X + 6, y, `POS: ${Math.floor(p.x)}, ${Math.floor(p.y)}`, DIM);
    y += LINE_H;
    const vel = p.body ? Math.floor(Math.hypot(p.body.velocity.x, p.body.velocity.y)) : 0;
    this._text(PANEL_X + 6, y, `VEL: ${vel}  ANG: ${(p.shipAngle * 180 / Math.PI).toFixed(0)}°`, DIM);
    y += LINE_H + 4;

    // Divider
    g.beginPath(); g.moveTo(PANEL_X + 4, y); g.lineTo(PANEL_X + PANEL_W - 4, y); g.strokePath();
    y += 6;

    // Player stats
    this._text(PANEL_X + 6, y, `HULL: ${Math.floor(p.hull)}/${p.maxHull}`, '#e74c3c');
    this._text(PANEL_X + 140, y, `SHIELD: ${Math.floor(p.shield)}/${p.maxShield}`, '#3498db');
    y += LINE_H;
    this._text(PANEL_X + 6, y, `FUEL: ${Math.floor(p.fuel)}/${p.maxFuel}`, '#f39c12');
    this._text(PANEL_X + 140, y, `CR: ${p.credits}`, '#f1c40f');
    y += LINE_H;
    this._text(PANEL_X + 6, y, `LV: ${p.level}  XP: ${p.xp}/${p.xpNext}`, '#bb6bd9');
    y += LINE_H + 4;

    // Counts
    const asteroidCount = s.asteroids ? s.asteroids.filter(a => !a.mined).length : 0;
    const enemyCount = s.enemyManager ? s.enemyManager.getEnemyCount() : 0;
    this._text(PANEL_X + 6, y, `ASTEROIDS: ${asteroidCount}  ENEMIES: ${enemyCount}`, DIM);
    y += LINE_H;

    // Quest
    const aq = s.questManager && s.questManager.activeQuests.length > 0 ? s.questManager.activeQuests[0] : null;
    if (aq) {
      const objStr = aq.objectives.map(o => `${o.current}/${o.target}`).join(', ');
      this._text(PANEL_X + 6, y, `QUEST: ${aq.name} [${objStr}]`, '#f39c12');
    } else {
      this._text(PANEL_X + 6, y, 'QUEST: none', DIM);
    }
    y += LINE_H + 4;

    // Divider
    g.beginPath(); g.moveTo(PANEL_X + 4, y); g.lineTo(PANEL_X + PANEL_W - 4, y); g.strokePath();
    y += 6;

    // Toggles
    this._text(PANEL_X + 6, y, '[G] God Mode', this.godMode ? GREEN : DIM);
    this._text(PANEL_X + 140, y, this.godMode ? 'ON' : 'OFF', this.godMode ? GREEN : DIM);
    y += LINE_H;
    this._text(PANEL_X + 6, y, '[U] Inf Fuel', this.infiniteFuel ? GREEN : DIM);
    this._text(PANEL_X + 140, y, this.infiniteFuel ? 'ON' : 'OFF', this.infiniteFuel ? GREEN : DIM);
    y += LINE_H;
    this._text(PANEL_X + 6, y, '[T] Teleport', DIM);
    this._text(PANEL_X + 140, y, '[`] Command', DIM);
    y += LINE_H + 4;

    // Command log
    if (this.commandLog.length > 0) {
      for (let i = 0; i < Math.min(this.commandLog.length, 2); i++) {
        this._text(PANEL_X + 6, y, '> ' + this.commandLog[i], '#555555');
        y += LINE_H;
      }
    }

    // Command bar
    if (this.commandBarOpen) {
      y += 4;
      g.fillStyle(0x003300, 0.9);
      g.fillRect(PANEL_X + 4, y, PANEL_W - 8, 18);
      g.lineStyle(1, 0x00ff00, 0.8);
      g.strokeRect(PANEL_X + 4, y, PANEL_W - 8, 18);
      const cursor = Date.now() % 1000 < 500 ? '_' : '';
      this._text(PANEL_X + 8, y + 3, '> ' + this.commandText + cursor, GREEN);
    }
  }

  _drawTeleportMenu(W, H) {
    const g = this.gfx;
    const systems = this.scene.universe;
    const pages = Math.ceil(systems.length / this.teleportPageSize);
    const start = this.teleportPage * this.teleportPageSize;
    const end = Math.min(start + this.teleportPageSize, systems.length);
    const currentId = this.scene.currentSystemId;

    const menuW = 340;
    const menuH = 30 + (end - start) * LINE_H + 30;
    const mx = W / 2 - menuW / 2;
    const my = H / 2 - menuH / 2;

    g.fillStyle(0x000000, 0.9);
    g.fillRect(mx, my, menuW, menuH);
    g.lineStyle(1, 0x00ff00, 0.6);
    g.strokeRect(mx, my, menuW, menuH);

    this._text(mx + 6, my + 6, `TELEPORT  (pg ${this.teleportPage + 1}/${pages})  ←/→ page  ESC close`, GREEN, '8px');
    let y = my + 24;

    for (let i = start; i < end; i++) {
      const sys = systems[i];
      const num = (i - start) + 1;
      const isCurrent = sys.id === currentId;
      const visited = this.scene.visited.has(sys.id);
      const marker = isCurrent ? ' ◄' : visited ? ' ✓' : '';
      const color = isCurrent ? YELLOW : visited ? GREEN : DIM;
      this._text(mx + 6, y, `[${num}] ${sys.name}`, color);
      this._text(mx + 200, y, `${sys.region.name} D:${sys.danger}${marker}`, color);
      y += LINE_H;
    }

    this._text(mx + 6, y + 4, 'Press 1-9 to teleport  |  ←→ pages', DIM);
  }

  // ========== TEXT HELPERS ==========

  _text(x, y, str, color, size) {
    const t = this.scene.add.text(x, y, str, {
      fontSize: size || '8px', fontFamily: FONT, color: color || GREEN,
    }).setScrollFactor(0).setDepth(DEPTH + 1);
    this._texts.push(t);
    return t;
  }

  _clearTexts() {
    for (const t of this._texts) {
      if (t && t.destroy) t.destroy();
    }
    this._texts = [];
    this.gfx.clear();
  }

  destroy() {
    this._clearTexts();
    if (this.gfx) this.gfx.destroy();
    if (this.badge) this.badge.destroy();
    this.scene.input.keyboard.off('keydown', this._keyHandler);
  }
}
