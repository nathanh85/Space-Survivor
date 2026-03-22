// ============================================================
// Flight Scene — main gameplay: flight, mining, narrative
// ============================================================

import Phaser from 'phaser';
import { SYS_W, SYS_H, UNIVERSE_COLS, UNIVERSE_ROWS, DANGER_COLORS } from '../config/constants.js';
import { generateUniverse, generateSystem } from '../systems/UniverseGenerator.js';
import Player from '../entities/Player.js';
import InventorySystem from '../systems/InventorySystem.js';
import { RESOURCES, getAvailableResources } from '../data/resources.js';
import { RNG } from '../config/constants.js';
import { STORY_BEATS, getStoryBeat } from '../data/story.js';
import { NPCS } from '../data/npcs.js';
import DialogueUI from '../ui/DialogueUI.js';

export default class FlightScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FlightScene' });
  }

  preload() {
    // Art assets will be loaded when they exist.
    // For now, all portraits/cutscenes use placeholder fallbacks.
    // To add art: place PNGs in public/assets/portraits/ and public/assets/cutscenes/
    // Then uncomment the loaders below:
    //
    // this.load.image('sister_neutral', 'assets/portraits/sister_neutral.png');
    // this.load.image('npc_merchant1', 'assets/portraits/npc_merchant1.png');
    // this.load.image('cutscene_act1_intro', 'assets/cutscenes/act1_intro.png');
    //
    // this.load.on('loaderror', () => {}); // silently ignore missing
  }

  create() {
    // Universe
    this.universe = generateUniverse(42);
    this.systemCache = {};
    this.currentSystemId = null;
    this.currentSystem = null;
    this.fog = new Set();
    this.visited = new Set();
    this.nearGate = null;
    this.nearStation = null;
    this.inventory = new InventorySystem();
    this.miningAsteroid = null;
    this.invOpen = false;
    this.dialogueActive = false;

    // Story state
    this.firedTriggers = new Set();
    this.firstMineComplete = false;
    this.nearAsteroidTriggered = false;

    // Input
    this.cursors = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D',
    });
    this.input.keyboard.on('keydown-M', () => { if (!this.dialogueActive) this.openGalaxyMap(); });
    this.input.keyboard.on('keydown-E', () => { if (!this.dialogueActive) this.tryWarp(); });
    this.input.keyboard.on('keydown-F', () => { if (!this.dialogueActive) this.tryDock(); });
    this.input.keyboard.on('keydown-TAB', (e) => { e.preventDefault(); if (!this.dialogueActive) this.toggleInventory(); });
    this.input.keyboard.on('keydown-I', () => { if (!this.dialogueActive) this.toggleInventory(); });

    // World + Camera
    this.physics.world.setBounds(0, 0, SYS_W, SYS_H);
    this.cameras.main.setBackgroundColor('#0a0a18');
    this.cameras.main.setBounds(0, 0, SYS_W, SYS_H);

    // Graphics layers
    this.bgLayer = this.add.graphics().setDepth(0);
    this.starLayer = this.add.graphics().setDepth(5);
    this.orbitLayer = this.add.graphics().setDepth(10);
    this.staticEntityGfx = this.add.graphics().setDepth(20);  // planets (static)
    this.animEntityGfx = this.add.graphics().setDepth(21);    // asteroids, gates, stations (animated)
    this.miningGfx = this.add.graphics().setDepth(200);
    this.labelTexts = [];

    // Player
    this.player = new Player(this, SYS_W / 2, SYS_H / 2);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // HUD
    this.hudGfx = this.add.graphics().setScrollFactor(0).setDepth(500);
    this.crosshairGfx = this.add.graphics().setScrollFactor(0).setDepth(510);
    this.minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(500);

    this.barLabels = [];
    this.barValues = [];
    const barConfig = [
      { label: 'HULL', lc: '#e74c3c' }, { label: 'SHLD', lc: '#00d4ff' },
      { label: 'FUEL', lc: '#f1c40f' }, { label: 'LV1',  lc: '#bb6bd9' },
    ];
    for (let i = 0; i < 4; i++) {
      const y = 12 + i * 18;
      this.barLabels.push(this.add.text(10, y, barConfig[i].label, {
        fontSize: '10px', fontFamily: 'monospace', color: barConfig[i].lc,
      }).setScrollFactor(0).setDepth(501));
      this.barValues.push(this.add.text(164, y, '', {
        fontSize: '9px', fontFamily: 'monospace', color: '#888888',
      }).setScrollFactor(0).setDepth(501));
    }

    this.sysInfoTexts = [
      this.add.text(14, 0, '', { fontSize: '10px', fontFamily: 'monospace', color: '#00d4ff' }).setScrollFactor(0).setDepth(501),
      this.add.text(14, 0, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff' }).setScrollFactor(0).setDepth(501),
      this.add.text(14, 0, '', { fontSize: '10px', fontFamily: 'monospace', color: '#e74c3c' }).setScrollFactor(0).setDepth(501),
    ];

    this.controlsText = this.add.text(0, 0, '[WASD] Move  [Mouse] Aim  [M] Map  [E] Warp  [F] Dock  [TAB] Inv', {
      fontSize: '9px', fontFamily: 'monospace', color: '#444444',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(501);

    this.promptText = this.add.text(0, 0, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#00d4ff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501).setVisible(false);

    // Inventory UI
    this.invGfx = this.add.graphics().setScrollFactor(0).setDepth(600).setVisible(false);
    this.invTexts = [];

    // Dialogue UI
    this.dialogueUI = new DialogueUI(this);

    // Bark system
    this.barkText = this.add.text(0, 0, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#87CEEB',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(520).setVisible(false);
    this.barkTimer = null;

    // Transmission system
    this.transText = this.add.text(0, 0, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#33ff66',
      backgroundColor: 'rgba(0,20,0,0.8)', padding: { x: 14, y: 8 },
      stroke: '#1a4a1a', strokeThickness: 1,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(520).setVisible(false);
    this.transQueue = [];
    this.transTimer = null;

    // Entity data
    this.planets = [];
    this.asteroids = [];
    this.stations = [];
    this.gates = [];
    this.gameTime = 0;

    // Enter starting system
    const start = this.universe.find(s => s.region.key === 'CORE') || this.universe[0];
    this.enterSystem(start.id);

    // Fire game_start cutscene
    this.time.delayedCall(500, () => this.triggerStoryBeat('game_start'));
  }

  // ========== SYSTEM MANAGEMENT ==========

  enterSystem(sysId) {
    const sysData = this.universe.find(s => s.id === sysId);
    if (!sysData) return;

    for (const t of this.labelTexts) t.destroy();
    this.labelTexts = [];
    this.staticEntityGfx.clear();
    this.animEntityGfx.clear();
    this.miningGfx.clear();
    this.miningAsteroid = null;

    if (!this.systemCache[sysId]) {
      this.systemCache[sysId] = generateSystem(sysData, this.universe);
      // Assign NPC to each station
      const rng = new RNG(sysData.seed + 5555);
      for (const st of this.systemCache[sysId].stations) {
        st.npc = NPCS[rng.int(0, NPCS.length - 1)];
      }
    }

    const isFirstVisit = !this.visited.has(sysId);
    this.currentSystemId = sysId;
    this.currentSystem = this.systemCache[sysId];
    this.visited.add(sysId);
    this.revealFog(sysData.col, sysData.row, 2);

    const sys = this.currentSystem;
    this.assignResources(sys.asteroids, sysData, sys.planets);
    this.planets = sys.planets;
    this.asteroids = sys.asteroids;
    this.stations = sys.stations;
    this.gates = sys.gates;

    this.drawBgStars(sys.bgStars);
    this.drawStar(sys.star);
    this.drawOrbits(sys);
    this.drawStaticEntities();

    this.player.setPosition(sys.star.x, sys.star.y - 180);
    if (this.player.body) this.player.body.setVelocity(0, 0);

    // Transmission on first visit to a new system (not the starting one)
    if (isFirstVisit && this.visited.size > 1) {
      this.triggerStoryBeat('enter_system_first');
    }
  }

  assignResources(asteroids, sysData, planets) {
    const rng = new RNG(sysData.seed + 7777);
    for (const a of asteroids) {
      let nearest = planets[0], nd = Infinity;
      for (const p of planets) {
        const d = Math.hypot(a.x - p.x, a.y - p.y);
        if (d < nd) { nd = d; nearest = p; }
      }
      const avail = getAvailableResources(nearest.type, sysData.region.key);
      a.resourceId = avail.length > 0 ? rng.pick(avail).id : null;
      a.mined = false;
      a.mineProgress = 0;
      const res = RESOURCES[a.resourceId];
      a.mineTime = res ? 1.0 + (res.tier.level - 1) * 0.5 : 2;
    }
  }

  revealFog(col, row, radius) {
    for (let y = row - radius; y <= row + radius; y++)
      for (let x = col - radius; x <= col + radius; x++)
        if (x >= 0 && x < UNIVERSE_COLS && y >= 0 && y < UNIVERSE_ROWS)
          this.fog.add(`${x}_${y}`);
  }

  // ========== STATIC DRAWING (once per system) ==========

  drawBgStars(stars) {
    const g = this.bgLayer; g.clear();
    for (const s of stars) {
      g.fillStyle(0xffffff, s.brightness * 0.7);
      g.fillRect(s.x, s.y, s.size, s.size);
    }
  }

  drawStar(star) {
    const g = this.starLayer; g.clear();
    const c = Phaser.Display.Color.HexStringToColor(star.color).color;
    g.fillStyle(c, 0.06); g.fillCircle(star.x, star.y, star.radius * 3);
    g.fillStyle(c, 0.12); g.fillCircle(star.x, star.y, star.radius * 2);
    g.fillStyle(0xffffff); g.fillCircle(star.x, star.y, star.radius * 0.4);
    g.fillStyle(c, 0.9); g.fillCircle(star.x, star.y, star.radius);
  }

  drawOrbits(sys) {
    const g = this.orbitLayer; g.clear();
    g.lineStyle(1, 0xffffff, 0.04);
    for (const p of sys.planets) g.strokeCircle(sys.star.x, sys.star.y, p.orbitDist);
  }

  drawStaticEntities() {
    const g = this.staticEntityGfx; g.clear();
    // Planets (never animate)
    for (const p of this.planets) {
      const c = Phaser.Display.Color.HexStringToColor(p.type.color).color;
      g.fillStyle(c); g.fillCircle(p.x, p.y, p.radius);
      g.fillStyle(0xffffff, 0.15); g.fillCircle(p.x - p.radius * 0.25, p.y - p.radius * 0.25, p.radius * 0.6);
      this.labelTexts.push(this.add.text(p.x, p.y + p.radius + 12, p.type.name, {
        fontSize: '10px', fontFamily: 'monospace', color: '#aaa',
      }).setOrigin(0.5, 0).setDepth(22));
    }
    // Station labels
    for (const s of this.stations) {
      this.labelTexts.push(this.add.text(s.x, s.y + s.size + 12, s.name, {
        fontSize: '9px', fontFamily: 'monospace', color: '#00d4ff',
      }).setOrigin(0.5, 0).setDepth(22));
    }
    // Gate labels
    for (const ga of this.gates) {
      this.labelTexts.push(this.add.text(ga.x, ga.y + ga.size + 12,
        ga.targetName + (ga.isDungeon ? ' \u26A0' : ''), {
        fontSize: '9px', fontFamily: 'monospace', color: ga.isDungeon ? '#ff00ff' : '#00d4ff',
      }).setOrigin(0.5, 0).setDepth(22).setAlpha(0.7));
    }
  }

  // ========== ANIMATED ENTITIES (redrawn each frame, lightweight) ==========

  drawAnimatedEntities(time) {
    const g = this.animEntityGfx; g.clear();
    const t = time / 1000; // seconds

    // Asteroids with rotation
    for (const a of this.asteroids) {
      if (a.mined) continue;
      const c = Phaser.Display.Color.HexStringToColor(a.color).color;
      const rot = a.rotation + t * a.rotSpeed * 60;
      const s = a.size;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      // Rotated rectangle corners
      const hw = s / 2, hh = s * 0.4;
      const points = [
        { x: a.x + (-hw * cos - -hh * sin), y: a.y + (-hw * sin + -hh * cos) },
        { x: a.x + (hw * cos - -hh * sin),  y: a.y + (hw * sin + -hh * cos) },
        { x: a.x + (hw * cos - hh * sin),   y: a.y + (hw * sin + hh * cos) },
        { x: a.x + (-hw * cos - hh * sin),  y: a.y + (-hw * sin + hh * cos) },
      ];
      g.fillStyle(c);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < 4; i++) g.lineTo(points[i].x, points[i].y);
      g.closePath();
      g.fillPath();
    }

    // Stations with slow rotation
    for (const s of this.stations) {
      const rot = t * 0.3;
      const sz = s.size;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const hw = sz / 2, hh = sz / 2;
      // Rotated square
      const pts = [
        { x: s.x + (-hw * cos - -hh * sin), y: s.y + (-hw * sin + -hh * cos) },
        { x: s.x + (hw * cos - -hh * sin),  y: s.y + (hw * sin + -hh * cos) },
        { x: s.x + (hw * cos - hh * sin),   y: s.y + (hw * sin + hh * cos) },
        { x: s.x + (-hw * cos - hh * sin),  y: s.y + (-hw * sin + hh * cos) },
      ];
      g.fillStyle(0xcccccc);
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath(); g.fillPath();
      // Border
      g.lineStyle(1, 0x00d4ff, 0.8);
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath(); g.strokePath();
    }

    // Warp gates with spinning dots
    for (const ga of this.gates) {
      const c = ga.isDungeon ? 0xff00ff : 0x00d4ff;
      const pulse = Math.sin(t * 3) * 0.3 + 0.7;
      g.lineStyle(2, c, pulse);
      g.strokeCircle(ga.x, ga.y, ga.size);
      g.fillStyle(c, 0.15 * pulse);
      g.fillCircle(ga.x, ga.y, ga.size);
      // 4 orbiting dots
      for (let i = 0; i < 4; i++) {
        const a2 = t * 1.8 + i * Math.PI / 2;
        g.fillStyle(c, pulse);
        g.fillRect(ga.x + Math.cos(a2) * ga.size * 0.7 - 2, ga.y + Math.sin(a2) * ga.size * 0.7 - 2, 4, 4);
      }
    }
  }

  // ========== ENGINE TRAILS ==========

  spawnEngineTrail() {
    const px = this.player.x - Math.cos(this.player.shipAngle) * 14 + (Math.random() - 0.5) * 6;
    const py = this.player.y - Math.sin(this.player.shipAngle) * 14 + (Math.random() - 0.5) * 6;
    const trail = this.add.rectangle(px, py, 3, 3,
      Math.random() > 0.5 ? 0x00d4ff : 0x00aaff
    ).setAlpha(0.8).setDepth(90);
    this.tweens.add({
      targets: trail, alpha: 0, scaleX: 0, scaleY: 0,
      duration: 400, onComplete: () => trail.destroy(),
    });
  }

  // ========== UPDATE ==========

  update(time, delta) {
    if (!this.currentSystem) return;
    const dt = delta / 1000;
    this.gameTime = time;
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Dialogue UI update (typewriter)
    if (this.dialogueUI.isOpen) {
      this.dialogueUI.update(delta);
      return; // Don't process game input while dialogue open
    }

    if (this.invOpen) {
      this.drawInventory(W, H);
      return;
    }

    // Player
    this.player.update(this.cursors, this.input.activePointer);

    // Engine trails
    if (this.player.body && (Math.abs(this.player.body.velocity.x) > 30 || Math.abs(this.player.body.velocity.y) > 30)) {
      this.spawnEngineTrail();
    }

    // Gate proximity
    this.nearGate = null;
    for (const ga of this.gates) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, ga.x, ga.y) < 55) {
        this.nearGate = ga; break;
      }
    }

    // Station proximity
    this.nearStation = null;
    for (const st of this.stations) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, st.x, st.y) < 100) {
        this.nearStation = st; break;
      }
    }

    // Asteroid proximity — bark trigger
    if (!this.nearAsteroidTriggered) {
      for (const a of this.asteroids) {
        if (!a.mined && Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) < 80) {
          this.nearAsteroidTriggered = true;
          this.triggerStoryBeat('near_asteroid_first');
          break;
        }
      }
    }

    // Low fuel bark
    if (this.player.fuel < this.player.maxFuel * 0.2) {
      this.triggerStoryBeat('fuel_below_20');
    }

    // Animated entities
    this.drawAnimatedEntities(time);

    // Mining
    this.handleMining(dt);

    // HUD
    this.updateHUD(W, H);
    this.updateMinimap(W, H);
    this.updateCrosshair(W, H);
    this.updatePrompt(W, H);
  }

  // ========== PROMPT (warp / dock) ==========

  updatePrompt(W, H) {
    if (this.nearGate) {
      const gt = this.nearGate;
      this.promptText.setText('[E] WARP \u2192 ' + gt.targetName + (gt.isDungeon ? ' \u26A0 DUNGEON' : ''))
        .setColor(gt.isDungeon ? '#ff00ff' : '#00d4ff').setPosition(W / 2, H - 60).setVisible(true);
    } else if (this.nearStation) {
      this.promptText.setText('[F] Dock at ' + this.nearStation.name)
        .setColor('#00d4ff').setPosition(W / 2, H - 60).setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }

  // ========== MINING ==========

  handleMining(dt) {
    const ptr = this.input.activePointer;
    this.miningGfx.clear();
    if (!ptr.isDown || this.invOpen || this.dialogueActive) {
      if (this.miningAsteroid) { this.miningAsteroid.mineProgress = 0; this.miningAsteroid = null; }
      return;
    }
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    let closest = null, cd = Infinity;
    for (const a of this.asteroids) {
      if (a.mined) continue;
      const dc = Phaser.Math.Distance.Between(wp.x, wp.y, a.x, a.y);
      const dp = Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y);
      if (dc < 25 && dp < 120 && dc < cd) { closest = a; cd = dc; }
    }
    if (!closest) {
      if (this.miningAsteroid) { this.miningAsteroid.mineProgress = 0; this.miningAsteroid = null; }
      return;
    }
    if (this.miningAsteroid !== closest) {
      if (this.miningAsteroid) this.miningAsteroid.mineProgress = 0;
      this.miningAsteroid = closest;
    }
    closest.mineProgress += dt / closest.mineTime;
    this.miningGfx.lineStyle(1.5, 0x00d4ff, 0.6);
    this.miningGfx.strokeCircle(closest.x, closest.y, closest.size + 5);
    if (closest.mineProgress > 0 && closest.mineProgress < 1) {
      const bw = closest.size * 3;
      this.miningGfx.fillStyle(0x333333, 0.8);
      this.miningGfx.fillRect(closest.x - bw / 2, closest.y + closest.size + 4, bw, 3);
      this.miningGfx.fillStyle(0x00d4ff);
      this.miningGfx.fillRect(closest.x - bw / 2, closest.y + closest.size + 4, bw * closest.mineProgress, 3);
    }
    if (closest.mineProgress >= 1) {
      closest.mined = true;
      const res = RESOURCES[closest.resourceId];
      if (res) {
        const amt = 1 + Math.floor(Math.random() * 2);
        this.inventory.addItem(closest.resourceId, amt);
        const ft = this.add.text(closest.x, closest.y - 15, '+' + amt + ' ' + res.name, {
          fontSize: '11px', fontFamily: 'monospace', color: res.tier.color, stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(300);
        this.tweens.add({ targets: ft, y: closest.y - 45, alpha: 0, duration: 1200, onComplete: () => ft.destroy() });
      }
      // First mine bark
      if (!this.firstMineComplete) {
        this.firstMineComplete = true;
        this.triggerStoryBeat('first_mine_complete');
      }
    }
  }

  // ========== STORY / BARK / TRANSMISSION ==========

  triggerStoryBeat(trigger) {
    if (this.firedTriggers.has(trigger)) return;
    const beat = getStoryBeat(trigger);
    if (!beat) return;
    this.firedTriggers.add(trigger);

    if (beat.type === 'cutscene') {
      this.scene.pause('FlightScene');
      this.scene.launch('CutsceneScene', { beatId: beat.id });
    } else if (beat.type === 'bark') {
      this.showBark(beat.lines[0]);
    } else if (beat.type === 'transmission') {
      this.showTransmission(beat.lines);
    }
  }

  showBark(text) {
    const W = this.cameras.main.width;
    this.barkText.setText(text).setPosition(W / 2, 80).setAlpha(0).setVisible(true);
    this.tweens.add({ targets: this.barkText, alpha: 1, y: 90, duration: 300 });
    if (this.barkTimer) this.barkTimer.remove();
    this.barkTimer = this.time.delayedCall(3500, () => {
      this.tweens.add({ targets: this.barkText, alpha: 0, y: 80, duration: 300,
        onComplete: () => this.barkText.setVisible(false) });
    });
  }

  showTransmission(lines) {
    const W = this.cameras.main.width;
    let delay = 0;
    for (const line of lines) {
      this.time.delayedCall(delay, () => {
        this.transText.setText('\u25C8 ' + line).setPosition(W / 2, 50).setAlpha(0).setVisible(true);
        this.tweens.add({ targets: this.transText, alpha: 1, duration: 200 });
      });
      delay += 2500;
    }
    this.time.delayedCall(delay, () => {
      this.tweens.add({ targets: this.transText, alpha: 0, duration: 400,
        onComplete: () => this.transText.setVisible(false) });
    });
  }

  // ========== NPC DOCKING ==========

  tryDock() {
    if (!this.nearStation || this.invOpen) return;
    const npc = this.nearStation.npc;
    if (!npc) return;

    this.dialogueActive = true;
    const lines = this.getNPCDialogueLines(npc);
    const beat = {
      speaker: npc.name,
      portrait: npc.portrait,
      lines: lines,
      choices: null,
    };
    this.dialogueUI.show(beat, () => {
      this.dialogueActive = false;
    });
  }

  getNPCDialogueLines(npc) {
    const d = npc.dialogue;
    if (npc.type === 'merchant') {
      return [d.greeting, d.browse, d.farewell];
    } else if (npc.type === 'quest_giver') {
      return [d.greeting, d.quest_offer, d.farewell];
    } else if (npc.type === 'informant') {
      return [d.greeting, d.hint, d.farewell];
    }
    return [d.greeting || 'Hello.', d.farewell || 'Goodbye.'];
  }

  // ========== HUD ==========

  updateHUD(W, H) {
    const g = this.hudGfx; g.clear();
    const p = this.player;
    const vals = [
      { val: p.hull, max: p.maxHull, c: 0xe74c3c },
      { val: p.shield, max: p.maxShield, c: 0x3498db },
      { val: p.fuel, max: p.maxFuel, c: 0xf39c12 },
      { val: p.xp, max: p.xpNext, c: 0x8e44ad },
    ];
    for (let i = 0; i < 4; i++) {
      const v = vals[i], y = 12 + i * 18;
      g.fillStyle(0xffffff, 0.08); g.fillRect(48, y + 1, 110, 8);
      g.fillStyle(v.c); g.fillRect(48, y + 1, 110 * Math.max(0, v.val / v.max), 8);
      this.barValues[i].setText(Math.floor(v.val) + '/' + v.max);
    }
    this.barLabels[3].setText('LV' + p.level);

    const sd = this.currentSystem.data;
    const iy = H - 52;
    g.fillStyle(0x000000, 0.5); g.fillRect(8, iy, 200, 46);
    this.sysInfoTexts[0].setText('System: ' + sd.name).setPosition(14, iy + 6);
    this.sysInfoTexts[1].setText('Region: ' + sd.region.name).setPosition(14, iy + 18).setColor(sd.region.color);
    this.sysInfoTexts[2].setText('Danger: ' + '\u26A0'.repeat(Math.min(sd.danger, 5)) + ' ' + sd.danger + '/10')
      .setPosition(14, iy + 30).setColor(DANGER_COLORS[sd.danger] || '#e74c3c');
    this.controlsText.setPosition(W - 10, H - 10);
  }

  // ========== MINIMAP ==========

  updateMinimap(W, H) {
    const g = this.minimapGfx; g.clear();
    const mw = 160, mh = 120, mx = W - mw - 10, my = 10;
    const sx = mw / SYS_W, sy = mh / SYS_H;
    g.fillStyle(0x000000, 0.7); g.fillRect(mx, my, mw, mh);
    g.lineStyle(1, 0x00c8ff, 0.25); g.strokeRect(mx, my, mw, mh);
    const sys = this.currentSystem;
    g.fillStyle(Phaser.Display.Color.HexStringToColor(sys.star.color).color);
    g.fillCircle(mx + sys.star.x * sx, my + sys.star.y * sy, 2.5);
    for (const p of this.planets) {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(p.type.color).color);
      g.fillCircle(mx + p.x * sx, my + p.y * sy, 2);
    }
    for (const s of this.stations) { g.fillStyle(0xffffff); g.fillRect(mx + s.x * sx - 1, my + s.y * sy - 1, 3, 3); }
    for (const ga of this.gates) {
      g.fillStyle(ga.isDungeon ? 0xff00ff : 0x00d4ff);
      g.fillCircle(mx + ga.x * sx, my + ga.y * sy, 1.5);
    }
    g.fillStyle(0x00ff00); g.fillRect(mx + this.player.x * sx - 2, my + this.player.y * sy - 2, 4, 4);
    const cam = this.cameras.main;
    g.lineStyle(1, 0x00ff00, 0.2);
    g.strokeRect(mx + cam.scrollX * sx, my + cam.scrollY * sy, cam.width * sx, cam.height * sy);
  }

  // ========== CROSSHAIR ==========

  updateCrosshair(W, H) {
    const g = this.crosshairGfx; g.clear();
    const cx = W / 2 + Math.cos(this.player.shipAngle) * 40;
    const cy = H / 2 + Math.sin(this.player.shipAngle) * 40;
    g.lineStyle(1, 0x00d4ff, 0.35);
    g.beginPath(); g.moveTo(cx - 7, cy); g.lineTo(cx - 3, cy); g.strokePath();
    g.beginPath(); g.moveTo(cx + 3, cy); g.lineTo(cx + 7, cy); g.strokePath();
    g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx, cy - 3); g.strokePath();
    g.beginPath(); g.moveTo(cx, cy + 3); g.lineTo(cx, cy + 7); g.strokePath();
    g.strokeCircle(cx, cy, 2);
  }

  // ========== INVENTORY ==========

  toggleInventory() {
    this.invOpen = !this.invOpen;
    this.invGfx.setVisible(this.invOpen);
    if (!this.invOpen) { this.invGfx.clear(); for (const t of this.invTexts) t.destroy(); this.invTexts = []; }
  }

  drawInventory(W, H) {
    const g = this.invGfx; g.clear();
    for (const t of this.invTexts) t.destroy();
    this.invTexts = [];
    const cols = 6, rows = 5, cs = 48, pad = 4, m = 16;
    const tw = cols * (cs + pad) - pad + m * 2, th = rows * (cs + pad) - pad + m * 2 + 30;
    const ox = W / 2 - tw / 2, oy = H / 2 - th / 2;
    g.fillStyle(0x0a0a1a, 0.95); g.fillRect(ox, oy, tw, th);
    g.lineStyle(2, 0x00d4ff, 0.6); g.strokeRect(ox, oy, tw, th);
    this.invTexts.push(this.add.text(ox + tw / 2, oy + 10, 'INVENTORY', {
      fontSize: '12px', fontFamily: 'monospace', color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(601));
    this.invTexts.push(this.add.text(ox + tw - m, oy + 10, this.inventory.getUsedSlots() + '/' + this.inventory.maxSlots, {
      fontSize: '9px', fontFamily: 'monospace', color: '#888',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(601));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, sx = ox + m + c * (cs + pad), sy = oy + m + 24 + r * (cs + pad);
      const slot = this.inventory.slots[i];
      g.fillStyle(0x111122, 0.9); g.fillRect(sx, sy, cs, cs);
      if (slot) {
        const res = RESOURCES[slot.resourceId];
        if (res) {
          const rc = Phaser.Display.Color.HexStringToColor(res.color).color;
          g.lineStyle(1.5, rc, 0.8); g.strokeRect(sx, sy, cs, cs);
          g.fillStyle(rc, 0.6); g.fillRect(sx + 12, sy + 10, 24, 20);
          this.invTexts.push(this.add.text(sx + cs - 3, sy + cs - 3, '' + slot.count, {
            fontSize: '9px', fontFamily: 'monospace', color: '#fff', stroke: '#000', strokeThickness: 2,
          }).setOrigin(1, 1).setScrollFactor(0).setDepth(601));
          const nm = res.name.length > 7 ? res.name.substring(0, 6) + '.' : res.name;
          this.invTexts.push(this.add.text(sx + cs / 2, sy + cs - 3, nm, {
            fontSize: '7px', fontFamily: 'monospace', color: '#aaa',
          }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(601));
        }
      } else { g.lineStyle(1, 0x333344, 0.4); g.strokeRect(sx, sy, cs, cs); }
    }
  }

  // ========== WARP / MAP ==========

  openGalaxyMap() {
    if (this.invOpen || this.dialogueActive) return;
    this.scene.pause('FlightScene');
    this.scene.launch('GalaxyMapScene', {
      universe: this.universe, currentId: this.currentSystemId,
      visited: this.visited, fog: this.fog,
      onWarp: (id) => { this.scene.resume('FlightScene'); const g = this.currentSystem.gates.find(x => x.targetId === id); if (g) this.startWarp(g); },
    });
  }

  tryWarp() { if (this.nearGate && !this.invOpen && !this.dialogueActive) this.startWarp(this.nearGate); }

  startWarp(gateData) {
    if (gateData.isDungeon || this.player.fuel < 10) return;
    this.player.fuel = Math.max(0, this.player.fuel - 10);
    this.scene.pause('FlightScene');
    this.scene.launch('WarpScene', { targetName: gateData.targetName, targetId: gateData.targetId });
  }

  completeWarp(targetId) { this.scene.resume('FlightScene'); this.enterSystem(targetId); }
}
