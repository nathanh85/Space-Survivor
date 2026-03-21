# BLOCK SURVIVAL: SPACE PIRATES — Game Design Document v3.1

> **Tech Stack:** Phaser 3.90.0, Vite 8.0.1, Canvas renderer, Arcade Physics, ES Modules
> **Repo:** https://github.com/nathanh85/Space-Survivor.git

---

## TABLE OF CONTENTS

1. World Structure
2. Story & Narrative
3. Characters & NPCs
4. Resources (Streamlined)
5. Combat
6. Space Weather & Hazards
7. Skill Tree (3 Tiers)
8. Leveling
9. Economy
10. Art Assets & Cutscenes
11. Architecture Notes
12. TODO — Build Phases

---

## 1. WORLD STRUCTURE

### The Universe Map
- Large scrollable grid (12 x 10, ~86 systems at 72% fill)
- Fog of war — systems hidden until scanned or visited
- Unveils as scanner upgrades and player levels up
- Color-coded by danger: green → yellow → orange → red → skull
- Drag to pan, click adjacent systems to warp
- Four regions radiating outward from center:
  - **Core Worlds** (safe, low reward, tutorial/early game)
  - **Frontier** (moderate risk/reward, mid game)
  - **Outer Rim** (dangerous, high reward, late game)
  - **The Rift** (dungeon territory, endgame)

### Solar Systems (Persistent, Seeded)
- 30-40 systems in the fixed layout, seeded-procedural interiors
- Each contains: 1-5 planets, 20-60 asteroids, 0-2 stations, warp gates, 0-1 dungeon entrances
- Once generated, layout persists for the playthrough (seed = 42)
- Planet types: Rocky, Ice, Volcanic, Lush, Toxic, Barren
- NPCs populate stations; some roam between systems

### Warp Gates
- Standard: always available, costs fuel
- Locked: require level, faction rep, or key items
- Unstable: lead to dungeon systems (magenta glow, warning indicator)

### Dungeon Systems (Procedural, One-Shot)
- Fully random each entry — reset on leave or death
- Types: Derelict Fleet, Pirate Stronghold, Anomaly Zone, Ancient Ruins
- Escalating difficulty the longer you stay
- Boss at core → Tier 4 loot + XP bonus
- Story-critical dungeons for main questline

---

## 2. STORY & NARRATIVE

### Tone
**Light, funny, written for kids.** Think Adventure Time meets Star Wars meets Minecraft. Not grimdark — enemies explode into scrap and parts, characters are quirky and memorable, the villain is threatening but also kind of ridiculous. Stakes are real but the vibe stays fun.

### Premise
Two kids — a brother (the pilot) and his little sister (the brains) — are traveling the universe together. Their parents' status is TBD (missing? captured? sent the kids away for safety?). The big bad wants to take over the universe (specifics TBD — Nathan developing). The kids need to travel the galaxy, collect rare materials, and **build a legendary device/weapon** to stop the villain.

The endgame artifact is THE reason for the crafting system — you're collecting Tier 4 dungeon materials because you need them to build the thing that saves the universe. Every system you explore, every asteroid you mine, every boss you defeat is feeding into that goal.

### Story Structure

**Act 1: "We Need a Bigger Ship"** (Core Worlds — tutorial/early game)
- Kids arrive in the starting system with a junk ship and no plan
- Companion (sister) serves as the tutorial voice
- Meet first friendly NPCs at a station who point them in the right direction
- Learn about the big bad's threat (news transmissions, NPC warnings)
- First encounter with low-level enemies (pirate drones)
- **Gate:** Reach level 5, have enough fuel/resources to warp to the Frontier
- [Nathan to write specific scenes and dialogue]

**Act 2: "Things Get Complicated"** (Frontier + Outer Rim — mid/late game)
- The big bad's forces are actively hunting the kids (or something they carry)
- Meet more NPCs: allies, informants, morally gray characters
- Sister potentially gets captured / separated? (raises stakes, gives rescue quest)
- First dungeon runs for legendary materials
- Start building the endgame device (crafting milestones)
- **Gate:** Collect specific Tier 4 materials from dungeon bosses
- [Nathan to write specific scenes and dialogue]

**Act 3: "The Big One"** (The Rift — endgame)
- Final push into the most dangerous region
- Endgame device is complete (or nearly complete)
- Final dungeon / boss confrontation with the big bad
- Resolution — kids save the universe, funny/heartwarming ending
- [Nathan to write specific scenes and dialogue]

### Narrative Delivery Methods
| Method | When | Example |
|--------|------|---------|
| **Cutscene** | Act transitions, major story beats | Full-screen art + typewriter text, SPACE to advance |
| **Dialogue** | Talking to NPCs at stations | Portrait + text box, optional choices |
| **Companion bark** | During gameplay, contextual | Small text popup near ship: "Ooh, that planet looks scary!" |
| **Transmission** | Entering certain systems | Radio-style text popup: "WARNING: Pirate activity detected" |
| **Lore entry** | Found in dungeons/ruins | Collectible data fragments, viewable in a log |

### Script Format
Story beats stored in `src/data/story.js`:
```js
{
  id: 'act1_intro',
  type: 'cutscene',        // cutscene | dialogue | bark | transmission | lore
  trigger: 'game_start',   // when this fires
  speaker: 'sister',
  portrait: 'sister_excited',
  lines: [
    "We made it! I can't believe that rusty warp drive actually worked.",
    "Sensors are picking up a station nearby. Let's dock before anything falls off the ship."
  ],
  choices: null,            // or [{ text: "Let's go", next: 'act1_dock' }, ...]
  next: 'act1_dock'
}
```

---

## 3. CHARACTERS & NPCs

### Player Character (The Brother)
- **Name:** [TBD — Nathan defining]
- **Age:** Young teenager
- **Role:** The pilot. Action-oriented, brave, sometimes reckless.
- **Personality:** Determined, protective of his sister, makes dumb jokes under pressure
- **Visual:** Blocky pixel ship (gameplay), portrait for dialogue (art asset TBD)

### Companion (The Sister)
- **Name:** [TBD — Nathan defining]
- **Age:** Younger — maybe 10-11
- **Role:** The brains. Handles scanning, crafting, tech, navigation.
- **Personality:** Smart, sarcastic, enthusiastic about science/space, teases her brother
- **Mechanic:** Always present — portrait in dialogue, contextual barks during gameplay
- **Gameplay utility:**
  - Tutorial voice ("Try clicking that asteroid to mine it!")
  - Scan hints ("That planet looks volcanic — bet there's titanium there")
  - Combat callouts ("Incoming from the left!")
  - Crafting/tech flavor ("If I reroute the flux capacitor... just kidding, hand me the titanium")
  - Emotional beats ("I miss home." / "Do you think Mom and Dad are okay?")

### NPC Design Philosophy
Every NPC should feel like a character, not a menu. Quirky, funny, memorable. Even merchants have personality. The universe is full of weirdos and the kids are the most normal people in it.

### NPC Types

| Type | Where Found | Function | Design Note |
|------|-------------|----------|-------------|
| **Merchant** | Stations | Buy/sell resources + equipment | Quirky personalities, running jokes, favorites |
| **Quest Giver** | Stations, sometimes in space | Missions with rewards | Each has a reason for needing help — make it personal |
| **Informant** | Stations, hidden locations | Map info, lore, hints | Mysterious, cryptic, sometimes wrong on purpose (funny) |
| **Antagonist** | Scripted encounters, dungeons | Story villains, boss fights | Threatening but also ridiculous — monologue too long, dumb plans |
| **Neutral/Ambient** | Stations | World-building flavor | Dock workers, travelers, a cat that's somehow on every station |

### Enemy Types (Combat — Phase 3)

| Class | Behavior | HP | Loot | Tone |
|-------|----------|-----|------|------|
| **Drone** (Fodder) | Patrol, slow chase | Low | Scrap, common | Annoying, buzzy, pop like popcorn |
| **Fighter** (Standard) | Chase + strafe | Medium | Resources, credits | Cocky radio chatter |
| **Ace** (Elite) | Dodge, shields, smart | High | Uncommon resources | Rival energy, "we meet again!" |
| **Gunship** (Heavy) | Slow, tanky, AoE | Very high | Rare resources | Intimidating but slow — comedic contrast |
| **Boss** | Unique, multi-phase | Extreme | Tier 4, story items | Each has a personality, pre-fight dialogue |
| **Fauna** | Territorial, passive until provoked | Varies | Organic resources | Space whales, asteroid worms — not evil, just grumpy |

### Faction Question (TBD — Nathan deciding)
Are all enemies working for the big bad, or is it more complex?
- Option A: Big bad commands a fleet, all hostile ships are his minions
- Option B: Some pirates are independent, some work for the big bad — you can ally with indie pirates
- Option C: Multiple factions with shifting allegiances — big bad is just the biggest

### NPC Data Format (`src/data/npcs.js`)
```js
{
  id: 'merchant_grix',
  name: 'Grix',
  type: 'merchant',
  portrait: 'npc_grix',
  location: 'station',
  personality: 'Enthusiastic three-armed mechanic, accepts payment in bad jokes',
  dialogue: {
    greeting: "WELCOME! You look like you need... everything!",
    farewell: "Come back when you've got better jokes!",
    noMoney: "No credits? No problem! ...Just kidding, big problem.",
  },
  inventory: ['iron', 'carbon', 'fuel'],
}
```

---

## 4. RESOURCES (Streamlined: 10 total)

### Tier 1 — Common (Core Worlds)
| ID | Name | Color | Stack | Value |
|----|------|-------|-------|-------|
| `iron` | Iron Ore | #A0A0A0 | 50 | 5 |
| `carbon` | Carbon | #4a4a4a | 50 | 4 |
| `fuel` | Hydrogen Fuel | #f1c40f | 50 | 6 |

### Tier 2 — Uncommon (Frontier)
| ID | Name | Color | Stack | Value |
|----|------|-------|-------|-------|
| `titanium` | Titanium | #B8C6DB | 30 | 15 |
| `plasma` | Plasma Gel | #e74c3c | 30 | 18 |
| `cryo` | Cryo Crystals | #87CEEB | 30 | 12 |

### Tier 3 — Rare (Outer Rim)
| ID | Name | Color | Stack | Value |
|----|------|-------|-------|-------|
| `darkmatter` | Dark Matter | #8e44ad | 15 | 50 |
| `neutronium` | Neutronium | #2ecc71 | 15 | 55 |

### Tier 4 — Legendary (Dungeon-only, for building the endgame device)
| ID | Name | Color | Stack | Value |
|----|------|-------|-------|-------|
| `singularity` | Singularity Core | #ff00ff | 5 | 250 |
| `starfrag` | Star Fragment | #FFD700 | 5 | 300 |

### Region Distribution
- **Core:** Tier 1 only
- **Frontier:** Tier 1 (60%) + Tier 2 (40%)
- **Outer Rim:** Tier 1 (25%) + Tier 2 (40%) + Tier 3 (35%)
- **Rift:** Tier 1 (10%) + Tier 2 (30%) + Tier 3 (60%)
- **Dungeons:** Tier 3 (normal drops) + Tier 4 (boss loot only)

---

## 5. COMBAT

### Weapons (4 categories)
- **Lasers** (Energy) — Fast, accurate, weak vs armor, strong vs shields
- **Cannons** (Kinetic) — Medium speed, strong vs armor, weak vs shields
- **Missiles** (Explosive) — Slow, high damage, AoE, limited ammo
- **Mines** (Area/Trap) — Deploy behind, proximity detonation

Player equips 2 weapon slots + 1 utility slot. Swap with 1/2/3.

### Defense
- Hull HP, Shields (regen), Armor Plating, Resistances

### Damage Triangle
- Energy → strong vs shields, weak vs armor
- Kinetic → strong vs armor, weak vs shields
- Explosive → strong vs hull, weak vs shields

### Combat Tone
Kid-friendly. Ships explode into parts and scrap, not death. Enemies eject in escape pods (funny detail). Sister yells callouts. Bosses monologue before fights.

---

## 6. SPACE WEATHER & HAZARDS

| Event | Effect | Duration |
|-------|--------|----------|
| Solar Flare | Radiation DOT, +energy dmg, +energy yield | 60-90s |
| Ion Storm | Disables shields, random lightning | 45-60s |
| Meteor Shower | Kinetic rain, asteroids = cover | 30-45s |
| Nebula Drift | Low visibility, scanner off, stealth max | 90-120s |
| Dark Matter Rift | Gravity anomalies, dark matter spawns | 60s |

---

## 7. SKILL TREE — 4 BRANCHES, 3 TIERS

Binary choices at each tier — pick one of two.

### Warmonger (Combat)
- T1: +15% weapon damage **OR** +10% fire rate
- T2: Crit hits (10%, 2x) **OR** Explosive radius +25%
- T3: Berserker (2x dmg at low hull) **OR** Triple Shot

### Engineer (Ship & Crafting)
- T1: +20% crafting yield **OR** +15% hull HP
- T2: Shield regen 2x **OR** Extra module slot
- T3: Auto-Repair Drones **OR** Fortress Mode (immobile + 3x def)

### Corsair (Trade & Stealth)
- T1: +15% trade prices **OR** +20% scan range
- T2: Stealth Cloak (5s, 30s CD) **OR** 2x salvage
- T3: Ghost Ship (cloak + speed) **OR** Black Market access

### Navigator (Exploration)
- T1: +25% fuel efficiency **OR** +15% move speed
- T2: -50% hazard damage **OR** Extended minimap
- T3: Warp Shortcut (teleport to visited) **OR** Storm Rider (weather heals)

Respec at stations for scaling credit cost. Budget: max ~1.5 branches at cap.

---

## 8. LEVELING

- XP: kills (scaled), mining (small), discovery (bonus), dungeons, trades, quests
- Cap: 30
- Per level: 1 skill point
- Milestones: recipe unlocks at 5/10/15/20/25, system gates at 5/10/20
- Curve: fast to 10, moderate to 20, steep 20-30

---

## 9. ECONOMY

- Station supply/demand pricing per resource
- Buy/sell shifts prices — flooding crashes them
- System specialization
- Faction rep modifies prices
- Dungeon loot always premium
- Trade route gameplay: buy low, sell high

---

## 10. ART ASSETS & CUTSCENES

### Asset Types (Provided by Nathan)
- Cutscene images (act transitions, key moments)
- Menu/UI art (title, game over, loading)
- Character portraits (brother, sister, NPCs)
- Format: PNG, loaded as Phaser textures

### Folder Structure
```
assets/
├── cutscenes/       # act1_intro.png, act2_capture.png, etc.
├── portraits/       # brother.png, sister.png, npc_grix.png
├── ui/              # title.png, gameover.png
└── icons/           # resource icons, weapon icons (if needed)
```

### Cutscene System
- Triggered by story events
- Full-screen image + text overlay with typewriter effect
- SPACE/CLICK to advance
- Optional dialogue choices
- Implemented as `CutsceneScene.js` overlaying FlightScene

---

## 11. ARCHITECTURE NOTES

### Current State
FlightScene.js is the monolith — inlines HUD, minimap, inventory UI, mining, system rendering.

### Refactor Triggers
| When | Extract | Why |
|------|---------|-----|
| Phase 2.5 | DialogueUI class | Dialogue can't live in FlightScene |
| Phase 2.5 | CutsceneScene | Full-screen art needs own scene |
| Phase 3 | Enemy entity classes | AI needs encapsulation |
| Phase 3 | HUD class | Combat adds bars, ammo, warnings |
| Phase 4 | InventoryUI class | Crafting UI is complex |
| Phase 5 | StationUI / TradeUI | Docking is a major UI surface |

### File Size Rule
If any file exceeds ~800 lines, extract the next logical chunk.

### Resource Code Update Needed
Current `src/data/resources.js` has 20 resources — needs to be trimmed to match the 10-resource spec in this doc.

---

## 12. TODO — BUILD PHASES

### Phase 1 — Foundation ✅
- [x] Universe map, fog of war
- [x] System generation (seeded procedural)
- [x] Ship movement + physics
- [x] Warp gates + transition
- [x] HUD, minimap, galaxy map

### Phase 2 — Resources & Mining 🔧 (Mostly Done)
- [x] Resource data model
- [x] Asteroid mining mechanic
- [x] Inventory system (30-slot, stacking)
- [x] Inventory UI (TAB/I)
- [x] Region-based distribution
- [ ] **Trim resources.js from 20 → 10** to match v3 spec
- [ ] Planet landing transition + surface view
- [ ] Inventory tooltips on hover
- [ ] Asteroid/gate/station animations (cosmetic polish)
- [ ] Engine trail particles (reimplementation)

### Phase 2.5 — Narrative & NPC Framework 🆕
- [ ] `src/data/story.js` — story beat data (Nathan writing content)
- [ ] `src/data/npcs.js` — NPC definitions (2-3 test NPCs)
- [ ] DialogueUI class — portrait + text box + advance + choices
- [ ] Typewriter text effect
- [ ] CutsceneScene — full-screen art + text overlay
- [ ] NPC presence at stations + interaction prompt ([F] Talk)
- [ ] Companion bark system (contextual text popups during gameplay)
- [ ] Transmission system (radio-style alerts on system entry)
- [ ] Player character definition [Nathan TBD: name, portrait]
- [ ] Sister/companion definition [Nathan TBD: name, portrait]
- [ ] Act 1 script [Nathan writing]
- [ ] Art asset loading pipeline (Phaser preloader for PNGs)

### Phase 3 — Combat ⬜
- [ ] Weapon system (laser first)
- [ ] Projectile spawning + physics
- [ ] Enemy entity class (Drone first)
- [ ] Basic AI: patrol → detect → chase → attack
- [ ] Player damage (hull/shield)
- [ ] Enemy health + death → scrap explosion + loot
- [ ] Spawn enemies by danger rating (not in Core)
- [ ] Death → respawn at last station
- [ ] Sister combat callouts
- [ ] Enemy escape pod detail (kid-friendly)
- [ ] Refactor: extract enemy entities
- [ ] Refactor: extract HUD class

### Phase 4 — Crafting + Skills ⬜
- [ ] Crafting UI + recipe tree (~15-20 recipes)
- [ ] Endgame device as ultimate crafting goal (Tier 4 mats)
- [ ] Skill tree UI (4 branches, 3 tiers, binary choices)
- [ ] XP + leveling system
- [ ] Respec at stations
- [ ] Recipe unlock gates at level milestones
- [ ] Sister as "crafting voice" (flavor dialogue)

### Phase 5 — Economy + Stations ⬜
- [ ] Station docking UI
- [ ] Trade interface (buy/sell)
- [ ] Supply/demand pricing
- [ ] Faction reputation
- [ ] NPC merchants with personality + dialogue
- [ ] Quest givers at stations

### Phase 6 — Dungeons ⬜
- [ ] Procedural dungeon layouts
- [ ] Dungeon types (4)
- [ ] Boss encounters with dialogue + multi-phase
- [ ] Tier 4 loot tables
- [ ] Escalating difficulty timer
- [ ] Story-critical dungeon (Act 2/3 gate)

### Phase 7 — Polish & Ship ⬜
- [ ] Space weather system
- [ ] Full story integration (all acts + cutscene art)
- [ ] All NPC dialogue written and implemented
- [ ] Title screen + save system (localStorage)
- [ ] Balance tuning pass
- [ ] Audio (SFX + music if available)
- [ ] Vercel deployment

---

## OPEN QUESTIONS (Nathan to decide)

1. **Character names** — Brother? Sister?
2. **Parents status** — Missing? Captured? Sent kids away? Dead?
3. **Big bad identity** — Who is the villain? What do they want specifically?
4. **Faction structure** — All enemies under one banner, or multiple factions?
5. **Endgame device** — What are the kids building? What does it do?
6. **Villain personality** — Threatening + ridiculous how? Monologues? Bad plans? Running gag?
