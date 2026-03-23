// ============================================================
// Flight Scene — main gameplay: flight, mining, narrative
// ============================================================

import Phaser from 'phaser';
import { SYS_W, SYS_H, UNIVERSE_COLS, UNIVERSE_ROWS, DANGER_COLORS, BUILD_VERSION, BUILD_DATE } from '../config/constants.js';
import { generateUniverse, generateSystem } from '../systems/UniverseGenerator.js';
import Player from '../entities/Player.js';
import InventorySystem from '../systems/InventorySystem.js';
import { RESOURCES, getAvailableResources } from '../data/resources.js';
import { RNG } from '../config/constants.js';
import { STORY_BEATS, getStoryBeat, getBarksByTrigger, getRandomBark } from '../data/story.js';
import { NPCS } from '../data/npcs.js';
import DialogueUI from '../ui/DialogueUI.js';
import SoundManager from '../systems/SoundManager.js';
import TextQueue from '../systems/TextQueue.js';

export default class FlightScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FlightScene' });
  }

  preload() {}

  create() {
    // Sound
    this.sound_mgr = new SoundManager();

    // Universe
    this.universe = generateUniverse(42);
    this.systemCache = {};
    this.currentSystemId = null;
    this.currentSystem = null;
    this.fog = new Set();
    this.visited = new Set();
    this.nearGate = null;
    this.nearStation = null;
    this.nearPlanetZion = false;
    this.inventory = new InventorySystem();
    this.miningAsteroid = null;
    this.invOpen = false;
    this.dialogueActive = false;

    // Story state
    this.firedTriggers = new Set();
    this.sessionTriggers = new Set();
    this.perSystemTriggers = new Set();
    this.firstMineComplete = false;
    this.nearAsteroidTriggered = false;
    this.nearStationTriggered = false;
    this.nearGateTriggered = false;
    this.firstWarpDone = false;
    this.enteredFrontier = false;

    // Text queue (barks, transmissions, dialogues — one at a time)
    this.textQueue = new TextQueue();
    this.textQueue.onShowCallback = (item) => this._showQueueItem(item);
    this.textQueue.onDismissCallback = (item) => this._dismissQueueItem(item);

    // Idle bark timer
    this.lastActivityTime = 0;
    this.lastIdleBarkTime = 0;
    this.idleBarkCooldown = 60000;
    this.idleThresholdMin = 30000;
    this.idleThresholdMax = 45000;
    this.idleThreshold = 30000 + Math.random() * 15000;

    // Input
    this.cursors = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D', space: 'SPACE',
    });
    this.input.keyboard.on('keydown-M', () => { if (!this.dialogueActive) this.openGalaxyMap(); });
    this.input.keyboard.on('keydown-E', () => { if (!this.dialogueActive) this.tryWarp(); });
    this.input.keyboard.on('keydown-F', () => { if (!this.dialogueActive) this.tryDockOrLand(); });
    this.input.keyboard.on('keydown-TAB', (e) => { e.preventDefault(); if (!this.dialogueActive) this.toggleInventory(); });
    this.input.keyboard.on('keydown-I', () => { if (!this.dialogueActive) this.toggleInventory(); });

    // Init audio on first interaction
    this.input.on('pointerdown', () => this.sound_mgr.ensureContext(), this);

    // World + Camera
    this.physics.world.setBounds(0, 0, SYS_W, SYS_H);
    this.cameras.main.setBackgroundColor('#0a0a18');
    this.cameras.main.setBounds(0, 0, SYS_W, SYS_H);

    // Graphics layers
    this.bgLayer = this.add.graphics().setDepth(0);
    this.starLayer = this.add.graphics().setDepth(5);
    this.orbitLayer = this.add.graphics().setDepth(10);
    this.staticEntityGfx = this.add.graphics().setDepth(20);
    this.animEntityGfx = this.add.graphics().setDepth(21);
    this.miningGfx = this.add.graphics().setDepth(200);
    this.labelTexts = [];

    // Player
    this.player = new Player(this, SYS_W / 2, SYS_H / 2);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // HUD (P6: scaled text sizes)
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
      const y = 12 + i * 20;
      this.barLabels.push(this.add.text(10, y, barConfig[i].label, {
        fontSize: '14px', fontFamily: 'monospace', color: barConfig[i].lc,
      }).setScrollFactor(0).setDepth(501));
      this.barValues.push(this.add.text(172, y, '', {
        fontSize: '13px', fontFamily: 'monospace', color: '#888888',
      }).setScrollFactor(0).setDepth(501));
    }

    this.sysInfoTexts = [
      this.add.text(14, 0, '', { fontSize: '12px', fontFamily: 'monospace', color: '#00d4ff' }).setScrollFactor(0).setDepth(501),
      this.add.text(14, 0, '', { fontSize: '12px', fontFamily: 'monospace', color: '#ffffff' }).setScrollFactor(0).setDepth(501),
      this.add.text(14, 0, '', { fontSize: '12px', fontFamily: 'monospace', color: '#e74c3c' }).setScrollFactor(0).setDepth(501),
    ];

    this.controlsText = this.add.text(0, 0, '[W] Thrust  [Mouse] Aim  [A/D] Strafe  [M] Map  [E] Warp  [F] Dock  [TAB] Inv', {
      fontSize: '10px', fontFamily: 'monospace', color: '#444444',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(501);

    // Version string (bottom-right, dim)
    this.versionText = this.add.text(0, 0, BUILD_VERSION + ' | ' + BUILD_DATE, {
      fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(501);

    // Prompt text with background for visibility
    this.promptText = this.add.text(0, 0, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00d4ff',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501).setVisible(false);

    // Inventory UI
    this.invGfx = this.add.graphics().setScrollFactor(0).setDepth(600).setVisible(false);
    this.invTexts = [];

    // Dialogue UI
    this.dialogueUI = new DialogueUI(this);

    // Bark system
    this.barkText = this.add.text(0, 0, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#87CEEB',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(520).setVisible(false);
    this.barkTimer = null;

    // Transmission system
    this.transContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(520).setVisible(false);
    this.transGfx = this.add.graphics().setScrollFactor(0);
    this.transContainer.add(this.transGfx);
    this.transText = this.add.text(0, 0, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#33ff66',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5, 0).setScrollFactor(0);
    this.transContainer.add(this.transText);
    this.transTimer = null;
    this.transLineIndex = 0;
    this.transCurrentBeat = null;
    this.transDismissable = false;

    // Transmission dismiss input
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.transContainer.visible && this.transDismissable) {
        this.advanceTransmission();
      }
    });

    // Entity data
    this.planets = [];
    this.asteroids = [];
    this.stations = [];
    this.gates = [];
    this.gameTime = 0;

    // Enter starting system
    const start = this.universe.find(s => s.region.key === 'CORE') || this.universe[0];
    this.startingSystemId = start.id;
    this.enterSystem(start.id);

    // Fire game_start cutscene
    this.lastActivityTime = Date.now();
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
    this.perSystemTriggers.clear();

    if (!this.systemCache[sysId]) {
      this.systemCache[sysId] = generateSystem(sysData, this.universe);
      const rng = new RNG(sysData.seed + 5555);
      for (const st of this.systemCache[sysId].stations) {
        st.npc = NPCS[rng.int(0, NPCS.length - 1)];
      }

      // Add Planet Zion to the starting system
      if (sysId === this.startingSystemId) {
        this.systemCache[sysId].planets.push({
          x: this.systemCache[sysId].star.x + 350,
          y: this.systemCache[sysId].star.y - 200,
          radius: 40,
          orbitDist: Math.hypot(350, 200),
          type: { name: 'Zion', color: '#2ecc71', resources: ['iron', 'carbon'] },
          isHub: true,
          name: 'Zion',
        });
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

    // Bark: "New system!" on each new system (not starting)
    if (isFirstVisit && this.visited.size > 1) {
      this.fireBark('enter_new_system');
    }

    // M.O.T.H.E.R. transmission on first new system visit (one-shot)
    if (isFirstVisit && this.visited.size > 1) {
      this.time.delayedCall(1500, () => this.triggerStoryBeat('enter_system_first'));
    }

    // Outrider transmission on first Frontier entry (queued after M.O.T.H.E.R.)
    if (isFirstVisit && sysData.region.key === 'FRONT' && !this.enteredFrontier) {
      this.enteredFrontier = true;
      this.time.delayedCall(4500, () => this.triggerStoryBeat('enter_frontier_first'));
    }

    // High danger bark
    if (sysData.danger >= 6 && !this.perSystemTriggers.has('danger_warned')) {
      this.perSystemTriggers.add('danger_warned');
      this.time.delayedCall(2000, () => this.fireBark('enter_danger_6plus'));
    }
  }

  assignResources(asteroids, sysData, planets) {
    const rng = new RNG(sysData.seed + 7777);
    for (const a of asteroids) {
      let nearest = planets[0], nd = Infinity;
      for (const p of planets) {
        if (p.isHub) continue;
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

  // ========== STATIC DRAWING ==========

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
    for (const p of this.planets) {
      const c = Phaser.Display.Color.HexStringToColor(p.type.color).color;
      g.fillStyle(c); g.fillCircle(p.x, p.y, p.radius);
      g.fillStyle(0xffffff, 0.15); g.fillCircle(p.x - p.radius * 0.25, p.y - p.radius * 0.25, p.radius * 0.6);
      const label = p.isHub ? 'Zion' : p.type.name;
      this.labelTexts.push(this.add.text(p.x, p.y + p.radius + 12, label, {
        fontSize: '10px', fontFamily: 'monospace', color: p.isHub ? '#2ecc71' : '#aaa',
      }).setOrigin(0.5, 0).setDepth(22));
    }
    for (const s of this.stations) {
      this.labelTexts.push(this.add.text(s.x, s.y + s.size + 12, s.name, {
        fontSize: '9px', fontFamily: 'monospace', color: '#00d4ff',
      }).setOrigin(0.5, 0).setDepth(22));
    }
    for (const ga of this.gates) {
      this.labelTexts.push(this.add.text(ga.x, ga.y + ga.size + 12,
        ga.targetName + (ga.isDungeon ? ' \u26A0' : ''), {
        fontSize: '9px', fontFamily: 'monospace', color: ga.isDungeon ? '#ff00ff' : '#00d4ff',
      }).setOrigin(0.5, 0).setDepth(22).setAlpha(0.7));
    }
  }

  // ========== ANIMATED ENTITIES ==========

  drawAnimatedEntities(time) {
    const g = this.animEntityGfx; g.clear();
    const t = time / 1000;

    for (const a of this.asteroids) {
      if (a.mined) continue;
      const c = Phaser.Display.Color.HexStringToColor(a.color).color;
      const rot = a.rotation + t * a.rotSpeed * 60;
      const cos = Math.cos(rot), sin = Math.sin(rot);

      // Generate irregular polygon shape from seed (deterministic)
      if (!a._shapePoints) {
        const srng = new RNG(a.shapeSeed || 12345);
        const numPts = srng.int(5, 8);
        a._shapePoints = [];
        for (let i = 0; i < numPts; i++) {
          const angle = (i / numPts) * Math.PI * 2;
          const r = a.size * (0.5 + srng.next() * 0.5);
          a._shapePoints.push({ lx: Math.cos(angle) * r, ly: Math.sin(angle) * r });
        }
      }

      g.fillStyle(c);
      g.beginPath();
      for (let i = 0; i < a._shapePoints.length; i++) {
        const p = a._shapePoints[i];
        const rx = p.lx * cos - p.ly * sin + a.x;
        const ry = p.lx * sin + p.ly * cos + a.y;
        if (i === 0) g.moveTo(rx, ry);
        else g.lineTo(rx, ry);
      }
      g.closePath();
      g.fillPath();
      // Subtle edge highlight
      g.lineStyle(0.5, 0xffffff, 0.15);
      g.beginPath();
      for (let i = 0; i < a._shapePoints.length; i++) {
        const p = a._shapePoints[i];
        const rx = p.lx * cos - p.ly * sin + a.x;
        const ry = p.lx * sin + p.ly * cos + a.y;
        if (i === 0) g.moveTo(rx, ry);
        else g.lineTo(rx, ry);
      }
      g.closePath();
      g.strokePath();
    }

    for (const s of this.stations) {
      const rot = t * 0.3;
      const sz = s.size;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const hw = sz / 2, hh = sz / 2;
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
      g.lineStyle(1, 0x00d4ff, 0.8);
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath(); g.strokePath();
    }

    for (const ga of this.gates) {
      const c = ga.isDungeon ? 0xff00ff : 0x00d4ff;
      const pulse = Math.sin(t * 3) * 0.3 + 0.7;
      g.lineStyle(2, c, pulse);
      g.strokeCircle(ga.x, ga.y, ga.size);
      g.fillStyle(c, 0.15 * pulse);
      g.fillCircle(ga.x, ga.y, ga.size);
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
    const size = this.player.isThrusting ? 4 : 2;
    const trail = this.add.rectangle(px, py, size, size,
      Math.random() > 0.5 ? 0x00d4ff : 0x00aaff
    ).setAlpha(this.player.isThrusting ? 0.9 : 0.5).setDepth(90);
    this.tweens.add({
      targets: trail, alpha: 0, scaleX: 0, scaleY: 0,
      duration: this.player.isThrusting ? 500 : 300,
      onComplete: () => trail.destroy(),
    });
  }

  // ========== UPDATE ==========

  update(time, delta) {
    if (!this.currentSystem) return;
    const dt = delta / 1000;
    this.gameTime = time;
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    if (this.dialogueUI.isOpen) {
      this.dialogueUI.update(delta);
      return;
    }

    if (this.invOpen) {
      this.drawInventory(W, H);
      return;
    }

    // Player
    this.player.update(this.cursors, this.input.activePointer);

    // Engine sound
    this.sound_mgr.updateEngineHum(this.player.isThrusting);

    // Track activity for idle barks
    if (this.player.body && (Math.abs(this.player.body.velocity.x) > 20 || Math.abs(this.player.body.velocity.y) > 20)) {
      this.lastActivityTime = Date.now();
    }
    if (this.input.activePointer.isDown) {
      this.lastActivityTime = Date.now();
    }

    // Engine trails — more when thrusting
    const speed = this.player.body ? Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y) : 0;
    if (this.player.isThrusting && speed > 10) {
      this.spawnEngineTrail();
      if (Math.random() < 0.5) this.spawnEngineTrail(); // extra particle when thrusting
    } else if (speed > 40) {
      if (Math.random() < 0.3) this.spawnEngineTrail(); // fewer when coasting
    }

    // Gate proximity
    this.nearGate = null;
    for (const ga of this.gates) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, ga.x, ga.y) < 55) {
        this.nearGate = ga;
        if (!this.nearGateTriggered) {
          this.nearGateTriggered = true;
          this.fireBark('near_gate_first');
        }
        if (ga.isDungeon) {
          const dungeonKey = `dungeon_${ga.x}_${ga.y}`;
          if (!this.firedTriggers.has(dungeonKey)) {
            this.firedTriggers.add(dungeonKey);
            this.fireBark('near_dungeon_gate');
          }
        }
        break;
      }
    }

    // Station proximity
    this.nearStation = null;
    for (const st of this.stations) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, st.x, st.y) < 100) {
        this.nearStation = st;
        if (!this.nearStationTriggered) {
          this.nearStationTriggered = true;
          this.fireBark('near_station_first');
        }
        break;
      }
    }

    // Planet Zion proximity
    this.nearPlanetZion = false;
    for (const p of this.planets) {
      if (p.isHub && Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 100) {
        this.nearPlanetZion = true;
        break;
      }
    }

    // Asteroid proximity
    if (!this.nearAsteroidTriggered) {
      for (const a of this.asteroids) {
        if (!a.mined && Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) < 80) {
          this.nearAsteroidTriggered = true;
          this.fireBark('near_asteroid_first');
          break;
        }
      }
    }

    // Session-once warnings
    if (this.player.fuel < this.player.maxFuel * 0.2 && !this.sessionTriggers.has('fuel_warned')) {
      this.sessionTriggers.add('fuel_warned');
      this.fireBark('fuel_below_20');
    }
    if (this.player.hull < this.player.maxHull * 0.25 && !this.sessionTriggers.has('hull_warned')) {
      this.sessionTriggers.add('hull_warned');
      this.fireBark('hull_below_25');
    }
    if (this.inventory.isFull() && !this.sessionTriggers.has('inv_full')) {
      this.sessionTriggers.add('inv_full');
      this.fireBark('inventory_full');
    }

    // Idle barks
    this.checkIdleBark();

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

  // ========== IDLE BARK SYSTEM ==========

  checkIdleBark() {
    const now = Date.now();
    const idleTime = now - this.lastActivityTime;
    const sinceLastBark = now - this.lastIdleBarkTime;

    if (idleTime >= this.idleThreshold && sinceLastBark >= this.idleBarkCooldown) {
      const bark = getRandomBark('random_idle');
      if (bark) {
        this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: 'Pepper: ' + bark.lines[0] } });
        this.lastIdleBarkTime = now;
        this.idleThreshold = this.idleThresholdMin + Math.random() * (this.idleThresholdMax - this.idleThresholdMin);
      }
    }
  }

  // ========== PROMPT ==========

  updatePrompt(W, H) {
    if (this.nearPlanetZion) {
      this.promptText.setText('[F] Land at The Outpost')
        .setColor('#2ecc71').setPosition(W / 2, H - 60).setVisible(true);
    } else if (this.nearGate) {
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
      if (dc < 35 && dp < 120 && dc < cd) { closest = a; cd = dc; }
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

    // Mining sound
    if (Math.random() < 0.1) this.sound_mgr.playMiningClick();

    this.miningGfx.lineStyle(1.5, 0x00d4ff, 0.6);
    this.miningGfx.strokeCircle(closest.x, closest.y, closest.size + 8);
    if (closest.mineProgress > 0 && closest.mineProgress < 1) {
      const bw = closest.size * 3;
      this.miningGfx.fillStyle(0x333333, 0.8);
      this.miningGfx.fillRect(closest.x - bw / 2, closest.y + closest.size + 4, bw, 3);
      this.miningGfx.fillStyle(0x00d4ff);
      this.miningGfx.fillRect(closest.x - bw / 2, closest.y + closest.size + 4, bw * closest.mineProgress, 3);
    }
    if (closest.mineProgress >= 1) {
      closest.mined = true;
      this.sound_mgr.playMineComplete();
      const res = RESOURCES[closest.resourceId];
      if (res) {
        const amt = 1 + Math.floor(Math.random() * 2);
        this.inventory.addItem(closest.resourceId, amt);
        const ft = this.add.text(closest.x, closest.y - 15, '+' + amt + ' ' + res.name, {
          fontSize: '11px', fontFamily: 'monospace', color: res.tier.color, stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(300);
        this.tweens.add({ targets: ft, y: closest.y - 45, alpha: 0, duration: 1200, onComplete: () => ft.destroy() });
      }
      if (!this.firstMineComplete) {
        this.firstMineComplete = true;
        this.fireBark('first_mine_complete');
      }
      this.lastActivityTime = Date.now();
    }
  }

  // ========== STORY / BARK / TRANSMISSION (via TextQueue) ==========

  triggerStoryBeat(trigger) {
    if (this.firedTriggers.has(trigger)) return;
    const beat = getStoryBeat(trigger);
    if (!beat) return;
    this.firedTriggers.add(trigger);

    if (beat.type === 'cutscene') {
      this.scene.pause('FlightScene');
      this.scene.launch('CutsceneScene', { beatId: beat.id });
    } else if (beat.type === 'bark') {
      this.textQueue.enqueue({ type: 'bark', speaker: beat.speaker, data: { text: 'Pepper: ' + beat.lines[0] } });
    } else if (beat.type === 'transmission') {
      this.textQueue.enqueue({ type: 'transmission', speaker: beat.speaker, data: beat });
    }
  }

  fireBark(trigger) {
    const oneShot = ['near_asteroid_first', 'first_mine_complete', 'near_station_first',
      'near_gate_first', 'near_dungeon_gate'];
    if (oneShot.includes(trigger)) {
      if (this.firedTriggers.has('bark_' + trigger)) return;
      this.firedTriggers.add('bark_' + trigger);
    }

    const bark = getRandomBark(trigger);
    if (!bark) {
      const beat = getStoryBeat(trigger);
      if (beat && beat.type === 'bark') {
        this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: 'Pepper: ' + beat.lines[0] } });
      }
      return;
    }
    this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: 'Pepper: ' + bark.lines[0] } });
  }

  // --- TextQueue callbacks ---

  _showQueueItem(item) {
    if (item.type === 'bark') {
      this._showBark(item.data.text);
    } else if (item.type === 'transmission') {
      this._showTransmission(item.data);
    }
  }

  _dismissQueueItem(item) {
    if (item.type === 'bark') {
      if (this.barkTimer) this.barkTimer.remove();
      this.barkText.setVisible(false);
    } else if (item.type === 'transmission') {
      if (this.transTimer) this.transTimer.remove();
      this.transContainer.setVisible(false).setAlpha(1);
      this.transCurrentBeat = null;
    }
  }

  _showBark(text) {
    this.sound_mgr.playBarkBlip();
    const W = this.cameras.main.width;
    this.barkText.setText(text).setPosition(W / 2, 80).setAlpha(0).setVisible(true);
    this.tweens.add({ targets: this.barkText, alpha: 1, y: 90, duration: 300 });
    if (this.barkTimer) this.barkTimer.remove();
    this.barkTimer = this.time.delayedCall(3500, () => {
      this.tweens.add({ targets: this.barkText, alpha: 0, y: 80, duration: 300,
        onComplete: () => {
          this.barkText.setVisible(false);
          this.textQueue.dismiss();
        }
      });
    });
  }

  _showTransmission(beat) {
    const W = this.cameras.main.width;
    this.transCurrentBeat = beat;
    this.transLineIndex = 0;
    this.transDismissable = false;

    const isMother = beat.speaker === 'M.O.T.H.E.R.';
    const isOutrider = beat.speaker === 'outrider';
    const color = isMother ? '#f39c12' : isOutrider ? '#2ecc71' : '#33ff66';
    const borderColor = isMother ? 0xf39c12 : isOutrider ? 0x2ecc71 : 0x33ff66;

    this.transText.setColor(color);

    if (isMother) this.sound_mgr.playMotherHum();
    else this.sound_mgr.playTransmissionStatic();

    this.transContainer.setVisible(true);
    this._showTransmissionLine(beat, borderColor, W);
  }

  _showTransmissionLine(beat, borderColor, W) {
    if (this.transLineIndex >= beat.lines.length) {
      this.tweens.add({ targets: this.transContainer, alpha: 0, duration: 400,
        onComplete: () => {
          this.transContainer.setVisible(false).setAlpha(1);
          this.transCurrentBeat = null;
          this.textQueue.dismiss();
        }
      });
      return;
    }

    const line = beat.lines[this.transLineIndex];
    const speakerLabel = beat.speaker === 'M.O.T.H.E.R.' ? '\u25C8 M.O.T.H.E.R.' : '\u25C8 INCOMING';
    this.transText.setText(speakerLabel + '\n' + line);
    this.transText.setPosition(W / 2, 40);

    this.transGfx.clear();
    const bounds = this.transText.getBounds();
    const pad = 12;
    this.transGfx.fillStyle(0x000000, 0.85);
    this.transGfx.fillRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2);
    this.transGfx.lineStyle(1, borderColor, 0.6);
    this.transGfx.strokeRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2);

    this.transContainer.setAlpha(0);
    this.tweens.add({ targets: this.transContainer, alpha: 1, duration: 200 });

    this.transDismissable = true;

    if (this.transTimer) this.transTimer.remove();
    this.transTimer = this.time.delayedCall(2500, () => {
      this.advanceTransmission();
    });
  }

  advanceTransmission() {
    if (!this.transCurrentBeat) return;
    if (this.transTimer) this.transTimer.remove();
    this.transLineIndex++;
    const W = this.cameras.main.width;
    const beat = this.transCurrentBeat;
    const isMother = beat.speaker === 'M.O.T.H.E.R.';
    const isOutrider = beat.speaker === 'outrider';
    const borderColor = isMother ? 0xf39c12 : isOutrider ? 0x2ecc71 : 0x33ff66;
    this._showTransmissionLine(beat, borderColor, W);
  }

  // ========== NPC DOCKING / HUB LANDING ==========

  tryDockOrLand() {
    if (this.invOpen || this.dialogueActive) return;
    if (this.nearPlanetZion) {
      this.sound_mgr.stopAll();
      this.scene.pause('FlightScene');
      this.scene.launch('HubScene');
      return;
    }
    if (this.nearStation) {
      this.tryDock();
    }
  }

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
    if (npc.type === 'merchant') return [d.greeting, d.browse, d.farewell];
    if (npc.type === 'quest_giver') return [d.greeting, d.quest_offer, d.farewell];
    if (npc.type === 'informant') return [d.greeting, d.hint, d.farewell];
    return [d.greeting || 'Hello.', d.farewell || 'Goodbye.'];
  }

  returnFromHub() {
    this.scene.resume('FlightScene');
    const zion = this.planets.find(p => p.isHub);
    if (zion) {
      this.player.setPosition(zion.x, zion.y + 120);
      if (this.player.body) this.player.body.setVelocity(0, 0);
    }
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
      const v = vals[i], y = 12 + i * 20;
      g.fillStyle(0xffffff, 0.08); g.fillRect(52, y + 2, 110, 10);
      g.fillStyle(v.c); g.fillRect(52, y + 2, 110 * Math.max(0, v.val / v.max), 10);
      this.barValues[i].setText(Math.floor(v.val) + '/' + v.max);
    }
    this.barLabels[3].setText('LV' + p.level);

    const sd = this.currentSystem.data;
    const iy = H - 56;
    g.fillStyle(0x000000, 0.5); g.fillRect(8, iy, 210, 50);
    this.sysInfoTexts[0].setText('System: ' + sd.name).setPosition(14, iy + 6);
    this.sysInfoTexts[1].setText('Region: ' + sd.region.name).setPosition(14, iy + 20).setColor(sd.region.color);
    this.sysInfoTexts[2].setText('Danger: ' + '\u26A0'.repeat(Math.min(sd.danger, 5)) + ' ' + sd.danger + '/10')
      .setPosition(14, iy + 34).setColor(DANGER_COLORS[sd.danger] || '#e74c3c');
    this.controlsText.setPosition(W - 10, H - 10);
    this.versionText.setPosition(W - 10, H - 22);
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
      g.fillCircle(mx + p.x * sx, my + p.y * sy, p.isHub ? 3 : 2);
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
    this.sound_mgr.playInventoryWhoosh();
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
      fontSize: '14px', fontFamily: 'monospace', color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(601));
    this.invTexts.push(this.add.text(ox + tw - m, oy + 10, this.inventory.getUsedSlots() + '/' + this.inventory.maxSlots, {
      fontSize: '11px', fontFamily: 'monospace', color: '#888',
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
    this.sound_mgr.stopAll();
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
    this.sound_mgr.playWarpWhoosh();
    this.sound_mgr.stopAll();

    // Track first warp for cutscene
    if (!this.firstWarpDone) {
      this.firstWarpDone = true;
      this._pendingFirstWarp = true;
    }

    this.scene.pause('FlightScene');
    this.scene.launch('WarpScene', { targetName: gateData.targetName, targetId: gateData.targetId });
  }

  completeWarp(targetId) {
    this.scene.resume('FlightScene');
    this.enterSystem(targetId);

    // Fire first warp cutscene after landing
    if (this._pendingFirstWarp) {
      this._pendingFirstWarp = false;
      this.time.delayedCall(500, () => {
        const beat = STORY_BEATS.find(b => b.id === 'act1_first_warp');
        if (beat) {
          this.scene.pause('FlightScene');
          this.scene.launch('CutsceneScene', { beatId: beat.id });
        }
      });
    }
  }
}
