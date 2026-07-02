// ============================================================
// Hub Scene — The Outpost on Planet Zion
// v0.7.e.2: OUTPOST / WORKBENCH tabs; workbench crafting UI
// ============================================================

import Phaser from 'phaser';
import { FONT } from '../config/constants.js';
import { RECIPES } from '../data/recipes.js';
import { getItemDef, ITEMS } from '../data/items.js';

const GREEN = 0x2ecc71;
const CATEGORY_LABELS = { weapons: 'WEAPONS', ship: 'SHIP', consumables: 'CONSUMABLES' };

export default class HubScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HubScene' });
  }

  init() {
    this.activeTab = 'outpost';
    this.selectedRecipeId = null;
    this._tabObjects = [];   // objects belonging to the active tab (cleared on switch)
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.flight = this.scene.get('FlightScene');

    // Header
    this.add.text(W / 2, 40, 'THE OUTPOST — Planet Zion', {
      fontSize: '20px', fontFamily: FONT, fontStyle: 'bold', color: '#2ecc71',
    }).setOrigin(0.5);

    const g = this.add.graphics();
    g.lineStyle(1, GREEN, 0.3);
    g.beginPath(); g.moveTo(W * 0.2, 70); g.lineTo(W * 0.8, 70); g.strokePath();

    // Tab bar
    this._tabButtons = {};
    this._makeTab(W / 2 - 130, 100, 'OUTPOST', 'outpost');
    this._makeTab(W / 2 + 130, 100, 'WORKBENCH', 'workbench');

    // Launch button (always visible, bottom)
    const btnY = H - 100;
    this._makeButton(W / 2, btnY, 160, 40, 'LAUNCH', GREEN, () => this.launch());
    this.input.keyboard.on('keydown-ESC', () => this.launch());

    this.showTab('outpost');

    // Pepper bark on first hub visit
    if (this.flight && !this.flight.firedTriggers.has('hub_first_visit')) {
      this.flight.firedTriggers.add('hub_first_visit');
      this.showPepperBark("Home sweet... well, it ain't much. But it's ours.");
    }
  }

  // ========== TABS ==========

  _makeTab(x, y, label, tabId) {
    const w = 220, h = 34;
    const bg = this.add.graphics();
    const text = this.add.text(x, y, label, {
      fontSize: '12px', fontFamily: FONT, fontStyle: 'bold', color: '#888888',
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.showTab(tabId));
    this._tabButtons[tabId] = { bg, text, x, y, w, h };
  }

  _redrawTabs() {
    for (const [id, t] of Object.entries(this._tabButtons)) {
      const active = id === this.activeTab;
      t.bg.clear();
      t.bg.fillStyle(GREEN, active ? 0.25 : 0.06);
      t.bg.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
      t.bg.lineStyle(1, GREEN, active ? 0.9 : 0.3);
      t.bg.strokeRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
      t.text.setColor(active ? '#2ecc71' : '#888888');
    }
  }

  showTab(tabId) {
    this.activeTab = tabId;
    this._redrawTabs();
    for (const o of this._tabObjects) { if (o && o.destroy) o.destroy(); }
    this._tabObjects = [];
    if (tabId === 'outpost') this._drawOutpostTab();
    else this._drawWorkbenchTab();
  }

  _drawOutpostTab() {
    const { width: W, height: H } = this.cameras.main;
    this._tabObjects.push(this.add.text(W / 2, H / 2 - 40,
      "Home sweet... well, it ain't much. But it's ours.", {
      fontSize: '12px', fontFamily: FONT, color: '#87CEEB', fontStyle: 'italic',
    }).setOrigin(0.5));
    this._tabObjects.push(this.add.text(W / 2, H / 2,
      'Dock repairs hull and shields. Vera handles jobs outside.', {
      fontSize: '10px', fontFamily: FONT, color: '#555555',
    }).setOrigin(0.5));
  }

  // ========== WORKBENCH ==========

  _drawWorkbenchTab() {
    const { width: W, height: H } = this.cameras.main;
    const listX = W * 0.14, listW = W * 0.30;
    const listY = 150, listH = H - 300;

    // Left column: recipe list panel
    const lg = this.add.graphics();
    lg.fillStyle(0x0a0a1a, 0.9); lg.fillRect(listX, listY, listW, listH);
    lg.lineStyle(1, GREEN, 0.3); lg.strokeRect(listX, listY, listW, listH);
    this._tabObjects.push(lg);

    let y = listY + 14;
    const categories = ['weapons', 'ship', 'consumables'];
    for (const cat of categories) {
      this._tabObjects.push(this.add.text(listX + 14, y, '— ' + CATEGORY_LABELS[cat] + ' —', {
        fontSize: '9px', fontFamily: FONT, color: '#f39c12',
      }));
      y += 22;

      for (const recipe of RECIPES.filter(r => r.category === cat)) {
        const state = this._recipeState(recipe);
        const isSelected = this.selectedRecipeId === recipe.id;

        // Locked recipes show silhouette name until component owned
        const label = state.locked ? '??? ' : recipe.name;
        const suffix = state.done ? '  ✓' : '';
        const color = state.locked ? '#444444'
          : state.done ? '#557755'
          : state.craftable ? '#2ecc71' : '#aaaaaa';

        const rowBg = this.add.graphics();
        if (isSelected) {
          rowBg.fillStyle(GREEN, 0.12);
          rowBg.fillRect(listX + 6, y - 4, listW - 12, 22);
        }
        this._tabObjects.push(rowBg);

        this._tabObjects.push(this.add.text(listX + 20, y, label + suffix, {
          fontSize: '10px', fontFamily: FONT, color,
        }));

        const zone = this.add.zone(listX + listW / 2, y + 7, listW - 12, 22)
          .setInteractive({ useHandCursor: true });
        const rid = recipe.id;
        zone.on('pointerdown', () => {
          this.selectedRecipeId = rid;
          this.showTab('workbench'); // redraw
        });
        this._tabObjects.push(zone);

        y += 26;
      }
      y += 10;
    }

    // Right column: selected recipe detail
    const detX = W * 0.50, detW = W * 0.36;
    const dg = this.add.graphics();
    dg.fillStyle(0x0a0a1a, 0.9); dg.fillRect(detX, listY, detW, listH);
    dg.lineStyle(1, GREEN, 0.3); dg.strokeRect(detX, listY, detW, listH);
    this._tabObjects.push(dg);

    const recipe = RECIPES.find(r => r.id === this.selectedRecipeId);
    if (!recipe) {
      this._tabObjects.push(this.add.text(detX + detW / 2, listY + listH / 2,
        'Select a recipe', {
        fontSize: '11px', fontFamily: FONT, color: '#555555',
      }).setOrigin(0.5));
      return;
    }

    const state = this._recipeState(recipe);
    let dy = listY + 24;

    // Name (silhouetted when locked)
    this._tabObjects.push(this.add.text(detX + 24, dy, state.locked ? '???' : recipe.name, {
      fontSize: '14px', fontFamily: FONT, fontStyle: 'bold',
      color: state.locked ? '#444444' : '#2ecc71',
    }));
    dy += 30;

    // Description
    const desc = state.locked
      ? 'Something Pepper could build... if we find the right part.'
      : recipe.description;
    this._tabObjects.push(this.add.text(detX + 24, dy, desc, {
      fontSize: '9px', fontFamily: FONT, color: '#aaaaaa',
      wordWrap: { width: detW - 48 }, lineSpacing: 5,
    }));
    dy += 60;

    // Component requirement
    if (recipe.component) {
      const owned = this.flight.components.includes(recipe.component);
      const compDef = ITEMS[recipe.component];
      const compLabel = owned ? compDef.name + '  ✓' : 'Component required: ???';
      this._tabObjects.push(this.add.text(detX + 24, dy, compLabel, {
        fontSize: '9px', fontFamily: FONT, color: owned ? '#2ecc71' : '#e74c3c',
      }));
      dy += 24;
    }

    // Prior-tier requirement
    if (recipe.requires) {
      const has = this.flight.craftedRecipes.includes(recipe.requires);
      const reqRecipe = RECIPES.find(r => r.id === recipe.requires);
      this._tabObjects.push(this.add.text(detX + 24, dy,
        'Requires: ' + (reqRecipe ? reqRecipe.name : recipe.requires) + (has ? '  ✓' : ''), {
        fontSize: '9px', fontFamily: FONT, color: has ? '#2ecc71' : '#e74c3c',
      }));
      dy += 24;
    }

    // Material checklist (have/need)
    dy += 6;
    this._tabObjects.push(this.add.text(detX + 24, dy, 'MATERIALS', {
      fontSize: '9px', fontFamily: FONT, color: '#f39c12',
    }));
    dy += 20;
    for (const [matId, need] of Object.entries(recipe.materials || {})) {
      const have = this.flight.inventory.countItem(matId);
      const def = getItemDef(matId);
      const ok = have >= need;
      this._tabObjects.push(this.add.text(detX + 36, dy,
        (def ? def.name : matId) + '   ' + have + '/' + need, {
        fontSize: '9px', fontFamily: FONT, color: ok ? '#2ecc71' : '#e74c3c',
      }));
      dy += 20;
    }

    // CRAFT button (or status line)
    dy += 20;
    if (state.done) {
      this._tabObjects.push(this.add.text(detX + 24, dy, '✓ ' +
        (recipe.result.type === 'item' ? 'CRAFTED — craft more anytime' : 'INSTALLED'), {
        fontSize: '10px', fontFamily: FONT, color: '#557755',
      }));
      // Consumables stay repeatable
      if (recipe.result.type !== 'item') return;
    }

    const canCraft = state.craftable;
    const btnColor = canCraft ? GREEN : 0x555555;
    const bx = detX + 24, by = dy, bw = 180, bh = 36;
    const bg = this.add.graphics();
    bg.fillStyle(btnColor, canCraft ? 0.25 : 0.08);
    bg.fillRect(bx, by, bw, bh);
    bg.lineStyle(1, btnColor, canCraft ? 0.9 : 0.3);
    bg.strokeRect(bx, by, bw, bh);
    this._tabObjects.push(bg);
    this._tabObjects.push(this.add.text(bx + bw / 2, by + bh / 2, 'CRAFT', {
      fontSize: '12px', fontFamily: FONT, fontStyle: 'bold',
      color: canCraft ? '#2ecc71' : '#555555',
    }).setOrigin(0.5));

    if (canCraft) {
      const zone = this.add.zone(bx + bw / 2, by + bh / 2, bw, bh)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        const res = this.flight.craftRecipe(recipe.id);
        if (res.ok) {
          this.showPepperBark(res.message + '!');
        }
        this.showTab('workbench'); // refresh counts + states
      });
      this._tabObjects.push(zone);
    }
  }

  // Recipe display state: locked (component missing), craftable, done
  _recipeState(recipe) {
    const fs = this.flight;
    const locked = !!recipe.component && !fs.components.includes(recipe.component);
    const r = recipe.result;
    const done = r.type === 'weapon' ? fs.ownedWeapons.includes(r.id)
      : r.type === 'upgrade' ? fs.shipUpgrades[r.system] >= r.tier
      : false;
    const craftable = !done && fs.inventory.canCraft(recipe, {
      components: fs.components, craftedRecipes: fs.craftedRecipes,
    }).ok;
    return { locked, craftable, done };
  }

  // ========== SHARED UI ==========

  _makeButton(x, y, w, h, label, color, onClick) {
    const btn = this.add.graphics();
    const draw = (fillA, lineA, lineW) => {
      btn.clear();
      btn.fillStyle(color, fillA); btn.fillRect(x - w / 2, y - h / 2, w, h);
      btn.lineStyle(lineW, color, lineA); btn.strokeRect(x - w / 2, y - h / 2, w, h);
    };
    draw(0.2, 0.6, 1);
    this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: FONT, fontStyle: 'bold',
      color: '#' + color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    const hitZone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    hitZone.on('pointerover', () => draw(0.4, 0.8, 2));
    hitZone.on('pointerout', () => draw(0.2, 0.6, 1));
    hitZone.on('pointerdown', onClick);
  }

  showPepperBark(text) {
    const W = this.cameras.main.width;
    const bark = this.add.text(W / 2, 130, 'Pepper: ' + text, {
      fontSize: '12px', fontFamily: FONT, color: '#87CEEB',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 0).setAlpha(0).setDepth(500);
    this.tweens.add({ targets: bark, alpha: 1, duration: 300 });
    this.time.delayedCall(4000, () => {
      this.tweens.add({ targets: bark, alpha: 0, duration: 300, onComplete: () => bark.destroy() });
    });
  }

  launch() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('HubScene');
      const flightScene = this.scene.get('FlightScene');
      if (flightScene && flightScene.returnFromHub) {
        flightScene.returnFromHub();
      } else {
        this.scene.resume('FlightScene');
      }
    });
  }
}
