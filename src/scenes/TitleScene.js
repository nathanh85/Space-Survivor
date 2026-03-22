// ============================================================
// Title Scene — start menu
// ============================================================

import Phaser from 'phaser';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.cameras.main.setBackgroundColor('#050510');

    // Background stars
    const gfx = this.add.graphics();
    for (let i = 0; i < 150; i++) {
      gfx.fillStyle(0xffffff, 0.2 + Math.random() * 0.6);
      gfx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random(), 1 + Math.random());
    }

    // Title
    this.add.text(W / 2, H * 0.28, 'BLOCK SURVIVAL', {
      fontSize: '32px', fontFamily: 'monospace', color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.35, 'SPACE PIRATES', {
      fontSize: '18px', fontFamily: 'monospace', color: '#f39c12',
    }).setOrigin(0.5);

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

    // Start button
    const btnY = H * 0.62;
    const btn = this.add.graphics();
    btn.fillStyle(0x00d4ff, 0.1);
    btn.fillRect(W / 2 - 100, btnY - 18, 200, 36);
    btn.lineStyle(1, 0x00d4ff, 0.6);
    btn.strokeRect(W / 2 - 100, btnY - 18, 200, 36);

    const startText = this.add.text(W / 2, btnY, 'START GAME', {
      fontSize: '14px', fontFamily: 'monospace', color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Make button interactive
    const hitZone = this.add.zone(W / 2, btnY, 200, 36).setInteractive({ useHandCursor: true });
    hitZone.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(0x00d4ff, 0.25);
      btn.fillRect(W / 2 - 100, btnY - 18, 200, 36);
      btn.lineStyle(1, 0x00d4ff, 1);
      btn.strokeRect(W / 2 - 100, btnY - 18, 200, 36);
    });
    hitZone.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(0x00d4ff, 0.1);
      btn.fillRect(W / 2 - 100, btnY - 18, 200, 36);
      btn.lineStyle(1, 0x00d4ff, 0.6);
      btn.strokeRect(W / 2 - 100, btnY - 18, 200, 36);
    });
    hitZone.on('pointerdown', () => this.startGame());

    // Also start with SPACE or ENTER
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());

    // Version / credits
    this.add.text(W / 2, H * 0.75, 'WASD to fly  |  Mouse to aim  |  M for map', {
      fontSize: '10px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5);

    this.add.text(W / 2, H - 20, 'v0.2.5a — Phase 2', {
      fontSize: '9px', fontFamily: 'monospace', color: '#333333',
    }).setOrigin(0.5);

    // Pulse animation on start text
    this.tweens.add({
      targets: startText, alpha: 0.5,
      duration: 800, yoyo: true, repeat: -1,
    });
  }

  startGame() {
    this.scene.start('FlightScene');
  }
}
