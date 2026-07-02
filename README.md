# P.E.S.T.S. — A Space Western

**v1.0 — Act 1 Complete**

Paxton and Pepper Haskett lost their home, their planet, and their parents to
M.O.T.H.E.R. — a machine that calls itself law. All they have left is The
Dustkicker, a ship held together with hope and hull tape, and each other.

Fly. Mine. Trade. Craft. Fight M.O.T.H.E.R.'s Tin Badges across a 49-system
frontier, run a heist, and take down Deputy Harlan to open the road toward
The Factory — where the kids' parents are waiting.

**Play it:** https://space-survivor-pink.vercel.app
(Best experienced in Chrome with a gamepad.)

Built with **Phaser 3** + **Vite**. All graphics and audio are procedural —
no asset files except character portraits.

## Controls

| Keyboard + Mouse | Action |
|-----|--------|
| Arrow keys | Fly |
| Mouse | Aim · left-click fires laser |
| Right-click | Fire cannon (once crafted) |
| E | Warp (near gate) |
| F | Dock / land |
| M | Galaxy map |
| N | Music on/off |
| TAB / I | Inventory (right-click an item to use it) |

| Gamepad | Action |
|-----|--------|
| Left stick | Fly |
| Right stick | Aim + auto-fire |
| L1 | Fire cannon |
| A | Dock / advance dialogue |

## v1.0 — What's in Act 1

- 8-quest story chain from the Supply Run to the Deputy Harlan boss fight
- 6 cutscenes, 173 character portraits, fully voiced-in-text dialogue
- Crafting at the Zion workbench: Laser Mk2, Cannon Mk1, hull/shield/engine
  upgrades, consumables — gated by unique components found in the world
- Asteroid hardness tiers (T1–T3) with weapon-gated mining
- Enemy ranks (Standard/Veteran with stripes), regional drop tables,
  4 enemy types, and a 3-phase boss
- The Heist — steal M.O.T.H.E.R.'s shipment and outrun the response
- 5 hand-built system layouts (Zion, Scrapyard, The Stand, Harlan's Reach, Ironvale)
- Procedural regional music (pests-music-v1) + full SFX coverage
- Save/continue with old-save compatibility

## Quick Start (dev)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

Deploys to Vercel automatically on push to master.

## Credits

- **Design, direction, and playtesting:** Nathan Haskett
- **Design chat:** Claude (Anthropic) — narrative, systems, level design
- **Code:** Claude (Anthropic) — Opus, Sonnet, and Fable across v0.1–v1.0
- **Character portraits:** asset pack (see tools/asset-manager)
- **Fonts:** Rye, Press Start 2P (Google Fonts)

## Post-1.0 Roadmap

Acts 2–3 (The Truth, Homecoming), Missiles/Mines, T4 asteroids,
Elite enemies, challenge zones, The Marshal, PEST wanted level,
Home Jump Beacon, HUD themes.
