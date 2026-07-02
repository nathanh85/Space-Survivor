// ============================================================
// Flight Scene — main gameplay: flight, mining, narrative
// ============================================================

import Phaser from 'phaser';
import { SYS_W, SYS_H, UNIVERSE_COLS, UNIVERSE_ROWS, DANGER_COLORS, BUILD_VERSION, BUILD_DATE, FONT, PLAYER_DEFAULTS, HEX_NEIGHBORS } from '../config/constants.js';
import { loadUniverse, generateSystem } from '../systems/UniverseGenerator.js';
import { checkWarpLock } from '../data/zones/portalLocks.js';
import Player from '../entities/Player.js';
import InventorySystem from '../systems/InventorySystem.js';
import { RESOURCES, getAvailableResources } from '../data/resources.js';
import { getItemDef, ITEMS } from '../data/items.js';
import { getRecipe } from '../data/recipes.js';
import { RNG } from '../config/constants.js';
import { STORY_BEATS, getStoryBeat } from '../data/story.js';
import { getBarksByTrigger, getRandomBark } from '../data/barks.js';
import { ENEMY_DROP_TABLES, TIN_BADGE } from '../data/enemies.js';
import BossHarlan from '../entities/BossHarlan.js';
import { NPCS } from '../data/npcs.js';
import DialogueUI from '../ui/DialogueUI.js';
import SoundManager from '../systems/SoundManager.js';
import TextQueue from '../systems/TextQueue.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import EnemyManager from '../systems/EnemyManager.js';
import SaveManager from '../systems/SaveManager.js';
import QuestManager from '../systems/QuestManager.js';
import DebugManager from '../systems/DebugManager.js';
import { getQuest, getAvailableQuests } from '../data/quests.js';
import { characterPortraitKey, CHARACTER_MAP } from '../data/entities/portraits.js';

// Pepper/Pax one-liners fired right after accepting specific quests (v0.9.b)
const QUEST_ACCEPT_BARKS = {
  quest_find_grix: { speaker: 'pepper', text: 'Pepper: A delivery job. We fall out of the sky and land in the mail business.' },
  quest_pest_control: { speaker: 'pepper', text: 'Pepper: Fightin\' robots over pie. Dad would love this.' },
};

export default class FlightScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FlightScene' });
  }

  init(data) {
    this._initData = data || {};
  }

  // v0.9.b: legacy single-expression portraits are gone from disk —
  // everything resolves through CHARACTER_MAP now (loaded by PreloadScene).

  create() {
    // Sound
    this.sound_mgr = new SoundManager();

    // Universe — structure from JSON, interiors vary per save via galaxySeed
    this.universe = loadUniverse();
    if (this._initData && this._initData.fromSave) {
      const save = SaveManager.load();
      this.galaxySeed = (save && save.universe && save.universe.galaxySeed) || 1;
    } else {
      this.galaxySeed = Math.floor(Math.random() * 999999) + 1;
    }
    this.systemCache = {};
    this.currentSystemId = null;
    this.currentSystem = null;
    this.fog = new Set();  // Set of system IDs (hex-based, not grid cells)
    this.visited = new Set();

    // Portal locks — managed by portalLocks.js
    this.nearGate = null;
    this.nearStation = null;
    this.nearPlanetZion = false;
    this.inventory = new InventorySystem();
    // Equipment state (v0.7.e.1) — weapons owned, unique components, ship upgrade tiers
    this.ownedWeapons = ['laser_mk1'];
    this.components = [];
    this.craftedRecipes = [];
    this.shipUpgrades = { hull: 0, shield: 0, engine: 0 };
    this.firstCraftDone = false;
    this.cannonAmmo = 0;
    this.maxCannonAmmo = 60;
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
    this.weaponSystem.setLoadout(this.ownedWeapons);
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

    // Heist chase state (v0.9.b)
    this.heistChase = false;
    this._heistPickup = null;

    // Story flags (v0.9.c) — persisted; drive portal locks + boss state
    this.storyFlags = [];
    this.boss = null;
    this._bossArena = null;
    // Recover mid-chain auto quests on load (new game: no-op until level 2)
    this.time.delayedCall(3000, () => this._processAutoQuests());

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
    });
    // Prevent right-click context menu on canvas
    this.game.canvas.addEventListener('contextmenu', e => e.preventDefault());
    const dbgBlock = () => this.debugManager && this.debugManager.inputCaptured;
    this.input.keyboard.on('keydown-M', () => {
      if (dbgBlock() || this.dialogueActive) return;
      if (this.invOpen) this.toggleInventory(); // close inv first
      this.openGalaxyMap();
    });
    this.input.keyboard.on('keydown-E', () => { if (dbgBlock() || this.dialogueActive) return; this.tryWarp(); });
    // N = music mute toggle (v0.8.a — M is taken by the map)
    this.input.keyboard.on('keydown-N', () => {
      if (dbgBlock()) return;
      const muted = this.sound_mgr.toggleMusic();
      const W = this.cameras.main.width;
      const toast = this.add.text(W / 2, 130, muted ? 'MUSIC OFF' : 'MUSIC ON', {
        fontSize: '10px', fontFamily: FONT, color: '#888888',
        backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(850);
      this.tweens.add({ targets: toast, alpha: 0, duration: 400, delay: 900, onComplete: () => toast.destroy() });
    });
    this.input.keyboard.on('keydown-F', () => { if (dbgBlock() || this.dialogueActive) return; this.tryDockOrLand(); });
    this.input.keyboard.on('keydown-TAB', (e) => { e.preventDefault(); if (dbgBlock() || this.dialogueActive) return; this.toggleInventory(); });
    this.input.keyboard.on('keydown-I', () => { if (dbgBlock() || this.dialogueActive) return; this.toggleInventory(); });

    // Gamepad (twin-stick)
    this.pad = null;
    this._aimAngle = 0;
    this._padALast = false;
    if (this.input.gamepad) {
      this.input.gamepad.once('connected', (gp) => {
        this.pad = gp;
        console.log('Gamepad connected:', gp.id);
      });
      if (this.input.gamepad.total > 0) {
        this.pad = this.input.gamepad.getPad(0);
      }
    }

    // Debug mode (Ctrl+Shift+D)
    this.debugManager = new DebugManager(this);
    this.input.keyboard.on('keydown-D', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        this.debugManager.toggle();
      }
    });

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

    this.controlsText = this.add.text(0, 0, '[Arrows] Move  [Mouse] Aim+Shoot  [M] Map  [E] Warp  [F] Dock  [TAB] Inv', {
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
      const save = SaveManager.load();
      // v0.7.b: check save compatibility — old saves use sys_X_Y IDs, new uses hex_Q_R
      if (SaveManager.isCompatible(save)) {
        this.restoreFromSave(save);
      } else {
        // Incompatible save — start fresh
        console.warn('[SAVE] Incompatible save version:', save ? save.version : 'none');
        SaveManager.clear();
        this.enterSystem(start.id);
        this.textQueue.enqueue({ type: 'bark', speaker: 'M.O.T.H.E.R.', data: {
          text: 'M.O.T.H.E.R.: Save data incompatible with new universe format. Starting fresh.',
        }});
      }
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
    // Clear component pickups from previous system
    if (this._componentPickups) {
      for (const cp of this._componentPickups) { if (cp.obj) cp.obj.destroy(); }
    }
    this._componentPickups = [];
    // Clear heist prop (chase state itself survives warp only long enough
    // for completeWarp to resolve the escape)
    if (this._heistPickup) { this._heistPickup.obj.destroy(); this._heistPickup = null; }

    if (!this.systemCache[sysId]) {
      // H3/H4: mark isStarting on sysData before generating so UniverseGenerator can add trading post
      if (sysId === this.startingSystemId) sysData.isStarting = true;
      this.systemCache[sysId] = generateSystem(sysData, this.universe, this.galaxySeed);
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

      // Planet Zion now defined in zone override — no hardcoded creation needed
    }

    const isFirstVisit = !this.visited.has(sysId);
    this.currentSystemId = sysId;
    this.currentSystem = this.systemCache[sysId];
    this.visited.add(sysId);
    this.revealFog(sysId);

    // Background music based on zone config
    if (this.currentSystem.zoneConfig && this.currentSystem.zoneConfig.music) {
      this.sound_mgr.setMusic(this.currentSystem.zoneConfig.music);
    }

    // Quest progress: visit_system + visit_system_specific
    if (this.questManager) {
      const visitReady = isFirstVisit ? this.questManager.updateProgress('visit_system', {}) : [];
      const specReady = this.questManager.updateProgress('visit_system_specific', { system: sysData.name });
      if (specReady.length > 0) {
        this.time.delayedCall(2500, () => this._processAutoQuests());
      }
      // v0.9.a: Outrider Contact completion plays its cutscene at the trigger
      if (visitReady.includes('quest_outrider_contact')) {
        this.time.delayedCall(2500, () =>
          this.playCutscene('outrider_contact', () => this._processAutoQuests()));
      } else if (visitReady.length > 0) {
        this.time.delayedCall(3000, () => {
          this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: That's enough systems scouted. Let's report back." } });
        });
      }
    }

    const sys = this.currentSystem;
    // O7 (v0.7.f.1): asteroids persist mined across entries. When <30% of the
    // original count remains, respawn back to 70% on entry (never while present).
    // Partial damage on surviving rocks still resets to full (B15 behavior).
    {
      const total = sys.asteroids.length;
      const unmined = sys.asteroids.filter(a => !a.mined).length;
      if (total > 0 && unmined < total * 0.3) {
        const want = Math.ceil(total * 0.7);
        const minedRocks = sys.asteroids.filter(a => a.mined);
        for (let i = 0; i < want - unmined && i < minedRocks.length; i++) {
          minedRocks[i].mined = false;
        }
      }
      for (const a of sys.asteroids) {
        if (!a.mined) { a.hp = a.maxHp; a.mineProgress = 0; }
      }
    }
    this.assignResources(sys.asteroids, sysData, sys.planets);
    this.planets = sys.planets;
    this.asteroids = sys.asteroids;
    this.stations = sys.stations;
    this.gates = sys.gates;
    this.wrecks = sys.wrecks || [];
    this.anomaly = sys.anomaly || null;

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

    // Unique component pickups (v0.7.e.3) — proper layouts land in v0.9.d
    this._spawnComponentPickups(sysData, sys);

    // The Heist shipment (v0.9.b)
    this._spawnHeistPickup(sysData, sys);

    // Harlan boss arena (v0.9.c) — active until he's beaten
    if (this.boss) { this.boss.destroy(); this.boss = null; }
    this._bossArena = null;
    if (sysData.name === "Harlan's Reach" && !this.storyFlags.includes('boss_harlan')) {
      this._bossArena = {
        center: { x: SYS_W / 2, y: SYS_H / 2 },
        triggerRadius: 1200,
        triggered: false,
      };
    }

    // Checkpoint unease bark (v0.9.b)
    if (sysData.name === 'Checkpoint') {
      this.time.delayedCall(4000, () => this.fireBark('enter_system_checkpoint'));
    }
  }

  // Act 1 component locations: Diamond Aperture @ Ironvale, Bore Assembly @ Scrapyard
  _spawnComponentPickups(sysData, sys) {
    const COMPONENT_LOCATIONS = {
      'Ironvale': 'diamond_aperture',
      'Scrapyard': 'bore_assembly',
    };
    const compId = COMPONENT_LOCATIONS[sysData.name];
    if (!compId || this.components.includes(compId)) return;

    // v0.9.d: custom layouts pin the exact spot; otherwise seeded position
    const layout = sys.zoneConfig ? sys.zoneConfig.layout : null;
    let x, y;
    if (layout && layout.componentPos) {
      x = layout.componentPos.x;
      y = layout.componentPos.y;
    } else {
      const rng = new RNG(sysData.seed + 4242);
      const angle = rng.float(0, Math.PI * 2);
      const dist = rng.int(900, 1400);
      x = sys.star.x + Math.cos(angle) * dist;
      y = sys.star.y + Math.sin(angle) * dist;
    }

    const def = ITEMS[compId];
    const color = Phaser.Display.Color.HexStringToColor(def.color).color;
    const obj = this.add.container(x, y).setDepth(50);
    const gfx = this.add.graphics();
    // Diamond sparkle marker
    gfx.fillStyle(color, 0.9);
    gfx.beginPath();
    gfx.moveTo(0, -10); gfx.lineTo(7, 0); gfx.lineTo(0, 10); gfx.lineTo(-7, 0);
    gfx.closePath(); gfx.fillPath();
    gfx.lineStyle(1, 0xffffff, 0.7);
    gfx.strokeCircle(0, 0, 16);
    obj.add(gfx);
    const label = this.add.text(0, 24, def.name, {
      fontSize: '9px', fontFamily: FONT, color: def.color,
    }).setOrigin(0.5, 0);
    obj.add(label);
    this.tweens.add({ targets: obj, y: y - 8, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: gfx, alpha: 0.5, yoyo: true, repeat: -1, duration: 700 });

    this._componentPickups.push({ id: compId, x, y, obj });
  }

  _updateComponentPickups() {
    if (!this._componentPickups || this._componentPickups.length === 0) return;
    for (let i = this._componentPickups.length - 1; i >= 0; i--) {
      const cp = this._componentPickups[i];
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cp.x, cp.y);
      if (dist < 45) {
        this.components.push(cp.id);
        cp.obj.destroy();
        this._componentPickups.splice(i, 1);
        this.sound_mgr.play('component_pickup');
        const def = ITEMS[cp.id];
        const barks = {
          diamond_aperture: "Pepper: A Diamond Aperture! With this I can crank the laser up to Mk2. Get us to the workbench!",
          bore_assembly: "Pepper: That's a whole cannon bore assembly! Somebody just LEFT this here? Their loss.",
        };
        this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
          text: barks[cp.id] || ('Pepper: Got the ' + def.name + '!'),
        }});
        this.autoSave();
      }
    }
  }

  assignResources(asteroids, sysData, planets) {
    // resourceId already set by UniverseGenerator from type-based drop tables.
    // Just initialize mineTime here. Mined state is owned by the O7 respawn
    // rule in enterSystem — do NOT reset it here.
    for (const a of asteroids) {
      const res = RESOURCES[a.resourceId];
      a.mineTime = res ? 1.0 + (res.tier.level - 1) * 0.5 : 2;
    }
  }

  revealFog(sysId) {
    // Reveal this system + all hex neighbors
    this.fog.add(sysId);
    const sys = this.universe.find(s => s.id === sysId);
    if (sys) {
      for (const n of HEX_NEIGHBORS) {
        const neighbor = this.universe.find(s => s.q === sys.q + n.dq && s.r === sys.r + n.dr);
        if (neighbor) this.fog.add(neighbor.id);
      }
    }
  }

  // ========== PORTAL LOCKS (via portalLocks.js) ==========

  _getGameState() {
    return { completedQuests: this.questManager.completedQuests, flags: this.storyFlags };
  }

  // ========== SAVE SYSTEM ==========

  buildSaveState() {
    return {
      version: BUILD_VERSION,
      // Numeric save-format version — string compares on `version` break at
      // v0.10 ('v0.10' < 'v0.7' lexicographically). Bump only on breaking changes.
      format: 2,
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
        weaponDamageBonus: this.weaponSystem.damageBonus,
        xpNext: this.player.xpNext,
      },
      inventory: this.inventory.slots.map(s => s ? { ...s } : null),
      equipment: {
        ownedWeapons: [...this.ownedWeapons],
        components: [...this.components],
        craftedRecipes: [...this.craftedRecipes],
        shipUpgrades: { ...this.shipUpgrades },
        firstCraftDone: this.firstCraftDone,
        cannonAmmo: this.cannonAmmo,
      },
      universe: {
        galaxySeed: this.galaxySeed,
        currentSystem: this.currentSystemId,
        visitedSystems: [...this.visited],
        clearedSystems: this._clearedSystems || [],
      },
      story: {
        firedTriggers: [...this.firedTriggers],
        storyFlags: [...this.storyFlags],
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
    if (this.weaponSystem) {
      // New saves store the bonus; legacy saves stored absolute laser damage
      if (typeof p.weaponDamageBonus === 'number') {
        this.weaponSystem.damageBonus = p.weaponDamageBonus;
      } else if (p.weaponDamage) {
        this.weaponSystem.damageBonus = Math.max(0, p.weaponDamage - 15);
      }
    }

    // Inventory
    if (saveData.inventory) {
      for (let i = 0; i < saveData.inventory.length; i++) {
        this.inventory.slots[i] = saveData.inventory[i] ? { ...saveData.inventory[i] } : null;
      }
    }

    // Equipment (v0.7.e.1) — older saves default to starting loadout
    const eq = saveData.equipment || {};
    this.ownedWeapons = eq.ownedWeapons || ['laser_mk1'];
    this.components = eq.components || [];
    this.craftedRecipes = eq.craftedRecipes || [];
    this.shipUpgrades = eq.shipUpgrades || { hull: 0, shield: 0, engine: 0 };
    this.firstCraftDone = !!eq.firstCraftDone;
    this.cannonAmmo = eq.cannonAmmo || 0;
    this._reapplyUpgradeDerived();
    this.weaponSystem.setLoadout(this.ownedWeapons);

    // Visited systems + fog (hex-based)
    if (u.visitedSystems) {
      for (const id of u.visitedSystems) {
        this.visited.add(id);
        this.revealFog(id);
      }
    }
    this._clearedSystems = u.clearedSystems || [];

    // Portal locks computed from config — no save/restore needed

    // Story triggers
    if (s.firedTriggers) {
      for (const t of s.firedTriggers) this.firedTriggers.add(t);
    }
    this.storyFlags = s.storyFlags || [];

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

    // Wreck hulks (v0.9.d) — uncrackable, drawn as big dark polygons
    for (const w of (this.wrecks || [])) {
      if (!w._shapePoints) {
        const srng = new RNG(w.shapeSeed || 999);
        const numPts = srng.int(6, 9);
        w._shapePoints = [];
        for (let i = 0; i < numPts; i++) {
          const angle = (i / numPts) * Math.PI * 2;
          const r = w.size * (0.6 + srng.next() * 0.4);
          w._shapePoints.push({ lx: Math.cos(angle) * r, ly: Math.sin(angle) * r });
        }
      }
      const cos = Math.cos(w.rotation), sin = Math.sin(w.rotation);
      g.fillStyle(0x3d4450);
      g.beginPath();
      for (let i = 0; i < w._shapePoints.length; i++) {
        const p = w._shapePoints[i];
        const rx = p.lx * cos - p.ly * sin + w.x;
        const ry = p.lx * sin + p.ly * cos + w.y;
        if (i === 0) g.moveTo(rx, ry); else g.lineTo(rx, ry);
      }
      g.closePath();
      g.fillPath();
      g.lineStyle(1, 0x5d6a7a, 0.5);
      g.beginPath();
      for (let i = 0; i < w._shapePoints.length; i++) {
        const p = w._shapePoints[i];
        const rx = p.lx * cos - p.ly * sin + w.x;
        const ry = p.lx * sin + p.ly * cos + w.y;
        if (i === 0) g.moveTo(rx, ry); else g.lineTo(rx, ry);
      }
      g.closePath();
      g.strokePath();
    }

    // Challenge-zone anomaly teaser (v0.9.d) — pulsing violet ring
    if (this.anomaly) {
      const pulse = 0.35 + Math.sin(t * 2) * 0.2;
      g.lineStyle(2.5, 0x9b59b6, pulse);
      g.strokeCircle(this.anomaly.x, this.anomaly.y, 60 + Math.sin(t * 1.3) * 8);
      g.fillStyle(0x9b59b6, pulse * 0.25);
      g.fillCircle(this.anomaly.x, this.anomaly.y, 40);
    }

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
      // Edge highlight — T2/T3 shimmer brighter with a slow pulse (v0.7.f.1)
      const tier = a.tier || 1;
      if (tier >= 2) {
        const shimmer = 0.35 + Math.sin(t * 2.5 + (a.shapeSeed || 0)) * 0.25;
        const shimmerColor = tier === 2 ? 0xd0f0ff : 0xd9a8ff;
        g.lineStyle(1.5, shimmerColor, Math.max(0.15, shimmer));
      } else {
        g.lineStyle(0.5, 0xffffff, 0.15);
      }
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
    const vx = this.player.body.velocity.x, vy = this.player.body.velocity.y;
    const spd = Math.hypot(vx, vy);
    if (spd < 10) return;
    const moveAngle = Math.atan2(vy, vx);
    const px = this.player.x - Math.cos(moveAngle) * 14 + (Math.random() - 0.5) * 6;
    const py = this.player.y - Math.sin(moveAngle) * 14 + (Math.random() - 0.5) * 6;
    const moving = this.player.isMoving;
    const size = moving ? 4 : 2;
    const trail = this.add.rectangle(px, py, size, size,
      Math.random() > 0.5 ? 0x00d4ff : 0x00aaff
    ).setAlpha(moving ? 0.9 : 0.5).setDepth(90);
    this.tweens.add({
      targets: trail, alpha: 0, scaleX: 0, scaleY: 0,
      duration: moving ? 500 : 300,
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

    // --- TWIN-STICK INPUT ---
    const DEADZONE = 0.15;
    let mx = 0, my = 0;

    // Movement: left stick / arrow keys (standard twin-stick)
    if (this.pad && this.pad.leftStick) {
      const lx = this.pad.leftStick.x, ly = this.pad.leftStick.y;
      if (Math.abs(lx) > DEADZONE || Math.abs(ly) > DEADZONE) {
        mx = lx; my = ly;
      }
    }
    if (this.cursors.left.isDown) mx = -1;
    if (this.cursors.right.isDown) mx = 1;
    if (this.cursors.up.isDown) my = -1;
    if (this.cursors.down.isDown) my = 1;

    // Aim: right stick / mouse
    let aimAngle = this._aimAngle;
    let isAiming = false;
    if (this.pad && this.pad.rightStick) {
      const rx = this.pad.rightStick.x, ry = this.pad.rightStick.y;
      if (Math.abs(rx) > DEADZONE || Math.abs(ry) > DEADZONE) {
        aimAngle = Math.atan2(ry, rx);
        isAiming = true;
      }
    }
    if (!isAiming) {
      const wp = this.cameras.main.getWorldPoint(
        this.input.activePointer.x, this.input.activePointer.y
      );
      aimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, wp.x, wp.y);
      if (this.input.activePointer.isDown) isAiming = true;
    }
    this._aimAngle = aimAngle;
    this._gpRightStickActive = isAiming && this.pad && this.pad.rightStick &&
      (Math.abs(this.pad.rightStick.x) > DEADZONE || Math.abs(this.pad.rightStick.y) > DEADZONE);

    // Out-of-fuel speed reduction
    let speedMult = 1.0;
    if (this.player.fuel <= 0 && !(this.debugManager && this.debugManager.infiniteFuel)) {
      speedMult = 0.3;
    }

    this.player.update(mx * speedMult, my * speedMult, aimAngle, isAiming);

    // Gamepad A = dock/interact + advance transmissions (edge-triggered)
    const padA = this.pad && this.pad.A;
    if (padA && !this._padALast) {
      if (this.transContainer && this.transContainer.visible && this.transDismissable) {
        this.advanceTransmission();
      } else if (!this.dialogueActive) {
        this.tryDockOrLand();
      }
    }
    this._padALast = !!padA;

    // Ship-wreck collision (v0.9.d) — solid walls, gentle push, no damage
    for (const w of (this.wrecks || [])) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, w.x, w.y);
      if (dist < w.size + 15) {
        const angle = Phaser.Math.Angle.Between(w.x, w.y, this.player.x, this.player.y);
        const pushDist = (w.size + 15) - dist + 2;
        this.player.x += Math.cos(angle) * pushDist;
        this.player.y += Math.sin(angle) * pushDist;
        this.player.body.velocity.x *= -0.3;
        this.player.body.velocity.y *= -0.3;
      }
    }
    // Anomaly proximity bark (locked teaser)
    if (this.anomaly && !this.sessionTriggers.has('anomaly_bark')) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.anomaly.x, this.anomaly.y) < 200) {
        this.sessionTriggers.add('anomaly_bark');
        this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
          text: "Pepper: Some kinda anomaly. It's sealed tight — whatever's inside ain't ready for visitors. Yet.",
        }});
      }
    }

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
        if (impactSpeed > 50 && time > this.asteroidDamageCooldown && !(this.debugManager && this.debugManager.godMode)) {
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
    this.sound_mgr.updateEngineHum(this.player.isMoving);

    // Track activity for idle barks
    if (this.player.body && (Math.abs(this.player.body.velocity.x) > 20 || Math.abs(this.player.body.velocity.y) > 20)) {
      this.lastActivityTime = Date.now();
    }
    if (this.input.activePointer.isDown) {
      this.lastActivityTime = Date.now();
    }

    // Engine trails — more when thrusting
    const speed = this.player.body ? Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y) : 0;
    if (this.player.isMoving && speed > 10) {
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
        if (st.name && st.name.includes('Grix') && !this.firedTriggers.has('bark_grix_station')) {
          this.firedTriggers.add('bark_grix_station');
          this.fireBark('near_station_grix_first');
        } else if (!this.nearStationTriggered) {
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
    // First approach to Zion planet (wider radius so it fires before the dock prompt)
    if (!this.firedTriggers.has('bark_near_zion')) {
      for (const p of this.planets) {
        if (p.isHub && Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 400) {
          this.firedTriggers.add('bark_near_zion');
          this.fireBark('near_planet_zion_first');
          break;
        }
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
    // Out-of-fuel mechanic (speed reduction via speedMult in twin-stick block above)
    if (this.player.fuel <= 0) {
      if (!this.outOfFuel) {
        this.outOfFuel = true;
        this.outOfFuelTime = Date.now();
        this.fireBark('fuel_at_zero');
      }
      if (Date.now() - this.outOfFuelTime > 10000 && !this.sessionTriggers.has('fuel_zero_ext')) {
        this.sessionTriggers.add('fuel_zero_ext');
        this.fireBark('fuel_zero_extended');
      }
    } else if (this.outOfFuel) {
      this.outOfFuel = false;
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
        const velX = this.player.body.velocity.x, velY = this.player.body.velocity.y;
        const dot = awayX * velX + awayY * velY;
        const escapingThrust = this.player.isMoving && dot > 0;

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
        if (time > this.starDamageCooldown && !(this.debugManager && this.debugManager.godMode)) {
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
    this.updateLootPickup(delta);
    this._updateComponentPickups();
    this._updateHeist();
    this._updateBossFight(time, delta);

    // Animated entities
    this.drawAnimatedEntities(time);

    // Asteroid HP bars
    this.drawAsteroidHPBars();

    // HUD
    this.updateHUD(W, H);
    this.updateMinimap(W, H);
    this.updateCrosshair(W, H);
    this.updatePrompt(W, H);

    // Debug overlay (renders on top of everything)
    if (this.debugManager) this.debugManager.update(W, H);
  }

  // ========== IDLE BARK SYSTEM ==========

  checkIdleBark() {
    const now = Date.now();
    const idleTime = now - this.lastActivityTime;
    const sinceLastBark = now - this.lastIdleBarkTime;

    if (idleTime >= this.idleThreshold && sinceLastBark >= this.idleBarkCooldown) {
      const bark = getRandomBark('random_idle');
      if (bark) {
        this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: (bark.speaker || 'Pepper') + ': ' + (bark.text || bark.lines[0]) } });
        this.lastIdleBarkTime = now;
        this.idleThreshold = this.idleThresholdMin + Math.random() * (this.idleThresholdMax - this.idleThresholdMin);
      }
    }
  }

  // ========== PROMPT ==========

  updatePrompt(W, H) {
    if (this.nearPlanetZion) {
      this.promptText.setText('[F] Dock at The Outpost (Hub)')
        .setColor('#2ecc71').setPosition(W / 2, H - 76).setVisible(true);
    } else if (this.nearGate) {
      const gt = this.nearGate;
      this.promptText.setText('[E] WARP \u2192 ' + gt.targetName + (gt.isDungeon ? ' \u26A0 DUNGEON' : ''))
        .setColor(gt.isDungeon ? '#ff00ff' : '#00d4ff').setPosition(W / 2, H - 76).setVisible(true);
    } else if (this.nearStation) {
      const st = this.nearStation;
      let dockLabel;
      if (this.outOfFuel) {
        dockLabel = '[F] Emergency Dock \u2014 Free Fuel';
      } else {
        // B39: dock prompt = "[F] Dock at <name> (<type label>)"
        const sType = st.stationType || 'outpost';
        const typeLabel = sType === 'trading_post' ? 'Trading Post'
          : sType === 'refinery' ? 'Refinery' : 'Outpost';
        dockLabel = '[F] Dock at ' + st.name + ' (' + typeLabel + ')';
      }
      this.promptText.setText(dockLabel)
        .setColor(this.outOfFuel ? '#f1c40f' : '#00d4ff').setPosition(W / 2, H - 76).setVisible(true);
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

    // Sound: config-driven per asteroid type
    if (asteroid.sounds && asteroid.sounds.hit) {
      this.sound_mgr.play(asteroid.sounds.hit);
    } else {
      this.sound_mgr.playMiningClick();
    }

    if (asteroid.hp <= 0) {
      this.destroyAsteroid(asteroid);
    }
  }

  // v0.7.f.1: shot bounces off a rock too hard for the current weapon
  _deflectShot(proj, asteroid) {
    // Spark burst at impact point, angled away from the rock
    const angle = Phaser.Math.Angle.Between(asteroid.x, asteroid.y, proj.x, proj.y);
    for (let i = 0; i < 4; i++) {
      const sx = proj.x, sy = proj.y;
      const p = this.add.rectangle(sx, sy, 2, 2, 0xffffff).setDepth(200).setAlpha(0.9);
      const spread = angle + (Math.random() - 0.5) * 1.2;
      this.tweens.add({
        targets: p,
        x: sx + Math.cos(spread) * (20 + Math.random() * 25),
        y: sy + Math.sin(spread) * (20 + Math.random() * 25),
        alpha: 0, duration: 250, onComplete: () => p.destroy(),
      });
    }
    proj.destroy();
    this.sound_mgr.play('asteroid_deflect');

    // Pepper explains the gate — once per session
    if (!this.sessionTriggers.has('deflect_bark')) {
      this.sessionTriggers.add('deflect_bark');
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: "Pepper: That rock's tougher than our laser, Pax. We need a bigger gun.",
      }});
    }
  }

  destroyAsteroid(asteroid) {
    asteroid.mined = true;
    // Sound: config-driven per asteroid type
    if (asteroid.sounds && asteroid.sounds.break) {
      this.sound_mgr.play(asteroid.sounds.break);
    } else {
      this.sound_mgr.playMineComplete();
    }

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

  // ========== HARLAN BOSS FIGHT (v0.9.c) ==========

  _updateBossFight(time, delta) {
    const arena = this._bossArena;
    if (!arena) return;

    // Trigger: crossing into the arena starts the fight
    if (!arena.triggered) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, arena.center.x, arena.center.y);
      if (dist < arena.triggerRadius) {
        arena.triggered = true;
        this._startHarlanFight();
      }
      return;
    }

    if (!this.boss) return;

    this.boss.update(time, delta, this.player.x, this.player.y, this.enemyManager.enemyProjectiles);

    // Player projectiles vs boss
    this.weaponSystem.projectiles.getChildren().forEach(proj => {
      if (!proj || !proj.active || !this.boss || !this.boss.alive) return;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, this.boss.x, this.boss.y) < this.boss.size + 6) {
        const dmg = proj._damage || 15;
        proj.destroy();
        this.boss.takeDamage(dmg);
        const ft = this.add.text(this.boss.x, this.boss.y - 30, '-' + dmg, {
          fontSize: '9px', fontFamily: FONT, color: '#ffd700', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(300);
        this.tweens.add({ targets: ft, y: ft.y - 30, alpha: 0, duration: 700, onComplete: () => ft.destroy() });
        if (!this.boss.alive) this._onHarlanDefeated();
      }
    });
  }

  _startHarlanFight() {
    this.sound_mgr.setMusic('music_boss');
    this.textQueue.enqueue({ type: 'transmission', speaker: 'harlan', data: {
      speaker: 'harlan',
      lines: ["By the authority of M.O.T.H.E.R., Section 9, Clause 4: you are hereby detained, catalogued, and—"],
    }});
    this.textQueue.enqueue({ type: 'bark', speaker: 'pax', data: { text: 'Pax: Save it, Deputy.' } });

    const a = this._bossArena.center;
    this.boss = new BossHarlan(this, a.x, a.y - 300, a);

    // v0.9.d: seal the N gap — 2 wrecks slide in behind the player
    const layout = this.currentSystem.zoneConfig ? this.currentSystem.zoneConfig.layout : null;
    if (layout && layout.arenaSeal) {
      this._sealWrecks = layout.arenaSeal.map(s => ({
        x: s.x, y: s.y,
        size: Math.round(22 * (s.scale || 2)),
        shapeSeed: Math.floor(Math.random() * 999999),
        rotation: Math.random() * Math.PI * 2,
      }));
      this.wrecks.push(...this._sealWrecks);
    }
    this.autoSave();
  }

  _unsealArena() {
    if (!this._sealWrecks) return;
    this.wrecks = this.wrecks.filter(w => !this._sealWrecks.includes(w));
    this._sealWrecks = null;
  }

  _onHarlanDefeated() {
    const bx = this.boss.x, by = this.boss.y;
    this.boss.destroy();
    this.boss = null;
    this._bossArena = null;
    this._unsealArena();
    this.sound_mgr.play('boss_defeat');
    this.sound_mgr.setMusic(this.currentSystem && this.currentSystem.zoneConfig
      ? this.currentSystem.zoneConfig.music : null);
    this.enemyManager.clearAll();

    // Explosion burst
    for (let i = 0; i < 24; i++) {
      const p = this.add.rectangle(bx, by, 4, 4,
        [0xffd700, 0xe74c3c, 0xffffff][i % 3]).setDepth(250);
      this.tweens.add({
        targets: p,
        x: bx + (Math.random() - 0.5) * 200, y: by + (Math.random() - 0.5) * 200,
        alpha: 0, duration: 900, onComplete: () => p.destroy(),
      });
    }

    // Radio Booster drop (auto-collect), story flag, quest completion
    this.inventory.addItem('radio_booster', 1);
    this.storyFlags.push('boss_harlan');
    this.questManager.updateProgress('quest_flag', { flag: 'boss_harlan' });

    // Script beats: defeat transmission → post-fight barks → victory cutscene
    this.textQueue.enqueue({ type: 'transmission', speaker: 'harlan', data: {
      speaker: 'harlan',
      lines: ["...Filed under: unprecedented. She won't stop, kids. She never stops."],
    }});
    this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
      text: 'Pepper: One down. ...How many more of those she got, you think?' } });
    this.textQueue.enqueue({ type: 'bark', speaker: 'pax', data: {
      text: "Pax: Doesn't matter. That's one less between us and Mom and Dad." } });
    this.time.delayedCall(14000, () => {
      this.playCutscene('harlan_victory', () => this._processAutoQuests());
    });
    this.autoSave();
  }

  // ========== AUTO QUESTS (v0.9.b) ==========
  // Quests 4-8 have giver/turnIn 'auto': they self-accept when prerequisites
  // + level are met (announced via transmission) and self-turn-in when
  // objectives complete. Without this the Act 1 chain dead-ends at quest 3.

  _grantXp(amount) {
    this.player.xp += amount;
    while (this.player.xp >= this.player.xpNext) {
      this.player.level++;
      this.player.xp -= this.player.xpNext;
      this.player.xpNext = Math.floor(this.player.xpNext * 1.5);
      this.onLevelUp();
    }
  }

  _processAutoQuests() {
    const qm = this.questManager;
    let changed = false;

    // 1. Auto turn-in for completed auto quests
    for (const q of [...qm.activeQuests]) {
      if (q.turnIn !== 'auto' || !qm.isQuestComplete(q.id)) continue;
      // Outrider Contact turn-in waits for its cutscene to play
      if (q.id === 'quest_outrider_contact' && !this.firedTriggers.has('outrider_contact')) continue;
      const deliveredObjs = [...q.objectives];
      const rewards = qm.turnInQuest(q.id, this.inventory);
      if (rewards) {
        if (rewards.credits) this.player.credits += rewards.credits;
        if (rewards.fuel) this.player.fuel = Math.min(this.player.maxFuel, this.player.fuel + rewards.fuel);
        this._showRewardPopup(rewards, deliveredObjs);
        if (rewards.xp) this._grantXp(rewards.xp);
      }
      this._onAutoQuestComplete(q.id);
      changed = true;
    }

    // 2. Auto accept newly available auto quests
    const avail = getAvailableQuests(
      qm.completedQuests, qm.activeQuests.map(q => q.id), this.player.level
    ).filter(q => q.giver === 'auto');
    for (const q of avail) {
      if (!qm.acceptQuest(q.id, this.inventory)) continue;
      this.textQueue.enqueue({ type: 'transmission', speaker: q.transmitter || '???',
        data: { speaker: q.transmitter || '???', lines: q.dialogue.offer } });
      const bark = QUEST_ACCEPT_BARKS[q.id];
      if (bark) this.textQueue.enqueue({ type: 'bark', speaker: bark.speaker, data: { text: bark.text } });
      changed = true;
    }

    if (changed) this.autoSave();
  }

  // Story beats that fire when specific auto quests complete
  _onAutoQuestComplete(questId) {
    if (questId === 'quest_meet_informant') {
      // The Informant's full reveal (DIALOGUE_SCRIPT_FINAL post-heist scene)
      this.textQueue.enqueue({ type: 'transmission', speaker: '???', data: {
        speaker: '???',
        lines: [
          "You've got guts, kid. Or no sense. Out here that's the same currency.",
          "43LL Sector. The Factory. That's where M.O.T.H.E.R. keeps the ones who fought back. Your folks included.",
          "Funny thing about your folks. M.O.T.H.E.R. don't keep prisoners she don't *value*. Ask yourself what makes two junkyard engineers so valuable.",
          "Watch the dark between the stars, kids. M.O.T.H.E.R.'s always listenin'.",
        ],
      }});
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: 'Pepper: The Factory. He said they\'re alive, Pax. They\'re ALIVE.' } });
      this.textQueue.enqueue({ type: 'bark', speaker: 'pax', data: {
        text: 'Pax: Then we go get \'em. Jammers, deputies, whatever she\'s got — we go get \'em.' } });
    } else if (questId === 'quest_the_heist') {
      this.fireBark('heist_complete');
    }
  }

  // ========== THE HEIST (v0.9.b) ==========

  _spawnHeistPickup(sysData, sys) {
    if (sysData.name !== 'Scrapyard') return;
    const qm = this.questManager;
    const active = qm.activeQuests.find(q => q.id === 'quest_the_heist');
    if (!active || qm.isQuestComplete('quest_the_heist')) return;
    if (this.heistChase) return;

    // v0.9.d: corridor layout pins the freighter at the E dead-end
    const layout = sys.zoneConfig ? sys.zoneConfig.layout : null;
    let x, y;
    if (layout && layout.heistPos) {
      x = layout.heistPos.x;
      y = layout.heistPos.y;
    } else {
      const rng = new RNG(sysData.seed + 1717);
      const angle = rng.float(0, Math.PI * 2);
      const dist = rng.int(1100, 1500);
      x = sys.star.x + Math.cos(angle) * dist;
      y = sys.star.y + Math.sin(angle) * dist;
    }

    const obj = this.add.container(x, y).setDepth(50);
    const gfx = this.add.graphics();
    // Crate with M.O.T.H.E.R. red trim
    gfx.fillStyle(0x8a7550, 1);
    gfx.fillRect(-12, -10, 24, 20);
    gfx.lineStyle(2, 0xe74c3c, 0.9);
    gfx.strokeRect(-12, -10, 24, 20);
    gfx.fillStyle(0xe74c3c, 1);
    gfx.fillCircle(0, 0, 4);
    obj.add(gfx);
    const label = this.add.text(0, 26, 'M.O.T.H.E.R. SHIPMENT', {
      fontSize: '9px', fontFamily: FONT, color: '#e74c3c',
    }).setOrigin(0.5, 0);
    obj.add(label);
    this.tweens.add({ targets: gfx, alpha: 0.55, yoyo: true, repeat: -1, duration: 800 });

    this._heistPickup = { x, y, obj };
  }

  _updateHeist() {
    // Pickup collection
    if (this._heistPickup) {
      const cp = this._heistPickup;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, cp.x, cp.y) < 50) {
        cp.obj.destroy();
        this._heistPickup = null;
        this._startHeistChase();
      }
    }
  }

  _startHeistChase() {
    this.heistChase = true;
    this.sound_mgr.play('component_pickup');
    this.fireBark('heist_item_collected');
    this.time.delayedCall(2500, () => this.fireBark('heist_chase_start'));
    this.time.delayedCall(9000, () => { if (this.heistChase) this.fireBark('heist_chase_midpoint'); });

    // 6 pursuers (Standard 1-stripe Tin Badges), staggered 2s.
    // Chase tuning ⚑: 90% of player top speed — pressure, not inevitability.
    const rank = { key: 'standard_1', hpMult: 1.3, dmgMult: 1.1, spdMult: 1.05, color: 0xff4444, stripes: 1 };
    const pursuerCfg = { ...TIN_BADGE, speed: Math.round(250 * 0.9 / 1.05), detectRange: 6000, attackRange: 200 };
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 2000, () => {
        if (!this.heistChase || this.playerDead) return;
        const angle = Math.random() * Math.PI * 2;
        const dist = 600 + Math.random() * 200;
        const sx = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 100, SYS_W - 100);
        const sy = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 100, SYS_H - 100);
        this.enemyManager.spawnEnemy(sx, sy, pursuerCfg, rank);
      });
    }
  }

  // Play a registered cutscene once; optional continuation after resume.
  playCutscene(id, afterFn = null) {
    if (this.firedTriggers.has(id)) { if (afterFn) afterFn(); return false; }
    this.firedTriggers.add(id);
    if (afterFn) this.events.once('resume', () => this.time.delayedCall(50, afterFn));
    this.scene.pause('FlightScene');
    this.scene.launch('CutsceneScene', { beatId: id });
    this.autoSave();
    return true;
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
    this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: (bark.speaker || 'Pepper') + ': ' + (bark.text || bark.lines[0]) } });
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
    // Barks are purely visual overlays — no gameplay state changes
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
    // v0.9.b: resolve through CHARACTER_MAP (legacy keys no longer exist)
    const spNorm = sp === 'M.O.T.H.E.R.' ? 'mother'
      : sp.toLowerCase() === 'commander vera' ? 'vera' : sp.toLowerCase();
    const pKey = CHARACTER_MAP[spNorm] ? characterPortraitKey(spNorm) : null;
    if (pKey && this.textures.exists(pKey)) {
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

    // Typewriter effect — 36 chars/sec (B38: 10% slower), then hold after complete
    if (this.barkTimer) this.barkTimer.remove();
    if (this._barkTypewriter) this._barkTypewriter.remove();
    let charIdx = 0;
    const BARK_CHARS_PER_SEC = 36;
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

    // Show portrait for M.O.T.H.E.R. transmissions — B37: constrain within box
    if (this.transPortrait) { this.transPortrait.destroy(); this.transPortrait = null; }
    const motherKey = characterPortraitKey('mother');
    if (isMother && this.textures.exists(motherKey)) {
      // Portrait sits left of text, vertically aligned with transmission box top
      this.transPortrait = this.add.image(0, 0, motherKey)
        .setDisplaySize(48, 48).setScrollFactor(0).setDepth(521).setVisible(false);
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
    // B37: widen box left to include portrait if present
    const hasPortrait = this.transPortrait && this.transPortrait.visible !== false;
    const portraitExtra = hasPortrait ? 56 : 0; // 48px portrait + 8px gap
    const boxX = bounds.x - pad - portraitExtra;
    const boxW = bounds.width + pad * 2 + portraitExtra;
    this.transGfx.fillStyle(0x000000, 0.85);
    this.transGfx.fillRect(boxX, bounds.y - pad, boxW, bounds.height + pad * 2);
    this.transGfx.lineStyle(1, this.transBorderColor, 0.6);
    this.transGfx.strokeRect(boxX, bounds.y - pad, boxW, bounds.height + pad * 2);
    // Position portrait inside box
    if (this.transPortrait) {
      const pX = boxX + pad + 24; // center of 48px portrait
      const pY = bounds.y + bounds.height / 2;
      this.transPortrait.setPosition(pX, pY).setVisible(true);
    }
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
      this.weaponSystem.damageBonus += 2;
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

    // Level gate may have unlocked the next auto quest
    this.time.delayedCall(800, () => this._processAutoQuests());

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

    // Fire weapon — right stick auto-fire (gamepad) / left click (mouse)
    // IMPORTANT: declare ptr locally — it is NOT in scope from update()
    const ptr = this.input.activePointer;
    const canFire = !this.dialogueActive && !this.invOpen && !this.dialogueUI.isOpen;
    if (canFire) {
      const gpFiring = !!this._gpRightStickActive;
      if (gpFiring || ptr.leftButtonDown()) {
        const proj = this.weaponSystem.firePrimary(time, this.player.x, this.player.y, this._aimAngle);
        if (proj) {
          this.sound_mgr.playLaser();
          this.lastActivityTime = Date.now();
        }
      }
      // Secondary: cannon on L1 / right mouse button (v0.7.e.3)
      const padL1 = this.pad && this.pad.L1;
      if ((padL1 || ptr.rightButtonDown()) && this.weaponSystem.secondary) {
        if (this.cannonAmmo > 0) {
          const proj = this.weaponSystem.fireSecondary(time, this.player.x, this.player.y, this._aimAngle);
          if (proj) {
            this.cannonAmmo--;
            this.sound_mgr.play('cannon_fire');
            this.lastActivityTime = Date.now();
          }
        } else if (!this.sessionTriggers.has('cannon_dry')) {
          this.sessionTriggers.add('cannon_dry');
          this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
            text: "Pepper: Cannon's dry, Pax. We can refill at a dock or craft more rounds.",
          }});
        }
      }
    }

    // Check player projectiles vs asteroids (shoot-to-mine) — always active
    this.weaponSystem.projectiles.getChildren().forEach(proj => {
      if (!proj || !proj.active) return;
      // Wrecks stop shots dead (v0.9.d)
      for (const w of (this.wrecks || [])) {
        if (Phaser.Math.Distance.Between(proj.x, proj.y, w.x, w.y) < w.size + 4) {
          proj.destroy();
          return;
        }
      }
      for (const a of this.asteroids) {
        if (a.mined) continue;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, a.x, a.y);
        if (dist < a.size + 4) {
          // v0.7.f.1: hardness gate — weaker weapons deflect off harder rock
          if ((proj._hardness || 1) < (a.hardness || 1)) {
            this._deflectShot(proj, a);
          } else {
            const dmg = proj._damage || 15;
            proj.destroy();
            this.handleAsteroidHit(a, dmg);
          }
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
        this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: (bark.speaker || 'Pepper') + ': ' + (bark.text || bark.lines[0]) } });
      }
    }

    // Quest progress: kill_enemy
    const killReady = this.questManager.updateProgress('kill_enemy', { enemy: enemy.configId || 'tin_badge' });
    if (killReady.length > 0) {
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: That's the last one for the job! Time to report in." } });
      this.time.delayedCall(1000, () => this._processAutoQuests());
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
    this.spawnLoot(enemy.x, enemy.y, enemy.loot, enemy);
  }

  spawnLoot(x, y, loot, enemy = null) {
    if (!loot) return;

    // Credits (always)
    const credits = loot.credits[0] + Math.floor(Math.random() * (loot.credits[1] - loot.credits[0]));
    this.spawnLootItem(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20,
      'credits', credits, 0xf1c40f);

    // v0.7.g.2: regional drop table rolls (replaces flat resourceChance)
    const regionKey = this.currentSystem ? this.currentSystem.data.region.key : 'CORE';
    const table = ENEMY_DROP_TABLES[regionKey] || ENEMY_DROP_TABLES.CORE;
    const isVeteran = !!(enemy && enemy.rank && !enemy.rank.key.startsWith('standard'));
    for (const row of table) {
      if (row.veteranOnly && !isVeteran) continue;
      if (Math.random() >= row.chance) continue;
      const amount = row.amount[0] + Math.floor(Math.random() * (row.amount[1] - row.amount[0] + 1));
      const def = getItemDef(row.id);
      const color = def ? Phaser.Display.Color.HexStringToColor(def.tier ? def.tier.color : def.color).color : 0x2ecc71;
      this.spawnLootItem(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30,
        row.id, amount, color);
    }
  }

  spawnLootItem(x, y, type, amount, color) {
    const item = this.add.rectangle(x, y, 6, 6, color).setDepth(150);
    item._lootType = type;
    item._lootAmount = amount;

    // E7: eject with a small random impulse (decays in update), pulse alpha.
    // No position tween — the magnet in updateLootPickup owns movement.
    const impulseAngle = Math.random() * Math.PI * 2;
    const impulseSpeed = 40 + Math.random() * 60;
    item._vx = Math.cos(impulseAngle) * impulseSpeed;
    item._vy = Math.sin(impulseAngle) * impulseSpeed;
    this.tweens.add({ targets: item, alpha: 0.6, yoyo: true, repeat: -1, duration: 500 });

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

  updateLootPickup(delta = 16) {
    if (!this._lootItems) return;
    const dt = delta / 1000;
    for (let i = this._lootItems.length - 1; i >= 0; i--) {
      const item = this._lootItems[i];
      if (!item || !item.active) { this._lootItems.splice(i, 1); continue; }

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);

      // E7: impulse drift with decay, then magnet inside r=120
      if (item._vx || item._vy) {
        item.x += item._vx * dt;
        item.y += item._vy * dt;
        item._vx *= 0.94;
        item._vy *= 0.94;
        if (Math.abs(item._vx) < 2 && Math.abs(item._vy) < 2) { item._vx = 0; item._vy = 0; }
      }
      if (dist < 120 && dist > 1) {
        const pull = 90 + 240 * (1 - dist / 120); // accelerates as it closes
        item.x += ((this.player.x - item.x) / dist) * pull * dt;
        item.y += ((this.player.y - item.y) / dist) * pull * dt;
      }

      if (dist < 30) {
        this.sound_mgr.playPickup();
        let label = '';
        if (item._lootType === 'credits') {
          this.player.credits += item._lootAmount;
          label = '+' + item._lootAmount + ' Credits';
        } else {
          this.inventory.addItem(item._lootType, item._lootAmount);
          const res = getItemDef(item._lootType);
          label = '+' + item._lootAmount + ' ' + (res ? res.name : item._lootType);
          // Quest progress: collect_resource
          const qReady = this.questManager.updateProgress('collect_resource', { resource: item._lootType, amount: item._lootAmount });
          if (qReady.length > 0) {
            this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: "Pepper: That's everything for the quest! Let's go turn it in." } });
            this.time.delayedCall(1000, () => this._processAutoQuests());
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
    if (this.debugManager && this.debugManager.godMode) return;
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
    // M2: quest chase states reset on death
    this.heistChase = false;
    // v0.9.c: boss resets to Phase 1 full HP ⚑ — fight restarts on re-approach
    if (this.boss) { this.boss.destroy(); this.boss = null; }
    if (this._bossArena) this._bossArena.triggered = false;
    this._unsealArena();
    if (this.currentSystem && this.currentSystem.zoneConfig) {
      this.sound_mgr.setMusic(this.currentSystem.zoneConfig.music);
    }
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
    const pKey = characterPortraitKey('mother');
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

    // Heist retry: shipment reappears if we died mid-chase in the Scrapyard
    if (this.currentSystem && !this._heistPickup) {
      this._spawnHeistPickup(this.currentSystem.data, this.currentSystem);
    }
  }

  // ========== NPC DOCKING / HUB LANDING ==========

  tryDockOrLand() {
    if (this.invOpen || this.dialogueActive || this.tradeOpen) return;
    if (this.nearPlanetZion) {
      // v0.9.a: first-ever dock at The Outpost plays the Vera intro,
      // then re-enters the normal dock flow
      if (!this.firedTriggers.has('vera_intro')) {
        this.playCutscene('vera_intro', () => this.tryDockOrLand());
        return;
      }
      this.autoSave(); // save on every dock (reverted B32 regression)
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
            const ab = QUEST_ACCEPT_BARKS[availQuest.id];
            this.textQueue.enqueue({ type: 'bark', speaker: ab ? ab.speaker : 'pepper',
              data: { text: ab ? ab.text : "Pepper: New quest from Vera! Check the HUD." } });
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
    // Hub dock: free cannon ammo refill (O6)
    if (this.weaponSystem.secondary && this.cannonAmmo < this.maxCannonAmmo) {
      this.cannonAmmo = this.maxCannonAmmo;
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: 'Pepper: Topped off the cannon rounds while we docked.',
      }});
    }
    this.sound_mgr.stopAll();
    this.scene.pause('FlightScene');
    this.scene.launch('HubScene');
  }

  tryDock() {
    if (!this.nearStation || this.invOpen || this.tradeOpen) return;
    console.log('Docking at:', this.nearStation.name, 'Type:', this.nearStation.stationType);
    // v0.9.a: docking at The Stand with the booster quest done plays the
    // emotional beat, then continues into the normal dock flow
    if (this.currentSystem && this.currentSystem.data.name === 'The Stand'
        && !this.firedTriggers.has('the_stand')
        && (this.questManager.completedQuests.includes('quest_radio_booster')
            || this.questManager.isQuestComplete('quest_radio_booster'))) {
      this.playCutscene('the_stand', () => this.tryDock());
      return;
    }
    this.autoSave(); // save on every station dock
    // Emergency fuel refill
    if (this.outOfFuel) {
      this.player.fuel = Math.min(this.player.maxFuel, this.player.fuel + 25);
    }
    const npc = this.nearStation.npc;
    if (!npc) return;

    // Quest progress: visit_npc
    if (npc.id) {
      this.questManager.updateProgress('visit_npc', { npc: npc.id });
    }

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
        const ab = QUEST_ACCEPT_BARKS[availQuest.id];
        this.textQueue.enqueue({ type: 'bark', speaker: ab ? ab.speaker : 'pepper',
          data: { text: ab ? ab.text : "Pepper: New quest accepted! Check the HUD." } });
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
        const res = getItemDef(resId);
        if (!res || res.sellable === false || !res.value) continue;
        const totalVal = res.value * qty;

        const nameText = this.add.text(px + 16, y, res.name, {
          fontSize: '9px', fontFamily: FONT, color: res.tier ? res.tier.color : res.color,
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

    // Cannon ammo row (v0.7.e.3 — O6: costs credits at trading posts)
    if (this.weaponSystem.secondary) {
      const ammoPrice = 15, ammoAmount = 20;
      const ammoY = fuelBuyY + 22;
      this.tradeObjects.push(this.add.text(px + 16, ammoY, `Cannon Rounds  (+${ammoAmount})`, {
        fontSize: '9px', fontFamily: FONT, color: '#f39c12',
      }).setScrollFactor(0).setDepth(701));
      this.tradeObjects.push(this.add.text(px + 240, ammoY, ammoPrice + ' cr', {
        fontSize: '9px', fontFamily: FONT, color: '#f1c40f',
      }).setScrollFactor(0).setDepth(701));

      const ammoFull = this.cannonAmmo >= this.maxCannonAmmo;
      const canBuyAmmo = (this.player.credits || 0) >= ammoPrice && !ammoFull;
      const aBg = this.add.graphics().setScrollFactor(0).setDepth(701);
      aBg.fillStyle(0x2ecc71, canBuyAmmo ? 0.2 : 0.05);
      aBg.fillRect(px + 320, ammoY - 2, 60, 18);
      aBg.lineStyle(1, 0x2ecc71, canBuyAmmo ? 0.8 : 0.2);
      aBg.strokeRect(px + 320, ammoY - 2, 60, 18);
      this.tradeObjects.push(aBg);
      this.tradeObjects.push(this.add.text(px + 350, ammoY + 7, ammoFull ? 'FULL' : 'BUY', {
        fontSize: '8px', fontFamily: FONT, color: canBuyAmmo ? '#2ecc71' : '#555',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(702));

      if (canBuyAmmo) {
        const aZone = this.add.zone(px + 350, ammoY + 7, 60, 18).setScrollFactor(0).setDepth(703).setInteractive({ useHandCursor: true });
        aZone.on('pointerdown', () => {
          if ((this.player.credits || 0) < ammoPrice) return;
          this.player.credits -= ammoPrice;
          this.cannonAmmo = Math.min(this.maxCannonAmmo, this.cannonAmmo + ammoAmount);
          this._renderTradeUI();
        });
        this.tradeObjects.push(aZone);
      }
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
    const res = getItemDef(resourceId);
    if (!res || res.sellable === false || !res.value) return;
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
      const res = getItemDef(slot.resourceId);
      if (!res || res.sellable === false || !res.value) continue;
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
      this.player.aimAngle = awayAngle;
    }
    if (this.player.body) {
      this.player.body.setVelocity(0, 0);
      this.player.body.setAcceleration(0, 0);
    }
    this.player.isMoving = false;
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
    this.controlsText.setPosition(W - 10, H - 6);
    this.versionText.setPosition(W - 10, H - 18);

    // Combat HUD — primary weapon + cannon ammo when owned
    let weaponStr = this.weaponSystem.getWeaponName() + '  DMG:' + this.weaponSystem.getDamage() + '  RNG:' + this.weaponSystem.getRange();
    if (this.weaponSystem.secondary) {
      weaponStr += '\nCANNON  ' + this.cannonAmmo + '/' + this.maxCannonAmmo;
    }
    this.weaponLabel.setText(weaponStr).setPosition(10, 102);
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

    // Boss HP bar (v0.9.c) — top center during the fight
    if (this.boss && this.boss.alive) {
      const bw = 400, bh = 12;
      const bx = W / 2 - bw / 2, by = 24;
      g.fillStyle(0x000000, 0.7); g.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
      g.fillStyle(0x331111, 1); g.fillRect(bx, by, bw, bh);
      g.fillStyle(0xc0392b, 1); g.fillRect(bx, by, bw * (this.boss.hp / this.boss.maxHp), bh);
      g.lineStyle(1, 0xffd700, 0.8); g.strokeRect(bx, by, bw, bh);
      if (!this._bossLabel) {
        this._bossLabel = this.add.text(W / 2, by + bh + 8, 'DEPUTY HARLAN', {
          fontSize: '10px', fontFamily: FONT, color: '#ffd700',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(501);
      }
      this._bossLabel.setVisible(true).setPosition(W / 2, by + bh + 8);
    } else if (this._bossLabel) {
      this._bossLabel.setVisible(false);
    }

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
        } else if (obj.type === 'visit_system_specific') {
          label = 'Go to: ' + obj.system;
        } else if (obj.type === 'visit_npc') {
          label = 'Find: ' + (obj.npc === 'merchant_grix' ? 'Grix' : obj.npc);
        } else if (obj.type === 'quest_flag') {
          label = obj.label || 'Objective';
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
    const cx = W / 2 + Math.cos(this._aimAngle) * 40;
    const cy = H / 2 + Math.sin(this._aimAngle) * 40;
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
        const res = getItemDef(slot.resourceId);
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
        const res = getItemDef(slot.resourceId);
        if (res) {
          const dpx = ox + tw + 8, dpy = oy;
          const dpw = 180, dph = 120;
          g.fillStyle(0x0a0a1a, 0.95); g.fillRect(dpx, dpy, dpw, dph);
          const tierColor = res.tier ? res.tier.color : res.color;
          const tierName = res.tier ? res.tier.name : (res.type || 'Item');
          const rc = Phaser.Display.Color.HexStringToColor(tierColor).color;
          g.lineStyle(1.5, rc, 0.6); g.strokeRect(dpx, dpy, dpw, dph);

          this.invTexts.push(this.add.text(dpx + 10, dpy + 10, res.name, {
            fontSize: '10px', fontFamily: FONT, color: tierColor, fontStyle: 'bold',
          }).setScrollFactor(0).setDepth(601));
          this.invTexts.push(this.add.text(dpx + 10, dpy + 26, tierName, {
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

          // B24/v0.7.e.1: USE button for usable items (fuel + consumables)
          const useLabel = this._consumableLabel(slot.resourceId);
          if (useLabel) {
            g.fillStyle(0x2ecc71, 0.2);
            g.fillRect(dpx + 10, dpy + dph - 44, dpw - 20, 20);
            g.lineStyle(1, 0x2ecc71, 0.7);
            g.strokeRect(dpx + 10, dpy + dph - 44, dpw - 20, 20);
            this.invTexts.push(this.add.text(dpx + dpw / 2, dpy + dph - 34, useLabel, {
              fontSize: '8px', fontFamily: FONT, color: '#2ecc71',
            }).setOrigin(0.5).setScrollFactor(0).setDepth(602));
            const useZone = this.add.zone(dpx + dpw / 2, dpy + dph - 34, dpw - 20, 20)
              .setScrollFactor(0).setDepth(603).setInteractive({ useHandCursor: true });
            useZone.on('pointerdown', () => {
              this._useConsumableFromInventory(this._selectedInvSlot);
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

  // B16: Right-click an inventory item to use it
  handleInvRightClick(pointer) {
    if (!this.invOpen || !this._invSlots) return;
    const mx = pointer.x, my = pointer.y;
    for (const s of this._invSlots) {
      if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
        const slot = this.inventory.slots[s.index];
        if (slot && this._consumableLabel(slot.resourceId)) {
          this._useConsumableFromInventory(s.index);
        }
        break;
      }
    }
  }

  // Returns a USE button label for usable items, or null if not usable
  _consumableLabel(itemId) {
    if (itemId === 'fuel') return 'USE  (+20 Fuel)';
    const def = ITEMS[itemId];
    if (def && def.use) {
      const statLabel = def.use.stat === 'hull' ? 'Hull' : def.use.stat === 'fuel' ? 'Fuel' : def.use.stat;
      return `USE  (+${def.use.amount} ${statLabel})`;
    }
    return null;
  }

  // H6/v0.7.e.1: Use one consumable from inventory (fuel, repair_kit, fuel_cell)
  _useConsumableFromInventory(slotIndex) {
    const slot = this.inventory.slots[slotIndex];
    if (!slot) return;
    const itemId = slot.resourceId;
    const p = this.player;

    // Resolve effect: raw fuel is +20 fuel; ITEMS use their `use` block
    let stat, amount;
    if (itemId === 'fuel') { stat = 'fuel'; amount = 20; }
    else if (ITEMS[itemId] && ITEMS[itemId].use) { stat = ITEMS[itemId].use.stat; amount = ITEMS[itemId].use.amount; }
    else return;

    const max = stat === 'fuel' ? (p.maxFuel || 100) : p.maxHull;
    const cur = stat === 'fuel' ? p.fuel : p.hull;
    if (cur >= max) {
      const full = stat === 'fuel' ? 'Tank is already full, Pax!' : "Hull's already patched up, Pax!";
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: 'Pepper: ' + full } });
      return;
    }

    this.inventory.removeItem(itemId, 1);
    const gained = Math.min(amount, max - cur);
    if (stat === 'fuel') p.fuel = Math.min(max, p.fuel + amount);
    else p.hull = Math.min(max, p.hull + amount);
    this.sound_mgr.playPickup();

    // Floating text
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const label = '+' + gained + ' ' + (stat === 'fuel' ? 'Fuel' : 'Hull');
    const ft = this.add.text(W / 2, H / 2 - 30, label, {
      fontSize: '12px', fontFamily: FONT, color: stat === 'fuel' ? '#f1c40f' : '#e74c3c', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(800);
    this.tweens.add({ targets: ft, y: ft.y - 30, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
    // B40: immediately update HUD + redraw inventory
    this.updateHUD(W, H);
    // If slot is now empty, deselect; otherwise keep selected for repeat use
    const remainingSlot = this.inventory.slots[slotIndex];
    if (!remainingSlot || remainingSlot.resourceId !== itemId) {
      this._selectedInvSlot = null;
    }
  }

  // ========== CRAFTING (v0.7.e.1) ==========

  _craftCtx() {
    return { components: this.components, craftedRecipes: this.craftedRecipes };
  }

  /**
   * Craft a recipe by id. Consumes materials, grants result.
   * @returns {{ok: boolean, message: string}}
   */
  craftRecipe(recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return { ok: false, message: 'Unknown recipe: ' + recipeId };

    const check = this.inventory.canCraft(recipe, this._craftCtx());
    if (!check.ok) return { ok: false, message: 'Missing — ' + check.missing.join(', ') };

    // Non-repeatable results: weapons + upgrades craft once
    const r = recipe.result;
    if (r.type === 'weapon' && this.ownedWeapons.includes(r.id)) {
      return { ok: false, message: 'Already own ' + recipe.name };
    }
    if (r.type === 'upgrade' && this.shipUpgrades[r.system] >= r.tier) {
      return { ok: false, message: recipe.name + ' already installed' };
    }
    if (r.type === 'item' && this.inventory.isFull()
        && this.inventory.countItem(r.id) === 0) {
      return { ok: false, message: 'Inventory full' };
    }

    this.inventory.consumeMaterials(recipe, this._craftCtx());

    if (r.type === 'weapon') {
      this.ownedWeapons.push(r.id);
      this.weaponSystem.setLoadout(this.ownedWeapons);
      // First cannon comes fully loaded
      if (r.id === 'cannon_mk1') this.cannonAmmo = this.maxCannonAmmo;
    } else if (r.type === 'upgrade') {
      this.shipUpgrades[r.system] = r.tier;
      this._applyUpgrade(r);
    } else if (r.type === 'item') {
      this.inventory.addItem(r.id, r.qty || 1);
    }
    if (!this.craftedRecipes.includes(recipe.id)) this.craftedRecipes.push(recipe.id);

    this.sound_mgr.play('craft_complete');

    // Pepper bark on first ever craft
    if (!this.firstCraftDone) {
      this.firstCraftDone = true;
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: "Pepper: Look at that! Dad's tools, my brains, your button-pressin'. We're basically a factory.",
      }});
    }

    this.autoSave();
    return { ok: true, message: 'Crafted ' + recipe.name };
  }

  _applyUpgrade(result) {
    const p = this.player;
    if (result.stat === 'maxHull') {
      p.maxHull += result.amount;
      p.hull = Math.min(p.maxHull, p.hull + result.amount);
    } else if (result.stat === 'maxShield') {
      p.maxShield += result.amount;
      p.shield = Math.min(p.maxShield, p.shield + result.amount);
    } else if (result.stat === 'speedMult') {
      p.speedMult = 1 + 0.15 * this.shipUpgrades.engine;
      if (p.body) p.body.setMaxVelocity(300 * p.speedMult);
    }
  }

  // Re-apply derived stats from upgrade tiers (used on save restore)
  _reapplyUpgradeDerived() {
    const p = this.player;
    p.speedMult = 1 + 0.15 * (this.shipUpgrades.engine || 0);
    if (p.body) p.body.setMaxVelocity(300 * p.speedMult);
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

    this.sound_mgr.play('quest_complete');

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
    // v0.9.b: map warp locked during the heist chase — fly to the gate
    if (this.heistChase) {
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: "Pepper: No time for the map, Pax — GET TO THE GATE!",
      }});
      return;
    }
    this.sound_mgr.stopAll();
    this.scene.pause('FlightScene');
    this.scene.launch('GalaxyMapScene', {
      universe: this.universe, currentId: this.currentSystemId,
      visited: this.visited, fog: this.fog,
      startingSystemId: this.startingSystemId,
      clearedSystems: this._clearedSystems || [],
      questManager: this.questManager,
      checkWarpLock: (fromId, toId) => checkWarpLock(fromId, toId, this._getGameState()),
      onWarp: (id, blocked) => {
        this.scene.resume('FlightScene');
        if (!id) {
          if (blocked && blocked.bark) {
            this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: blocked.bark } });
          } else {
            const barkText = blocked === 'active'
              ? "Pepper: Vera needs those supplies before we head out, Pax."
              : "Pepper: We should check in with Commander Vera before headin' out.";
            this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: { text: barkText } });
          }
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
    // Portal lock check
    if (gateData.targetId) {
      const lock = checkWarpLock(this.currentSystemId, gateData.targetId, this._getGameState());
      if (lock) {
        this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
          text: lock.bark || "Pepper: That gate's sealed, Pax. We need to find another way.",
        }});
        return;
      }
    }
    // H6: Warp costs WARP_FUEL_COST fuel; block if not enough
    const WARP_FUEL_COST = 15;
    const debugInfFuel = this.debugManager && this.debugManager.infiniteFuel;
    if (!debugInfFuel && this.player.fuel < WARP_FUEL_COST) {
      this.textQueue.enqueue({ type: 'bark', speaker: 'pepper', data: {
        text: "Pepper: We're running on fumes, Pax. Need fuel!",
      }});
      return;
    }
    if (!debugInfFuel) this.player.fuel = Math.max(0, this.player.fuel - WARP_FUEL_COST);
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
    // v0.9.b: warping out with the shipment completes the heist
    const escaped = this.heistChase;
    this.heistChase = false;
    this.enterSystem(targetId);
    if (escaped) {
      this.questManager.updateProgress('quest_flag', { flag: 'heist_escaped' });
      this.time.delayedCall(1500, () => this._processAutoQuests());
    }

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
