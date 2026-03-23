// ============================================================
// Dialogue UI — portrait + typewriter text box
// ============================================================

import Phaser from 'phaser';

const BOX_HEIGHT = 180;
const PORTRAIT_SIZE = 100;
const CHARS_PER_SEC = 30;

// Per-character portrait colors and speaker label colors
const PORTRAIT_COLORS = {
  pepper:       { bg: 0x87CEEB, initial: 'P', label: '#87CEEB' },
  pax:          { bg: 0xe67e22, initial: 'P', label: '#e67e22' },
  grix:         { bg: 0xf39c12, initial: 'G', label: '#f39c12' },
  'commander vera': { bg: 0x3498db, initial: 'V', label: '#3498db' },
  '???':        { bg: 0x666666, initial: '?', label: '#999999' },
  'M.O.T.H.E.R.': { bg: 0xe74c3c, initial: 'M', label: '#e74c3c' },
  outrider:     { bg: 0x2ecc71, initial: 'O', label: '#2ecc71' },
};

function getPortraitInfo(speaker) {
  const key = (speaker || '').toLowerCase();
  // Try exact match first
  if (PORTRAIT_COLORS[key]) return PORTRAIT_COLORS[key];
  // Try partial match
  for (const [k, v] of Object.entries(PORTRAIT_COLORS)) {
    if (key.includes(k)) return v;
  }
  return { bg: 0x1a2a3a, initial: (speaker || '?')[0].toUpperCase(), label: '#ffffff' };
}

export default class DialogueUI {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.currentBeat = null;
    this.currentLineIndex = 0;
    this.displayedChars = 0;
    this.fullLineText = '';
    this.onComplete = null;
    this._initTexts = [];

    // Graphics
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(700).setVisible(false);

    this.bgGfx = scene.add.graphics().setScrollFactor(0);
    this.container.add(this.bgGfx);

    // Portrait placeholder
    this.portraitGfx = scene.add.graphics().setScrollFactor(0);
    this.container.add(this.portraitGfx);

    // Portrait image (if loaded)
    this.portraitImage = scene.add.image(0, 0, '__DEFAULT').setScrollFactor(0).setVisible(false);
    this.container.add(this.portraitImage);

    // Speaker name
    this.speakerText = scene.add.text(0, 0, '', {
      fontSize: '13px', fontFamily: '"Press Start 2P", monospace', fontStyle: 'bold', color: '#87CEEB',
    }).setScrollFactor(0);
    this.container.add(this.speakerText);

    // Dialogue text
    this.dialogueText = scene.add.text(0, 0, '', {
      fontSize: '12px', fontFamily: '"Press Start 2P", monospace', color: '#cccccc',
      wordWrap: { width: 0 },
      lineSpacing: 4,
    }).setScrollFactor(0);
    this.container.add(this.dialogueText);

    // Advance hint
    this.advanceHint = scene.add.text(0, 0, '[SPACE / Click to continue]', {
      fontSize: '9px', fontFamily: '"Press Start 2P", monospace', color: '#666666',
    }).setOrigin(1, 1).setScrollFactor(0).setVisible(false);
    this.container.add(this.advanceHint);

    // Choice buttons (stubbed for now)
    this.choiceTexts = [];

    // Input
    scene.input.keyboard.on('keydown-SPACE', () => this.advance());
    scene.input.on('pointerdown', () => {
      if (this.isOpen) this.advance();
    });
  }

  show(beat, onComplete) {
    this.currentBeat = beat;
    this.currentLineIndex = 0;
    this.onComplete = onComplete || null;
    this.isOpen = true;
    this.container.setVisible(true);
    this.showCurrentLine();
  }

  hide() {
    this.isOpen = false;
    this.container.setVisible(false);
    this.currentBeat = null;
    for (const c of this.choiceTexts) c.destroy();
    this.choiceTexts = [];
    for (const t of this._initTexts) t.destroy();
    this._initTexts = [];
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }

  showCurrentLine() {
    const beat = this.currentBeat;
    if (!beat || this.currentLineIndex >= beat.lines.length) {
      if (beat && beat.choices && beat.choices.length > 0) {
        this.showChoices();
      } else {
        this.hide();
      }
      return;
    }

    this.fullLineText = beat.lines[this.currentLineIndex];
    this.displayedChars = 0;
    this.advanceHint.setVisible(false);
    this.layout();
  }

  showChoices() {
    // Stub — just close for now
    this.hide();
  }

  advance() {
    if (!this.isOpen || !this.currentBeat) return;

    if (this.displayedChars < this.fullLineText.length) {
      this.displayedChars = this.fullLineText.length;
      this.dialogueText.setText(this.fullLineText);
      this.advanceHint.setVisible(true);
    } else {
      this.currentLineIndex++;
      this.showCurrentLine();
    }
  }

  layout() {
    const W = this.scene.cameras.main.width;
    const H = this.scene.cameras.main.height;
    const boxY = H - BOX_HEIGHT;

    // Clean up old initials
    for (const t of this._initTexts) t.destroy();
    this._initTexts = [];

    // Background
    this.bgGfx.clear();
    this.bgGfx.fillStyle(0x000000, 0.85);
    this.bgGfx.fillRect(0, boxY, W, BOX_HEIGHT);
    this.bgGfx.lineStyle(1, 0x00d4ff, 0.3);
    this.bgGfx.strokeRect(0, boxY, W, BOX_HEIGHT);

    const beat = this.currentBeat;
    const info = getPortraitInfo(beat.speaker);

    // Portrait
    const px = 16, py = boxY + 12;
    this.portraitGfx.clear();
    this.portraitImage.setVisible(false);

    if (beat.portrait && this.scene.textures.exists(beat.portrait)) {
      this.portraitImage.setTexture(beat.portrait);
      this.portraitImage.setPosition(px + PORTRAIT_SIZE / 2, py + PORTRAIT_SIZE / 2);
      this.portraitImage.setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
      this.portraitImage.setVisible(true);
    } else {
      // Colored rectangle placeholder with initial
      this.portraitGfx.fillStyle(info.bg, 0.3);
      this.portraitGfx.fillRect(px, py, PORTRAIT_SIZE, PORTRAIT_SIZE);
      this.portraitGfx.lineStyle(1, info.bg, 0.6);
      this.portraitGfx.strokeRect(px, py, PORTRAIT_SIZE, PORTRAIT_SIZE);

      const initText = this.scene.add.text(px + PORTRAIT_SIZE / 2, py + PORTRAIT_SIZE / 2, info.initial, {
        fontSize: '36px', fontFamily: '"Press Start 2P", monospace', color: info.label,
      }).setOrigin(0.5).setScrollFactor(0);
      this.container.add(initText);
      this._initTexts.push(initText);
    }

    // Speaker name
    const textX = px + PORTRAIT_SIZE + 16;
    this.speakerText.setPosition(textX, boxY + 12);
    this.speakerText.setText((beat.speaker || 'Unknown').toUpperCase());
    this.speakerText.setColor(info.label);

    // Dialogue text
    this.dialogueText.setPosition(textX, boxY + 32);
    this.dialogueText.setWordWrapWidth(W - textX - 20);
    this.dialogueText.setText('');

    // Advance hint
    this.advanceHint.setPosition(W - 16, H - 8);
  }

  update(delta) {
    if (!this.isOpen || !this.currentBeat) return;

    if (this.displayedChars < this.fullLineText.length) {
      this.displayedChars += CHARS_PER_SEC * (delta / 1000);
      const chars = Math.min(Math.floor(this.displayedChars), this.fullLineText.length);
      this.dialogueText.setText(this.fullLineText.substring(0, chars));

      if (chars >= this.fullLineText.length) {
        this.advanceHint.setVisible(true);
      }
    }
  }

  destroy() {
    this.container.destroy();
    for (const t of this._initTexts) t.destroy();
  }
}
