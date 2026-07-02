// ============================================================
// Sound Manager — Procedural Web Audio API sounds
// v0.7.c: Added play(soundKey) for config-driven sounds
// ============================================================

import { getSoundConfig } from '../data/entities/index.js';

export default class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.5;
    this.engineOsc = null;
    this.engineGain = null;
    this.initialized = false;

    // pests-music-v1 (v0.8.a)
    this.musicMaster = null;                 // mute-targetable music bus
    this.musicMuted = localStorage.getItem('pests_music_muted') === '1';
    this.currentMusicKey = null;
    this._music = null;                      // active music instance
    this._pendingMusicKey = undefined;       // queued while ctx suspended
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      // Music bus: instance gain → musicMaster → masterGain
      this.musicMaster = this.ctx.createGain();
      this.musicMaster.gain.value = this.musicMuted ? 0 : 1;
      this.musicMaster.connect(this.masterGain);
      this.initialized = true;
    } catch (e) {
      // Audio not available
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => this._flushPendingMusic());
    }
    return true;
  }

  _flushPendingMusic() {
    if (this._pendingMusicKey !== undefined && this.ctx && this.ctx.state === 'running') {
      const key = this._pendingMusicKey;
      this._pendingMusicKey = undefined;
      this._startMusic(key);
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  // --- Oscillator helper ---
  _playTone(freq, duration, type = 'sine', vol = 0.15, detune = 0) {
    if (!this.ensureContext()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // --- Noise helper ---
  _playNoise(duration, vol = 0.1) {
    if (!this.ensureContext()) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain).connect(this.masterGain);
    source.start();
  }

  // === SOUND EFFECTS ===

  playEngineStart() {
    this._playTone(80, 0.3, 'sawtooth', 0.08);
  }

  updateEngineHum(isThrusting) {
    if (!this.ensureContext()) return;

    if (isThrusting && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain.gain.value = 0.04;
      this.engineOsc.connect(this.engineGain).connect(this.masterGain);
      this.engineOsc.start();
    } else if (!isThrusting && this.engineOsc) {
      try { this.engineOsc.stop(); } catch (e) {}
      this.engineOsc = null;
      this.engineGain = null;
    }
  }

  playMiningClick() {
    this._playTone(800, 0.05, 'square', 0.06);
  }

  playMineComplete() {
    this._playTone(600, 0.15, 'sine', 0.1);
    setTimeout(() => this._playTone(900, 0.15, 'sine', 0.1), 80);
  }

  playWarpWhoosh() {
    if (!this.ensureContext()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 100;
    osc.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.5);
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
    this._playNoise(0.6, 0.06);
  }

  playBarkBlip() {
    this._playTone(600, 0.05, 'sine', 0.08);
  }

  playTransmissionStatic() {
    this._playNoise(0.3, 0.05);
  }

  playMotherHum() {
    this._playTone(60, 0.8, 'sine', 0.06);
    this._playTone(63, 0.8, 'sine', 0.04, 5);
  }

  playTypewriterTick(speaker) {
    if (!this.ensureContext()) return;
    const freq = speaker === 'M.O.T.H.E.R.' ? 600 : speaker === 'pepper' ? 1000 : 800;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.04;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.015);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.015);
  }

  playLaser() {
    if (!this.ensureContext()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playEnemyDeath() {
    this._playNoise(0.15, 0.08);
    this._playTone(200, 0.2, 'sine', 0.06);
  }

  playPickup() {
    this._playTone(800, 0.08, 'sine', 0.08);
    setTimeout(() => this._playTone(1200, 0.08, 'sine', 0.08), 60);
  }

  playLevelUpChime() {
    this._playTone(440, 0.15, 'sine', 0.12);
    setTimeout(() => this._playTone(550, 0.15, 'sine', 0.12), 120);
    setTimeout(() => this._playTone(660, 0.2, 'sine', 0.14), 240);
  }

  playPlayerHit() {
    this._playNoise(0.08, 0.06);
    this._playTone(150, 0.15, 'square', 0.05);
  }

  playMenuClick() {
    this._playTone(1000, 0.02, 'square', 0.06);
  }

  playInventoryWhoosh() {
    if (!this.ensureContext()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 400;
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.15);
    gain.gain.value = 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // --- Config-driven sound player ---
  play(soundKey) {
    const config = getSoundConfig(soundKey);
    if (!config) return;
    if (config.type === 'tone') {
      this._playTone(config.freq, config.duration, config.wave || 'sine', config.vol || 0.1, config.detune || 0);
    } else if (config.type === 'noise') {
      this._playNoise(config.duration, config.vol || 0.1);
    } else if (config.type === 'sweep') {
      this._playSweep(config.startFreq, config.endFreq, config.duration, config.wave || 'sine', config.vol || 0.1);
    } else if (config.type === 'multi') {
      for (const s of config.sounds) {
        const delay = s.delay || 0;
        if (delay > 0) {
          setTimeout(() => this._playSoundDef(s), delay * 1000);
        } else {
          this._playSoundDef(s);
        }
      }
    }
    // 'music' and 'continuous' types handled by setMusic() and engine hum
  }

  _playSoundDef(def) {
    if (def.type === 'tone') this._playTone(def.freq, def.duration, def.wave || 'sine', def.vol || 0.1, def.detune || 0);
    else if (def.type === 'noise') this._playNoise(def.duration, def.vol || 0.1);
    else if (def.type === 'sweep') this._playSweep(def.startFreq, def.endFreq, def.duration, def.wave || 'sine', def.vol || 0.1);
  }

  _playSweep(startFreq, endFreq, duration, type = 'sine', vol = 0.1) {
    if (!this.ensureContext()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = startFreq;
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), this.ctx.currentTime + duration);
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.05);
  }

  // ============================================================
  // pests-music-v1 (v0.8.a) — regional music runtime
  // Lookahead scheduler (25ms tick, 100ms window), generative fallback,
  // optional `song` block support (Audio Forge export format).
  // ============================================================

  setMusic(regionKey) {
    const key = regionKey || null;
    if (key === this.currentMusicKey) return; // same-key no-op
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      // Queue until first user-gesture unlock (autoplay policy)
      this._pendingMusicKey = key;
      this.currentMusicKey = key;
      return;
    }
    this._startMusic(key);
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    localStorage.setItem('pests_music_muted', this.musicMuted ? '1' : '0');
    if (this.musicMaster) this.musicMaster.gain.value = this.musicMuted ? 0 : 1;
    return this.musicMuted;
  }

  _startMusic(key) {
    this.currentMusicKey = key;
    this._stopMusicInstance(1.5); // crossfade out whatever is playing
    if (!key) return;
    const def = getSoundConfig(key);
    if (!def || def.type !== 'music') return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(def.vol || 0.08, this.ctx.currentTime + 1.5);
    gain.connect(this.musicMaster);

    const inst = {
      key, def, gain,
      loopIndex: 0,
      loopStart: this.ctx.currentTime + 0.1,
      queue: [],
      interval: null,
    };
    inst.loopDur = this._musicLoopDur(def);
    inst.queue = this._musicLoopEvents(def, inst.loopIndex);

    // Lookahead scheduler: 25ms tick schedules events in the next 100ms
    inst.interval = setInterval(() => {
      if (!this.ctx) return;
      const horizon = this.ctx.currentTime + 0.1;
      while (inst.queue.length > 0 && inst.loopStart + inst.queue[0].t <= horizon) {
        const ev = inst.queue.shift();
        this._playMusicEvent(ev, inst.loopStart + ev.t, inst.gain);
      }
      // Loop wrap: refill queue for the next pass
      if (inst.queue.length === 0) {
        inst.loopIndex++;
        inst.loopStart += inst.loopDur;
        inst.queue = this._musicLoopEvents(inst.def, inst.loopIndex);
      }
    }, 25);

    this._music = inst;
  }

  _stopMusicInstance(fadeSec = 0) {
    const inst = this._music;
    if (!inst) return;
    this._music = null;
    if (this.ctx && fadeSec > 0) {
      const now = this.ctx.currentTime;
      inst.gain.gain.cancelScheduledValues(now);
      inst.gain.gain.setValueAtTime(inst.gain.gain.value, now);
      inst.gain.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      // Let scheduled notes ring through the fade, then kill the scheduler
      setTimeout(() => {
        clearInterval(inst.interval);
        try { inst.gain.disconnect(); } catch (e) {}
      }, (fadeSec + 0.2) * 1000);
    } else {
      clearInterval(inst.interval);
      try { inst.gain.disconnect(); } catch (e) {}
    }
  }

  _musicLoopDur(def) {
    if (def.song) {
      const s = def.song;
      const stepDur = (60 / s.bpm) * 4 / s.stepsPerBar;
      return s.bars * s.stepsPerBar * stepDur;
    }
    return (60 / (def.bpm || 70)) * 4 * 4; // 4 bars of 4/4
  }

  // Events for one loop pass, times relative to loop start, sorted.
  _musicLoopEvents(def, loopIndex) {
    const events = [];
    if (def.song) {
      const s = def.song;
      const stepDur = (60 / s.bpm) * 4 / s.stepsPerBar;
      for (const tr of s.tracks || []) {
        for (const n of tr.notes || []) {
          events.push({
            t: n.step * stepDur,
            dur: (n.len || 1) * stepDur,
            freq: 440 * Math.pow(2, (n.midi - 69) / 12),
            wave: tr.wave || 'sine',
            vol: tr.vol || 0.06,
            adsr: tr.adsr || { a: 0.02, d: 0.1, s: 0.6, r: 0.3 },
          });
        }
      }
    } else {
      // Generative fallback: pad (2 detuned oscs, chord tone cycles every
      // 2 bars) + pulse pluck on beats 1 and 3 (root/fifth alternating)
      const beat = 60 / (def.bpm || 70);
      const barDur = beat * 4;
      const chords = { major: [0, 4, 7, 12], minor: [0, 3, 7, 12], diminished: [0, 3, 6, 9] };
      const offs = chords[def.chordPattern] || chords.major;
      for (let seg = 0; seg < 2; seg++) {
        const off = offs[(loopIndex * 2 + seg) % offs.length];
        const freq = (def.baseFreq || 220) * Math.pow(2, off / 12);
        for (const det of [-4, 4]) {
          events.push({
            t: seg * 2 * barDur, dur: 2 * barDur, freq,
            wave: def.wave || 'sine', vol: (def.vol || 0.08) * 0.55,
            adsr: { a: 1.4, d: 0.6, s: 0.85, r: 1.6 }, detune: det,
          });
        }
      }
      for (let bar = 0; bar < 4; bar++) {
        for (const beatIdx of [0, 2]) {
          const useFifth = (bar + beatIdx / 2) % 2 === 1;
          const off = useFifth ? 7 : 0;
          events.push({
            t: bar * barDur + beatIdx * beat, dur: 0.15,
            freq: (def.baseFreq || 220) * Math.pow(2, off / 12) * 2,
            wave: def.wave || 'sine', vol: (def.vol || 0.08) * 0.7,
            adsr: { a: 0.005, d: 0.05, s: 0.3, r: 0.08 },
          });
        }
      }
    }
    events.sort((a, b) => a.t - b.t);
    return events;
  }

  _playMusicEvent(ev, when, outGain) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = ev.wave;
    osc.frequency.value = ev.freq;
    if (ev.detune) osc.detune.value = ev.detune;

    const a = ev.adsr.a, d = ev.adsr.d, s = ev.adsr.s, r = ev.adsr.r;
    const peak = ev.vol;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + a);
    g.gain.linearRampToValueAtTime(peak * s, when + a + d);
    g.gain.setValueAtTime(peak * s, Math.max(when + a + d, when + ev.dur));
    g.gain.linearRampToValueAtTime(0.0001, when + ev.dur + r);

    osc.connect(g).connect(outGain);
    osc.start(when);
    osc.stop(when + ev.dur + r + 0.05);
    osc.onended = () => { try { osc.disconnect(); g.disconnect(); } catch (e) {} };
  }

  stopAll() {
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch (e) {}
      this.engineOsc = null;
      this.engineGain = null;
    }
  }
}
