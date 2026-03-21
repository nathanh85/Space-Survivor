# BLOCK SURVIVAL: SPACE PIRATES — Game Design Document v2

## WORLD STRUCTURE

### The Universe Map
- Large scrollable grid (~100x100 tiles, representing a galactic sector)
- Fog of war — systems hidden until discovered via scanning or warp travel
- Unveils over time: leveling up scanner reveals more map
- Systems color-coded by danger: green → yellow → orange → red → skull
- Scroll with mouse drag or edge panning, zoom with scroll wheel
- Player icon shows current location, visited systems marked, breadcrumb trail
- Regions: Core Worlds (safe, low reward), Frontier (moderate), Outer Rim (dangerous, high reward), The Rift (dungeon territory, endgame)

### Solar Systems (Persistent, Seeded-Procedural)
- ~30-40 systems in fixed universe layout
- Each contains: 1-5 planets, 0-3 asteroid belts, 0-2 stations, 0-1 warp anomalies (dungeon entrances)
- Once generated, layout persists for the playthrough
- Dominant faction, danger rating, primary resource type per system
- Planet types: Rocky (ores), Ice (cryo crystals, water), Volcanic (rare metals, fuel), Lush (organics, food), Toxic (chemicals, dark matter), Barren (salvage, ruins)
- Free flight within system, land on planets (surface view), dock at stations

### Warp Gates
- Located at system edges, connect to adjacent systems on universe map
- Standard gates: always available, costs fuel
- Locked gates: require level, faction rep, or key items
- Unstable gates: lead to dungeon systems, visual shimmer/pulse, warning indicator

### Dungeon Systems (Procedural, One-Shot)
- Fully random layout each entry
- Types: Derelict Fleet (salvage + ambush), Pirate Stronghold (heavy combat + loot), Anomaly Zone (hazards + rare materials), Ancient Ruins (puzzles + tech artifacts)
- Escalating difficulty — longer you stay, harder it gets
- Boss encounter at core, defeating yields rare materials + XP bonus
- On leave or death, dungeon resets

---

## RESOURCES

### Tier 1 — Common (Core Worlds)
- Iron Ore, Carbon, Silicon, Water Ice, Hydrogen Fuel

### Tier 2 — Uncommon (Frontier)
- Titanium, Plasma Gel, Cryo Crystals, Organic Compounds, Copper Wire

### Tier 3 — Rare (Outer Rim)
- Dark Matter Shards, Neutronium, Quantum Flux, Exotic Spores, Void Glass

### Tier 4 — Legendary (Dungeon-only, boss loot)
- Singularity Core, Precursor Alloy, Living Crystal, Star Fragment, Chrono Dust

---

## COMBAT SYSTEM

### Weapons (4 categories)
- **Lasers** (Energy) — Fast, accurate, weak vs armor, strong vs shields. Pulse Laser, Beam Laser, Scatter Laser
- **Cannons** (Kinetic) — Medium speed, strong vs armor, weak vs shields. Autocannon, Railgun, Shotgun Blast
- **Missiles** (Explosive) — Slow, high damage, AoE, limited ammo. Seeker Missile, Cluster Bomb, EMP Torpedo
- **Mines** (Area/Trap) — Deploy behind, proximity detonation. Proximity Mine, Gravity Well, Shock Net

Player equips 2 weapon slots + 1 utility slot. Swap with number keys.

### Defense
- **Hull HP** — Base health, repair with resources or at stations
- **Shields** — Regenerating energy barrier, strong vs lasers, weak vs kinetic
- **Armor Plating** — Flat damage reduction, strong vs kinetic, weak vs explosive
- **Resistances** — Tech modules add elemental resistances (radiation, cryo, toxic)

### Enemy Types (TBD — Nathan defining archetypes)
- Fodder: basic patrol drones, low HP, predictable
- Standard: armed fighters, one weapon type, basic tactics
- Elite: multiple weapons, shields, dodge/strafe
- Heavy: slow, tanky, high damage, area attacks
- Boss: unique mechanics per dungeon type, multi-phase
- Environmental: space fauna, asteroid worms, living anomalies

---

## SPACE WEATHER & HAZARDS

### System-Wide Events (cycled on timers, HUD warnings)
- **Solar Flare** — Radiation DOT, boosts energy weapons + energy resource yield. 60-90s
- **Ion Storm** — Disables all shields, random lightning strikes. 45-60s
- **Meteor Shower** — Kinetic projectile rain, asteroids provide cover. 30-45s
- **Nebula Drift** — Reduced visibility, scanner disabled, max stealth. 90-120s
- **Dark Matter Rift** — Gravity anomalies, warp disruption, dark matter spawns. 60s

### Planet Surface Hazards
- Toxic Rain (Toxic), Lava Eruptions (Volcanic), Blizzards (Ice), Tremors (Rocky), Spore Clouds (Lush)

---

## SKILL TREE — 4 BRANCHES (Respec Available)

### Branch 1: Warmonger (Combat)
- T1: +10% weapon damage, +5% fire rate
- T2: Critical hit chance, explosive radius
- T3: Dual-wield (3 weapon slots), berserker mode
- T4: Devastating Strike (3x damage chance), Weapon Mastery (unique weapon effects)

### Branch 2: Engineer (Ship & Crafting)
- T1: +15% crafting yield, +10% hull HP
- T2: Shield regen speed, extra module slot
- T3: Auto-repair drones, overcharge shields (2x capacity)
- T4: Master Crafter (double craft chance), Fortress Mode (immobile + massive defense)

### Branch 3: Corsair (Trade, Stealth, Exploration)
- T1: +10% trade prices, +15% scan range
- T2: Stealth cloak (brief invisibility), salvage multiplier
- T3: Black market access, dungeon loot bonus
- T4: Ghost Ship (extended cloak + speed), Market Manipulation (influence prices)

### Branch 4: Navigator (Exploration & Hazard Mastery)
- T1: +20% fuel efficiency, +10% movement speed
- T2: Hazard resistance, extended minimap
- T3: Warp Shortcut (teleport to visited systems), environmental immunity (one type)
- T4: Cartographer (full system map reveal), Storm Rider (convert weather damage to energy)

### Respec
- Available at any station for scaling credit cost
- Full respec resets all points
- Point budget: enough to max ~1.5 branches at level cap — must specialize

---

## LEVELING

- XP: combat kills (scaled), mining (small), first discovery (bonus), dungeon clears, profitable trades, quests
- Level cap: 30
- Per level: 1 skill point
- Recipe unlocks at: 5, 10, 15, 20, 25, 30
- System access gates: 5, 10, 20
- XP curve: fast to 10, moderate to 20, steep 20-30

---

## ECONOMY

- Stations have resource inventories with supply/demand pricing
- Buy/sell updates prices — flooding crashes prices
- System specialization: mining systems = cheap ore, combat zones = cheap salvage
- Faction rep modifies prices: +rep = discounts, -rep = markup/refusal
- Dungeon loot always sells high
- Trade route gameplay: buy low in producing systems, sell high in consuming systems

---

## PEOPLE & STORY

### Story
`[TBD — Nathan adding]`

### NPC Archetypes
`[TBD — Nathan adding]`

### Enemy Archetypes (Expanded)
`[TBD — Nathan adding]`

### Factions
`[TBD — Nathan adding]`

---

## TODO — BUILD ORDER

### Phase 1 — Foundation ⬜
- [ ] Universe map (large, scrollable, fog of war)
- [ ] System generation (seeded procedural interiors)
- [ ] Ship movement + physics (WASD + mouse aim)
- [ ] Warp gate travel between systems
- [ ] Basic HUD (coordinates, fuel, system name)
- [ ] Minimap

### Phase 2 — Resources & Mining ⬜
- [ ] Resource node generation on planets/asteroids
- [ ] Mining mechanic (click to harvest)
- [ ] Inventory UI (grid-based)
- [ ] Planet landing transition
- [ ] Resource tier distribution by region

### Phase 3 — Combat ⬜
- [ ] Weapon system (laser + cannon first)
- [ ] Projectile physics
- [ ] Enemy spawning + basic AI (patrol, chase, attack)
- [ ] Health/shields/armor system
- [ ] Damage types + resistances
- [ ] Death + respawn at last station
- [ ] Enemy loot drops

### Phase 4 — Crafting + Skills ⬜
- [ ] Crafting UI + recipe tree
- [ ] Skill tree UI (4 branches)
- [ ] XP + leveling system
- [ ] Respec mechanic at stations
- [ ] Recipe unlock gates

### Phase 5 — Economy + Stations ⬜
- [ ] Station docking UI
- [ ] Trade interface (buy/sell)
- [ ] Supply/demand price model
- [ ] Faction reputation system
- [ ] Price fluctuation over time

### Phase 6 — Dungeons ⬜
- [ ] Unstable warp gate generation
- [ ] Procedural dungeon layouts
- [ ] Dungeon types (derelict, stronghold, anomaly, ruins)
- [ ] Boss encounters
- [ ] Rare loot tables (Tier 4)
- [ ] Escalating difficulty timer

### Phase 7 — Weather, Story & Polish ⬜
- [ ] Space weather event system
- [ ] Planet surface hazards
- [ ] Story integration + NPCs
- [ ] Enemy archetype variety
- [ ] Title screen + save system
- [ ] Balance tuning pass
- [ ] Visual + audio polish
