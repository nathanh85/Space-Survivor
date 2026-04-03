// ============================================================
// Flight Scene — main gameplay: flight, mining, narrative
// ============================================================

import Phaser from 'phaser';
import { SYS_W, SYS_H, UNIVERSE_COLS, UNIVERSE_ROWS, DANGER_COLORS, BUILD_VERSION, BUILD_DATE, FONT, PLAYER_DEFAULTS } from '../config/constants.js';
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
import WeaponSystem from '../systems/WeaponSystem.js';
import EnemyManager from '../systems/EnemyManager.js';
import SaveManager from '../systems/SaveManager.js';
import QuestManager from '../systems/QuestManager.js';
import { getQuest } from '../data/quests.js';

export default class FlightScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FlightScene' });
  }

  init(data) {
    this._initData = data || {};
  }

  preload() {
    // Load character portraits (fallback to colored rect if missing)
    const portraits = [
      'pax_neutral', 'pepper_neutral', 'mother', 'marshal', 'judge',
      'grix', 'vera', 'informant', 'miner', 'smuggler', 'commander', 'mechanic'
    ];
    portraits.forEach(p => {
      this.load.image(p, `assets/portraits/${p}.png`);
    });
    this.load.on('loaderror', (file) => {
      console.warn('[PORTRAIT] Failed to load:', file.key, file.url);
    });
  }

  create() {
    // Sound
    this.sound_mgr = new SoundManager();

    // Universe
    // Galaxy seed: use saved seed on Continue, generate new on New Game
    if (this._initData && this._initData.fromSave) {
      const save = SaveManager.load();
      this.galaxySeed = (save && save.universe && save.universe.galaxySeed) || 42;
    } else {
      this.galaxySeed = Math.floor(Math.random() * 999999) + 1;
    }
    this.universe = generateUniverse(this.galaxySeed);
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
    this._selectedInvSlot = null;
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
    this.outOfFuel = false;
    this.outOfFuelTime = 0;
    this._starWarned = false;

    // Text queue (barks, transmissions, dialogues — one at a time)
    this.textQueue = new TextQueue();
    this.textQueue.onShowCallback = (item) => this._showQueueItem(item);
    this.textQueue.onDismissCallback = (item) => this._dismissQueueItem(item);

    // Combat systems
    this.weaponSystem = new WeaponSystem(this);
    this.enemyManager = new EnemyManager(this);
    this.systemCleared = false; // stops enemy respawns once all cleared
    this.shieldRegenPaused = 0; // timestamp when regen was paused
    this.lastCombatBarkTime = 0;
    this.combatHullWarned = false;
    this.combatShieldsWarned = false;
    this.playerDead = false;
    this.starDamageCooldown = 0;
    this.asteroidDamageCooldown = 0;
    this.systemHadEnemies = false;

    // Quest manager
    this.questManager = new QuestManager();

    // Trade UI state
    this.tradeOpen = false;
    this.tradeObjects = [];
    this._firstSellBark = false;

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
      space: 'SPACE',
    });
    // Prevent right-click context menu on canvas
    this.game.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.input.keyboard.on('keydown-M', () => {
      if (this.dialogueActive) return;
      if (this.invOpen) this.toggleInventory(); // close inv first
      this.openGalaxyMap();
    });
    this.input.keyboard.on('keydown-E', () => { if (!this.dialogueActive) this.tryWarp(); });
    this.input.keyboard.on('keydown-F', () => { if (!this.dialogueActive) this.tryDockOrLand(); });
    this.input.keyboard.on('keydown-TAB', (e) => { e.preventDefault(); if (!this.dialogueActive) this.toggleInventory(); });
    this.input.keyboard.on('keydown-I', () => { if (!this.dialogueActive) this.toggleInventory(); });

    // Init audio on first interaction
    this.input.on('pointerdown', (pointer) => {
      this.sound_mgr.ensureContext();
      if (this.invOpen) this.handleInvClick(pointer);
    }, this);
    // B16: Right-click in inventory to use item (fuel)
    this.input.on('pointerup', (pointer) => {
      if (this.invOpen && pointer.rightButtonReleased()) this.handleInvRightClick(pointer);
    }, this);

    // World + Camera
    this.physics.world.setBounds(0, 0, SYS_W, SYS_H);
    this.cameras.main.setBackgroundColor('#0a0a18');
    this.cameras.main.setBounds(0, 0, SYS_W, SYS_H);

    // Graphics layers
    this.bgLayer = this.add.graphics().setDepth(0);
    // Parallax near-star layer (scrollFactor < 1 for parallax effect)
    this.nearStarLayer = this.add.graphics().setDepth(1);
    this.parallaxOffset = { x: 0, y: 0 };
    this.starLayer = this.add.graphics().setDepth(5);
    this.orbitLayer = this.add.graphics().setDepth(10);
    this.planetLayer = this.add.graphics().setDepth(15);
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
        fontSize: '10px', fontFamily: FONT, color: barConfig[i].lc,
      }).setScrollFactor(0).setDepth(501));
      this.barValues.push(this.add.text(178, y, '', {
        fontSize: '9px', fontFamily: FONT, color: '#888888',
      }).setScrollFactor(0).setDepth(501));
    }

    this.sysInfoTexts = [
      this.add.text(14, 0, '', { fontSize: '10px', fontFamily: FONT, color: '#00d4ff' }).setScrollFactor(0).setDepth(501),
      this.add.text(14, 0, '', { fontSize: '10px', fontFamily: FONT, color: '#ffffff' }).setScrollFactor(0).setDepth(501),
      this.add.text(14, 0, '', { fontSize: '10px', fontFamily: FONT, color: '#e74c3c' }).setScrollFactor(0).setDepth(501),
    ];

    this.controlsText = this.add.text(0, 0, '[SPACE] Thrust  [Mouse] Aim  [Arrows] Move  [M] Map  [E] Warp  [F] Dock  [TAB] Inv', {
      fontSize: '8px', fontFamily: FONT, color: '#444444',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(501);

    // Version string (bottom-right, dim)
    this.versionText = this.add.text(0, 0, BUILD_VERSION + ' | ' + BUILD_DATE, {
      fontSize: '10px', fontFamily: FONT, color: 'rgba(255,255,255,0.2)',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(501);

    // Combat HUD
    this.weaponLabel = this.add.text(10, 100, '', {
      fontSize: '8px', fontFamily: FONT, color: '#00d4ff',
    }).setScrollFactor(0).setDepth(501);
    this.hostileLabel = this.add.text(0, 0, '', {
      fontSize: '8px', fontFamily: FONT, color: '#e74c3c',
    }).setScrollFactor(0).setDepth(501).setVisible(false);
    this.killLabel = this.add.text(0, 0, '', {
      fontSize: '8px', fontFamily: FONT, color: 'rgba(255,255,255,0.3)',
    }).setScrollFactor(0).setDepth(501);
    this.xpLabel = this.add.text(0, 0, '', {
      fontSize: '8px', fontFamily: FONT, color: '#bb6bd9',
    }).setScrollFactor(0).setDepth(501);
    this.xpBarGfx = this.add.graphics().setScrollFactor(0).setDepth(500);
    this.creditsLabel = this.add.text(0, 0, '', {
      fontSize: '8px', fontFamily: FONT, color: '#f39c12',
    }).setScrollFactor(0).setDepth(501);

    // Save indicator
    this.saveIndicator = this.add.text(0, 0, '\uD83D\uDCBE SAVED', {
      fontSize: '10px', fontFamily: FONT, color: '#2ecc71',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(600).setAlpha(0);

    // Quest HUD texts (below main bars)
    this.questHudTexts = [];
    this.questHudGfx = this.add.graphics().setScrollFactor(0).setDepth(500);

    // Prompt text with background for visibility
    this.promptText = this.add.text(0, 0, '', {
      fontSize: '10px', fontFamily: FONT, color: '#00d4ff',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501).setVisible(false);

    // Inventory UI
    this.invGfx = this.add.graphics().setScrollFactor(0).setDepth(600).setVisible(false);
    this.invTexts = [];

    // Dialogue UI
    this.dialogueUI = new DialogueUI(this);

    // Bark system — all objects tracked in array for cleanup
    this.barkObjects = [];
    this.barkTimer = null;

    // Transmission system
    this.transContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(520).setVisible(false);
    this.transGfx = this.add.graphics().setScrollFactor(0);
    this.transContainer.add(this.transGfx);
    this.transText = this.add.text(0, 0, '', {
      fontSize: '10px', fontFamily: FONT, color: '#33ff66',
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

    // Enter starting system — prefer isStarting flag, fallback to first CORE system
    const start = this.universe.find(s => s.isStarting) || this.universe.find(s => s.region.key === 'CORE') || this.universe[0];
    this.startingSystemId = start.id;

    // Check if resuming from save
    if (this._initData && this._initData.fromSave) {
      this.restoreFromSave(SaveManager.load());
    } else {
      this.enterSystem(start.id);
    }

    // Combat collision setup
    this.setupCombatCollisions();

    // Start blacked out — cutscene fires first, then fade in after
    this.cameras.main.setAlpha(0);
    this.lastActivityTime = Date.now();

    // Fire game_start cutscene immediately (skip if from save)
    if (this._initData && this._initData.fromSave) {
      // From save — skip cutscene, just fade in
      this.cameras.main.setAlpha(1);
      this.cameras.main.fadeIn(500, 0, 0, 0);
    } else {
      this.time.delayedCall(100, () => {
        const beat = getStoryBeat('game_start');
        if (beat && !this.firedTriggers.has(beat.id)) {
          this.firedTriggers.add(beat.id);
          this.scene.launch('CutsceneScene', { beatId: beat.id });
          this.scene.pause();
          // When cutscene ends, FlightScene resumes — fade in there
          this.events.on('resume', () => {
            this.cameras.main.setAlpha(1);
            this.cameras.main.fadeIn(800, 0, 0, 0);
          });
        } else {
          // No cutscene (returning player) — just fade in
          this.cameras.main.setAlpha(1);
          this.cameras.main.fadeIn(500, 0, 0, 0);
        }
      });
    }
  }

  // ========== SYSTEM MANAGEMENT ==========

  enterSystem(sysId) {
    const sysData = this.universe.find(s => s.id === sysId);
    if (!sysData) return;

    for (const t of this.labelTexts) t.destroy();
    this.labelTexts = [];
    this.staticEntityGfx.clear();
    this.planetLayer.clear();
    this.animEntityGfx.clear();
    this.miningGfx.clear();
    this.miningAsteroid = null;
    this.perSystemTriggers.clear();
    this.enemyManager.clearAll();
    this.systemCleared = false;
    this.systemHadEnemies = false;
    this._lootItems = [];

    if (!this.systemCache[sysId]) {
      // H3/H4: mark isStarting on sysData before generating so UniverseGenerator can add trading post
      if (sysId === this.startingSystemId) sysData.isStarting = true;
      this.systemCache[sysId] = generateSystem(sysData, this.universe);
      const rng = new RNG(sysData.seed + 5555);
      for (const st of this.systemCache[sysId].stations) {
        // H4/H5: Assign NPC based on station type
        const sType = st.stationType || 'outpost';
        if (sType === 'trading_post') {
          st.npc = NPCS.find(n => n.id === 'merchant_grix') || NPCS[0];
        } else if (sType === 'refinery') {
          // H5: Refinery Worker with flavor lines
          const refineryLines = [
            "These ore processors haven't been calibrated in months. Don't touch anything.",
            "Conversion bay's running hot today. Watch your hull near the exhaust vents.",
            "We melt down what the miners bring in. Not glamorous, but it pays.",
          ];
          st.npc = { id: 'refinery_worker', name: 'Refinery Worker', type: 'flavor',
            portrait: 'mechanic',
            dialogue: { greeting: rng.pick(refineryLines) } };
        } else {
          // H5: Outpost NPC variety
          const outpostNPCs = [
            { id: 'outpost_drifter', name: 'Drifter', portrait: 'smuggler',
              lines: [
                "Just passin' through? Smart. Don't stay too long.",
                "Seen three ships blow past here last week. None of 'em came back.",
                "Got a tip: avoid the Rift. Whatever M.O.T.H.E.R. is buildin' out there... it ain't for us.",
              ] },
            { id: 'outpost_settler', name: 'Settler', portrait: 'miner',
              lines: [
                "We came out here for a fresh start. Some days I think we just found fresh trouble.",
                "Nothin' to see here. Just rust and regret.",
                "You kids be careful. M.O.T.H.E.R.'s eyes are everywhere now.",
              ] },
            { id: 'outpost_mechanic', name: 'Mechanic', portrait: 'mechanic',
              lines: [
                "Your ship looks like it's held together with prayers and carbon tape. Respect.",
                "Need parts? I'm fresh out. Need advice? Same answer.",
                "Out here, you learn to fix what you got. No supply runs for months at a stretch.",
              ] },
          ];
          const chosen = rng.pick(outpostNPCs);
          st.npc = { id: chosen.id, name: chosen.name, type: 'flavor',
            portrait: chosen.portrait,
            dialogue: { greeting: rng.pick(chosen.lines) } };
        }
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

    // Quest progress: visit_system
    if (isFirstVisit && this.questManager) {
      const visitReady = this.questManager.updateProgress('visit_system', {});
      if (visitReady.length > 0) {
        this.time.delayedCall(3000, () => {
          this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: That's enough systems scouted. Let's report back." } });
        });
      }
    }

    const sys = this.currentSystem;
    // B15: Reset asteroid HP to full on every system entry (cached systems retain damage)
    for (const a of sys.asteroids) {
      a.hp = a.maxHp;
      a.mined = false;
      a.mineProgress = 0;
    }
    this.assignResources(sys.asteroids, sysData, sys.planets);
    this.planets = sys.planets;
    this.asteroids = sys.asteroids;
    this.stations = sys.stations;
    this.gates = sys.gates;

    this.drawBgStars(sys.bgStars);
    this.createNebulas(sysData);
    this.drawStar(sys.star);
    this.drawOrbits(sys);
    this.drawStaticEntities();

    // Spawn at safe distance from star — seeded angle so entry point is always
    // consistent for a given system (B28: same layout feel on re-entry)
    const spawnRng = new RNG(sysData.seed + 7777);
    const spawnAngle = spawnRng.float(0, Math.PI * 2);
    const spawnDist = (sys.star.radius || 50) * 4 + 200;
    this.player.setPosition(
      sys.star.x + Math.cos(spawnAngle) * spawnDist,
      sys.star.y + Math.sin(spawnAngle) * spawnDist
    );
    if (this.player.body) this.player.body.setVelocity(0, 0);

    // Warp arrival cooldown: suppress auto-barks for 3s
    this.warpArrivalTime = Date.now();

    // Bark: "New system!" on each new system (delayed 3s after arrival)
    if (isFirstVisit && this.visited.size > 1) {
      this.time.delayedCall(3000, () => this.fireBark('enter_new_system'));
    }

    // M.O.T.H.E.R. transmission — ONCE total, only outside Core zones
    if (isFirstVisit && this.visited.size > 1 && sysData.region.key !== 'CORE'
        && !this.firedTriggers.has('enter_system_first')) {
      this.time.delayedCall(8000, () => this.triggerStoryBeat('enter_system_first'));
      this.time.delayedCall(20000, () => this.fireBark('after_mother_transmission'));
    }

    // Outrider transmission on first Frontier entry (13s after arrival — after M.O.T.H.E.R.)
    if (isFirstVisit && sysData.region.key === 'FRONT' && !this.enteredFrontier) {
      this.enteredFrontier = true;
      this.time.delayedCall(13000, () => this.triggerStoryBeat('enter_frontier_first'));
      // Pepper reacts to Outriders (~25s)
      this.time.delayedCall(25000, () => this.fireBark('after_outrider_transmission'));
    }

    // High danger bark (5s after arrival)
    if (sysData.danger >= 6 && !this.perSystemTriggers.has('danger_warned')) {
      this.perSystemTriggers.add('danger_warned');
      this.time.delayedCall(5000, () => this.fireBark('enter_danger_6plus'));
    }
  }

  assignResources(asteroids, sysData, planets) {
    // resourceId already set by UniverseGenerator from type-based drop tables.
    // Just initialize gameplay state and mineTime here.
    for (const a of asteroids) {
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

  // ========== SAVE SYSTEM ==========

  buildSaveState() {
    return {
      version: 'v0.6.0',
      timestamp: Date.now(),
      player: {
        level: this.player.level,
        xp: this.player.xp,
        hull: this.player.hull,
        maxHull: this.player.maxHull,
        shield: this.player.shield,
        maxShield: this.player.maxShield,
        fuel: this.player.fuel,
        credits: this.player.credits,
        weaponDamage: this.weaponSystem.weapon.damage,
        xpNext: this.player.xpNext,
      },
      inventory: this.inventory.slots.map(s => s ? { ...s } : null),
      universe: {
        galaxySeed: this.galaxySeed,
        currentSystem: this.currentSystemId,
        visitedSystems: [...this.visited],
        clearedSystems: this._clearedSystems || [],
      },
      story: {
        firedTriggers: [...this.firedTriggers],
        completedQuests: this.questManager.completedQuests,
        activeQuests: JSON.parse(JSON.stringify(this.questManager.activeQuests)),
        npcStates: {},
      },
      settings: {},
    };
  }

  restoreFromSave(saveData) {
    if (!saveData) return;
    const p = saveData.player;
    const u = saveData.universe;
    const s = saveData.story;

    // Enter saved system
    this.enterSystem(u.currentSystem);

    // Player stats
    this.player.level = p.level || 1;
    this.player.xp = p.xp || 0;
    this.player.hull = p.hull;
    this.player.maxHull = p.maxHull || 100;
    this.player.shield = p.shield;
    this.player.maxShield = p.maxShield || 50;
    this.player.fuel = p.fuel;
    this.player.credits = p.credits || 0;
    this.player.xpNext = p.xpNext || 100;
    if (p.weaponDamage && this.weaponSystem) {
      this.weaponSystem.weapon.damage = p.weaponDamage;
    }

    // Inventory
    if (saveData.inventory) {
      for (let i = 0; i < saveData.inventory.length; i++) {
        this.inventory.slots[i] = saveData.inventory[i] ? { ...saveData.inventory[i] } : null;
      }
    }

    // Visited systems + fog
    if (u.visitedSystems) {
      for (const id of u.visitedSystems) {
        this.visited.add(id);
        const sys = this.universe.find(x => x.id === id);
        if (sys) this.revealFog(sys.col, sys.row, 2);
      }
    }
    this._clearedSystems = u.clearedSystems || [];

    // Story triggers
    if (s.firedTriggers) {
      for (const t of s.firedTriggers) this.firedTriggers.add(t);
    }

    // Quest state
    this.questManager.deserialize({
      activeQuests: s.activeQuests || [],
      completedQuests: s.completedQuests || [],
    });

    // Skip intro triggers
    this.firedTriggers.add('act1_intro');
    this.firstWarpDone = true;
    this.firstMineComplete = true;
    this.nearAsteroidTriggered = true;
  }

  autoSave() {
    const state = this.buildSaveState();
    SaveManager.save(state);
    this.showSaveIndicator();
  }

  showSaveIndicator() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.saveIndicator.setPosition(W - 14, H - 40);
    this.tweens.add({ targets: this.saveIndicator, alpha: 1, duration: 300 });
    this.time.delayedCall(2000, () => {
      this.tweens.add({ targets: this.saveIndicator, alpha: 0, duration: 500 });
    });
  }

  // ========== STATIC DRAWING ==========

  drawBgStars(stars) {
    const g = this.bgLayer; g.clear();
    for (const s of stars) {
      g.fillStyle(0xffffff, s.brightness * 0.7);
      g.fillRect(s.x, s.y, s.size, s.size);
    }
    // Generate parallax star layers
    this._farStars = [];
    this._nearStars = [];
    const rng = new RNG(42);
    for (let i = 0; i < 350; i++) {
      const isBright = rng.chance(0.05); // 1 in 20
      this._farStars.push({
        x: rng.float(0, SYS_W), y: rng.float(0, SYS_H),
        size: isBright ? rng.float(0.75, 2.25) : rng.float(0.5, 1.5),
        brightness: isBright ? rng.float(0.3, 0.9) : rng.float(0.15, 0.45),
        _bright: isBright,
      });
    }
    for (let i = 0; i < 180; i++) {
      const isBright = rng.chance(0.05); // 1 in 20
      this._nearStars.push({
        x: rng.float(0, SYS_W), y: rng.float(0, SYS_H),
        size: isBright ? rng.float(1.5, 3.75) : rng.float(1, 2.5),
        brightness: isBright ? rng.float(0.5, 1.4) : rng.float(0.25, 0.7),
        _bright: isBright,
      });
    }
  }

  createNebulas(sysData) {
    // Destroy old nebulas
    if (this._nebulas) {
      for (const n of this._nebulas) {
        if (n && n.destroy) n.destroy();
      }
    }
    this._nebulas = [];

    // Region-based color
    const regionColors = { CORE: 0x2ecc71, FRONT: 0xf39c12, OUTER: 0xe74c3c, RIFT: 0x9b59b6 };
    const nebulaColor = regionColors[sysData.region.key] || 0x2ecc71;

    // 2 subtle nebula blobs per system, seeded by system ID
    const rng = new RNG(sysData.seed + 8888);
    for (let i = 0; i < 2; i++) {
      const nx = rng.float(400, SYS_W - 400);
      const ny = rng.float(300, SYS_H - 300);
      const radius = rng.float(250, 400);
      const alpha = rng.float(0.02, 0.04);

      const nebula = this.add.circle(nx, ny, radius, nebulaColor, alpha).setDepth(0);
      this._nebulas.push(nebula);

      // Slow drift tween: 50px over 20s, yoyo, repeat forever
      const driftX = rng.float(-50, 50);
      const driftY = rng.float(-50, 50);
      this.tweens.add({
        targets: nebula,
        x: nx + driftX,
        y: ny + driftY,
        duration: 20000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  updateParallax(delta) {
    if (!this._nearStars || !this._farStars) return;
    const cam = this.cameras.main;
    const scrollX = cam.scrollX;
    const scrollY = cam.scrollY;

    // Time-based constant drift even when velocity is 0
    this.starDriftTime = (this.starDriftTime || 0) + (delta || 16) / 1000;

    const g = this.nearStarLayer; g.clear();

    // Far stars: 5% camera scroll offset + constant drift
    for (const s of this._farStars) {
      const nx = s.x - scrollX * 0.05 + this.starDriftTime * 3;
      const ny = s.y - scrollY * 0.05 + this.starDriftTime * 1;
      // Wrap stars into viewport range
      const wx = ((nx % SYS_W) + SYS_W) % SYS_W;
      const wy = ((ny % SYS_H) + SYS_H) % SYS_H;
      const bright = s._bright ? s.brightness * 0.8 : s.brightness * 0.4;
      g.fillStyle(0x8899cc, bright);
      g.fillRect(wx, wy, s.size, s.size);
    }

    // Near stars: 15% camera scroll offset + constant drift
    for (const s of this._nearStars) {
      const nx = s.x - scrollX * 0.15 + this.starDriftTime * 8;
      const ny = s.y - scrollY * 0.15 + this.starDriftTime * 2;
      const wx = ((nx % SYS_W) + SYS_W) % SYS_W;
      const wy = ((ny % SYS_H) + SYS_H) % SYS_H;
      const bright = s._bright ? s.brightness * 1.0 : s.brightness * 0.5;
      g.fillStyle(0xaaddff, bright);
      g.fillRect(wx, wy, s.size, s.size);
    }
  }

  drawStar(star, time) {
    const g = this.starLayer; g.clear();
    const c = Phaser.Display.Color.HexStringToColor(star.color).color;
    const t = time || 0;
    const pulse = 1 + Math.sin(t * 0.002) * 0.05;
    const r = star.radius;

    // 1. Outer corona (pulsing)
    g.fillStyle(c, 0.04);
    g.fillCircle(star.x, star.y, r * 3.5 * pulse);

    // 2. Inner corona
    g.fillStyle(c, 0.1);
    g.fillCircle(star.x, star.y, r * 2.2);

    // 3. Star body
    g.fillStyle(c, 0.8);
    g.fillCircle(star.x, star.y, r);

    // 4. Hot core
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(star.x, star.y, r * 0.5);

    // 5. Bright center
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(star.x, star.y, r * 0.15);

    // 6. Corona rays (slowly rotating)
    g.lineStyle(1, c, 0.08);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 0.0005;
      const r1 = r * 1.2;
      const r2 = r * 2.8 * pulse;
      g.beginPath();
      g.moveTo(star.x + Math.cos(angle) * r1, star.y + Math.sin(angle) * r1);
      g.lineTo(star.x + Math.cos(angle) * r2, star.y + Math.sin(angle) * r2);
      g.strokePath();
    }
  }

  drawOrbits(sys) {
    const g = this.orbitLayer; g.clear();
    g.lineStyle(1, 0xffffff, 0.04);
    for (const p of sys.planets) g.strokeCircle(sys.star.x, sys.star.y, p.orbitDist);
  }

  drawStaticEntities() {
    const g = this.staticEntityGfx; g.clear();
    const pg = this.planetLayer; pg.clear();

    // Draw planets on planetLayer (depth 15) — below asteroids (depth 21)
    for (const p of this.planets) {
      const c = Phaser.Display.Color.HexStringToColor(p.type.color).color;
      const r = p.radius;
      const isZion = p.isHub;

      // 1. Atmosphere glow
      pg.fillStyle(c, isZion ? 0.25 : 0.15);
      pg.fillCircle(p.x, p.y, r * 1.3);

      // 2. Planet body
      pg.fillStyle(c, 1.0);
      pg.fillCircle(p.x, p.y, r);

      // 3. Shadow crescent (dark side)
      pg.fillStyle(0x000000, 0.25);
      pg.fillCircle(p.x + r * 0.2, p.y + r * 0.1, r * 0.95);

      // 4. Highlight (bright spot)
      pg.fillStyle(0xffffff, 0.2);
      pg.fillCircle(p.x - r * 0.3, p.y - r * 0.3, r * 0.4);

      // 5. Extra glow for Zion
      if (isZion) {
        pg.fillStyle(c, 0.08);
        pg.fillCircle(p.x, p.y, r * 1.6);
      }

      const label = isZion ? 'Zion' : p.type.name;
      this.labelTexts.push(this.add.text(p.x, p.y + r + 14, label, {
        fontSize: '12px', fontFamily: FONT, color: isZion ? '#2ecc71' : '#aaa',
      }).setOrigin(0.5, 0).setDepth(22));
    }

    // Draw stations on staticEntityGfx (depth 20)
    for (const s of this.stations) {
      this.labelTexts.push(this.add.text(s.x, s.y + s.size + 12, s.name, {
        fontSize: '12px', fontFamily: FONT, color: '#00d4ff',
      }).setOrigin(0.5, 0).setDepth(22));
    }
    for (const ga of this.gates) {
      this.labelTexts.push(this.add.text(ga.x, ga.y + ga.size + 12,
        ga.targetName + (ga.isDungeon ? ' \u26A0' : ''), {
        fontSize: '12px', fontFamily: FONT, color: ga.isDungeon ? '#ff00ff' : '#00d4ff',
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
    if (this.playerDead) return; // Death screen active — stop all updates
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

    if (this.tradeOpen) {
      return;
    }

    // Player
    this.player.update(this.cursors, this.input.activePointer);

    // Ship-asteroid collision
    for (const a of this.asteroids) {
      if (a.mined) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y);
      if (dist < a.size + 15) {
        // Push player away
        const angle = Phaser.Math.Angle.Between(a.x, a.y, this.player.x, this.player.y);
        const pushDist = (a.size + 15) - dist + 2;
        this.player.x += Math.cos(angle) * pushDist;
        this.player.y += Math.sin(angle) * pushDist;

        // Impact damage based on speed (with 1s cooldown)
        const impactSpeed = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y);
        if (impactSpeed > 50 && time > this.asteroidDamageCooldown) {
          this.asteroidDamageCooldown = time + 1000;
          const dmg = Math.floor(impactSpeed / 20); // 5-15 range
          this.player.hull -= dmg;
          if (this.player.hull < 0) this.player.hull = 0;
          this.cameras.main.shake(100, 0.003);
          this.sound_mgr.playPlayerHit();
          if (this.player.hull <= 0) {
            this.handlePlayerDeath();
          }
        }

        this.player.body.velocity.x *= -0.3;
        this.player.body.velocity.y *= -0.3;
      }
    }

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
      if (p.isHub && Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 150) {
        this.nearPlanetZion = true;
        break;
      }
    }

    // Non-Zion planet proximity bark (once per planet type)
    for (const p of this.planets) {
      if (p.isHub) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      if (dist < 80) {
        const typeKey = 'near_planet_' + (p.type?.name || 'unknown');
        if (!this.sessionTriggers.has(typeKey)) {
          this.sessionTriggers.add(typeKey);
          this.fireBark('near_planet');
          break;
        }
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
    if (this.player.fuel < this.player.maxFuel * 0.5 && !this.sessionTriggers.has('fuel_half')) {
      this.sessionTriggers.add('fuel_half');
      this.fireBark('fuel_below_50');
    }
    if (this.player.fuel < this.player.maxFuel * 0.2 && !this.sessionTriggers.has('fuel_warned')) {
      this.sessionTriggers.add('fuel_warned');
      this.fireBark('fuel_below_20');
    }
    // Out-of-fuel mechanic
    if (this.player.fuel <= 0) {
      if (!this.outOfFuel) {
        this.outOfFuel = true;
        this.outOfFuelTime = Date.now();
        this.player.body.setMaxVelocity(PLAYER_DEFAULTS.maxSpeed * 0.3);
        this.fireBark('fuel_at_zero');
      }
      // Extended bark after 10s
      if (Date.now() - this.outOfFuelTime > 10000 && !this.sessionTriggers.has('fuel_zero_ext')) {
        this.sessionTriggers.add('fuel_zero_ext');
        this.fireBark('fuel_zero_extended');
      }
    } else if (this.outOfFuel) {
      // Fuel restored (e.g., mined some)
      this.outOfFuel = false;
      this.player.body.setMaxVelocity(PLAYER_DEFAULTS.maxSpeed);
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

    // Star hazard zone
    if (this.currentSystem) {
      const star = this.currentSystem.star;
      const distToStar = Phaser.Math.Distance.Between(this.player.x, this.player.y, star.x, star.y);

      // Gravity pull (within 2.5x radius)
      // v0.6.5.1: Zero gravity when player is actively thrusting away from the star —
      // ensures escape is always possible regardless of fuel level or max-velocity cap.
      if (distToStar < star.radius * 2.5 && this.player.body) {
        const rawPull = 15 * (1 - distToStar / (star.radius * 2.5));
        const pullStrength = Math.min(rawPull, 3);
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, star.x, star.y);

        // Dot product: thrust direction vs away-from-star direction
        const awayX = this.player.x - star.x, awayY = this.player.y - star.y;
        const thrustX = Math.cos(this.player.shipAngle), thrustY = Math.sin(this.player.shipAngle);
        const dot = awayX * thrustX + awayY * thrustY;
        const escapingThrust = this.player.isThrusting && dot > 0;

        if (!escapingThrust) {
          this.player.body.velocity.x += Math.cos(angle) * pullStrength;
          this.player.body.velocity.y += Math.sin(angle) * pullStrength;
        }
      }

      // Warning zone (1.8x radius)
      if (distToStar < star.radius * 1.8) {
        if (!this._starWarned) {
          this._starWarned = true;
          this.fireBark('near_star');
        }
      } else {
        this._starWarned = false;
      }

      // Damage zone (1.2x radius) — slingshot push + heavy damage
      if (distToStar < star.radius * 1.2) {
        // B35: gentle push outward — firm drift, not a pinball launch
        const pushAngle = Phaser.Math.Angle.Between(star.x, star.y, this.player.x, this.player.y);
        if (this.player.body) {
          this.player.body.velocity.x = Math.cos(pushAngle) * 120;
          this.player.body.velocity.y = Math.sin(pushAngle) * 120;
        }

        // Damage: 10 hull per second on cooldown timer
        if (time > this.starDamageCooldown) {
          this.starDamageCooldown = time + 1000; // 1 second cooldown
          this.player.hull -= 10;
          if (this.player.hull < 0) this.player.hull = 0;

          // Camera shake + red tint
          this.cameras.main.shake(150, 0.005);
          if (this.player.gfx) {
            this.player.gfx.setTint(0xff0000);
            this.time.delayedCall(200, () => {
              if (this.player.gfx) this.player.gfx.clearTint();
            });
          }

          // Pepper bark on first star damage (once per session)
          if (!this.sessionTriggers.has('star_damage_bark')) {
            this.sessionTriggers.add('star_damage_bark');
            this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
              text: "Pepper: The star's cookin' us, Pax! GET US OUTTA HERE!"
            }});
          }

          // Death check
          if (this.player.hull <= 0) {
            this.handlePlayerDeath();
          }
        }
      }
    }

    // Transmission typewriter
    this.updateTransmissionTypewriter(delta);

    // Animated star (pulsing corona)
    if (this.currentSystem) {
      this.drawStar(this.currentSystem.star, time);
    }

    // Parallax
    this.updateParallax(delta);

    // Combat
    this.updateCombat(time, delta);
    this.updateLootPickup();

    // Animated entities
    this.drawAnimatedEntities(time);

    // Asteroid HP bars
    this.drawAsteroidHPBars();

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
      this.promptText.setText('[F] Dock at The Outpost (Hub)')
        .setColor('#2ecc71').setPosition(W / 2, H - 60).setVisible(true);
    } else if (this.nearGate) {
      const gt = this.nearGate;
      this.promptText.setText('[E] WARP \u2192 ' + gt.targetName + (gt.isDungeon ? ' \u26A0 DUNGEON' : ''))
        .setColor(gt.isDungeon ? '#ff00ff' : '#00d4ff').setPosition(W / 2, H - 60).setVisible(true);
    } else if (this.nearStation) {
      const st = this.nearStation;
      let dockLabel;
      if (this.outOfFuel) {
        dockLabel = '[F] Emergency Dock \u2014 Free Fuel';
      } else {
        // H3/H4/Dock Prompt: format by station type
        const sType = st.stationType || 'outpost';
        if (sType === 'trading_post') {
          dockLabel = '[F] Dock at Trading Post ' + st.name;
        } else if (sType === 'refinery') {
          dockLabel = '[F] Dock at Refinery ' + st.name;
        } else if (sType === 'hub') {
          dockLabel = '[F] Dock at The Outpost (Hub)';
        } else {
          dockLabel = '[F] Dock at Outpost ' + st.name;
        }
      }
      this.promptText.setText(dockLabel)
        .setColor(this.outOfFuel ? '#f1c40f' : '#00d4ff').setPosition(W / 2, H - 60).setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }

  drawAsteroidHPBars() {
    this.miningGfx.clear();
    for (const a of this.asteroids) {
      if (a.mined || a.hp >= a.maxHp) continue;
      const bw = a.size * 2.5;
      this.miningGfx.fillStyle(0x333333, 0.8);
      this.miningGfx.fillRect(a.x - bw / 2, a.y + a.size + 4, bw, 3);
      this.miningGfx.fillStyle(0x00d4ff);
      this.miningGfx.fillRect(a.x - bw / 2, a.y + a.size + 4, bw * (a.hp / a.maxHp), 3);
    }
  }

  // ========== SHOOT-TO-MINE ==========

  handleAsteroidHit(asteroid, damage) {
    asteroid.hp -= damage;

    // Visual: debris particles
    for (let i = 0; i < 3; i++) {
      const px = asteroid.x + (Math.random() - 0.5) * asteroid.size;
      const py = asteroid.y + (Math.random() - 0.5) * asteroid.size;
      const p = this.add.rectangle(px, py, 2, 2, 0x8B7355).setDepth(200);
      this.tweens.add({
        targets: p, x: px + (Math.random() - 0.5) * 30, y: py + (Math.random() - 0.5) * 30,
        alpha: 0, duration: 400, onComplete: () => p.destroy(),
      });
    }

    // Sound: rock hit
    this.sound_mgr.playMiningClick();

    if (asteroid.hp <= 0) {
      this.destroyAsteroid(asteroid);
    }
  }

  destroyAsteroid(asteroid) {
    asteroid.mined = true;
    this.sound_mgr.playMineComplete();

    // Bigger debris burst
    for (let i = 0; i < 8; i++) {
      const px = asteroid.x + (Math.random() - 0.5) * asteroid.size * 1.5;
      const py = asteroid.y + (Math.random() - 0.5) * asteroid.size * 1.5;
      const c = [0x8B7355, 0xA0A0A0, 0x6B6B6B][Math.floor(Math.random() * 3)];
      const p = this.add.rectangle(px, py, 3, 3, c).setDepth(200);
      this.tweens.add({
        targets: p, x: px + (Math.random() - 0.5) * 50, y: py + (Math.random() - 0.5) * 50,
        alpha: 0, duration: 600, onComplete: () => p.destroy(),
      });
    }

    // Resource drops as loot pickups
    const res = RESOURCES[asteroid.resourceId];
    if (res) {
      const drops = asteroid.size < 15 ? 1 : asteroid.size < 20 ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < drops; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 30;
        this.spawnLootItem(
          asteroid.x + Math.cos(angle) * dist,
          asteroid.y + Math.sin(angle) * dist,
          asteroid.resourceId, 1, Phaser.Display.Color.HexStringToColor(res.tier.color).color
        );
      }
    }

    // XP
    this.player.xp += 3;
    const xpText = this.add.text(asteroid.x, asteroid.y - 15, '+3 XP', {
      fontSize: '8px', fontFamily: FONT, color: '#bb6bd9', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(300);
    this.tweens.add({ targets: xpText, y: asteroid.y - 40, alpha: 0, duration: 800, onComplete: () => xpText.destroy() });

    // Level up check
    if (this.player.xp >= this.player.xpNext) {
      this.player.level++;
      this.player.xp -= this.player.xpNext;
      this.player.xpNext = Math.floor(this.player.xpNext * 1.5);
      this.onLevelUp();
    }

    // First mine bark
    if (!this.firstMineComplete) {
      this.firstMineComplete = true;
      this.fireBark('first_mine_complete');
    }

    // Big haul bark
    const drops = asteroid.size >= 20 ? 3 : 0;
    if (drops >= 3 && !this.firedTriggers.has('bark_big_haul')) {
      this.firedTriggers.add('bark_big_haul');
      this.fireBark('asteroid_dropped_3_plus');
    }

    this.lastActivityTime = Date.now();
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
      this._showBark(item.data.text, item.speaker);
    } else if (item.type === 'transmission') {
      this._showTransmission(item.data);
    }
  }

  _dismissQueueItem(item) {
    if (item.type === 'bark') {
      if (this.barkTimer) this.barkTimer.remove();
      if (this._barkTypewriter) { this._barkTypewriter.remove(); this._barkTypewriter = null; }
      // Clean up all bark game objects
      for (const obj of this.barkObjects) {
        if (obj && obj.destroy) obj.destroy();
      }
      this.barkObjects = [];
    } else if (item.type === 'transmission') {
      if (this.transTimer) this.transTimer.remove();
      if (this.transPortrait) { this.transPortrait.destroy(); this.transPortrait = null; }
      this.transContainer.setVisible(false).setAlpha(1);
      this.transCurrentBeat = null;
    }
  }

  _showBark(text, speaker) {
    // B27: halt ship when a bark fires — prevents thrust-sticking
    if (this.player && this.player.body) {
      this.player.body.setAcceleration(0, 0);
      this.player.isThrusting = false;
    }
    this.sound_mgr.playBarkBlip();
    const W = this.cameras.main.width;

    // Clean up previous bark objects
    for (const obj of this.barkObjects) {
      if (obj && obj.destroy) obj.destroy();
    }
    this.barkObjects = [];

    const sp = speaker || 'pepper';
    // H8/H9: Wider bark box (560px min), increased padding
    const PORTRAIT_SZ = 48;
    const PAD = 10;
    const boxW = Math.max(560, W * 0.55);
    const boxH = 80;
    const boxX = W / 2 - boxW / 2;
    const boxY = 70 - boxH / 2;

    // Dark background box
    const boxGfx = this.add.graphics().setScrollFactor(0).setDepth(800).setAlpha(0);
    boxGfx.fillStyle(0x000000, 0.85);
    boxGfx.fillRect(boxX, boxY, boxW, boxH);
    boxGfx.lineStyle(1, 0x1a3a4a, 1);
    boxGfx.strokeRect(boxX, boxY, boxW, boxH);
    this.barkObjects.push(boxGfx);

    // Portrait: 48x48, 10px from left edge of bark box
    const portraitX = boxX + PAD + PORTRAIT_SZ / 2;
    const portraitY = boxY + boxH / 2;
    // Resolve portrait key — support M.O.T.H.E.R. and named speakers
    const portraitKeyMap = {
      pepper: 'pepper_neutral', pax: 'pax_neutral',
      'M.O.T.H.E.R.': 'mother', mother: 'mother',
      grix: 'grix', vera: 'vera', 'commander vera': 'vera',
    };
    const pKey = portraitKeyMap[sp] || portraitKeyMap[sp.toLowerCase()] || sp;
    if (this.textures.exists(pKey)) {
      const portrait = this.add.image(portraitX, portraitY, pKey)
        .setDisplaySize(PORTRAIT_SZ, PORTRAIT_SZ).setScrollFactor(0).setDepth(801).setAlpha(0);
      this.barkObjects.push(portrait);
    } else {
      // Colored rect fallback
      const colors = { pepper: 0x87CEEB, pax: 0xe67e22, 'M.O.T.H.E.R.': 0xe74c3c, mother: 0xe74c3c };
      const c = colors[sp] || colors[sp.toLowerCase()] || 0x87CEEB;
      const fallbackGfx = this.add.graphics().setScrollFactor(0).setDepth(801).setAlpha(0);
      fallbackGfx.fillStyle(c, 0.4);
      fallbackGfx.fillRect(portraitX - PORTRAIT_SZ / 2, portraitY - PORTRAIT_SZ / 2, PORTRAIT_SZ, PORTRAIT_SZ);
      fallbackGfx.lineStyle(1, c, 0.6);
      fallbackGfx.strokeRect(portraitX - PORTRAIT_SZ / 2, portraitY - PORTRAIT_SZ / 2, PORTRAIT_SZ, PORTRAIT_SZ);
      this.barkObjects.push(fallbackGfx);
    }

    // H8: Text starts at portrait.right + 12px
    const textStartX = boxX + PAD + PORTRAIT_SZ + 12;
    const wrapWidth = boxW - PORTRAIT_SZ - PAD * 3 - 12;

    // Speaker name
    const speakerColors = { pepper: '#87CEEB', pax: '#e67e22', 'M.O.T.H.E.R.': '#f39c12', mother: '#f39c12' };
    const nameColor = speakerColors[sp] || speakerColors[sp.toLowerCase()] || '#87CEEB';
    const speakerName = sp.charAt(0).toUpperCase() + sp.slice(1);
    const nameText = this.add.text(textStartX, boxY + PAD, speakerName, {
      fontSize: '11px', fontFamily: FONT, color: nameColor,
    }).setScrollFactor(0).setDepth(801).setAlpha(0);
    this.barkObjects.push(nameText);

    // Strip speaker prefix from text if present (e.g. "Pepper: ...")
    let displayText = text;
    const prefixMatch = text.match(/^[A-Za-z.]+:\s*/);
    if (prefixMatch) displayText = text.slice(prefixMatch[0].length);

    // Bark text (starts empty — typewriter fills it)
    const barkText = this.add.text(textStartX, boxY + PAD + 18, '', {
      fontSize: '11px', fontFamily: FONT, color: '#c8d8e8',
      wordWrap: { width: wrapWidth },
    }).setScrollFactor(0).setDepth(801).setAlpha(0);
    this.barkObjects.push(barkText);

    // Fade in all objects (200ms)
    for (const obj of this.barkObjects) {
      this.tweens.add({ targets: obj, alpha: 1, duration: 200 });
    }

    // Typewriter effect — 40 chars/sec, then 6s hold after complete
    if (this.barkTimer) this.barkTimer.remove();
    if (this._barkTypewriter) this._barkTypewriter.remove();
    let charIdx = 0;
    const BARK_CHARS_PER_SEC = 40;
    this._barkTypewriterText = displayText;
    this._barkTypewriter = this.time.addEvent({
      delay: 1000 / BARK_CHARS_PER_SEC, // 25ms per char
      loop: true,
      callback: () => {
        charIdx++;
        barkText.setText(displayText.substring(0, charIdx));
        // Tick sound on alphanumeric chars
        if (charIdx <= displayText.length) {
          const ch = displayText[charIdx - 1];
          if (ch && /[a-zA-Z0-9]/.test(ch)) {
            this.sound_mgr.playTypewriterTick(sp);
          }
        }
        if (charIdx >= displayText.length) {
          this._barkTypewriter.remove();
          this._barkTypewriter = null;
          // Text complete — hold timer (3s if chained, 6s standalone)
          const holdTime = this.textQueue.getBarkHoldTime();
          this.barkTimer = this.time.delayedCall(holdTime, () => {
            for (const obj of this.barkObjects) {
              this.tweens.add({ targets: obj, alpha: 0, duration: 300 });
            }
            this.time.delayedCall(300, () => {
              for (const obj of this.barkObjects) {
                if (obj && obj.destroy) obj.destroy();
              }
              this.barkObjects = [];
              this.textQueue.dismiss();
            });
          });
        }
      },
    });
  }

  _showTransmission(beat) {
    const W = this.cameras.main.width;
    this.transCurrentBeat = beat;
    this.transLineIndex = 0;
    this.transDismissable = false;
    this.transTypewriterChars = 0;
    this.transTypewriterDone = false;

    const isMother = beat.speaker === 'M.O.T.H.E.R.';
    const isOutrider = beat.speaker === 'outrider';
    const color = isMother ? '#f39c12' : isOutrider ? '#2ecc71' : '#33ff66';
    this.transBorderColor = isMother ? 0xf39c12 : isOutrider ? 0x2ecc71 : 0x33ff66;
    this.transSpeakerLabel = isMother ? '\u25C8 M.O.T.H.E.R.' : '\u25C8 INCOMING';

    this.transText.setColor(color);

    // Show portrait for M.O.T.H.E.R. transmissions
    if (this.transPortrait) { this.transPortrait.destroy(); this.transPortrait = null; }
    if (isMother && this.textures.exists('mother')) {
      this.transPortrait = this.add.image(W / 2 - 260, 160, 'mother')
        .setDisplaySize(64, 64).setScrollFactor(0).setDepth(521);
      this.transContainer.add(this.transPortrait);
    }

    if (isMother) this.sound_mgr.playMotherHum();
    else this.sound_mgr.playTransmissionStatic();

    this.transContainer.setVisible(true).setAlpha(1);
    this._startTransmissionLine();
  }

  _startTransmissionLine() {
    const beat = this.transCurrentBeat;
    if (!beat || this.transLineIndex >= beat.lines.length) {
      // All lines done — auto-dismiss after 2s
      if (this.transTimer) this.transTimer.remove();
      this.transTimer = this.time.delayedCall(2000, () => {
        this.tweens.add({ targets: this.transContainer, alpha: 0, duration: 400,
          onComplete: () => {
            this.transContainer.setVisible(false).setAlpha(1);
            this.transCurrentBeat = null;
            this.textQueue.dismiss();
          }
        });
      });
      return;
    }

    this.transFullLine = beat.lines[this.transLineIndex];
    this.transTypewriterChars = 0;
    this.transTypewriterDone = false;
    this.transDismissable = true;

    // Show speaker label immediately, start typewriter
    const W = this.cameras.main.width;
    this.transText.setText(this.transSpeakerLabel + '\n');
    this.transText.setPosition(W / 2, 40);
    this._drawTransmissionBox(W);
  }

  // Called from FlightScene update loop
  updateTransmissionTypewriter(delta) {
    if (!this.transCurrentBeat || this.transTypewriterDone) return;

    const TRANS_CHARS_PER_SEC = 25;
    const prevChars = Math.floor(this.transTypewriterChars);
    this.transTypewriterChars += TRANS_CHARS_PER_SEC * (delta / 1000);
    const chars = Math.min(Math.floor(this.transTypewriterChars), this.transFullLine.length);

    // Typewriter tick
    if (chars > prevChars) {
      const newChar = this.transFullLine[chars - 1];
      if (newChar && /[a-zA-Z0-9]/.test(newChar)) {
        this.sound_mgr.playTypewriterTick(this.transCurrentBeat.speaker);
      }
    }
    const W = this.cameras.main.width;
    this.transText.setText(this.transSpeakerLabel + '\n' + this.transFullLine.substring(0, chars));
    this.transText.setPosition(W / 2, 40);
    this._drawTransmissionBox(W);

    if (chars >= this.transFullLine.length) {
      this.transTypewriterDone = true;
      // Auto-advance to next line after 1.5s pause
      if (this.transTimer) this.transTimer.remove();
      this.transTimer = this.time.delayedCall(1500, () => {
        this.transLineIndex++;
        this._startTransmissionLine();
      });
    }
  }

  _drawTransmissionBox(W) {
    this.transGfx.clear();
    const bounds = this.transText.getBounds();
    const pad = 12;
    this.transGfx.fillStyle(0x000000, 0.85);
    this.transGfx.fillRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2);
    this.transGfx.lineStyle(1, this.transBorderColor, 0.6);
    this.transGfx.strokeRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2);
  }

  advanceTransmission() {
    if (!this.transCurrentBeat) return;
    if (this.transTimer) this.transTimer.remove();

    if (!this.transTypewriterDone) {
      // Mid-typewriter: complete current line instantly
      this.transTypewriterChars = this.transFullLine.length;
      this.transTypewriterDone = true;
      const W = this.cameras.main.width;
      this.transText.setText(this.transSpeakerLabel + '\n' + this.transFullLine);
      this.transText.setPosition(W / 2, 40);
      this._drawTransmissionBox(W);
      // Auto-advance after 1.5s
      this.transTimer = this.time.delayedCall(1500, () => {
        this.transLineIndex++;
        this._startTransmissionLine();
      });
    } else {
      // Line complete: advance to next
      this.transLineIndex++;
      this._startTransmissionLine();
    }
  }

  onLevelUp() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Stats boost
    this.player.maxHull += 5;
    this.player.maxShield += 5;
    this.player.hull = this.player.maxHull; // full heal
    this.player.shield = this.player.maxShield;

    // Damage boost every 2 levels
    if (this.player.level % 2 === 0) {
      this.weaponSystem.weapon.damage += 2;
    }

    // Sound: ascending chime (440→550→660 Hz)
    this.sound_mgr.playLevelUpChime();

    // Visual: gold ring expanding from ship
    const ring = this.add.circle(this.player.x, this.player.y, 10, 0xffd700, 0).setDepth(250);
    ring.setStrokeStyle(3, 0xffd700, 0.8);
    this.tweens.add({
      targets: ring, radius: 120, alpha: 0,
      duration: 1000, onComplete: () => ring.destroy(),
    });

    // Visual: "LEVEL X" text center-screen
    const lvlText = this.add.text(W / 2, H * 0.35, 'LEVEL ' + this.player.level, {
      fontSize: '32px', fontFamily: FONT, color: '#ffd700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(600).setAlpha(0);
    this.tweens.add({ targets: lvlText, alpha: 1, duration: 300 });
    this.time.delayedCall(2000, () => {
      this.tweens.add({ targets: lvlText, alpha: 0, duration: 500, onComplete: () => lvlText.destroy() });
    });

    // Pepper bark
    this.fireBark('level_up');

    // Auto-save on level up
    this.autoSave();
  }

  _spawnHitSparks(color, count) {
    for (let i = 0; i < count; i++) {
      const px = this.player.x + (Math.random() - 0.5) * 16;
      const py = this.player.y + (Math.random() - 0.5) * 16;
      const p = this.add.rectangle(px, py, 2, 2, color).setDepth(200).setAlpha(0.9);
      this.tweens.add({
        targets: p, x: px + (Math.random() - 0.5) * 40, y: py + (Math.random() - 0.5) * 40,
        alpha: 0, duration: 300, onComplete: () => p.destroy(),
      });
    }
  }

  // ========== COMBAT ==========

  setupCombatCollisions() {
    // Player projectiles vs enemy bodies — checked each frame in updateCombat
    // Enemy projectiles vs player — checked each frame in updateCombat
  }

  updateCombat(time, delta) {
    if (this.playerDead) return;

    // Weapon always updates (range check) + firing for asteroid mining
    this.weaponSystem.update();

    // Fire weapon on left click or right click (shoot-to-mine + shoot enemies)
    const ptr = this.input.activePointer;
    const canFire = !this.dialogueActive && !this.invOpen && !this.dialogueUI.isOpen;
    if (canFire && (ptr.leftButtonDown() || ptr.rightButtonDown())) {
      const proj = this.weaponSystem.fire(time, this.player.x, this.player.y, this.player.shipAngle);
      if (proj) {
        this.sound_mgr.playLaser();
        this.lastActivityTime = Date.now();
      }
    }

    // Check player projectiles vs asteroids (shoot-to-mine) — always active
    this.weaponSystem.projectiles.getChildren().forEach(proj => {
      if (!proj || !proj.active) return;
      for (const a of this.asteroids) {
        if (a.mined) continue;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, a.x, a.y);
        if (dist < a.size + 4) {
          const dmg = proj._damage || 15;
          proj.destroy();
          this.handleAsteroidHit(a, dmg);
          break;
        }
      }
    });

    // Skip enemy combat processing entirely when zone is cleared
    if (this.systemCleared) return;

    const dt = delta / 1000;
    const danger = this.currentSystem ? this.currentSystem.data.danger : 1;

    // Update enemy manager
    // Track if this system ever had enemies
    if (this.enemyManager.getEnemyCount() > 0) {
      this.systemHadEnemies = true;
    }

    this.enemyManager.update(time, delta, this.player.x, this.player.y, danger);

    // Check zone cleared via kill/spawn tracking (not distance despawn)
    if (!this.systemCleared && this.enemyManager.isZoneCleared()) {
      this.systemCleared = true;
      this.fireBark('all_enemies_cleared');
      this.combatHullWarned = false;
      this.combatShieldsWarned = false;
      // Respawn timer: enemies return after 90s
      this.time.delayedCall(90000, () => {
        if (this.systemCleared && this.currentSystemId) {
          this.systemCleared = false;
          this.enemyManager.totalKills = 0;
          this.enemyManager.totalSpawned = 0;
          // Fire respawn bark once per session per system
          const rKey = 'respawn_' + this.currentSystemId;
          if (!this.sessionTriggers.has(rKey)) {
            this.sessionTriggers.add(rKey);
            this.fireBark('enemies_respawned');
          }
        }
      });
    }

    // First enemy spotted bark
    if (this.enemyManager.getEnemyCount() > 0 && !this.firedTriggers.has('first_enemy_spotted')) {
      this.firedTriggers.add('first_enemy_spotted');
      this.fireBark('first_enemy_spotted');
    }

    // Check player projectiles vs enemies
    for (const enemy of this.enemyManager.enemies) {
      if (!enemy.alive || enemy.spawnFade > 0) continue;
      this.weaponSystem.projectiles.getChildren().forEach(proj => {
        if (!proj || !proj.active || !enemy.body || !enemy.body.active) return;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, enemy.x, enemy.y);
        if (dist < 15) {
          const dmg = proj._damage || 15;
          enemy.takeDamage(dmg);
          proj.destroy();

          // Damage number popup
          const ft = this.add.text(enemy.x, enemy.y - 15, '-' + dmg, {
            fontSize: '8px', fontFamily: FONT, color: '#ffffff', stroke: '#000', strokeThickness: 2,
          }).setOrigin(0.5).setDepth(300);
          this.tweens.add({ targets: ft, y: enemy.y - 40, alpha: 0, duration: 800, onComplete: () => ft.destroy() });

          // Check if enemy died
          if (!enemy.alive) {
            this.handleEnemyKill(enemy);
          }
        }
      });
    }

    // Check enemy projectiles vs player
    this.enemyManager.enemyProjectiles.getChildren().forEach(proj => {
      if (!proj || !proj.active) return;
      const dist = Phaser.Math.Distance.Between(proj.x, proj.y, this.player.x, this.player.y);
      if (dist < 20) {
        const dmg = proj._damage || 5;
        proj.destroy();
        this.playerTakeDamage(dmg);
      }
    });

    // Combat hull warning
    if (this.player.hull < this.player.maxHull * 0.25 && !this.combatHullWarned && this.enemyManager.getEnemyCount() > 0) {
      this.combatHullWarned = true;
      this.fireBark('hull_below_25_combat');
    }

    // Shield regen pause
    if (this.shieldRegenPaused > 0 && Date.now() > this.shieldRegenPaused) {
      this.shieldRegenPaused = 0;
    }
  }

  handleEnemyKill(enemy) {
    this.sound_mgr.playEnemyDeath();
    this.enemyManager.handleEnemyDeath(enemy);

    // First kill bark
    if (!this.firedTriggers.has('first_enemy_kill')) {
      this.firedTriggers.add('first_enemy_kill');
      this.fireBark('first_enemy_kill');
    } else if (Date.now() - this.lastCombatBarkTime > 5000) {
      // Random combat bark with cooldown
      this.lastCombatBarkTime = Date.now();
      const barks = getBarksByTrigger('enemy_destroyed');
      if (barks.length > 0) {
        const bark = barks[Math.floor(Math.random() * barks.length)];
        this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: 'Pepper: ' + bark.lines[0] } });
      }
    }

    // Quest progress: kill_enemy
    const killReady = this.questManager.updateProgress('kill_enemy', { enemy: 'tin_badge' });
    if (killReady.length > 0) {
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: That's the last one for the job! Time to report in." } });
    }

    // XP
    this.player.xp += enemy.xp || 10;
    const xpText = this.add.text(enemy.x, enemy.y - 20, '+' + (enemy.xp || 10) + ' XP', {
      fontSize: '8px', fontFamily: FONT, color: '#bb6bd9', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(300);
    this.tweens.add({ targets: xpText, y: enemy.y - 50, alpha: 0, duration: 1000, onComplete: () => xpText.destroy() });

    // Level up check
    if (this.player.xp >= this.player.xpNext) {
      this.player.level++;
      this.player.xp -= this.player.xpNext;
      this.player.xpNext = Math.floor(this.player.xpNext * 1.5);
      this.onLevelUp();
    }

    // Loot drop
    this.spawnLoot(enemy.x, enemy.y, enemy.loot);
  }

  spawnLoot(x, y, loot) {
    if (!loot) return;

    // Credits (always)
    const credits = loot.credits[0] + Math.floor(Math.random() * (loot.credits[1] - loot.credits[0]));
    this.spawnLootItem(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20,
      'credits', credits, 0xf1c40f);

    // Resource (40% chance)
    if (Math.random() < (loot.resourceChance || 0.4) && loot.resources) {
      const resId = loot.resources[Math.floor(Math.random() * loot.resources.length)];
      this.spawnLootItem(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30,
        resId, 1, 0x2ecc71);
    }
  }

  spawnLootItem(x, y, type, amount, color) {
    const item = this.add.rectangle(x, y, 6, 6, color).setDepth(150);
    item._lootType = type;
    item._lootAmount = amount;

    // Bob animation
    this.tweens.add({
      targets: item, y: y - 5, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut',
    });

    // Auto-collect check each frame (stored for update loop)
    if (!this._lootItems) this._lootItems = [];
    this._lootItems.push(item);

    // Despawn after 30s
    this.time.delayedCall(30000, () => {
      if (item && item.active) {
        item.destroy();
        this._lootItems = this._lootItems.filter(i => i !== item);
      }
    });
  }

  updateLootPickup() {
    if (!this._lootItems) return;
    for (let i = this._lootItems.length - 1; i >= 0; i--) {
      const item = this._lootItems[i];
      if (!item || !item.active) { this._lootItems.splice(i, 1); continue; }

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (dist < 50) {
        this.sound_mgr.playPickup();
        let label = '';
        if (item._lootType === 'credits') {
          this.player.credits += item._lootAmount;
          label = '+' + item._lootAmount + ' Credits';
        } else {
          this.inventory.addItem(item._lootType, item._lootAmount);
          const res = RESOURCES[item._lootType];
          label = '+' + item._lootAmount + ' ' + (res ? res.name : item._lootType);
          // Quest progress: collect_resource
          const qReady = this.questManager.updateProgress('collect_resource', { resource: item._lootType, amount: item._lootAmount });
          if (qReady.length > 0) {
            this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: That's everything for the quest! Let's go turn it in." } });
          }
        }

        const ft = this.add.text(item.x, item.y - 10, label, {
          fontSize: '8px', fontFamily: FONT, color: '#f1c40f', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(300);
        this.tweens.add({ targets: ft, y: item.y - 35, alpha: 0, duration: 800, onComplete: () => ft.destroy() });

        item.destroy();
        this._lootItems.splice(i, 1);
      }
    }
  }

  playerTakeDamage(amount) {
    if (this.playerDead) return;
    this.sound_mgr.playPlayerHit();

    // Pause shield regen for 3s
    this.shieldRegenPaused = Date.now() + 5000; // 5s pause after hit

    if (this.player.shield > 0) {
      this.player.shield -= amount;
      if (this.player.shield < 0) {
        // Overflow to hull
        this.player.hull += this.player.shield;
        this.player.shield = 0;
        if (!this.combatShieldsWarned) {
          this.combatShieldsWarned = true;
          this.fireBark('shields_depleted');
        }
      }
      // Shield hit bark (15s cooldown)
      if (Date.now() - (this._lastShieldBarkTime || 0) > 15000) {
        this._lastShieldBarkTime = Date.now();
        this.fireBark('player_hit');
      }
      // Shield hit: blue ring flash around ship + sparks
      this._spawnHitSparks(0x4488ff, 4);
      if (this.player.gfx) {
        this.player.gfx.lineStyle(2, 0x4488ff, 0.8);
        this.player.gfx.strokeCircle(this.player.x, this.player.y, 20);
        this.time.delayedCall(100, () => this.player.redraw && this.player.redraw());
      }
    } else {
      this.player.hull -= amount;
      // Hull hit: red tint + sparks + subtle shake
      this._spawnHitSparks(0xff4444, 5);
      this.cameras.main.shake(100, 0.003);
      // Hull damage bark (repeats on 15s cooldown)
      if (Date.now() - this.lastCombatBarkTime > 15000) {
        this.lastCombatBarkTime = Date.now();
        this.fireBark('player_hit_hull');
      }
    }

    if (this.player.hull <= 0) {
      this.player.hull = 0;
      this.handlePlayerDeath();
    }
  }

  handlePlayerDeath() {
    this.playerDead = true;
    this.sound_mgr.stopAll();
    this.enemyManager.clearAll();

    // Particle burst
    for (let i = 0; i < 15; i++) {
      const px = this.player.x + (Math.random() - 0.5) * 30;
      const py = this.player.y + (Math.random() - 0.5) * 30;
      const c = [0xf39c12, 0xe74c3c, 0xffffff][Math.floor(Math.random() * 3)];
      const p = this.add.rectangle(px, py, 3, 3, c).setDepth(200);
      this.tweens.add({
        targets: p, x: px + (Math.random() - 0.5) * 80, y: py + (Math.random() - 0.5) * 80,
        alpha: 0, duration: 600, onComplete: () => p.destroy(),
      });
    }

    this.player.setVisible(false);

    // Fade to black after 1s
    this.time.delayedCall(1000, () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        // CRITICAL: Reset the camera fade effect so it stops covering everything.
        // The fade paints an opaque black fill over ALL rendered objects.
        // We replace it with our own overlay rectangle that respects depth sorting.
        this.cameras.main.resetFX();
        this.showDeathScreen();
      });
    });
  }

  showDeathScreen() {
    const W = this.scale.width;
    const H = this.scale.height;
    const elements = [];

    // Black overlay (BELOW all death content)
    const overlay = this.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x000000)
      .setScrollFactor(0).setDepth(998);
    elements.push(overlay);

    // Interactive click zone (ABOVE overlay, BELOW content)
    const clickZone = this.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x000000, 0)
      .setScrollFactor(0).setDepth(999).setInteractive({ useHandCursor: true });
    elements.push(clickZone);

    // M.O.T.H.E.R. portrait (or fallback) — ABOVE overlay + click zone
    const portraitX = W * 0.25, portraitY = H * 0.4;
    const pKey = 'mother';
    if (this.textures.exists(pKey)) {
      const img = this.add.image(portraitX, portraitY, pKey).setDisplaySize(96, 96)
        .setScrollFactor(0).setDepth(1000).setAlpha(0);
      this.tweens.add({ targets: img, alpha: 1, duration: 600 });
      elements.push(img);
    } else {
      const pg = this.add.graphics().setScrollFactor(0).setDepth(1000);
      pg.fillStyle(0xe74c3c, 0.3);
      pg.fillRect(portraitX - 48, portraitY - 48, 96, 96);
      pg.lineStyle(1, 0xe74c3c, 0.6);
      pg.strokeRect(portraitX - 48, portraitY - 48, 96, 96);
      const init = this.add.text(portraitX, portraitY, 'M', {
        fontSize: '32px', fontFamily: FONT, color: '#e74c3c',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
      elements.push(pg, init);
    }

    // Amber typewriter text lines — depth 1000
    const lines = [
      'M.O.T.H.E.R.',
      "VESSEL 'DUSTKICKER' HAS BEEN PROCESSED.",
      'OCCUPANTS RELEASED TO NEAREST STATION.',
      'HAVE A PRODUCTIVE DAY.',
    ];
    const textX = W * 0.42, startY = H * 0.3;
    const deathTexts = [];
    lines.forEach((line, i) => {
      const t = this.add.text(textX, startY + i * 28, '', {
        fontSize: '10px', fontFamily: FONT, color: '#f39c12',
      }).setScrollFactor(0).setDepth(1000);
      deathTexts.push(t);
      elements.push(t);
    });

    // Typewriter effect
    let lineIdx = 0, charIdx = 0;
    const typeTimer = this.time.addEvent({
      delay: 40,
      loop: true,
      callback: () => {
        if (lineIdx >= lines.length) { typeTimer.remove(); return; }
        charIdx++;
        deathTexts[lineIdx].setText(lines[lineIdx].substring(0, charIdx));
        this.sound_mgr.playTypewriterTick('M.O.T.H.E.R.');
        if (charIdx >= lines[lineIdx].length) {
          lineIdx++;
          charIdx = 0;
        }
      },
    });

    // Penalty text — depth 1000
    const creditsLost = Math.floor(this.player.credits * 0.25);
    const penaltyText = this.add.text(textX, startY + lines.length * 28 + 20,
      `Credits confiscated: -${creditsLost}\nHull repaired to 50%`, {
      fontSize: '8px', fontFamily: FONT, color: '#888888', lineSpacing: 4,
    }).setScrollFactor(0).setDepth(1000).setAlpha(0);
    elements.push(penaltyText);
    this.time.delayedCall(3000, () => this.tweens.add({ targets: penaltyText, alpha: 1, duration: 600 }));

    // Click hint — depth 1000
    const hint = this.add.text(W / 2, H * 0.75, '[Click or SPACE to continue]', {
      fontSize: '8px', fontFamily: FONT, color: '#555555',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    elements.push(hint);
    this.time.delayedCall(3500, () => this.tweens.add({ targets: hint, alpha: 1, duration: 400 }));

    // Cleanup + respawn — NO auto-timer, player MUST click or SPACE
    let respawnReady = false;
    const cleanup = () => {
      if (!this.playerDead) return;
      typeTimer.remove();
      elements.forEach(e => e.destroy());
      this.respawnPlayer();
    };

    clickZone.on('pointerdown', () => {
      if (respawnReady) cleanup();
    });
    this.input.keyboard.on('keydown-SPACE', () => {
      if (respawnReady && this.playerDead) cleanup();
    });

    // Enable respawn after 2s (let typewriter play)
    this.time.delayedCall(2000, () => { respawnReady = true; });
  }

  respawnPlayer() {
    // Penalty: lose 25% credits, hull 50%, fuel 50%
    this.player.credits = Math.floor(this.player.credits * 0.75);
    this.player.hull = this.player.maxHull * 0.5;
    this.player.shield = this.player.maxShield;
    this.player.fuel = this.player.maxFuel * 0.5;
    this.playerDead = false;
    this.player.setVisible(true);
    this.combatHullWarned = false;
    this.combatShieldsWarned = false;

    // Move to nearest station or hub
    const zion = this.planets.find(p => p.isHub);
    if (zion) {
      this.player.setPosition(zion.x, zion.y + 100);
    } else if (this.stations.length > 0) {
      const st = this.stations[0];
      this.player.setPosition(st.x, st.y + 50);
    }
    if (this.player.body) this.player.body.setVelocity(0, 0);

    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: "Pepper: Well... that happened. At least they didn't keep us."
      }});
    });
  }

  // ========== NPC DOCKING / HUB LANDING ==========

  tryDockOrLand() {
    if (this.invOpen || this.dialogueActive || this.tradeOpen) return;
    if (this.nearPlanetZion) {
      // B32: save on hub LAUNCH (returnFromHub), not on dock entry
      // H3: Show Vera's quest dialogue on hub dock before launching HubScene
      const vera = NPCS.find(n => n.id === 'quest_vera');
      if (vera) {
        const completeQuest = this.questManager.getActiveQuestForNPC('quest_vera');
        if (completeQuest && this.questManager.isQuestComplete(completeQuest.id)) {
          this.dialogueActive = true;
          const beat = { speaker: vera.name, portrait: vera.portrait, lines: completeQuest.dialogue.complete, choices: null };
          this.dialogueUI.show(beat, () => {
            this.dialogueActive = false;
            const deliveredObjs = completeQuest.objectives ? [...completeQuest.objectives] : [];
            const rewards = this.questManager.turnInQuest(completeQuest.id, this.inventory);
            if (rewards) {
              if (rewards.credits) this.player.credits += rewards.credits;
              if (rewards.xp) {
                this.player.xp += rewards.xp;
                if (this.player.xp >= this.player.xpNext) {
                  this.player.level++;
                  this.player.xp -= this.player.xpNext;
                  this.player.xpNext = Math.floor(this.player.xpNext * 1.5);
                  this.onLevelUp();
                }
              }
              if (rewards.fuel) this.player.fuel = Math.min(this.player.maxFuel, this.player.fuel + rewards.fuel);
              this._showRewardPopup(rewards, deliveredObjs);
              this.autoSave();
            }
            this._launchHubScene();
          });
          return;
        }
        const availQuest = this.questManager.getAvailableQuestForNPC('quest_vera', this.player.level);
        if (availQuest) {
          this.dialogueActive = true;
          const beat = { speaker: vera.name, portrait: vera.portrait, lines: availQuest.dialogue.offer, choices: null };
          this.dialogueUI.show(beat, () => {
            this.dialogueActive = false;
            this.questManager.acceptQuest(availQuest.id, this.inventory);
            this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: New quest from Vera! Check the HUD." } });
            this._launchHubScene();
          });
          return;
        }
        if (completeQuest && !this.questManager.isQuestComplete(completeQuest.id)) {
          this.dialogueActive = true;
          const beat = { speaker: vera.name, portrait: vera.portrait, lines: completeQuest.dialogue.inProgress, choices: null };
          this.dialogueUI.show(beat, () => {
            this.dialogueActive = false;
            this._launchHubScene();
          });
          return;
        }
        // Default Vera greeting
        this.dialogueActive = true;
        const lines = [vera.dialogue.greeting, vera.dialogue.farewell];
        const beat = { speaker: vera.name, portrait: vera.portrait, lines, choices: null };
        this.dialogueUI.show(beat, () => {
          this.dialogueActive = false;
          this._launchHubScene();
        });
        return;
      }
      this._launchHubScene();
      return;
    }
    if (this.nearStation) {
      this.tryDock();
    }
  }

  _launchHubScene() {
    this.sound_mgr.stopAll();
    this.scene.pause('FlightScene');
    this.scene.launch('HubScene');
  }

  tryDock() {
    if (!this.nearStation || this.invOpen || this.tradeOpen) return;
    // B32: save after quest interactions, not on dock entry
    // Emergency fuel refill
    if (this.outOfFuel) {
      this.player.fuel = Math.min(this.player.maxFuel, this.player.fuel + 25);
    }
    const npc = this.nearStation.npc;
    if (!npc) return;

    // Quest-aware NPC interaction
    // 1. Check for completable quest
    const completeQuest = this.questManager.getActiveQuestForNPC(npc.id);
    if (completeQuest && this.questManager.isQuestComplete(completeQuest.id)) {
      this.dialogueActive = true;
      const beat = {
        speaker: npc.name, portrait: npc.portrait,
        lines: completeQuest.dialogue.complete,
        choices: null,
      };
      this.dialogueUI.show(beat, () => {
        this.dialogueActive = false;
        const deliveredObjs = completeQuest.objectives ? [...completeQuest.objectives] : [];
        const rewards = this.questManager.turnInQuest(completeQuest.id, this.inventory);
        if (rewards) {
          if (rewards.credits) this.player.credits += rewards.credits;
          if (rewards.xp) {
            this.player.xp += rewards.xp;
            if (this.player.xp >= this.player.xpNext) {
              this.player.level++;
              this.player.xp -= this.player.xpNext;
              this.player.xpNext = Math.floor(this.player.xpNext * 1.5);
              this.onLevelUp();
            }
          }
          if (rewards.fuel) this.player.fuel = Math.min(this.player.maxFuel, this.player.fuel + rewards.fuel);
          this._showRewardPopup(rewards, deliveredObjs);
          this.autoSave();
        }
      });
      return;
    }

    // 2. Check for in-progress quest
    if (completeQuest && !this.questManager.isQuestComplete(completeQuest.id)) {
      this.dialogueActive = true;
      const beat = {
        speaker: npc.name, portrait: npc.portrait,
        lines: completeQuest.dialogue.inProgress,
        choices: null,
      };
      this.dialogueUI.show(beat, () => { this.dialogueActive = false; });
      return;
    }

    // 3. Check for available quest
    const availQuest = this.questManager.getAvailableQuestForNPC(npc.id, this.player.level);
    if (availQuest) {
      this.dialogueActive = true;
      const beat = {
        speaker: npc.name, portrait: npc.portrait,
        lines: availQuest.dialogue.offer,
        choices: null,
      };
      this.dialogueUI.show(beat, () => {
        this.dialogueActive = false;
        this.questManager.acceptQuest(availQuest.id, this.inventory);
        this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: New quest accepted! Check the HUD." } });
        this.autoSave(); // B32: save after quest accept
      });
      return;
    }

    // 4. Merchant — open trade UI
    if (npc.type === 'merchant') {
      this.showTradeUI(npc);
      return;
    }

    // 5. Default NPC dialogue
    this.dialogueActive = true;
    const lines = this.getNPCDialogueLines(npc);
    const beat = {
      speaker: npc.name, portrait: npc.portrait,
      lines: lines, choices: null,
    };
    this.dialogueUI.show(beat, () => { this.dialogueActive = false; });
  }

  getNPCDialogueLines(npc) {
    const d = npc.dialogue;
    if (npc.type === 'merchant') return [d.greeting, d.browse, d.farewell];
    if (npc.type === 'quest_giver') return [d.greeting, d.quest_offer, d.farewell];
    if (npc.type === 'informant') return [d.greeting, d.hint, d.farewell];
    return [d.greeting || 'Hello.', d.farewell || 'Goodbye.'];
  }

  // ========== TRADE UI ==========

  showTradeUI(npc) {
    this.tradeOpen = true;
    this._tradeNpc = npc;
    this._renderTradeUI();
  }

  _renderTradeUI() {
    // Cleanup previous
    for (const obj of this.tradeObjects) { if (obj && obj.destroy) obj.destroy(); }
    this.tradeObjects = [];

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const pw = 420, ph = 420;
    const px = W / 2 - pw / 2, py = H / 2 - ph / 2;

    // Background
    const bg = this.add.graphics().setScrollFactor(0).setDepth(700);
    bg.fillStyle(0x0a0a1a, 0.95);
    bg.fillRect(px, py, pw, ph);
    bg.lineStyle(2, 0xf39c12, 0.6);
    bg.strokeRect(px, py, pw, ph);
    this.tradeObjects.push(bg);

    // Title
    const npcName = this._tradeNpc ? this._tradeNpc.name : 'TRADER';
    const title = this.add.text(W / 2, py + 16, npcName.toUpperCase() + "'S TRADING POST", {
      fontSize: '11px', fontFamily: FONT, color: '#f39c12', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(701);
    this.tradeObjects.push(title);

    // Resource list
    const resourceMap = {};
    for (const slot of this.inventory.slots) {
      if (!slot) continue;
      if (!resourceMap[slot.resourceId]) resourceMap[slot.resourceId] = 0;
      resourceMap[slot.resourceId] += slot.count;
    }

    let y = py + 42;
    const entries = Object.entries(resourceMap);
    if (entries.length === 0) {
      const empty = this.add.text(W / 2, py + ph / 2 - 20, 'Nothing to sell!', {
        fontSize: '10px', fontFamily: FONT, color: '#666',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(701);
      this.tradeObjects.push(empty);
    } else {
      for (const [resId, qty] of entries) {
        const res = RESOURCES[resId];
        if (!res) continue;
        const totalVal = res.value * qty;

        const nameText = this.add.text(px + 16, y, res.name, {
          fontSize: '9px', fontFamily: FONT, color: res.tier.color,
        }).setScrollFactor(0).setDepth(701);
        this.tradeObjects.push(nameText);

        const qtyText = this.add.text(px + 180, y, 'x' + qty, {
          fontSize: '9px', fontFamily: FONT, color: '#aaa',
        }).setScrollFactor(0).setDepth(701);
        this.tradeObjects.push(qtyText);

        const valText = this.add.text(px + 240, y, totalVal + ' cr', {
          fontSize: '9px', fontFamily: FONT, color: '#f1c40f',
        }).setScrollFactor(0).setDepth(701);
        this.tradeObjects.push(valText);

        // SELL button
        const sellBg = this.add.graphics().setScrollFactor(0).setDepth(701);
        sellBg.fillStyle(0xf39c12, 0.15);
        sellBg.fillRect(px + 320, y - 2, 60, 18);
        sellBg.lineStyle(1, 0xf39c12, 0.5);
        sellBg.strokeRect(px + 320, y - 2, 60, 18);
        this.tradeObjects.push(sellBg);

        const sellText = this.add.text(px + 350, y + 7, 'SELL', {
          fontSize: '8px', fontFamily: FONT, color: '#f39c12',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(702);
        this.tradeObjects.push(sellText);

        const sellZone = this.add.zone(px + 350, y + 7, 60, 18).setScrollFactor(0).setDepth(703).setInteractive({ useHandCursor: true });
        const capturedResId = resId;
        sellZone.on('pointerdown', (pointer) => {
          const qty = this.inventory.countItem(capturedResId);
          let amt = 1;
          if (pointer.event.ctrlKey || pointer.event.metaKey) amt = qty; // sell all
          else if (pointer.event.shiftKey) amt = 5; // sell 5
          this._sellResource(capturedResId, amt);
        });
        this.tradeObjects.push(sellZone);

        y += 22;
      }
    }

    // ── BUY SECTION (B23) ──────────────────────────────────────────────────
    const buyHeaderY = py + ph - 150;
    const buyHdr = this.add.text(px + 16, buyHeaderY, '— BUY —', {
      fontSize: '9px', fontFamily: FONT, color: '#2ecc71', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(701);
    this.tradeObjects.push(buyHdr);

    // Fuel row
    const fuelPrice = 10;
    const fuelBuyY = buyHeaderY + 18;
    const fuelNameT = this.add.text(px + 16, fuelBuyY, 'Hydrogen Fuel  (+20 fuel)', {
      fontSize: '9px', fontFamily: FONT, color: '#87CEEB',
    }).setScrollFactor(0).setDepth(701);
    this.tradeObjects.push(fuelNameT);

    const fuelPriceT = this.add.text(px + 240, fuelBuyY, fuelPrice + ' cr', {
      fontSize: '9px', fontFamily: FONT, color: '#f1c40f',
    }).setScrollFactor(0).setDepth(701);
    this.tradeObjects.push(fuelPriceT);

    const canAfford = (this.player.credits || 0) >= fuelPrice;
    const buyBg = this.add.graphics().setScrollFactor(0).setDepth(701);
    buyBg.fillStyle(0x2ecc71, canAfford ? 0.2 : 0.05);
    buyBg.fillRect(px + 320, fuelBuyY - 2, 60, 18);
    buyBg.lineStyle(1, 0x2ecc71, canAfford ? 0.8 : 0.2);
    buyBg.strokeRect(px + 320, fuelBuyY - 2, 60, 18);
    this.tradeObjects.push(buyBg);

    const buyText = this.add.text(px + 350, fuelBuyY + 7, 'BUY', {
      fontSize: '8px', fontFamily: FONT, color: canAfford ? '#2ecc71' : '#555',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(702);
    this.tradeObjects.push(buyText);

    if (canAfford) {
      const buyZone = this.add.zone(px + 350, fuelBuyY + 7, 60, 18).setScrollFactor(0).setDepth(703).setInteractive({ useHandCursor: true });
      buyZone.on('pointerdown', () => {
        if ((this.player.credits || 0) < fuelPrice) return;
        this.player.credits -= fuelPrice;
        this.inventory.addItem('fuel', 1);
        this._renderTradeUI(); // refresh
      });
      this.tradeObjects.push(buyZone);
    }
    // ── END BUY SECTION ───────────────────────────────────────────────────

    // Credits total
    const creditsText = this.add.text(px + 16, py + ph - 50, 'Credits: ' + (this.player.credits || 0), {
      fontSize: '10px', fontFamily: FONT, color: '#f1c40f',
    }).setScrollFactor(0).setDepth(701);
    this.tradeObjects.push(creditsText);

    // SELL ALL button
    if (entries.length > 0) {
      const saBg = this.add.graphics().setScrollFactor(0).setDepth(701);
      saBg.fillStyle(0xe74c3c, 0.15);
      saBg.fillRect(px + pw - 110, py + ph - 52, 90, 22);
      saBg.lineStyle(1, 0xe74c3c, 0.5);
      saBg.strokeRect(px + pw - 110, py + ph - 52, 90, 22);
      this.tradeObjects.push(saBg);

      const saText = this.add.text(px + pw - 65, py + ph - 41, 'SELL ALL', {
        fontSize: '8px', fontFamily: FONT, color: '#e74c3c',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(702);
      this.tradeObjects.push(saText);

      const saZone = this.add.zone(px + pw - 65, py + ph - 41, 90, 22).setScrollFactor(0).setDepth(703).setInteractive({ useHandCursor: true });
      saZone.on('pointerdown', () => this._sellAll());
      this.tradeObjects.push(saZone);
    }

    // CLOSE button
    const closeBg = this.add.graphics().setScrollFactor(0).setDepth(701);
    closeBg.fillStyle(0x555555, 0.15);
    closeBg.fillRect(px + pw / 2 - 40, py + ph - 26, 80, 20);
    closeBg.lineStyle(1, 0x555555, 0.5);
    closeBg.strokeRect(px + pw / 2 - 40, py + ph - 26, 80, 20);
    this.tradeObjects.push(closeBg);

    const closeText = this.add.text(W / 2, py + ph - 16, 'CLOSE', {
      fontSize: '8px', fontFamily: FONT, color: '#aaa',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(702);
    this.tradeObjects.push(closeText);

    const closeZone = this.add.zone(W / 2, py + ph - 16, 80, 20).setScrollFactor(0).setDepth(703).setInteractive({ useHandCursor: true });
    closeZone.on('pointerdown', () => this.closeTradeUI());

    // Sell hint
    const hint = this.add.text(W / 2, py + ph + 8, 'Click=1  |  Shift+Click=5  |  Ctrl+Click=All', {
      fontSize: '7px', fontFamily: FONT, color: '#555',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701);
    this.tradeObjects.push(hint);
    this.tradeObjects.push(closeZone);
  }

  _sellResource(resourceId, amount) {
    const res = RESOURCES[resourceId];
    if (!res) return;
    const qty = this.inventory.countItem(resourceId);
    if (qty <= 0) return;
    const sellQty = Math.min(amount || 1, qty);
    const value = res.value * sellQty;
    this.inventory.removeItem(resourceId, sellQty);
    this.player.credits += value;
    this.sound_mgr.playPickup();

    // Floating text
    const W = this.cameras.main.width;
    const ft = this.add.text(W / 2, this.cameras.main.height * 0.4, '+' + value + ' CR', {
      fontSize: '10px', fontFamily: FONT, color: '#f39c12', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(800);
    this.tweens.add({ targets: ft, y: ft.y - 20, alpha: 0, duration: 800, onComplete: () => ft.destroy() });

    // First sell bark
    if (!this._firstSellBark) {
      this._firstSellBark = true;
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: Credits in the bank! ...Well, credits in our pocket." } });
    }

    this._renderTradeUI();
  }

  _sellAll() {
    let totalValue = 0;
    const toSell = [];
    for (const slot of this.inventory.slots) {
      if (!slot) continue;
      const res = RESOURCES[slot.resourceId];
      if (!res) continue;
      toSell.push({ id: slot.resourceId, qty: slot.count, val: res.value * slot.count });
      totalValue += res.value * slot.count;
    }
    if (totalValue === 0) return;
    for (const item of toSell) {
      this.inventory.removeItem(item.id, item.qty);
    }
    this.player.credits += totalValue;
    this.sound_mgr.playPickup();

    if (!this._firstSellBark) {
      this._firstSellBark = true;
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: Credits in the bank! ...Well, credits in our pocket." } });
    }

    this._renderTradeUI();
  }

  closeTradeUI() {
    this.tradeOpen = false;
    for (const obj of this.tradeObjects) { if (obj && obj.destroy) obj.destroy(); }
    this.tradeObjects = [];
  }

  returnFromHub() {
    this.autoSave(); // B32: save on launch, not dock
    this.scene.resume('FlightScene');
    const zion = this.planets.find(p => p.isHub);
    if (zion && this.currentSystem) {
      // B30: spawn at orbit distance from Zion, pointing away from star
      const star = this.currentSystem.star;
      const awayAngle = Phaser.Math.Angle.Between(star.x, star.y, zion.x, zion.y);
      const spawnDist = (zion.radius || 40) + 80;
      this.player.setPosition(
        zion.x + Math.cos(awayAngle) * spawnDist,
        zion.y + Math.sin(awayAngle) * spawnDist
      );
      this.player.shipAngle = awayAngle; // face away from planet
    }
    if (this.player.body) {
      this.player.body.setVelocity(0, 0);
      this.player.body.setAcceleration(0, 0);
    }
    this.player.isThrusting = false;
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

    // Combat HUD
    this.weaponLabel.setText('LASER  DMG:' + this.weaponSystem.getDamage() + '  RNG:' + this.weaponSystem.getRange()).setPosition(10, 102);
    const hostiles = this.enemyManager.getEnemyCount();
    if (hostiles > 0) {
      this.hostileLabel.setText('HOSTILES: ' + hostiles).setPosition(W - 10, 140).setOrigin(1, 0).setVisible(true);
    } else {
      this.hostileLabel.setVisible(false);
    }
    this.killLabel.setText('KILLS: ' + this.enemyManager.killCount).setPosition(W - 10, H - 34).setOrigin(1, 1);

    // XP info (no level number — that's shown in bar label LV.X)
    this.xpLabel.setText('XP: ' + this.player.xp + '/' + this.player.xpNext)
      .setPosition(10, 120);
    this.xpBarGfx.clear();

    // Credits
    this.creditsLabel.setText('CR: ' + (this.player.credits || 0)).setPosition(W - 10, 160).setOrigin(1, 0);

    // Quest HUD
    this.questHudGfx.clear();
    for (const t of this.questHudTexts) t.destroy();
    this.questHudTexts = [];
    if (this.questManager.activeQuests.length > 0) {
      const q = this.questManager.activeQuests[0];
      const qy = 140;
      this.questHudGfx.fillStyle(0x000000, 0.4);
      this.questHudGfx.fillRect(8, qy, 180, 14 + q.objectives.length * 14);
      const qTitle = this.add.text(12, qy + 2, '\uD83D\uDCCB ' + q.name, {
        fontSize: '8px', fontFamily: FONT, color: '#f39c12',
      }).setScrollFactor(0).setDepth(501);
      this.questHudTexts.push(qTitle);
      for (let i = 0; i < q.objectives.length; i++) {
        const obj = q.objectives[i];
        let label = '';
        if (obj.type === 'collect_resource') {
          const res = RESOURCES[obj.resource];
          label = (res ? res.name : obj.resource) + ': ' + obj.current + '/' + obj.target;
        } else if (obj.type === 'kill_enemy') {
          label = 'Kills: ' + obj.current + '/' + obj.target;
        } else if (obj.type === 'visit_system') {
          label = 'Systems: ' + obj.current + '/' + obj.target;
        }
        const objText = this.add.text(18, qy + 14 + i * 14, label, {
          fontSize: '8px', fontFamily: FONT, color: obj.current >= obj.target ? '#2ecc71' : '#aaa',
        }).setScrollFactor(0).setDepth(501);
        this.questHudTexts.push(objText);
      }
    }
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
    if (!this.invOpen) { this.invGfx.clear(); for (const t of this.invTexts) t.destroy(); this.invTexts = []; this._selectedInvSlot = null; }
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
      fontSize: '14px', fontFamily: FONT, color: '#00d4ff', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(601));
    this.invTexts.push(this.add.text(ox + tw - m, oy + 10, this.inventory.getUsedSlots() + '/' + this.inventory.maxSlots, {
      fontSize: '11px', fontFamily: FONT, color: '#888',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(601));

    // Track slot positions for click detection
    this._invSlots = [];

    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, sx = ox + m + c * (cs + pad), sy = oy + m + 24 + r * (cs + pad);
      const slot = this.inventory.slots[i];

      // Highlight selected slot
      const isSelected = this._selectedInvSlot === i && slot;
      g.fillStyle(isSelected ? 0x1a1a3a : 0x111122, 0.9);
      g.fillRect(sx, sy, cs, cs);

      this._invSlots.push({ x: sx, y: sy, w: cs, h: cs, index: i });

      if (slot) {
        const res = RESOURCES[slot.resourceId];
        if (res) {
          const rc = Phaser.Display.Color.HexStringToColor(res.color).color;
          g.lineStyle(isSelected ? 2 : 1.5, rc, isSelected ? 1 : 0.8);
          g.strokeRect(sx, sy, cs, cs);
          g.fillStyle(rc, 0.6); g.fillRect(sx + 8, sy + 6, cs - 16, cs - 18);
          this.invTexts.push(this.add.text(sx + cs - 3, sy + cs - 3, '' + slot.count, {
            fontSize: '8px', fontFamily: FONT, color: '#fff', stroke: '#000', strokeThickness: 2,
          }).setOrigin(1, 1).setScrollFactor(0).setDepth(601));
        }
      } else { g.lineStyle(1, 0x333344, 0.4); g.strokeRect(sx, sy, cs, cs); }
    }

    // Detail panel for selected item
    if (this._selectedInvSlot != null) {
      const slot = this.inventory.slots[this._selectedInvSlot];
      if (slot) {
        const res = RESOURCES[slot.resourceId];
        if (res) {
          const dpx = ox + tw + 8, dpy = oy;
          const dpw = 180, dph = 120;
          g.fillStyle(0x0a0a1a, 0.95); g.fillRect(dpx, dpy, dpw, dph);
          const rc = Phaser.Display.Color.HexStringToColor(res.tier.color).color;
          g.lineStyle(1.5, rc, 0.6); g.strokeRect(dpx, dpy, dpw, dph);

          this.invTexts.push(this.add.text(dpx + 10, dpy + 10, res.name, {
            fontSize: '10px', fontFamily: FONT, color: res.tier.color, fontStyle: 'bold',
          }).setScrollFactor(0).setDepth(601));
          this.invTexts.push(this.add.text(dpx + 10, dpy + 26, res.tier.name, {
            fontSize: '7px', fontFamily: FONT, color: '#888',
          }).setScrollFactor(0).setDepth(601));
          this.invTexts.push(this.add.text(dpx + 10, dpy + 42, res.description, {
            fontSize: '7px', fontFamily: FONT, color: '#cccccc',
            wordWrap: { width: dpw - 20 }, lineSpacing: 4,
          }).setScrollFactor(0).setDepth(601));
          this.invTexts.push(this.add.text(dpx + 10, dpy + dph - 22, slot.count + '/' + res.maxStack, {
            fontSize: '8px', fontFamily: FONT, color: '#aaa',
          }).setScrollFactor(0).setDepth(601));
          this.invTexts.push(this.add.text(dpx + dpw - 10, dpy + dph - 22, res.value + ' cr', {
            fontSize: '8px', fontFamily: FONT, color: '#f1c40f',
          }).setOrigin(1, 0).setScrollFactor(0).setDepth(601));

          // B24: USE button for usable items (fuel)
          if (slot.resourceId === 'fuel') {
            g.fillStyle(0x2ecc71, 0.2);
            g.fillRect(dpx + 10, dpy + dph - 44, dpw - 20, 20);
            g.lineStyle(1, 0x2ecc71, 0.7);
            g.strokeRect(dpx + 10, dpy + dph - 44, dpw - 20, 20);
            this.invTexts.push(this.add.text(dpx + dpw / 2, dpy + dph - 34, 'USE  (+20 Fuel)', {
              fontSize: '8px', fontFamily: FONT, color: '#2ecc71',
            }).setOrigin(0.5).setScrollFactor(0).setDepth(602));
            const useZone = this.add.zone(dpx + dpw / 2, dpy + dph - 34, dpw - 20, 20)
              .setScrollFactor(0).setDepth(603).setInteractive({ useHandCursor: true });
            useZone.on('pointerdown', () => {
              this._useFuelFromInventory(this._selectedInvSlot);
            });
            this.invTexts.push(useZone);
          }
        }
      }
    }
  }

  handleInvClick(pointer) {
    if (!this.invOpen || !this._invSlots) return;
    const mx = pointer.x, my = pointer.y;
    let clicked = false;
    for (const s of this._invSlots) {
      if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
        const slot = this.inventory.slots[s.index];
        if (slot) {
          this._selectedInvSlot = s.index;
        } else {
          this._selectedInvSlot = null;
        }
        clicked = true;
        break;
      }
    }
    if (!clicked) this._selectedInvSlot = null;
  }

  // B16: Right-click an inventory item to use it (fuel only for now)
  handleInvRightClick(pointer) {
    if (!this.invOpen || !this._invSlots) return;
    const mx = pointer.x, my = pointer.y;
    for (const s of this._invSlots) {
      if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
        const slot = this.inventory.slots[s.index];
        if (slot && slot.resourceId === 'fuel') {
          this._useFuelFromInventory(s.index);
        }
        break;
      }
    }
  }

  // H6: Use one unit of fuel from inventory, adds +20 fuel
  _useFuelFromInventory(slotIndex) {
    const slot = this.inventory.slots[slotIndex];
    if (!slot || slot.resourceId !== 'fuel') return;
    const maxFuel = this.player.maxFuel || 100;
    if (this.player.fuel >= maxFuel) {
      // Tank already full — flash feedback
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: 'Pepper: Tank is already full, Pax!',
      }});
      return;
    }
    this.inventory.removeItem('fuel', 1);
    const gained = Math.min(20, maxFuel - this.player.fuel);
    this.player.fuel = Math.min(maxFuel, this.player.fuel + 20);
    this.sound_mgr.playPickup();
    // Floating text
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const ft = this.add.text(W / 2, H / 2 - 30, '+' + gained + ' Fuel', {
      fontSize: '12px', fontFamily: FONT, color: '#f1c40f', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(800);
    this.tweens.add({ targets: ft, y: ft.y - 30, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
    this._selectedInvSlot = null;
  }

  // B17/F12: Quest reward popup — "Delivered: X → Received: Y" clarity
  _showRewardPopup(rewards, deliveredObjs = []) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    const receivedParts = [];
    if (rewards.credits) receivedParts.push('+' + rewards.credits + ' CR');
    if (rewards.xp) receivedParts.push('+' + rewards.xp + ' XP');
    if (rewards.fuel) receivedParts.push('+' + rewards.fuel + ' Fuel');
    if (receivedParts.length === 0) return;

    let lines = 'QUEST COMPLETE!';
    if (deliveredObjs.length > 0) {
      const delParts = deliveredObjs
        .filter(o => o.type === 'collect_resource')
        .map(o => { const r = RESOURCES[o.resource]; return o.target + ' ' + (r ? r.name : o.resource); });
      if (delParts.length > 0) lines += '\nDelivered: ' + delParts.join(', ');
    }
    lines += '\nReceived: ' + receivedParts.join('  ');

    const popup = this.add.text(W / 2, H / 2 - 80, lines, {
      fontSize: '12px', fontFamily: FONT, color: '#f1c40f',
      stroke: '#000', strokeThickness: 3,
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(900);

    this.tweens.add({
      targets: popup,
      y: popup.y - 50,
      alpha: 0,
      duration: 3000,
      delay: 1200,
      onComplete: () => popup.destroy(),
    });
  }

  // ========== WARP / MAP ==========

  openGalaxyMap() {
    if (this.invOpen || this.dialogueActive) return;
    this.sound_mgr.stopAll();
    this.scene.pause('FlightScene');
    this.scene.launch('GalaxyMapScene', {
      universe: this.universe, currentId: this.currentSystemId,
      visited: this.visited, fog: this.fog,
      startingSystemId: this.startingSystemId,
      clearedSystems: this._clearedSystems || [],
      questManager: this.questManager,
      onWarp: (id, blocked) => {
        this.scene.resume('FlightScene');
        if (!id) {
          // Warp was blocked by quest lock — fire Pepper bark
          this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
            text: blocked === 'active'
              ? "Pepper: Vera needs those supplies before we head out, Pax."
              : "Pepper: We should check in with Commander Vera before headin' out.",
          }});
          return;
        }
        const g = this.currentSystem.gates.find(x => x.targetId === id);
        if (g) this.startWarp(g);
      },
    });
  }

  tryWarp() {
    if (!this.nearGate || this.invOpen || this.dialogueActive) return;
    // F11: Lock warp until Supply Run is turned in
    const done = this.questManager.completedQuests.includes('quest_supply_run');
    if (done) { this.startWarp(this.nearGate); return; }
    const active = this.questManager.activeQuests.some(q => q.id === 'quest_supply_run');
    if (active) {
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: "Pepper: Vera needs those supplies before we head out, Pax.",
      }});
    } else {
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: "Pepper: We should check in with Commander Vera before headin' out.",
      }});
    }
  }

  startWarp(gateData) {
    if (gateData.isDungeon) {
      this.fireBark('near_dungeon_gate');
      return;
    }
    // H6: Warp costs WARP_FUEL_COST fuel; block if not enough
    const WARP_FUEL_COST = 15;
    if (this.player.fuel < WARP_FUEL_COST) {
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: "Pepper: We're running on fumes, Pax. Need fuel!",
      }});
      return;
    }
    this.player.fuel = Math.max(0, this.player.fuel - WARP_FUEL_COST);
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
