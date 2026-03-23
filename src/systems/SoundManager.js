// ============================================================
// Sound Manager — Procedural Web Audio API sounds
// ============================================================

export default class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.5;
    this.engineOsc = null;
    this.engineGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      // Audio not available
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
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

  stopAll() {
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch (e) {}
      this.engineOsc = null;
      this.engineGain = null;
    }
  }
}
