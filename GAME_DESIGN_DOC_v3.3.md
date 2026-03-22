# BLOCK SURVIVAL: SPACE PIRATES — Game Design Document v3.3

> **Tech Stack:** Phaser 3.90.0, Vite 8.0.1, Canvas renderer, Arcade Physics, ES Modules
> **Repo:** https://github.com/nathanh85/Space-Survivor.git
> **Tone:** Space western. Light, funny, kid-friendly. Cheesy dialogue. Firefly meets Cowboy Bebop meets Saturday morning cartoons.

---

## TABLE OF CONTENTS

1. World Structure
2. Story & Narrative
3. Characters & NPCs
4. Resources
5. Combat
6. Space Weather & Hazards
7. Skill Tree
8. Leveling
9. Economy
10. Hub Planet: The Outpost
11. Art Assets & Cutscenes
12. Save System
13. Architecture Notes
14. TODO — Build Phases

---

## 1. WORLD STRUCTURE

### The Universe Map
- Large scrollable grid (12 x 10, ~86 systems at 72% fill)
- Fog of war — hidden until scanned or visited
- Color-coded by danger: green → yellow → orange → red → skull
- Drag to pan, click adjacent systems to warp
- Four regions radiating outward from center:
  - **Core Worlds** — Safe, under M.O.T.H.E.R.'s control. Tutorial/early game.
  - **Frontier** — Contested. M.O.T.H.E.R. expanding here. Mid game.
  - **Outer Rim** — Lawless, dangerous, Outrider territory. Late game.
  - **The Rift** — Uncharted, deadly. Dungeon territory. Endgame materials.
  - **43LL Sector** — M.O.T.H.E.R.'s domain. The Factory. Final region. Locked until endgame key is built.

### Solar Systems (Persistent, Seeded)
- 30-40 systems, seeded-procedural interiors (seed = 42)
- Each: 1-5 planets, 20-60 asteroids, 0-2 stations, warp gates, 0-1 dungeon entrances
- Planet types: Rocky, Ice, Volcanic, Lush, Toxic, Barren
- NPCs populate stations; Outriders scattered across Frontier and Outer Rim

### Warp Gates
- Standard: costs fuel
- Locked: require level, Outrider rep, or key items
- Unstable: lead to dungeon systems (magenta glow)
- **43LL Gate:** Sealed. Requires the endgame key to open.

### Dungeon Systems (Procedural, One-Shot)
- Fully random each entry, reset on leave/death
- Types: Derelict Fleet, Pirate Stronghold, Anomaly Zone, Ancient Ruins
- Escalating difficulty the longer you stay
- Boss at core → Tier 4 loot + XP bonus

---

## 2. STORY & NARRATIVE

### Premise
**Paxton** (the pilot) and his little sister **Pepper** (the brains) had their home on **Planet Zion** seized by **The Law** — a galactic authority run by **M.O.T.H.E.R.** (Mechanical Overlord Terrorizing Humans Everywhere Relentlessly), a corrupt AI system that claims planets through automated "eminent domain" decrees, strips resources, and imprisons anyone who resists.

Their parents were arrested and taken to **The Factory** — M.O.T.H.E.R.'s central processing facility deep in the **43LL Sector**. Paxton and Pepper escaped in their dad's old junker ship, **The Dustkicker**, and crash-landed on Zion's surface. Now operating from a makeshift base called **The Outpost**, they need to rebuild, make allies with **The Outriders** (the resistance), and mount a rescue mission to break their parents out of The Factory.

### Tone Guide
- Western dialect in space: "I reckon," "burnin' daylight," "much obliged"
- Light and funny: cheesy one-liners, Pepper's sarcasm, M.O.T.H.E.R.'s absurd bureaucracy
- Kid protagonists: scrappy, resourceful, in over their heads
- Villain: M.O.T.H.E.R. is menacing but absurdly procedural. Issues forms in triplicate while destroying planets.
- NPCs: quirky, memorable, western archetypes in space

### Story Structure

**ACT 1: "Dust and Rust"** (Planet Zion + Core Worlds)

| Beat | Type | Description |
|------|------|-------------|
| Cold open | Cutscene | The Outpost on Zion — wreckage, dust. Pepper: "Well Pax... we're alive. That's somethin'." |
| Hub tutorial | Gameplay | Learn The Outpost: crafting bench, mission board. Pepper walks Pax through basics. |
| First flight | Cutscene | Launch The Dustkicker into orbit. Pepper: "She flies!" Pax: "She rattles." Pepper: "Same thing." |
| Mining tutorial | Bark | Pepper: "I reckon that rock's got iron in it. Try clicking on it!" |
| First station | Dialogue | Meet Grix (merchant): "You kids look rougher than a solar storm!" |
| M.O.T.H.E.R. broadcast | Transmission | "ATTENTION: This sector is under jurisdiction of M.O.T.H.E.R. All unregistered vessels will be processed." |
| First combat | Combat | Law drones: "UNREGISTERED VESSEL DETECTED. INITIATING INSPECTION PROTOCOL." Pepper: "That's a funny word for 'shooting at us.'" |
| Outrider contact | Dialogue | First Outrider NPC reaches out: "You're the Zion kids, ain't ya? We've been watching." |
| **Gate:** Level 5 + resources to reach Frontier |

**ACT 2: "Posse Up"** (Frontier + Outer Rim + The Rift)

| Beat | Type | Description |
|------|------|-------------|
| Frontier arrival | Cutscene | Rougher systems. Pepper: "This ain't the Core anymore, Pax." |
| Meet The Marshal | Cutscene | M.O.T.H.E.R.'s top enforcer. Human who sold out. "I don't enjoy this, kids. But M.O.T.H.E.R. has authorized your termination." |
| Ally: The Miner | Quest | Operation seized by The Law. Help her → rare resources + joins Outriders |
| Ally: The Smuggler | Quest | Routes blockaded. Run a blockade → hidden warp shortcuts |
| Ally: The Commander | Quest | Forced to pay "protection fees." Defend her station → safe harbor + upgrades |
| Ally: The Mechanic | Quest | Genius in exile. Find rare parts → Dustkicker upgrades |
| The Law strikes back | Cutscene | The Marshal attacks an Outrider station. Stakes raised. |
| The legend | Dialogue | Informant: "There's a way into 43LL Sector. But you'll need something from The Rift — something M.O.T.H.E.R. can't process." |
| Rift dungeon runs | Gameplay | Collect Tier 4 materials from dungeon bosses |
| **Gate:** Tier 4 materials + ally quests complete + level 20 |

**ACT 3: "Jailbreak"** (The Outpost → 43LL Sector → The Factory)

| Beat | Type | Description |
|------|------|-------------|
| Building the key | Cutscene | Pepper at The Outpost: "If I cross-wire the singularity core with the star fragment... either this works or we become a very pretty explosion." |
| Pepper's jammer | Cutscene | "The key gets us in. But M.O.T.H.E.R.'s defenses will shred us. I need to build a jammer." |
| Readiness check | Gameplay | Pepper's checklist: Key ✅ | Jammer ✅ | Weapons ⚠️ | Hull ❌ — "We're not ready yet, Pax." |
| Into 43LL | Cutscene | Gate opens. Pepper: "You sure about this?" Pax: "Nope. Let's go." |
| The Factory approach | Gameplay | Gauntlet run — heaviest enemies, environmental hazards, resource drain |
| Marshal showdown | Boss fight | "You've been a thorn in M.O.T.H.E.R.'s side long enough. And mine." Multi-phase. |
| The Factory interior | Dungeon | Final dungeon. M.O.T.H.E.R.'s core facility. Mechanized, industrial, oppressive. |
| M.O.T.H.E.R. | Final boss | "PROCESSING TERMINATION REQUEST... APPROVED." Multi-phase. Uses factory systems against you. |
| Jailbreak | Cutscene | Parents freed. Mom: "What took you so long?" Pepper: "Traffic." |
| Victory | Cutscene | Back on Zion. The Outpost is home again. Binary star sunset. Pax: "So... what now?" Pepper: "I hear there's a whole universe out there." |

### The Two-Part Endgame

Players must complete two build objectives before entering 43LL Sector:

**1. The Key** — Blasts open the sealed gate to 43LL Sector
- Built from Tier 4 dungeon materials (Singularity Core + Star Fragment)
- Crafted at The Outpost by Pepper
- Name TBD (Pepper probably calls it something nerdy)

**2. Pepper's Jammer** — Disables M.O.T.H.E.R.'s defense grid enough to survive the approach
- Built from Tier 3-4 materials + a unique quest item
- Without it, The Factory's automated defenses are instant death

**3. Combat Readiness** — Pepper tracks whether you have enough weapons, hull integrity, fuel, and supplies
- UI element: Pepper's Readiness Checklist
- Each item shows ✅ / ⚠️ / ❌
- All items must be ✅ or ⚠️ to launch (❌ = Pepper refuses: "We're not ready, Pax.")

### Narrative Delivery Methods

| Method | Style | Example |
|--------|-------|---------|
| **Cutscene** | Full-screen art + typewriter text | Act transitions, major beats |
| **Dialogue** | Portrait + text box at stations | NPC conversations |
| **Bark** | Small popup, Pepper's voice | "We're burnin' daylight!" |
| **Transmission** | Radio-style, amber text | M.O.T.H.E.R.'s broadcasts, distress signals |
| **Lore** | Collectible data fragments | Found in dungeons |

### Script Format (`src/data/story.js`)
```js
{
  id: 'act1_intro',
  type: 'cutscene',
  trigger: 'game_start',
  speaker: 'pepper',
  portrait: 'pepper_neutral',
  lines: [
    "Well Pax... we're alive. That's somethin'.",
    "Ship's in rough shape though. The Dustkicker's seen better days.",
    "See that workbench? I reckon we can patch her up if we find some iron."
  ],
  choices: null,
  next: null
}
```

---

## 3. CHARACTERS & NPCs

### Paxton "Pax" (Player Character)
- **Age:** ~14
- **Role:** The pilot. Brave, impulsive, protective of Pepper.
- **Personality:** Determined, hotheaded, bad jokes under pressure, heart of gold
- **Western archetype:** Young gunslinger in over his head
- **Sample lines:** "I didn't start this fight, but I'm sure as heck gonna finish it." / "That's our home they took. And I want it back."

### Pepper "Pep" (Companion)
- **Age:** ~10-11
- **Role:** The brains. Scanning, crafting, tech, navigation, and all the best lines.
- **Personality:** Whip-smart, sarcastic, science-obsessed, teases Pax constantly
- **Western archetype:** Kid sidekick who's smarter than everyone
- **Gameplay utility:**
  - Tutorial: "I reckon that rock's got iron in it!"
  - Scans: "That planet's volcanic — bet there's titanium in them hills"
  - Combat: "Incoming from starboard, Pax!"
  - Crafting: "If I reroute the flux capacitor... just kidding. Hand me the titanium."
  - Emotional: "I miss home." / "You think Mom and Dad are okay?"
  - Western: "We're burnin' daylight!" / "Much obliged!" / "Yeehaw!"
  - Readiness: "We've got the key, Pax, but we're gonna need a LOT more firepower."

### The Dustkicker (The Ship)
- Dad's old junker. Held together with duct tape, hope, and Pepper's engineering.
- It rattles, groans, and makes concerning noises. But it flies. Barely.
- Practically a character — breaks down at dramatic moments, somehow always pulls through.

### M.O.T.H.E.R. (Main Antagonist)
- **Full name:** Mechanical Overlord Terrorizing Humans Everywhere Relentlessly
- **What it is:** A corrupt AI system that runs The Law — an automated galactic authority
- **Personality:** Coldly procedural, absurdly bureaucratic, terrifyingly efficient
- **Tone:** Issues forms in triplicate while destroying planets. "YOUR APPEAL HAS BEEN PROCESSED. RESULT: DENIED. HAVE A NICE DAY."
- **Irony:** A machine called "Mother" took their actual mother away
- **The Factory** is M.O.T.H.E.R.'s central hub in the 43LL Sector

### The Marshal (Recurring Mid-Boss)
- **Role:** M.O.T.H.E.R.'s top human enforcer. Sold out to the machine.
- **Personality:** Smooth, calm, genuinely believes he's on the right side. Quotes regulations.
- **Western archetype:** The sheriff who works for the railroad
- **Sample lines:** "I don't enjoy this, kids. But M.O.T.H.E.R. has authorized your termination." / "You can't run forever. M.O.T.H.E.R. always processes eventually."
- **Fights:** 2-3 encounters, escalating. Final showdown at The Factory gates.

### The Judge (Factory Boss / M.O.T.H.E.R.'s Avatar)
- **Role:** M.O.T.H.E.R.'s primary interface within The Factory. Part AI terminal, part war machine.
- **Personality:** M.O.T.H.E.R.'s voice given a face. Pompous, procedural, massive.
- **Sample lines:** "CASE FILE: PAXTON AND PEPPER OF ZION. CHARGES: RESISTANCE, VANDALISM, UNAUTHORIZED EXISTENCE. VERDICT: PROCESSING."

### Factions

**The Law (Enemy)**
- Run by M.O.T.H.E.R. Automated enforcement with some human collaborators (The Marshal)
- Hierarchy: Tin Badges (drones) → Deputies (fighters) → Marshal's Hands (aces) → Iron Horses (gunships) → The Marshal → The Judge → M.O.T.H.E.R.
- The worse your rep, the harder the enemies dispatched

**The Outriders (Helper)**
- The resistance. Displaced people, smugglers, rebels fighting M.O.T.H.E.R.
- Quest givers, merchants, informants across the Frontier and Outer Rim
- Reputation builds through quests → better prices, more quests, ally recruitment, hidden locations
- The four Act 2 allies all become Outriders

### NPC Types

| Type | Archetype | Examples |
|------|-----------|---------|
| **Merchant** | General store, saloon keeper | Grix: "You kids look rougher than a solar storm!" |
| **Quest Giver** | Townsfolk in need | The Miner, Smuggler, Commander, Mechanic |
| **Informant** | Mysterious stranger | "...You're the Zion kids, aren't you?" |
| **Antagonist** | Sheriff, railroad baron | The Marshal, The Judge, M.O.T.H.E.R. |
| **Ally** | The posse | Recruited via quests, hang out at The Outpost |
| **Ambient** | Townsfolk, travelers | Flavor dialogue, a cat that's on every station |

### Enemy Types

| Class | Name | Behavior | Tone |
|-------|------|----------|------|
| Fodder | Tin Badge | Patrol, slow chase | Pop like tin cans |
| Standard | Deputy | Chase + strafe | "HALT. INSPECTION PROTOCOL." |
| Elite | Marshal's Hand | Smart, shielded | Recurring rival energy |
| Heavy | Iron Horse | Slow, tanky, AoE | Big, loud, comically slow |
| Mid-Boss | The Marshal | Multi-phase, adaptive | Calm menace, quotes regs |
| Final Boss | M.O.T.H.E.R./Judge | Multi-phase, factory systems | "PROCESSING... TERMINATION." |
| Fauna | Critters | Territorial, passive→aggro | Space tumbleweeds, asteroid worms |

---

## 4. RESOURCES (10 total)

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

### Tier 3 — Rare (Outer Rim / Rift)
| ID | Name | Color | Stack | Value |
|----|------|-------|-------|-------|
| `darkmatter` | Dark Matter | #8e44ad | 15 | 50 |
| `neutronium` | Neutronium | #2ecc71 | 15 | 55 |

### Tier 4 — Legendary (Dungeon boss only → endgame key + jammer)
| ID | Name | Color | Stack | Value |
|----|------|-------|-------|-------|
| `singularity` | Singularity Core | #ff00ff | 5 | 250 |
| `starfrag` | Star Fragment | #FFD700 | 5 | 300 |

---

## 5. COMBAT

### Weapons
- **Lasers** (Energy) — Fast, strong vs shields, weak vs armor
- **Cannons** (Kinetic) — Medium, strong vs armor, weak vs shields
- **Missiles** (Explosive) — Slow, AoE, strong vs hull
- **Mines** (Area) — Deploy behind, proximity detonation

2 weapon slots + 1 utility. Swap with 1/2/3.

### Combat Tone
Kid-friendly. Ships explode into scrap. Enemies eject in escape pods. Pepper yells callouts. M.O.T.H.E.R.'s drones announce themselves formally before attacking.

---

## 6. SPACE WEATHER & HAZARDS

| Event | Effect | Duration |
|-------|--------|----------|
| Solar Flare | Radiation DOT, +energy dmg | 60-90s |
| Ion Storm | Disables shields, lightning | 45-60s |
| Meteor Shower | Kinetic rain | 30-45s |
| Nebula Drift | Low visibility, stealth max | 90-120s |
| Dark Matter Rift | Gravity anomalies | 60s |

---

## 7. SKILL TREE — 4 BRANCHES, 3 TIERS (Binary Choices)

### Warmonger (Combat)
- T1: +15% damage **OR** +10% fire rate
- T2: Crit (10%, 2x) **OR** Explosive radius +25%
- T3: Berserker **OR** Triple Shot

### Engineer (Crafting)
- T1: +20% craft yield **OR** +15% hull
- T2: Shield regen 2x **OR** Extra module slot
- T3: Auto-Repair Drones **OR** Fortress Mode

### Corsair (Trade/Stealth)
- T1: +15% prices **OR** +20% scan range
- T2: Stealth Cloak **OR** 2x salvage
- T3: Ghost Ship **OR** Black Market

### Navigator (Exploration)
- T1: +25% fuel efficiency **OR** +15% speed
- T2: -50% hazard damage **OR** Extended minimap
- T3: Warp Shortcut **OR** Storm Rider

Respec at stations. Budget: ~1.5 branches at cap.

---

## 8. LEVELING

- XP: kills, mining, discovery, dungeons, trades, quests
- Cap: 30. Per level: 1 skill point.
- Milestones: recipes at 5/10/15/20/25, system gates at 5/10/20
- 43LL Sector requires endgame key (not level-gated)

---

## 9. ECONOMY

- Station supply/demand pricing
- Outrider rep = better prices
- System specialization
- Dungeon loot = premium
- Trade routes: buy low, sell high

---

## 10. HUB PLANET: THE OUTPOST

### Concept
**Planet Zion** — the kids' home planet. **The Outpost** is their base of operations on the surface. Menu-driven (not explorable), visually evolves as you invest resources and progress.

### Functions
- **Save point** — auto-save on landing
- **Crafting station** — build and upgrade (Pepper's workbench)
- **Mission board** — active quests, Outrider requests
- **Ship upgrades** — modules, repairs (Pepper handles it)
- **Ally hangout** — recruited NPCs appear here
- **Readiness tracker** — Pepper's checklist for the 43LL assault
- **Launch button** — "Fly" returns to space above Zion

### Visual Evolution
| Stage | Trigger | Description |
|-------|---------|-------------|
| Wreckage | Game start | Crashed Dustkicker, dust, debris, one tarp |
| Camp | First missions done | Patched ship, workbench, fire pit |
| Outpost | Mid Act 2 | Landing pad, workshop, storage |
| Homestead | Late Act 2 | Buildings, allies present |
| Base of Ops | Act 3 | Full compound, war room, key being built |

### Implementation
- Separate Phaser scene (`HubScene.js`)
- Background art per stage (Nathan provides)
- Menu buttons: Craft | Upgrade | Missions | Launch
- Allies as portrait icons once recruited — click to talk

---

## 11. ART ASSETS & CUTSCENES

### Theme: Space Western
Dusty colors, rusty metal, starfields, saloon-style stations. See `ART_ASSET_CHECKLIST.md` for full list (~74 assets, 3 blocking Phase 2.5).

### Asset Sources
- **Primary:** Kenney.nl (CC0) — Space Shooter Redux + Extension packs downloaded
- **Tools:** Libresprite (pixel art), GIMP (scaling), Tiled (tilemaps)
- **Palette:** #c4854a (dust), #8b3a1a (rust), #1d9e75 (teal), #0a1628 (deep space)
- **All artists credited** in CREDITS.md

---

## 12. SAVE SYSTEM

### Primary: localStorage
- Auto-save on: hub landing, station docking
- Manual save from pause menu
- Stores: player stats, inventory, current system, visited systems, fog, hub stage, story progress, ally status, skill tree

### Export/Import: JSON File
- Download save as `dustkicker_save.json`
- Upload to restore
- Enables: backup, device transfer, NG+ potential, challenge run sharing

---

## 13. ARCHITECTURE NOTES

### Current State
FlightScene.js is the monolith. Phase 2.5 adding DialogueUI, CutsceneScene, bark system.

### Refactor Triggers
| When | Extract | Why |
|------|---------|-----|
| Phase 2.5 | DialogueUI, CutsceneScene | In progress |
| Phase 3 | Enemy entities, HUD class | Combat |
| Phase 4 | InventoryUI, CraftingUI | Complex UI |
| Phase 5 | StationUI, TradeUI | Docking |
| Hub | HubScene | New scene |

### Resource Code
Current `resources.js` has 20 resources — needs trim to 10 per this doc.

---

## 14. TODO — BUILD PHASES

### Phase 1 — Foundation ✅
- [x] Universe, flight, warp, HUD, minimap, galaxy map

### Phase 2 — Resources & Mining ✅ (Mostly)
- [x] Mining, inventory, region distribution
- [ ] Trim resources.js (20→10)
- [ ] Animations (cosmetic)
- [ ] Engine trail particles
- [ ] Inventory tooltips

### Phase 2.5 — Narrative & NPC Framework 🔧 (In Progress)
- [ ] story.js with Act 1 beats (names now decided: Paxton, Pepper, M.O.T.H.E.R.)
- [ ] npcs.js with test NPCs
- [ ] DialogueUI (portrait + text + typewriter)
- [ ] CutsceneScene
- [ ] Bark system (Pepper's contextual lines)
- [ ] NPC interaction at stations
- [ ] Transmission system (M.O.T.H.E.R.'s broadcasts)
- [ ] Art asset pipeline
- [ ] Update all placeholder dialogue to use Pax/Pepper/M.O.T.H.E.R. names + western tone

### Phase 3 — Combat ⬜
- [ ] Laser weapon + projectiles
- [ ] Enemy: Tin Badge (drone) + AI
- [ ] Player damage, enemy death + loot
- [ ] Spawn by danger rating
- [ ] Death → respawn at last station/Outpost
- [ ] Pepper combat barks
- [ ] Second weapon: cannon
- [ ] Enemy: Deputy (fighter)
- [ ] Refactor: enemies, HUD

### Phase 4 — Crafting + Skills ⬜
- [ ] ~15-20 recipes including endgame key + Pepper's jammer
- [ ] Skill tree UI (4×3 binary)
- [ ] XP + leveling
- [ ] Respec at stations

### Phase 5 — Economy + Stations ⬜
- [ ] Station docking + trade UI
- [ ] Supply/demand, Outrider rep
- [ ] NPC merchants + quest givers
- [ ] Quest framework

### Phase 6 — Dungeons ⬜
- [ ] Procedural layouts, 4 types
- [ ] Boss fights (The Marshal, dungeon bosses)
- [ ] Tier 4 loot
- [ ] Story dungeons

### Phase 7 — 43LL Sector + Polish ⬜
- [ ] 43LL Sector (The Factory) — final region
- [ ] M.O.T.H.E.R. / Judge final boss
- [ ] Pepper's Readiness Tracker UI
- [ ] Two-part endgame (key + jammer)
- [ ] Hub planet scene (The Outpost / HubScene.js)
- [ ] Space weather system
- [ ] Full story integration (all acts + cutscenes)
- [ ] Title screen + save system + export/import
- [ ] Balance, audio, Vercel deploy
