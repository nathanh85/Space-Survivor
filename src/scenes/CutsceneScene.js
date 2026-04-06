// ============================================================
// Cutscene Scene — full-screen art + typewriter text overlay
// ============================================================

import Phaser from 'phaser';
import { STORY_BEATS } from '../data/story.js';

const CHARS_PER_SEC = 30;

const SPEAKER_COLORS = {
  pepper:       '#87CEEB',
  pax:          '#e67e22',
  'M.O.T.H.E.R.': '#e74c3c',
  outrider:     '#2ecc71',
  grix:         '#f39c12',
  'commander vera': '#3498db',
  '???':        '#999999',
};

function getSpeakerColor(speaker) {
  const key = (speaker || '').toLowerCase();
  if (SPEAKER_COLORS[key]) return SPEAKER_COLORS[key];
  for (const [k, v] of Object.entries(SPEAKER_COLORS)) {
    if (key.includes(k)) return v;
  }
  return '#ffffff';
}

export default class CutsceneScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CutsceneScene' });
  }

  init(data) {
    this.beatId = data.beatId;
    this.beat = STORY_BEATS.find(b => b.id === this.beatId);
    this.currentLineIndex = 0;
    this.displayedChars = 0;
    this.fullLineText = '';
    this.lineComplete = false;
  }

  preload() {
    // Load portraits here too — CutsceneScene may launch before FlightScene finishes loading
    const portraits = [
      'pax_neutral', 'pepper_neutral', 'mother', 'marshal', 'judge',
      'grix', 'vera', 'informant', 'miner', 'smuggler', 'commander', 'mechanic'
    ];
    portraits.forEach(p => {
      if (!this.textures.exists(p)) {
        this.load.image(p, `assets/portraits/${p}.png`);
      }
    });
  }

  create() {
    if (!this.beat) {
      this.closeCutscene();
      return;
    }

    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#000000');

    // Cutscene image (if available)
    const imgKey = 'cutscene_' + this.beatId;
    if (this.textures.exists(imgKey)) {
      this.add.image(W / 2, H / 2 - 60, imgKey).setOrigin(0.5);
    } else {
      // Dark panel placeholder
      const g = this.add.graphics();
      g.fillStyle(0x0a0a1a, 0.8);
      g.fillRect(W * 0.1, 40, W * 0.8, H * 0.5);
      g.lineStyle(1, 0x00d4ff, 0.2);
      g.strokeRect(W * 0.1, 40, W * 0.8, H * 0.5);

      this.add.text(W / 2, H * 0.3, '[Cutscene Art]', {
        fontSize: '16px', fontFamily: '"Press Start 2P", monospace', color: '#333344',
      }).setOrigin(0.5);
    }

    // Text area at bottom
    const boxY = H - 180;
    const g2 = this.add.graphics();
    g2.fillStyle(0x000000, 0.9);
    g2.fillRect(0, boxY, W, 180);
    g2.lineStyle(1, 0x00d4ff, 0.3);
    g2.strokeRect(0, boxY, W, 180);

    // Portrait (left side)
    const pMap = { pepper: 'pepper_neutral', pax: 'pax_neutral', 'M.O.T.H.E.R.': 'mother',
      grix: 'grix', 'commander vera': 'vera', '???': 'informant' };
    const pKey = pMap[(this.beat.speaker || '').toLowerCase()] || pMap[this.beat.speaker] || null;
    const portraitX = 16, portraitY = boxY + 12, pSize = 80;
    const textOffset = pKey ? pSize + 24 : 30;

    if (pKey && this.textures.exists(pKey)) {
      this.cutscenePortrait = this.add.image(portraitX + pSize / 2, portraitY + pSize / 2, pKey)
        .setDisplaySize(pSize, pSize);
    } else if (pKey) {
      // Colored rect fallback
      const colors = { pepper: 0x87CEEB, pax: 0xe67e22, 'M.O.T.H.E.R.': 0xe74c3c };
      const c = colors[(this.beat.speaker || '').toLowerCase()] || 0x1a2a3a;
      g2.fillStyle(c, 0.3);
      g2.fillRect(portraitX, portraitY, pSize, pSize);
      g2.lineStyle(1, c, 0.6);
      g2.strokeRect(portraitX, portraitY, pSize, pSize);
    }

    // Speaker name
    const speakerColor = getSpeakerColor(this.beat.speaker);
    this.add.text(textOffset, boxY + 12, (this.beat.speaker || '').toUpperCase(), {
      fontSize: '13px', fontFamily: '"Press Start 2P", monospace', fontStyle: 'bold', color: speakerColor,
    });

    // Dialogue text
    this.dialogueText = this.add.text(textOffset, boxY + 34, '', {
      fontSize: '12px', fontFamily: '"Press Start 2P", monospace', color: '#cccccc',
      wordWrap: { width: W - textOffset - 30 },
      lineSpacing: 4,
    });

    // Advance hint
    this.advanceHint = this.add.text(W - 16, H - 8, '[SPACE / Click / A]', {
      fontSize: '9px', fontFamily: '"Press Start 2P", monospace', color: '#666666',
    }).setOrigin(1, 1).setVisible(false);

    // Fade in + start first line
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.showLine();

    // Input
    this._padALast = false;
    this.input.keyboard.on('keydown-SPACE', () => this.advance());
    this.input.on('pointerdown', () => this.advance());
  }

  showLine() {
    if (this.currentLineIndex >= this.beat.lines.length) {
      this.closeCutscene();
      return;
    }
    this.fullLineText = this.beat.lines[this.currentLineIndex];
    this.displayedChars = 0;
    this.lineComplete = false;
    this.advanceHint.setVisible(false);
    this.dialogueText.setText('');
  }

  advance() {
    if (!this.lineComplete) {
      this.displayedChars = this.fullLineText.length;
      this.dialogueText.setText(this.fullLineText);
      this.lineComplete = true;
      this.advanceHint.setVisible(true);
    } else {
      this.currentLineIndex++;
      this.showLine();
    }
  }

  update(time, delta) {
    // Gamepad A to advance (edge-triggered)
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const gpad = this.input.gamepad.getPad(0);
      const padA = gpad && gpad.A;
      if (padA && !this._padALast) {
        this.advance();
      }
      this._padALast = !!padA;
    }

    if (this.lineComplete) return;

    const prevChars = Math.floor(this.displayedChars);
    this.displayedChars += CHARS_PER_SEC * (delta / 1000);
    const chars = Math.min(Math.floor(this.displayedChars), this.fullLineText.length);
    this.dialogueText.setText(this.fullLineText.substring(0, chars));

    // Typewriter tick
    if (chars > prevChars) {
      const newChar = this.fullLineText[chars - 1];
      if (newChar && /[a-zA-Z0-9]/.test(newChar)) {
        const flightScene = this.scene.get('FlightScene');
        if (flightScene && flightScene.sound_mgr) {
          flightScene.sound_mgr.playTypewriterTick(this.beat.speaker);
        }
      }
    }

    if (chars >= this.fullLineText.length) {
      this.lineComplete = true;
      this.advanceHint.setVisible(true);
    }
  }

  closeCutscene() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('CutsceneScene');
      this.scene.resume('FlightScene');

      if (this.beat && this.beat.next) {
        const flightScene = this.scene.get('FlightScene');
        if (flightScene && flightScene.triggerStoryBeat) {
          flightScene.triggerStoryBeat(this.beat.next);
        }
      }
    });
  }
}
