// ============================================================
// Title Scene — start menu with save/load support
// ============================================================

import Phaser from 'phaser';
import SaveManager from '../systems/SaveManager.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  preload() {
    // Load ALL portraits here (first scene) so they're available globally
    const portraits = [
      'pax_neutral', 'pepper_neutral', 'mother', 'marshal', 'judge',
      'grix', 'vera', 'informant', 'miner', 'smuggler', 'commander', 'mechanic'
    ];
    portraits.forEach(p => {
      this.load.image(p, `assets/portraits/${p}.png`);
    });
    this.load.on('loaderror', (file) => {
      console.error('[TitleScene] Portrait load FAILED:', file.key, file.url);
    });
    this.load.on('filecomplete', (key) => {
      if (portraits.includes(key)) {
        console.log('[TitleScene] Portrait loaded OK:', key);
      }
    });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.cameras.main.setBackgroundColor('#050510');

    // H10: Apply LINEAR filtering to all portrait textures for quality upscaling
    const portraitKeys = [
      'pax_neutral', 'pepper_neutral', 'mother', 'marshal', 'judge',
      'grix', 'vera', 'informant', 'miner', 'smuggler', 'commander', 'mechanic',
    ];
    portraitKeys.forEach(key => {
      const tex = this.textures.get(key);
      if (tex && tex.key !== '__MISSING') {
        tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });

    const hasSave = SaveManager.hasSave();

    // Background stars
    const gfx = this.add.graphics();
    for (let i = 0; i < 150; i++) {
      gfx.fillStyle(0xffffff, 0.2 + Math.random() * 0.6);
      gfx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random(), 1 + Math.random());
    }

    // Title
    this.add.text(W / 2, H * 0.30, 'P.E.S.T.S.', {
      fontSize: '48px', fontFamily: '"Rye", "Press Start 2P", monospace', color: '#00d4ff',
    }).setOrigin(0.5, 0.5);

    this.add.text(W / 2, H * 0.38, 'A Space Western', {
      fontSize: '10px', fontFamily: '"Press Start 2P", monospace', color: '#f39c12',
    }).setOrigin(0.5, 0.5);

    // Decorative ship
    const ship = this.add.graphics();
    ship.setPosition(W / 2, H * 0.48);
    ship.fillStyle(0x666666); ship.fillRect(-10, -4, 5, 8);
    ship.fillStyle(0xdddddd); ship.fillRect(-6, -5, 16, 10);
    ship.fillStyle(0x00d4ff); ship.fillRect(10, -3, 6, 6);
    ship.fillStyle(0x999999); ship.fillRect(-4, -11, 10, 5);
    ship.fillStyle(0x999999); ship.fillRect(-4, 6, 10, 5);
    ship.fillStyle(0xe74c3c); ship.fillRect(-4, -12, 3, 2);
    ship.fillStyle(0xe74c3c); ship.fillRect(-4, 10, 3, 2);
    ship.fillStyle(0x00aaff); ship.fillRect(4, -2, 4, 4);

    if (hasSave) {
      // CONTINUE button
      const contY = H * 0.58;
      this._makeButton(W / 2, contY, 'CONTINUE', '#2ecc71', 0x2ecc71, () => this.continueGame());

      // NEW GAME button
      const newY = H * 0.66;
      this._makeButton(W / 2, newY, 'NEW GAME', '#00d4ff', 0x00d4ff, () => this.confirmNewGame());

      // Pulse on continue
      const contText = this.children.list.find(c => c.text === 'CONTINUE');
      if (contText) {
        this.tweens.add({ targets: contText, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });
      }
    } else {
      // NEW GAME only
      const btnY = H * 0.62;
      this._makeButton(W / 2, btnY, 'NEW GAME', '#00d4ff', 0x00d4ff, () => this.startNewGame());

      const startText = this.children.list.find(c => c.text === 'NEW GAME');
      if (startText) {
        this.tweens.add({ targets: startText, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });
      }
    }

    // Controls hint
    this.add.text(W / 2, H * 0.78, '[SPACE] Thrust  |  [Click] Shoot/Mine  |  [M] Map  |  [TAB] Inventory', {
      fontSize: '8px', fontFamily: '"Press Start 2P", monospace', color: '#555555',
    }).setOrigin(0.5);

    // Version
    this.add.text(W / 2, H - 20, 'v0.6.2 \u2014 P.E.S.T.S.', {
      fontSize: '9px', fontFamily: '"Press Start 2P", monospace', color: '#333333',
    }).setOrigin(0.5);

    // Keyboard shortcuts
    if (hasSave) {
      this.input.keyboard.on('keydown-SPACE', () => this.continueGame());
      this.input.keyboard.on('keydown-ENTER', () => this.continueGame());
    } else {
      this.input.keyboard.on('keydown-SPACE', () => this.startNewGame());
      this.input.keyboard.on('keydown-ENTER', () => this.startNewGame());
    }
  }

  _makeButton(x, y, label, textColor, lineColor, onClick) {
    const btn = this.add.graphics();
    btn.fillStyle(lineColor, 0.1);
    btn.fillRect(x - 100, y - 18, 200, 36);
    btn.lineStyle(1, lineColor, 0.6);
    btn.strokeRect(x - 100, y - 18, 200, 36);

    const text = this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: textColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    const hitZone = this.add.zone(x, y, 200, 36).setInteractive({ useHandCursor: true });
    hitZone.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(lineColor, 0.25);
      btn.fillRect(x - 100, y - 18, 200, 36);
      btn.lineStyle(1, lineColor, 1);
      btn.strokeRect(x - 100, y - 18, 200, 36);
    });
    hitZone.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(lineColor, 0.1);
      btn.fillRect(x - 100, y - 18, 200, 36);
      btn.lineStyle(1, lineColor, 0.6);
      btn.strokeRect(x - 100, y - 18, 200, 36);
    });
    hitZone.on('pointerdown', onClick);
  }

  _resumeAudio() {
    // Safari requires AudioContext created/resumed during user gesture
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      ctx.close(); // just warming up the permission
    } catch (e) { /* ignore */ }
  }

  continueGame() {
    this._resumeAudio();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('FlightScene', { fromSave: true });
    });
  }

  startNewGame() {
    this._resumeAudio();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('IntroScene');
    });
  }

  confirmNewGame() {
    // H7: Styled confirmation box — dark panel with amber border, Press Start 2P font
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const BOX_W = 400, BOX_H = 150;
    const bx = W / 2 - BOX_W / 2, by = H / 2 - BOX_H / 2;

    const elements = [];

    // Semi-transparent dark overlay behind the box
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(100);
    elements.push(overlay);

    // Box background
    const boxGfx = this.add.graphics().setDepth(101);
    boxGfx.fillStyle(0x0a0a18, 0.96);
    boxGfx.fillRect(bx, by, BOX_W, BOX_H);
    // Amber border 2px
    boxGfx.lineStyle(2, 0xe67e22, 1);
    boxGfx.strokeRect(bx, by, BOX_W, BOX_H);
    // Subtle inner glow line
    boxGfx.lineStyle(1, 0xf39c12, 0.35);
    boxGfx.strokeRect(bx + 3, by + 3, BOX_W - 6, BOX_H - 6);
    elements.push(boxGfx);

    // "ERASE SAVE?" title
    const warnText = this.add.text(W / 2, by + 28, 'ERASE SAVE?', {
      fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: '#e67e22', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);
    elements.push(warnText);

    const subText = this.add.text(W / 2, by + 56, 'All progress will be lost.', {
      fontSize: '8px', fontFamily: '"Press Start 2P", monospace', color: '#888888',
    }).setOrigin(0.5).setDepth(102);
    elements.push(subText);

    // YES button (red)
    const yesX = W / 2 - 70, yesY = by + 102;
    const yesBg = this.add.graphics().setDepth(102);
    yesBg.fillStyle(0xe74c3c, 0.25);
    yesBg.fillRect(yesX - 45, yesY - 16, 90, 32);
    yesBg.lineStyle(1, 0xe74c3c, 0.8);
    yesBg.strokeRect(yesX - 45, yesY - 16, 90, 32);
    elements.push(yesBg);

    const yesText = this.add.text(yesX, yesY, 'YES', {
      fontSize: '12px', fontFamily: '"Press Start 2P", monospace', color: '#e74c3c', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(103);
    elements.push(yesText);

    const yesZone = this.add.zone(yesX, yesY, 90, 32).setDepth(104).setInteractive({ useHandCursor: true });
    yesZone.on('pointerover', () => { yesBg.clear(); yesBg.fillStyle(0xe74c3c, 0.5); yesBg.fillRect(yesX - 45, yesY - 16, 90, 32); yesBg.lineStyle(1, 0xe74c3c, 1); yesBg.strokeRect(yesX - 45, yesY - 16, 90, 32); });
    yesZone.on('pointerout', () => { yesBg.clear(); yesBg.fillStyle(0xe74c3c, 0.25); yesBg.fillRect(yesX - 45, yesY - 16, 90, 32); yesBg.lineStyle(1, 0xe74c3c, 0.8); yesBg.strokeRect(yesX - 45, yesY - 16, 90, 32); });
    yesZone.on('pointerdown', () => {
      SaveManager.deleteSave();
      this.startNewGame();
    });
    elements.push(yesZone);

    // NO button (green)
    const noX = W / 2 + 70, noY = by + 102;
    const noBg = this.add.graphics().setDepth(102);
    noBg.fillStyle(0x2ecc71, 0.2);
    noBg.fillRect(noX - 45, noY - 16, 90, 32);
    noBg.lineStyle(1, 0x2ecc71, 0.8);
    noBg.strokeRect(noX - 45, noY - 16, 90, 32);
    elements.push(noBg);

    const noText = this.add.text(noX, noY, 'NO', {
      fontSize: '12px', fontFamily: '"Press Start 2P", monospace', color: '#2ecc71', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(103);
    elements.push(noText);

    const noZone = this.add.zone(noX, noY, 90, 32).setDepth(104).setInteractive({ useHandCursor: true });
    noZone.on('pointerover', () => { noBg.clear(); noBg.fillStyle(0x2ecc71, 0.4); noBg.fillRect(noX - 45, noY - 16, 90, 32); noBg.lineStyle(1, 0x2ecc71, 1); noBg.strokeRect(noX - 45, noY - 16, 90, 32); });
    noZone.on('pointerout', () => { noBg.clear(); noBg.fillStyle(0x2ecc71, 0.2); noBg.fillRect(noX - 45, noY - 16, 90, 32); noBg.lineStyle(1, 0x2ecc71, 0.8); noBg.strokeRect(noX - 45, noY - 16, 90, 32); });
    noZone.on('pointerdown', () => {
      elements.forEach(e => { if (e && e.destroy) e.destroy(); });
    });
    elements.push(noZone);

    // ESC also closes
    const escHandler = (e) => {
      if (e.code === 'Escape') {
        elements.forEach(el => { if (el && el.destroy) el.destroy(); });
        this.input.keyboard.off('keydown', escHandler);
      }
    };
    this.input.keyboard.on('keydown', escHandler);
  }
}
