# BUILD SPEC: Phase 2 Cleanup + Phase 2.5a Narrative Framework

> For Claude Code. Read GAME_DESIGN_DOC_v3.1.md for full context.
> Codebase: Phaser 3.90.0, Vite, Canvas renderer, Arcade Physics, ES Modules
> Test: `npm run dev` → localhost:5173

---

## PART 1: Phase 2 Quick Cleanup (do first, ~30-60 min)

### 1a. Trim resources.js from 20 → 10
Replace the current 20-resource data file with these 10:

**Tier 1 — Common:**
- `iron` — Iron Ore — #A0A0A0 — stack 50 — value 5
- `carbon` — Carbon — #4a4a4a — stack 50 — value 4
- `fuel` — Hydrogen Fuel — #f1c40f — stack 50 — value 6

**Tier 2 — Uncommon:**
- `titanium` — Titanium — #B8C6DB — stack 30 — value 15
- `plasma` — Plasma Gel — #e74c3c — stack 30 — value 18
- `cryo` — Cryo Crystals — #87CEEB — stack 30 — value 12

**Tier 3 — Rare:**
- `darkmatter` — Dark Matter — #8e44ad — stack 15 — value 50
- `neutronium` — Neutronium — #2ecc71 — stack 15 — value 55

**Tier 4 — Legendary:**
- `singularity` — Singularity Core — #ff00ff — stack 5 — value 250
- `starfrag` — Star Fragment — #FFD700 — stack 5 — value 300

Update any references in FlightScene.js or other files that depend on removed resource IDs. Keep the same region distribution logic but mapped to fewer resources.

### 1b. Asteroid/Gate/Station Animations (cosmetic)
- Asteroids: slow rotation (each has a random rotSpeed, already in data from UniverseGenerator)
- Warp gates: 4 small dots orbiting the ring (rotating over time)
- Stations: slow rotation on their center axis
- These are simple tween/angle updates in the render loop — nothing complex.

### 1c. Engine Trail Particles
- When player is moving (velocity > threshold), spawn small colored rectangles behind the ship
- Color: #00d4ff with some variation
- Fade out over ~0.5 seconds
- Use Phaser tweens on small Graphics objects, or a simple particle pool
- Don't use Phaser's built-in particle emitter (it had API issues in earlier attempts — use manual approach)

---

## PART 2: Phase 2.5a — Narrative Framework (~3-5 hours)

### 2a. Data Files

**Create `src/data/story.js`:**
```js
// Story beats — cutscenes, transmissions, barks
// Each has: id, type, trigger, speaker, portrait, lines, choices, next

export const STORY_BEATS = [
  {
    id: 'act1_intro',
    type: 'cutscene',
    trigger: 'game_start',
    speaker: 'sister',
    portrait: 'sister_neutral',
    lines: [
      "We made it! I can't believe that rusty warp drive actually worked.",
      "Sensors are picking up a station nearby.",
      "Let's dock before anything else falls off the ship."
    ],
    choices: null,
    next: null
  },
  {
    id: 'act1_first_system',
    type: 'transmission',
    trigger: 'enter_system_first',
    speaker: 'station',
    portrait: null,
    lines: [
      "Incoming vessel, you are cleared for approach.",
      "Welcome to the Core Worlds. Try not to hit anything."
    ],
    choices: null,
    next: null
  },
  {
    id: 'bark_first_asteroid',
    type: 'bark',
    trigger: 'near_asteroid_first',
    speaker: 'sister',
    portrait: null,
    lines: [
      "That asteroid looks like it has iron deposits. Try clicking on it!"
    ],
    choices: null,
    next: null
  },
  {
    id: 'bark_low_fuel',
    type: 'bark',
    trigger: 'fuel_below_20',
    speaker: 'sister',
    portrait: null,
    lines: [
      "We're running low on fuel. Maybe don't warp anywhere far?"
    ],
    choices: null,
    next: null
  },
  {
    id: 'bark_first_mine',
    type: 'bark',
    trigger: 'first_mine_complete',
    speaker: 'sister',
    portrait: null,
    lines: [
      "Nice! We got some resources. I can already think of ten things to build with that."
    ],
    choices: null,
    next: null
  }
];

// Helper to find a story beat by trigger
export function getStoryBeat(trigger) {
  return STORY_BEATS.find(b => b.trigger === trigger);
}
```

**Create `src/data/npcs.js`:**
```js
export const NPCS = [
  {
    id: 'merchant_grix',
    name: 'Grix',
    type: 'merchant',
    portrait: 'npc_merchant1',
    personality: 'Enthusiastic mechanic, talks too fast',
    dialogue: {
      greeting: "WELCOME! You two look like you need... basically everything.",
      browse: "Take a look! All genuine, mostly not stolen!",
      farewell: "Come back soon! Or don't! But do!",
      noMoney: "Credits first, window shopping second. I got bills!",
    },
    inventory: ['iron', 'carbon', 'fuel', 'titanium'],
    priceModifier: 1.0,
  },
  {
    id: 'quest_vera',
    name: 'Commander Vera',
    type: 'quest_giver',
    portrait: 'npc_quest1',
    personality: 'Tired station commander, seen too much',
    dialogue: {
      greeting: "Another ship. Great. At least you're not shooting at us.",
      quest_offer: "Look, I've got a job if you want it. Nothing dangerous. ...Probably.",
      quest_complete: "You actually did it? Huh. Maybe there's hope for the universe after all.",
      farewell: "Try to stay in one piece out there.",
    },
    quests: ['quest_patrol_1'],
  },
  {
    id: 'info_whisper',
    name: '???',
    type: 'informant',
    portrait: 'npc_informant',
    personality: 'Mysterious, speaks in fragments, knows too much',
    dialogue: {
      greeting: "...You're the ones they're looking for, aren't you?",
      hint: "The Frontier isn't safe anymore. Something's moving out there.",
      farewell: "Watch the dark between the stars.",
    },
  }
];

export function getNPC(id) {
  return NPCS.find(n => n.id === id);
}

export function getNPCsByType(type) {
  return NPCS.filter(n => n.type === type);
}
```

### 2b. Dialogue UI Class

**Create `src/ui/DialogueUI.js`:**

A reusable dialogue box that sits at the bottom of the screen.

**Visual spec:**
- Full-width box at bottom, ~180px tall
- Dark semi-transparent background (rgba 0,0,0,0.85)
- Left side: portrait area (128x128), bordered
- Right side: speaker name (top, colored) + text area
- Text displays with typewriter effect (~30 chars/second)
- Click or SPACE to: advance to next line if typing complete, or skip to end of current line
- When all lines are done: if choices exist, show choice buttons; otherwise close

**Behavior:**
- `show(storyBeat)` — takes a story beat object, displays it
- `hide()` — closes the dialogue box
- While dialogue is open, player movement is disabled (pause FlightScene input)
- Portrait: if portrait key exists and texture is loaded, show it; otherwise show a colored rectangle placeholder with speaker initial

**Choice handling (for later, but stub it now):**
- If `storyBeat.choices` is an array, show buttons after last line
- Each choice has `{ text, next }` — clicking fires the `next` beat
- For now, choices can just close the dialogue

### 2c. Cutscene Scene

**Create `src/scenes/CutsceneScene.js`:**

A Phaser scene that overlays on top of FlightScene (launched with `scene.launch`, not `scene.start`).

**Visual spec:**
- Black background
- Center: cutscene image (if available) or solid dark panel
- Bottom: text area with typewriter effect (same style as DialogueUI)
- Speaker name above text
- SPACE or click to advance / skip

**Behavior:**
- `init({ beatId })` — receives a story beat ID, looks it up in STORY_BEATS
- Shows image if a matching texture exists in `cutscenes/` (keyed by beat ID)
- Plays through all lines with typewriter effect
- On complete: returns to FlightScene (calls `this.scene.stop()` and resumes flight)
- If `next` is set on the beat, trigger the next beat

### 2d. Companion Bark System

**In FlightScene, add a bark manager:**

- Small text popup near the top-center of the screen
- Styled: semi-transparent dark background, sister's color (#87CEEB), 12-14px font
- Slides in from top, stays for 3-4 seconds, fades out
- Only one bark at a time (new bark replaces current)
- Triggered by game events — check triggers in STORY_BEATS:
  - `game_start` → fire act1_intro cutscene
  - `near_asteroid_first` → fire when player first gets close to an asteroid
  - `first_mine_complete` → fire after first successful mine
  - `fuel_below_20` → fire when fuel drops below 20%
  - `enter_system_first` → fire on first warp to a new system
- Track which barks have fired (Set of triggered IDs) so they only fire once per playthrough

### 2e. NPC at Stations

**When player is near a station (within ~100px):**
- Show interaction prompt: "[F] Dock" (similar style to warp prompt)
- On pressing F:
  - Determine which NPC(s) are at this station (for now, assign 1 random NPC from NPCS array per station during system generation)
  - Open DialogueUI with the NPC's greeting
  - For merchants: after greeting, just show farewell for now (trade UI is Phase 5)
  - For quest givers: show greeting → quest_offer → farewell (quest system is Phase 5)
  - For informants: show greeting → hint → farewell

### 2f. Transmission System

**On entering a new system for the first time:**
- Check if any STORY_BEATS have trigger matching the event
- If `enter_system_first` trigger exists and hasn't fired, show it as a transmission
- Transmission style: top-center of screen, radio-style (different from bark)
  - Bordered box, slight static/scan-line effect (optional, can be simple)
  - Monospace font, green or amber colored text
  - Auto-advances through lines, ~2 seconds per line
  - Disappears after last line

### 2g. Art Asset Loading

**In the Phaser preload (FlightScene or a PreloadScene):**
- Attempt to load images from `assets/portraits/` and `assets/cutscenes/`
- If images don't exist yet, that's fine — the DialogueUI and CutsceneScene use placeholder fallbacks (colored rectangles)
- File pattern:
  ```js
  // Portraits
  this.load.image('brother_neutral', 'assets/portraits/brother_neutral.png');
  this.load.image('sister_neutral', 'assets/portraits/sister_neutral.png');
  this.load.image('npc_merchant1', 'assets/portraits/npc_merchant1.png');
  // etc.

  // Cutscenes
  this.load.image('cutscene_act1_intro', 'assets/cutscenes/act1_intro.png');
  ```
- Use `this.load.on('loaderror', ...)` to silently handle missing files
- Check `this.textures.exists(key)` before displaying

---

## WHAT NOT TO BUILD YET

- Quest tracking/completion system (Phase 5)
- Trade/buy/sell UI (Phase 5)
- Branching dialogue with state changes
- Multiple cutscene images per scene
- Voice acting or audio
- Any combat features

---

## TESTING CHECKLIST

After building, verify:
- [ ] Game boots, flight works as before
- [ ] Resources trimmed to 10, mining still works, inventory shows correct items
- [ ] Asteroids rotate slowly, gates have spinning dots, stations rotate
- [ ] Engine trail particles appear when moving, fade out
- [ ] Act 1 intro cutscene fires on game start (with placeholder art)
- [ ] Sister bark appears when first approaching an asteroid
- [ ] Sister bark appears after first mine
- [ ] Pressing F near a station opens dialogue with NPC greeting
- [ ] Dialogue typewriter effect works, SPACE/click advances
- [ ] Dialogue closes properly, player controls resume
- [ ] Transmission appears on first warp to a new system
- [ ] No console errors from missing art assets (graceful fallbacks)
- [ ] Galaxy map still works (M key)
- [ ] Warp still works (E key near gate)
