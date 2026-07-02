// Sound configs — all game audio definitions
// Referenced by entity configs via sound key strings
export const SOUND_CONFIGS = {
  // Weapons
  laser_fire:          { type: 'sweep', startFreq: 1200, endFreq: 400, duration: 0.08, wave: 'sine', vol: 0.12 },
  laser_hit:           { type: 'noise', duration: 0.05, vol: 0.08 },

  // Asteroids — per-type sounds
  asteroid_hit_rock:   { type: 'tone', freq: 800, duration: 0.05, wave: 'square', vol: 0.06 },
  asteroid_hit_ice:    { type: 'tone', freq: 1200, duration: 0.04, wave: 'sine', vol: 0.06 },
  asteroid_break_rock: { type: 'multi', sounds: [
    { type: 'tone', freq: 600, duration: 0.15, wave: 'sine', vol: 0.1 },
    { type: 'tone', freq: 900, duration: 0.15, wave: 'sine', vol: 0.1, delay: 0.08 },
  ]},
  asteroid_break_dark: { type: 'multi', sounds: [
    { type: 'tone', freq: 400, duration: 0.15, wave: 'sine', vol: 0.1 },
    { type: 'tone', freq: 700, duration: 0.15, wave: 'sine', vol: 0.08, delay: 0.08 },
  ]},
  asteroid_break_ice:  { type: 'multi', sounds: [
    { type: 'tone', freq: 1000, duration: 0.12, wave: 'sine', vol: 0.08 },
    { type: 'noise', duration: 0.1, vol: 0.06, delay: 0.05 },
  ]},

  // Enemies
  enemy_hit:           { type: 'tone', freq: 400, duration: 0.05, wave: 'square', vol: 0.06 },
  enemy_death_small:   { type: 'multi', sounds: [
    { type: 'noise', duration: 0.15, vol: 0.08 },
    { type: 'tone', freq: 200, duration: 0.2, wave: 'sine', vol: 0.06 },
  ]},

  // Ship
  player_hit:          { type: 'multi', sounds: [
    { type: 'noise', duration: 0.08, vol: 0.06 },
    { type: 'tone', freq: 150, duration: 0.15, wave: 'square', vol: 0.05 },
  ]},
  engine_hum:          { type: 'continuous', freq: 55, wave: 'sawtooth', vol: 0.04 },
  warp_whoosh:         { type: 'sweep', startFreq: 100, endFreq: 2000, duration: 0.5, wave: 'sawtooth', vol: 0.1 },

  // UI
  pickup:              { type: 'multi', sounds: [
    { type: 'tone', freq: 800, duration: 0.08, wave: 'sine', vol: 0.08 },
    { type: 'tone', freq: 1200, duration: 0.08, wave: 'sine', vol: 0.08, delay: 0.06 },
  ]},
  level_up:            { type: 'multi', sounds: [
    { type: 'tone', freq: 440, duration: 0.15, wave: 'sine', vol: 0.12 },
    { type: 'tone', freq: 550, duration: 0.15, wave: 'sine', vol: 0.12, delay: 0.12 },
    { type: 'tone', freq: 660, duration: 0.2, wave: 'sine', vol: 0.14, delay: 0.24 },
  ]},
  bark_blip:           { type: 'tone', freq: 600, duration: 0.05, wave: 'sine', vol: 0.08 },
  menu_click:          { type: 'tone', freq: 1000, duration: 0.02, wave: 'square', vol: 0.06 },
  inventory_whoosh:    { type: 'sweep', startFreq: 400, endFreq: 200, duration: 0.15, wave: 'sine', vol: 0.06 },
  mining_click:        { type: 'tone', freq: 800, duration: 0.05, wave: 'square', vol: 0.06 },

  // Asteroid deflect — dull clank (v0.7.f.1)
  asteroid_deflect:    { type: 'multi', sounds: [
    { type: 'tone', freq: 200, duration: 0.08, wave: 'square', vol: 0.07 },
    { type: 'noise', duration: 0.05, vol: 0.05 },
  ]},

  // Weapons (v0.7.e.3)
  cannon_fire:         { type: 'sweep', startFreq: 80, endFreq: 40, duration: 0.15, wave: 'sawtooth', vol: 0.14 },
  component_pickup:    { type: 'multi', sounds: [
    { type: 'tone', freq: 523, duration: 0.15, wave: 'sine', vol: 0.09 },
    { type: 'tone', freq: 659, duration: 0.15, wave: 'sine', vol: 0.09, delay: 0.12 },
    { type: 'tone', freq: 784, duration: 0.15, wave: 'sine', vol: 0.1, delay: 0.24 },
    { type: 'tone', freq: 1047, duration: 0.25, wave: 'sine', vol: 0.11, delay: 0.36 },
  ]},

  // Crafting (v0.7.e.1 — full SFX gap fill lands in v0.8.b)
  craft_complete:      { type: 'multi', sounds: [
    { type: 'tone', freq: 523, duration: 0.12, wave: 'sine', vol: 0.1 },
    { type: 'tone', freq: 659, duration: 0.12, wave: 'sine', vol: 0.1, delay: 0.1 },
    { type: 'tone', freq: 784, duration: 0.2, wave: 'sine', vol: 0.12, delay: 0.2 },
  ]},

  // Quest + boss stingers (v0.8.b)
  quest_complete:      { type: 'multi', sounds: [
    { type: 'tone', freq: 392, duration: 0.12, wave: 'square', vol: 0.08 },
    { type: 'tone', freq: 523, duration: 0.12, wave: 'square', vol: 0.08, delay: 0.11 },
    { type: 'tone', freq: 659, duration: 0.12, wave: 'square', vol: 0.09, delay: 0.22 },
    { type: 'tone', freq: 784, duration: 0.14, wave: 'square', vol: 0.1, delay: 0.33 },
    { type: 'tone', freq: 1047, duration: 0.3, wave: 'square', vol: 0.11, delay: 0.46 },
  ]},
  boss_phase:          { type: 'sweep', startFreq: 55, endFreq: 220, duration: 1.0, wave: 'sawtooth', vol: 0.12 },
  boss_defeat:         { type: 'multi', sounds: [
    { type: 'tone', freq: 440, duration: 0.2, wave: 'sawtooth', vol: 0.1 },
    { type: 'tone', freq: 349, duration: 0.2, wave: 'sawtooth', vol: 0.1, delay: 0.18 },
    { type: 'tone', freq: 262, duration: 0.2, wave: 'sawtooth', vol: 0.1, delay: 0.36 },
    { type: 'tone', freq: 175, duration: 0.4, wave: 'sawtooth', vol: 0.11, delay: 0.54 },
    { type: 'noise', duration: 0.6, vol: 0.1, delay: 0.7 },
  ]},

  // Transmissions
  transmission_static: { type: 'noise', duration: 0.3, vol: 0.05 },
  mother_hum:          { type: 'multi', sounds: [
    { type: 'tone', freq: 60, duration: 0.8, wave: 'sine', vol: 0.06 },
    { type: 'tone', freq: 63, duration: 0.8, wave: 'sine', vol: 0.04 },
  ]},

  // Music loops (per region) — stub definitions for setMusic()
  music_core:          { type: 'music', wave: 'sine', baseFreq: 220, chordPattern: 'major', bpm: 70, vol: 0.08 },
  music_frontier:      { type: 'music', wave: 'triangle', baseFreq: 196, chordPattern: 'minor', bpm: 80, vol: 0.08 },
  music_outer:         { type: 'music', wave: 'sine', baseFreq: 165, chordPattern: 'diminished', bpm: 60, vol: 0.1 },
  music_rift:          { type: 'music', wave: 'sawtooth', baseFreq: 130, chordPattern: 'minor', bpm: 50, vol: 0.1 },
  // Boss fight track (v0.9.c hooks setMusic('music_boss'))
  music_boss:          { type: 'music', wave: 'sawtooth', baseFreq: 110, chordPattern: 'diminished', bpm: 100, vol: 0.1 },
};
