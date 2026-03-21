# BLOCK SURVIVAL: SPACE PIRATES — Art Asset Checklist

> All assets: PNG format, any resolution (Phaser scales). Pixel art style recommended to match the blocky ship aesthetic.
> Folder: `assets/` in the project root

---

## PRIORITY 1 — Need for Phase 2.5 (Narrative Framework)

These are what Claude Code needs to build the dialogue/cutscene systems.

### Portraits (for dialogue UI)
| Asset | Filename | Notes |
|-------|----------|-------|
| Brother — neutral | `portraits/brother_neutral.png` | Default talking face |
| Brother — excited | `portraits/brother_excited.png` | Good news, discovery |
| Brother — worried | `portraits/brother_worried.png` | Danger, low health |
| Sister — neutral | `portraits/sister_neutral.png` | Default |
| Sister — excited | `portraits/sister_excited.png` | Found something cool, science stuff |
| Sister — sarcastic | `portraits/sister_sarcastic.png` | Teasing brother, dry humor |
| Sister — worried | `portraits/sister_worried.png` | Danger moments |

**Minimum viable:** 1 portrait each (brother_neutral, sister_neutral). Expressions can be added later.

### Cutscene Art
| Asset | Filename | Scene |
|-------|----------|-------|
| Act 1 intro | `cutscenes/act1_intro.png` | Kids in their junky ship arriving at first system |
| First station | `cutscenes/act1_station.png` | Docking at the first station, meeting first NPC |

**Minimum viable:** 1 image (act1_intro). Can use a black screen + text as fallback for others.

---

## PRIORITY 2 — Need for Phase 3 (Combat)

### Enemy Portraits (for combat callouts / death screens)
| Asset | Filename | Notes |
|-------|----------|-------|
| Pirate drone | `portraits/enemy_drone.png` | Small, buzzy, annoying |
| Pirate fighter | `portraits/enemy_fighter.png` | Cocky pilot |
| Pirate ace | `portraits/enemy_ace.png` | Rival character, recurring |

**Optional for Phase 3** — enemies can just be colored shapes initially.

---

## PRIORITY 3 — Need for Phase 5 (Economy/Stations)

### NPC Portraits
| Asset | Filename | Notes |
|-------|----------|-------|
| Merchant 1 | `portraits/npc_merchant1.png` | First shop NPC (quirky personality) |
| Merchant 2 | `portraits/npc_merchant2.png` | Second shop NPC (different vibe) |
| Quest giver 1 | `portraits/npc_quest1.png` | First quest NPC |
| Informant | `portraits/npc_informant.png` | Mysterious, gives hints |

**Minimum viable:** 1 generic NPC portrait that can be reused with different names.

---

## PRIORITY 4 — Need for Phase 7 (Polish)

### UI Screens
| Asset | Filename | Notes |
|-------|----------|-------|
| Title screen | `ui/title.png` | Game logo + "Press Start" — first impression |
| Game over | `ui/gameover.png` | Ship destroyed / respawn screen |
| Loading screen | `ui/loading.png` | Warp loading or initial boot |
| Pause menu BG | `ui/pause_bg.png` | Background for pause overlay |

### Additional Cutscenes
| Asset | Filename | Scene |
|-------|----------|-------|
| Act 1 finale | `cutscenes/act1_finale.png` | Leaving Core Worlds for the Frontier |
| Act 2 intro | `cutscenes/act2_intro.png` | Arriving in dangerous territory |
| Act 2 midpoint | `cutscenes/act2_midpoint.png` | Major plot twist (sister captured?) |
| Act 3 intro | `cutscenes/act3_intro.png` | Entering The Rift |
| Act 3 finale | `cutscenes/act3_finale.png` | Defeating the big bad |
| Ending | `cutscenes/ending.png` | Kids celebrating, universe saved |

### Villain
| Asset | Filename | Notes |
|-------|----------|-------|
| Big bad — portrait | `portraits/villain_neutral.png` | For dialogue/transmissions |
| Big bad — angry | `portraits/villain_angry.png` | When you beat his minions |
| Big bad — defeated | `portraits/villain_defeated.png` | Endgame |

---

## OPTIONAL / NICE-TO-HAVE

These would elevate the game but are not blockers for any phase.

### In-Game Sprites (replace procedural graphics)
| Asset | Filename | Notes |
|-------|----------|-------|
| Player ship | `sprites/ship_player.png` | Replace the blocky rectangle ship |
| Drone enemy | `sprites/ship_drone.png` | Small enemy sprite |
| Fighter enemy | `sprites/ship_fighter.png` | Medium enemy sprite |
| Station | `sprites/station.png` | Replace rotating square |
| Warp gate | `sprites/warpgate.png` | Replace circle + dots |
| Asteroid (small) | `sprites/asteroid_sm.png` | Replace colored blocks |
| Asteroid (large) | `sprites/asteroid_lg.png` | Bigger variant |

### Resource Icons (for inventory UI)
| Asset | Filename | Notes |
|-------|----------|-------|
| Iron Ore | `icons/res_iron.png` | 16x16 or 32x32 icon |
| Carbon | `icons/res_carbon.png` | |
| Hydrogen Fuel | `icons/res_fuel.png` | |
| Titanium | `icons/res_titanium.png` | |
| Plasma Gel | `icons/res_plasma.png` | |
| Cryo Crystals | `icons/res_cryo.png` | |
| Dark Matter | `icons/res_darkmatter.png` | |
| Neutronium | `icons/res_neutronium.png` | |
| Singularity Core | `icons/res_singularity.png` | |
| Star Fragment | `icons/res_starfrag.png` | |

### Weapon Icons (for HUD weapon slots)
| Asset | Filename | Notes |
|-------|----------|-------|
| Laser | `icons/wep_laser.png` | |
| Cannon | `icons/wep_cannon.png` | |
| Missile | `icons/wep_missile.png` | |
| Mine | `icons/wep_mine.png` | |

---

## SUMMARY — What to make first

**To unblock Phase 2.5 (next build):**
1. `portraits/brother_neutral.png`
2. `portraits/sister_neutral.png`
3. `cutscenes/act1_intro.png`

That's it. Three images and we can build the entire narrative framework with real assets. Everything else can use placeholders (colored rectangles, text-only fallbacks) until you're ready.

**Total asset count (all phases):**
- Portraits: ~17
- Cutscenes: ~8
- UI screens: ~4
- Sprites: ~7 (optional)
- Icons: ~14 (optional)
- **Grand total: ~50 assets** (but only 3 needed now)

---

## NOTES FOR CREATION

- **Style:** Pixel art or clean illustration — match the blocky ship vibe
- **Portraits:** Head/shoulders, ~200x200 to 400x400px, transparent or solid BG
- **Cutscenes:** Wider aspect, ~1280x800 or 16:9, can be rough/sketchy
- **Icons:** 16x16, 32x32, or 64x64 — small and readable
- **Sprites:** Match the current ship scale (~20-30px in game, so source can be 32x32 to 64x64)
- **All PNG with transparency where appropriate**
