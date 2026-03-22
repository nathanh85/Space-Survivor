// ============================================================
// Dialogue UI — portrait + typewriter text box
// ============================================================

import Phaser from 'phaser';

const BOX_HEIGHT = 180;
const PORTRAIT_SIZE = 100;
const CHARS_PER_SEC = 30;
const SPEAKER_COLORS = {
  sister: '#87CEEB',
  station: '#00d4ff',
  default: '#ffffff',
};

export default class DialogueUI {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.currentBeat = null;
    this.currentLineIndex = 0;
    this.displayedChars = 0;
    this.fullLineText = '';
    this.onComplete = null;

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
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#87CEEB',
    }).setScrollFactor(0);
    this.container.add(this.speakerText);

    // Dialogue text
    this.dialogueText = scene.add.text(0, 0, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#cccccc',
      wordWrap: { width: 0 },
      lineSpacing: 4,
    }).setScrollFactor(0);
    this.container.add(this.dialogueText);

    // Advance hint
    this.advanceHint = scene.add.text(0, 0, '[SPACE / Click to continue]', {
      fontSize: '9px', fontFamily: 'monospace', color: '#666666',
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
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }

  showCurrentLine() {
    const beat = this.currentBeat;
    if (!beat || this.currentLineIndex >= beat.lines.length) {
      // All lines done
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
      // Skip to end of current line
      this.displayedChars = this.fullLineText.length;
      this.dialogueText.setText(this.fullLineText);
      this.advanceHint.setVisible(true);
    } else {
      // Next line
      this.currentLineIndex++;
      this.showCurrentLine();
    }
  }

  layout() {
    const W = this.scene.cameras.main.width;
    const H = this.scene.cameras.main.height;
    const boxY = H - BOX_HEIGHT;

    // Background
    this.bgGfx.clear();
    this.bgGfx.fillStyle(0x000000, 0.85);
    this.bgGfx.fillRect(0, boxY, W, BOX_HEIGHT);
    this.bgGfx.lineStyle(1, 0x00d4ff, 0.3);
    this.bgGfx.strokeRect(0, boxY, W, BOX_HEIGHT);

    const beat = this.currentBeat;

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
      // Placeholder colored rectangle with initial
      this.portraitGfx.fillStyle(0x1a2a3a);
      this.portraitGfx.fillRect(px, py, PORTRAIT_SIZE, PORTRAIT_SIZE);
      this.portraitGfx.lineStyle(1, 0x00d4ff, 0.5);
      this.portraitGfx.strokeRect(px, py, PORTRAIT_SIZE, PORTRAIT_SIZE);

      // Speaker initial
      const initial = (beat.speaker || '?')[0].toUpperCase();
      const initText = this.scene.add.text(px + PORTRAIT_SIZE / 2, py + PORTRAIT_SIZE / 2, initial, {
        fontSize: '36px', fontFamily: 'monospace', color: '#334455',
      }).setOrigin(0.5).setScrollFactor(0);
      this.container.add(initText);
      // Store for cleanup
      if (!this._initTexts) this._initTexts = [];
      this._initTexts.push(initText);
    }

    // Speaker name
    const textX = px + PORTRAIT_SIZE + 16;
    const speakerColor = SPEAKER_COLORS[beat.speaker] || SPEAKER_COLORS.default;
    this.speakerText.setPosition(textX, boxY + 12);
    this.speakerText.setText((beat.speaker || 'Unknown').toUpperCase());
    this.speakerText.setColor(speakerColor);

    // Dialogue text
    this.dialogueText.setPosition(textX, boxY + 32);
    this.dialogueText.setWordWrapWidth(W - textX - 20);
    this.dialogueText.setText('');

    // Advance hint
    this.advanceHint.setPosition(W - 16, H - 8);
  }

  update(delta) {
    if (!this.isOpen || !this.currentBeat) return;

    // Typewriter effect
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
    if (this._initTexts) {
      for (const t of this._initTexts) t.destroy();
    }
  }
}
