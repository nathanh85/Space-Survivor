// ============================================================
// Hub Scene — The Outpost on Planet Zion (stub)
// ============================================================

import Phaser from 'phaser';

export default class HubScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HubScene' });
  }

  init() {
    this.firstVisit = false;
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Header
    this.add.text(W / 2, 40, 'THE OUTPOST \u2014 Planet Zion', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#2ecc71',
    }).setOrigin(0.5);

    // Divider line
    const g = this.add.graphics();
    g.lineStyle(1, 0x2ecc71, 0.3);
    g.beginPath();
    g.moveTo(W * 0.2, 70);
    g.lineTo(W * 0.8, 70);
    g.strokePath();

    // Placeholder description
    this.add.text(W / 2, H / 2 - 40, "Home sweet... well, it ain't much. But it's ours.", {
      fontSize: '12px', fontFamily: 'monospace', color: '#87CEEB',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2, '[The Outpost — Coming Soon]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#444444',
    }).setOrigin(0.5);

    // Launch button
    const btnY = H - 100;
    const btn = this.add.graphics();
    btn.fillStyle(0x2ecc71, 0.2);
    btn.fillRect(W / 2 - 80, btnY, 160, 40);
    btn.lineStyle(1, 0x2ecc71, 0.6);
    btn.strokeRect(W / 2 - 80, btnY, 160, 40);

    const btnText = this.add.text(W / 2, btnY + 20, 'LAUNCH', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#2ecc71',
    }).setOrigin(0.5);

    // Make button interactive
    const hitZone = this.add.zone(W / 2, btnY + 20, 160, 40).setInteractive({ useHandCursor: true });
    hitZone.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(0x2ecc71, 0.4);
      btn.fillRect(W / 2 - 80, btnY, 160, 40);
      btn.lineStyle(2, 0x2ecc71, 0.8);
      btn.strokeRect(W / 2 - 80, btnY, 160, 40);
    });
    hitZone.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(0x2ecc71, 0.2);
      btn.fillRect(W / 2 - 80, btnY, 160, 40);
      btn.lineStyle(1, 0x2ecc71, 0.6);
      btn.strokeRect(W / 2 - 80, btnY, 160, 40);
    });
    hitZone.on('pointerdown', () => this.launch());

    // ESC to launch too
    this.input.keyboard.on('keydown-ESC', () => this.launch());

    // Pepper bark on first hub visit
    const flightScene = this.scene.get('FlightScene');
    if (flightScene && !flightScene.firedTriggers.has('hub_first_visit')) {
      flightScene.firedTriggers.add('hub_first_visit');
      this.showPepperBark("Home sweet... well, it ain't much. But it's ours.");
    }
  }

  showPepperBark(text) {
    const W = this.cameras.main.width;
    const bark = this.add.text(W / 2, 90, 'Pepper: ' + text, {
      fontSize: '12px', fontFamily: 'monospace', color: '#87CEEB',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: bark, alpha: 1, duration: 300 });
    this.time.delayedCall(4000, () => {
      this.tweens.add({ targets: bark, alpha: 0, duration: 300, onComplete: () => bark.destroy() });
    });
  }

  launch() {
    this.scene.stop('HubScene');
    const flightScene = this.scene.get('FlightScene');
    if (flightScene && flightScene.returnFromHub) {
      flightScene.returnFromHub();
    } else {
      this.scene.resume('FlightScene');
    }
  }
}
