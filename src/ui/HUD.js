// ============================================================
// HUD — status bars, system info, controls hint
// ============================================================

import Phaser from 'phaser';
import { DANGER_COLORS } from '../config/constants.js';

export default class HUD extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setScrollFactor(0);
    this.setDepth(500);

    this.bars = [];
    this.systemInfo = null;
    this.controlsHint = null;
    this.warpPrompt = null;

    this.createBars();
    this.createSystemInfo();
    this.createControlsHint();
    this.createWarpPrompt();
  }

  createBars() {
    const barConfig = [
      { label: 'HULL', c1: '#e74c3c', c2: '#e67e22', lc: '#e74c3c' },
      { label: 'SHLD', c1: '#3498db', c2: '#00d4ff', lc: '#00d4ff' },
      { label: 'FUEL', c1: '#f39c12', c2: '#f1c40f', lc: '#f1c40f' },
      { label: 'LV1',  c1: '#8e44ad', c2: '#bb6bd9', lc: '#bb6bd9' },
    ];

    for (let i = 0; i < barConfig.length; i++) {
      const bc = barConfig[i];
      const y = 12 + i * 18;

      const label = this.scene.add.text(10, y, bc.label, {
        fontSize: '10px', fontFamily: 'monospace', color: bc.lc,
      });

      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffffff, 0.08);
      bg.fillRect(48, y + 1, 110, 8);
      bg.lineStyle(0.5, 0xffffff, 0.15);
      bg.strokeRect(48, y + 1, 110, 8);

      const fill = this.scene.add.graphics();

      const valueText = this.scene.add.text(164, y, '', {
        fontSize: '9px', fontFamily: 'monospace', color: '#888888',
      });

      this.add([label, bg, fill, valueText]);
      this.bars.push({ label, bg, fill, valueText, config: bc, y });
    }
  }

  createSystemInfo() {
    this.sysInfoBg = this.scene.add.graphics();
    this.sysNameText = this.scene.add.text(0, 0, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#00d4ff',
    });
    this.sysRegionText = this.scene.add.text(0, 0, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffffff',
    });
    this.sysDangerText = this.scene.add.text(0, 0, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#e74c3c',
    });
    this.sysLabelName = this.scene.add.text(0, 0, 'System:', {
      fontSize: '10px', fontFamily: 'monospace', color: '#888888',
    });
    this.sysLabelRegion = this.scene.add.text(0, 0, 'Region:', {
      fontSize: '10px', fontFamily: 'monospace', color: '#888888',
    });
    this.sysLabelDanger = this.scene.add.text(0, 0, 'Danger:', {
      fontSize: '10px', fontFamily: 'monospace', color: '#888888',
    });

    this.add([this.sysInfoBg, this.sysLabelName, this.sysNameText,
              this.sysLabelRegion, this.sysRegionText,
              this.sysLabelDanger, this.sysDangerText]);
  }

  createControlsHint() {
    this.controlsHint = this.scene.add.text(0, 0,
      '[WASD] Move  [Mouse] Aim  [M] Map  [E] Warp  [TAB] Inventory', {
      fontSize: '9px', fontFamily: 'monospace', color: '#444444',
    }).setOrigin(1, 1);
    this.add(this.controlsHint);
  }

  createWarpPrompt() {
    this.warpPromptBg = this.scene.add.graphics();
    this.warpPromptText = this.scene.add.text(0, 0, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#00d4ff',
    }).setOrigin(0.5);
    this.warpPromptBg.setVisible(false);
    this.warpPromptText.setVisible(false);
    this.add([this.warpPromptBg, this.warpPromptText]);
  }

  update(player, systemData, nearGate, W, H) {
    // Update bars
    const values = [
      { val: player.hull, max: player.maxHull },
      { val: player.shield, max: player.maxShield },
      { val: player.fuel, max: player.maxFuel },
      { val: player.xp, max: player.xpNext },
    ];

    for (let i = 0; i < this.bars.length; i++) {
      const bar = this.bars[i];
      const v = values[i];
      const fill = Math.max(0, v.val / v.max);

      bar.fill.clear();
      const c1 = Phaser.Display.Color.HexStringToColor(bar.config.c1).color;
      bar.fill.fillStyle(c1, 1);
      bar.fill.fillRect(48, bar.y + 1, 110 * fill, 8);

      bar.valueText.setText(`${Math.floor(v.val)}/${v.max}`);

      if (i === 3) {
        bar.label.setText('LV' + player.level);
      }
    }

    // System info position (bottom-left)
    const iy = H - 58;
    this.sysInfoBg.clear();
    this.sysInfoBg.fillStyle(0x000000, 0.5);
    this.sysInfoBg.fillRect(8, iy - 4, 200, 52);
    this.sysInfoBg.lineStyle(1, 0xffffff, 0.06);
    this.sysInfoBg.strokeRect(8, iy - 4, 200, 52);

    this.sysLabelName.setPosition(14, iy);
    this.sysNameText.setPosition(70, iy);
    this.sysNameText.setText(systemData.name);

    this.sysLabelRegion.setPosition(14, iy + 14);
    this.sysRegionText.setPosition(70, iy + 14);
    this.sysRegionText.setText(systemData.region.name);
    this.sysRegionText.setColor(systemData.region.color);

    this.sysLabelDanger.setPosition(14, iy + 28);
    this.sysDangerText.setPosition(70, iy + 28);
    const dangerColor = DANGER_COLORS[systemData.danger] || '#e74c3c';
    this.sysDangerText.setColor(dangerColor);
    this.sysDangerText.setText('\u26A0'.repeat(Math.min(systemData.danger, 10)) + ' ' + systemData.danger + '/10');

    // Controls hint
    this.controlsHint.setPosition(W - 14, H - 10);

    // Warp prompt
    if (nearGate) {
      const txt = '[E] WARP \u2192 ' + nearGate.targetName + (nearGate.isDungeon ? ' \u26A0 DUNGEON' : '');
      const color = nearGate.isDungeon ? '#ff00ff' : '#00d4ff';
      this.warpPromptText.setText(txt);
      this.warpPromptText.setColor(color);
      this.warpPromptText.setPosition(W / 2, H - 66);
      this.warpPromptText.setVisible(true);

      const tw = this.warpPromptText.width + 30;
      this.warpPromptBg.clear();
      this.warpPromptBg.fillStyle(0x000000, 0.8);
      this.warpPromptBg.lineStyle(1, nearGate.isDungeon ? 0xff00ff : 0x00d4ff);
      this.warpPromptBg.fillRect(W / 2 - tw / 2, H - 80, tw, 28);
      this.warpPromptBg.strokeRect(W / 2 - tw / 2, H - 80, tw, 28);
      this.warpPromptBg.setVisible(true);
    } else {
      this.warpPromptBg.setVisible(false);
      this.warpPromptText.setVisible(false);
    }
  }
}
