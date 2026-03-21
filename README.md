# Block Survival: Space Pirates

A top-down space pirate survival game built with **Phaser 3** + **Vite**.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move ship |
| Mouse | Aim |
| M | Galaxy Map |
| E | Warp (near gate) |
| TAB / I | Inventory |
| Click asteroid | Mine (when close) |

## Project Structure

```
src/
├── main.js                    # Phaser game config + boot
├── config/
│   └── constants.js           # RNG, dimensions, data tables
├── scenes/
│   ├── FlightScene.js         # Main gameplay
│   ├── GalaxyMapScene.js      # Universe map overlay
│   └── WarpScene.js           # Warp transition
├── entities/
│   ├── Player.js              # Ship sprite + physics
│   ├── Planet.js              # Planet objects
│   ├── Asteroid.js            # Mineable asteroids
│   ├── Station.js             # Dockable stations
│   └── WarpGate.js            # Gate objects
├── systems/
│   ├── UniverseGenerator.js   # Procedural universe/system gen
│   ├── ResourceSystem.js      # Mining + resource drops
│   └── InventorySystem.js     # Grid inventory + stacking
├── ui/
│   ├── HUD.js                 # Status bars + system info
│   ├── Minimap.js             # Tactical overlay
│   └── InventoryUI.js         # Inventory panel
└── data/
    ├── resources.js            # All resource definitions (4 tiers)
    └── recipes.js              # Placeholder for Phase 4
```

## Build Phases

- [x] Phase 1 — Foundation (universe, flight, warp, HUD, minimap)
- [x] Phase 2 — Resources & Mining (resource nodes, mining, inventory)
- [ ] Phase 3 — Combat
- [ ] Phase 4 — Crafting + Skills
- [ ] Phase 5 — Economy + Stations
- [ ] Phase 6 — Dungeons
- [ ] Phase 7 — Weather, Story & Polish

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. See `GAME_DESIGN_DOC.md` for full design details.
