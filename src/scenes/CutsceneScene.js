// ============================================================
// Cutscene Scene — per-beat speaker, portrait, SFX, transitions
// v0.7.d: Reads rich beat data from cutscene configs, legacy fallback
// ============================================================

import Phaser from 'phaser';
import { STORY_BEATS } from '../data/story.js';
import { getCutsceneConfig } from '../data/cutscenes/index.js';

const SPEAKER_COLORS = {
  PEPPER: '#87CEEB', PAX: '#e67e22', 'M.O.T.H.E.R.': '#e74c3c',
  OUTRIDER: '#2ecc71', GRIX: '#f39c12', VERA: '#3498db', '???': '#999999',
};

export default class CutsceneScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CutsceneScene' });
  }

  init(data) {
    this.beatId = data.beatId;
    this._padALast = false;
  }

  preload() {
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
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#000000');

    // Try rich config first, then legacy story.js
    const config = getCutsceneConfig(this.beatId);
    if (config) {
      this.beats = config.beats;
      this.sceneLabel = config.label || '';
    } else {
      const storyBeat = STORY_BEATS.find(b => b.id === this.beatId);
      if (storyBeat) {
        this.beats = storyBeat.lines.map(line => ({
          tmpl: 'dialogue', spk: (storyBeat.speaker || 'PEPPER').toUpperCase(),
          port: storyBeat.portrait || 'pepper_neutral', side: 'right',
          portLeft: 'pax_neutral', portRight: storyBeat.portrait || 'pepper_neutral',
          line, spd: 30, hold: 2500,
          sfx: 'none', enter: 'none', impact: 'none', trans: 'none',
        }));
        this.sceneLabel = '';
        this._legacyBeat = storyBeat; // keep for closeCutscene .next chain
      } else {
        this.closeCutscene();
        return;
      }
    }

    this.currentBeatIdx = 0;
    this.lineComplete = false;
    this.displayedChars = 0;
    this.fullLineText = '';

    // Dark panel placeholder
    const g = this.add.graphics();
    g.fillStyle(0x0a0a1a, 0.8);
    g.fillRect(W * 0.1, 40, W * 0.8, H * 0.45);
    g.lineStyle(1, 0x00d4ff, 0.2);
    g.strokeRect(W * 0.1, 40, W * 0.8, H * 0.45);

    // Scene label (e.g. "ACT I — DUST AND RUST")
    if (this.sceneLabel) {
      this.add.text(W / 2, H * 0.25, this.sceneLabel, {
        fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: '#444466',
      }).setOrigin(0.5);
    }

    // Text box at bottom
    const boxY = H - 180;
    this.boxGfx = this.add.graphics();
    this.boxGfx.fillStyle(0x000000, 0.9);
    this.boxGfx.fillRect(0, boxY, W, 180);
    this.boxGfx.lineStyle(1, 0x00d4ff, 0.3);
    this.boxGfx.strokeRect(0, boxY, W, 180);
    this.boxY = boxY;

    // Portraits (left + right)
    this.portraitLeft = null;
    this.portraitRight = null;
    this._portraitLeftKey = null;
    this._portraitRightKey = null;

    // Speaker name
    this.speakerText = this.add.text(110, boxY + 12, '', {
      fontSize: '13px', fontFamily: '"Press Start 2P", monospace', fontStyle: 'bold', color: '#87CEEB',
    });

    // Dialogue text
    this.dialogueText = this.add.text(110, boxY + 34, '', {
      fontSize: '12px', fontFamily: '"Press Start 2P", monospace', color: '#cccccc',
      wordWrap: { width: W - 140 }, lineSpacing: 4,
    });

    // Advance hint
    this.advanceHint = this.add.text(W - 16, H - 8, '[SPACE / Click / A]', {
      fontSize: '9px', fontFamily: '"Press Start 2P", monospace', color: '#666666',
    }).setOrigin(1, 1).setVisible(false);

    // Input
    this.input.keyboard.on('keydown-SPACE', () => this.advance());
    this.input.on('pointerdown', () => this.advance());

    // Fade in + show first beat
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.showBeat(0);
  }

  showBeat(index) {
    const beat = this.beats[index];
    if (!beat) { this.closeCutscene(); return; }

    this.currentBeatIdx = index;
    this.lineComplete = false;
    this.displayedChars = 0;
    this.fullLineText = beat.line;
    this.advanceHint.setVisible(false);
    this.dialogueText.setText('');

    // Speaker name + color
    this.speakerText.setText(beat.spk || '');
    this.speakerText.setColor(SPEAKER_COLORS[beat.spk] || '#ffffff');

    // Update portraits
    this._updatePortrait('left', beat.portLeft);
    this._updatePortrait('right', beat.portRight);

    // Dim non-speaking side
    const leftActive = beat.side === 'left';
    if (this.portraitLeft) this.portraitLeft.setAlpha(leftActive ? 1 : 0.4);
    if (this.portraitRight) this.portraitRight.setAlpha(leftActive ? 0.4 : 1);

    // Impact effect
    if (beat.impact === 'shake') {
      this.cameras.main.shake(200, 0.005);
    } else if (beat.impact === 'flash') {
      this.cameras.main.flash(200);
    }

    // SFX
    if (beat.sfx && beat.sfx !== 'none') {
      const fs = this.scene.get('FlightScene');
      if (fs && fs.sound_mgr) fs.sound_mgr.play(beat.sfx);
    }

    // Typewriter speed from beat
    this._charsPerSec = beat.spd || 30;
  }

  _updatePortrait(side, key) {
    if (!key) return;
    const propName = side === 'left' ? 'portraitLeft' : 'portraitRight';
    const keyProp = side === 'left' ? '_portraitLeftKey' : '_portraitRightKey';
    if (this[keyProp] === key) return; // no change
    this[keyProp] = key;

    if (this[propName]) { this[propName].destroy(); this[propName] = null; }

    const x = side === 'left' ? 50 : this.cameras.main.width - 50;
    const y = this.boxY + 50;
    if (this.textures.exists(key)) {
      this[propName] = this.add.image(x, y, key).setDisplaySize(72, 72);
    } else {
      // Colored rect fallback
      const g = this.add.graphics();
      g.fillStyle(0x1a2a3a, 0.4);
      g.fillRect(x - 36, y - 36, 72, 72);
      g.lineStyle(1, 0x1a2a3a, 0.6);
      g.strokeRect(x - 36, y - 36, 72, 72);
      this[propName] = g;
    }
  }

  advance() {
    if (!this.lineComplete) {
      // Skip typewriter — show full text
      this.displayedChars = this.fullLineText.length;
      this.dialogueText.setText(this.fullLineText);
      this.lineComplete = true;
      this.advanceHint.setVisible(true);
    } else {
      // Check exit transition
      const beat = this.beats[this.currentBeatIdx];
      if (beat && beat.trans === 'fade-black') {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.cameras.main.resetFX();
          this._nextBeat();
        });
      } else if (beat && beat.trans === 'fade-white') {
        this.cameras.main.fadeOut(400, 255, 255, 255);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.cameras.main.resetFX();
          this._nextBeat();
        });
      } else {
        this._nextBeat();
      }
    }
  }

  _nextBeat() {
    this.currentBeatIdx++;
    if (this.currentBeatIdx >= this.beats.length) {
      this.closeCutscene();
    } else {
      // Fade back in if previous had a fade-out transition
      const prevBeat = this.beats[this.currentBeatIdx - 1];
      if (prevBeat && (prevBeat.trans === 'fade-black' || prevBeat.trans === 'fade-white')) {
        this.cameras.main.fadeIn(300, 0, 0, 0);
      }
      this.showBeat(this.currentBeatIdx);
    }
  }

  update(time, delta) {
    // Gamepad A to advance (edge-triggered)
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const gpad = this.input.gamepad.getPad(0);
      const padA = gpad && gpad.A;
      if (padA && !this._padALast) this.advance();
      this._padALast = !!padA;
    }

    if (this.lineComplete) return;

    const prevChars = Math.floor(this.displayedChars);
    this.displayedChars += (this._charsPerSec || 30) * (delta / 1000);
    const chars = Math.min(Math.floor(this.displayedChars), this.fullLineText.length);
    this.dialogueText.setText(this.fullLineText.substring(0, chars));

    // Typewriter tick
    if (chars > prevChars) {
      const newChar = this.fullLineText[chars - 1];
      if (newChar && /[a-zA-Z0-9]/.test(newChar)) {
        const beat = this.beats[this.currentBeatIdx];
        const fs = this.scene.get('FlightScene');
        if (fs && fs.sound_mgr) {
          fs.sound_mgr.playTypewriterTick(beat ? beat.spk : 'PEPPER');
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

      // Legacy story.js next-beat chaining
      const storyBeat = this._legacyBeat || STORY_BEATS.find(b => b.id === this.beatId);
      if (storyBeat && storyBeat.next) {
        const flightScene = this.scene.get('FlightScene');
        if (flightScene && flightScene.triggerStoryBeat) {
          flightScene.triggerStoryBeat(storyBeat.next);
        }
      }
    });
  }
}
