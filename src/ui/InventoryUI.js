// ============================================================
// Inventory UI — grid display with tooltips
// ============================================================

import Phaser from 'phaser';
import { RESOURCES } from '../data/resources.js';

const COLS = 6;
const ROWS = 5;
const CELL_SIZE = 48;
const PADDING = 4;
const MARGIN = 16;

export default class InventoryUI extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setScrollFactor(0);
    this.setDepth(600);
    this.setVisible(false);

    this.isOpen = false;
    this.hoveredSlot = -1;

    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    this.slotTexts = [];
    this.tooltip = null;

    this.createTooltip();
  }

  createTooltip() {
    this.tooltipBg = this.scene.add.graphics();
    this.tooltipName = this.scene.add.text(0, 0, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
      fontStyle: 'bold',
    });
    this.tooltipTier = this.scene.add.text(0, 0, '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#888888',
    });
    this.tooltipDesc = this.scene.add.text(0, 0, '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#aaaaaa',
      wordWrap: { width: 180 },
    });
    this.tooltipValue = this.scene.add.text(0, 0, '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#f1c40f',
    });

    this.add([this.tooltipBg, this.tooltipName, this.tooltipTier, this.tooltipDesc, this.tooltipValue]);
    this.tooltipBg.setVisible(false);
    this.tooltipName.setVisible(false);
    this.tooltipTier.setVisible(false);
    this.tooltipDesc.setVisible(false);
    this.tooltipValue.setVisible(false);
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.setVisible(this.isOpen);
  }

  open() { this.isOpen = true; this.setVisible(true); }
  close() { this.isOpen = false; this.setVisible(false); }

  update(inventory, pointer, W, H) {
    if (!this.isOpen) return;

    const g = this.gfx;
    g.clear();

    // Clean up old slot texts
    for (const t of this.slotTexts) t.destroy();
    this.slotTexts = [];

    const totalW = COLS * (CELL_SIZE + PADDING) - PADDING + MARGIN * 2;
    const totalH = ROWS * (CELL_SIZE + PADDING) - PADDING + MARGIN * 2 + 30;
    const ox = W / 2 - totalW / 2;
    const oy = H / 2 - totalH / 2;

    // Background panel
    g.fillStyle(0x0a0a1a, 0.95);
    g.fillRect(ox, oy, totalW, totalH);
    g.lineStyle(2, 0x00d4ff, 0.6);
    g.strokeRect(ox, oy, totalW, totalH);

    // Title
    const title = this.scene.add.text(ox + totalW / 2, oy + 10, 'INVENTORY', {
      fontSize: '12px', fontFamily: 'monospace', color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(601);
    this.slotTexts.push(title);

    // Slot count
    const slotInfo = this.scene.add.text(ox + totalW - MARGIN, oy + 10,
      `${inventory.getUsedSlots()}/${inventory.maxSlots}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(601);
    this.slotTexts.push(slotInfo);

    // Draw slots
    this.hoveredSlot = -1;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col;
        const sx = ox + MARGIN + col * (CELL_SIZE + PADDING);
        const sy = oy + MARGIN + 24 + row * (CELL_SIZE + PADDING);

        const slot = inventory.slots[i];

        // Check hover
        const isHovered = pointer.x >= sx && pointer.x <= sx + CELL_SIZE &&
                          pointer.y >= sy && pointer.y <= sy + CELL_SIZE;
        if (isHovered) this.hoveredSlot = i;

        // Slot background
        g.fillStyle(isHovered ? 0x1a2a3a : 0x111122, 0.9);
        g.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);

        if (slot) {
          const res = RESOURCES[slot.resourceId];
          if (res) {
            // Resource color indicator
            const resColor = Phaser.Display.Color.HexStringToColor(res.color).color;
            g.lineStyle(1.5, resColor, 0.8);
            g.strokeRect(sx, sy, CELL_SIZE, CELL_SIZE);

            // Tier indicator (border glow)
            const tierColor = Phaser.Display.Color.HexStringToColor(res.tier.color).color;
            g.lineStyle(1, tierColor, 0.3);
            g.strokeRect(sx + 1, sy + 1, CELL_SIZE - 2, CELL_SIZE - 2);

            // Resource icon (simple colored block)
            g.fillStyle(resColor, 0.8);
            g.fillRect(sx + 12, sy + 10, 24, 20);
            g.fillStyle(resColor, 0.4);
            g.fillRect(sx + 14, sy + 12, 20, 16);

            // Stack count
            const countText = this.scene.add.text(sx + CELL_SIZE - 3, sy + CELL_SIZE - 3,
              `${slot.count}`, {
              fontSize: '9px', fontFamily: 'monospace', color: '#ffffff',
              stroke: '#000', strokeThickness: 2,
            }).setOrigin(1, 1).setScrollFactor(0).setDepth(601);
            this.slotTexts.push(countText);

            // Short name
            const shortName = res.name.length > 7 ? res.name.substring(0, 6) + '.' : res.name;
            const nameText = this.scene.add.text(sx + CELL_SIZE / 2, sy + CELL_SIZE - 3,
              shortName, {
              fontSize: '7px', fontFamily: 'monospace', color: '#aaaaaa',
            }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(601);
            this.slotTexts.push(nameText);
          }
        } else {
          g.lineStyle(1, 0x333344, 0.4);
          g.strokeRect(sx, sy, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Tooltip
    this.updateTooltip(inventory, ox, oy, totalW);
  }

  updateTooltip(inventory, panelX, panelY, panelW) {
    if (this.hoveredSlot < 0) {
      this.tooltipBg.setVisible(false);
      this.tooltipName.setVisible(false);
      this.tooltipTier.setVisible(false);
      this.tooltipDesc.setVisible(false);
      this.tooltipValue.setVisible(false);
      return;
    }

    const slot = inventory.slots[this.hoveredSlot];
    if (!slot) {
      this.tooltipBg.setVisible(false);
      this.tooltipName.setVisible(false);
      this.tooltipTier.setVisible(false);
      this.tooltipDesc.setVisible(false);
      this.tooltipValue.setVisible(false);
      return;
    }

    const res = RESOURCES[slot.resourceId];
    if (!res) return;

    const tx = panelX + panelW + 8;
    const ty = panelY;

    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(0x0a0a1a, 0.95);
    this.tooltipBg.fillRect(tx, ty, 200, 90);
    this.tooltipBg.lineStyle(1, Phaser.Display.Color.HexStringToColor(res.tier.color).color, 0.6);
    this.tooltipBg.strokeRect(tx, ty, 200, 90);
    this.tooltipBg.setVisible(true);

    this.tooltipName.setText(res.name);
    this.tooltipName.setColor(res.tier.color);
    this.tooltipName.setPosition(tx + 8, ty + 6);
    this.tooltipName.setVisible(true);

    this.tooltipTier.setText(`[${res.tier.name}] x${slot.count}`);
    this.tooltipTier.setPosition(tx + 8, ty + 22);
    this.tooltipTier.setVisible(true);

    this.tooltipDesc.setText(res.description);
    this.tooltipDesc.setPosition(tx + 8, ty + 38);
    this.tooltipDesc.setVisible(true);

    this.tooltipValue.setText(`Value: ${res.value} credits each`);
    this.tooltipValue.setPosition(tx + 8, ty + 68);
    this.tooltipValue.setVisible(true);
  }
}
