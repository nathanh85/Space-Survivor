# BLOCK SURVIVAL: SPACE PIRATES — Project Timeline

> Estimates are **working hours** (coding + testing + iteration), not calendar time.
> Art hours are separate — Nathan sourcing/creating assets on his own schedule.
> "Code" = Claude Code session hours. "Design" = Chat planning hours. "Art" = Nathan solo.

---

## COMPLETED

| Phase | Feature | Est. Hours | Actual | Status |
|-------|---------|-----------|--------|--------|
| — | Game design & planning (Chat) | — | ~3h | ✅ Done |
| 1 | Universe map + fog of war | 2-3h | — | ✅ Done |
| 1 | System generation (seeded) | 1-2h | — | ✅ Done |
| 1 | Ship movement + physics | 1-2h | — | ✅ Done |
| 1 | Warp gates + transition | 1-2h | — | ✅ Done |
| 1 | HUD, minimap, galaxy map | 2-3h | — | ✅ Done |
| 1 | Phaser migration + Vite setup | 2-3h | — | ✅ Done |
| 2 | Resource data model (20 resources) | 1h | — | ✅ Done |
| 2 | Mining mechanic | 1-2h | — | ✅ Done |
| 2 | Inventory system + UI | 2-3h | — | ✅ Done |
| **Total Phase 1+2** | | **~15-20h** | | |

---

## PHASE 2 — Remaining Polish

| Feature | Est. Hours | Type | Blocked By |
|---------|-----------|------|------------|
| Trim resources.js (20 → 10) | 0.5h | Code | Nothing |
| Inventory tooltips on hover | 1h | Code | Nothing |
| Asteroid rotation animation | 0.5h | Code | Nothing |
| Warp gate spinning animation | 0.5h | Code | Nothing |
| Station rotation animation | 0.5h | Code | Nothing |
| Engine trail particles | 1h | Code | Nothing |
| Planet landing + surface view | 3-4h | Code | Nothing |
| **Phase 2 remaining** | **~7-8h** | | |

*Recommendation: Do the quick wins (animations, tooltips, trim resources) as warmups before bigger sessions. Planet landing can wait until after combat — it's a nice-to-have.*

---

## PHASE 2.5 — Narrative & NPC Framework

| Feature | Est. Hours | Type | Blocked By |
|---------|-----------|------|------------|
| Story data format (`story.js`) | 0.5h | Code | Nothing |
| NPC data format (`npcs.js`) | 0.5h | Code | Nothing |
| DialogueUI class (portrait + text box) | 3-4h | Code | Nothing (placeholders ok) |
| Typewriter text effect | 0.5h | Code | Nothing |
| CutsceneScene (fullscreen art + text) | 2-3h | Code | Nothing (placeholders ok) |
| NPC spawning at stations + [F] Talk | 1-2h | Code | NPC data |
| Companion bark system (contextual popups) | 2-3h | Code | Story data |
| Transmission system (system entry alerts) | 1h | Code | Story data |
| Art: 2 portraits (brother + sister) | 1-3h | Art | Nathan |
| Art: 1 cutscene (act1 intro) | 1-3h | Art | Nathan |
| Art asset loading pipeline | 0.5h | Code | At least 1 art asset |
| Act 1 script writing | 2-4h | Design | Nathan |
| Character names + definitions | 1h | Design | Nathan |
| 2-3 test NPC definitions | 1h | Design | Nathan |
| **Phase 2.5 total** | **~18-26h** | | |
| *Code only:* | *~11-15h* | | |
| *Art + writing:* | *~6-11h* | | |

*This is the biggest "new" phase. The code work can start immediately with placeholder art (colored rectangles + placeholder text). Art and story writing happen in parallel on your schedule.*

---

## PHASE 3 — Combat

| Feature | Est. Hours | Type | Blocked By |
|---------|-----------|------|------------|
| Weapon system (laser first) | 2-3h | Code | Nothing |
| Projectile spawning + physics | 1-2h | Code | Weapon system |
| Enemy entity class (Drone) | 2-3h | Code | Nothing |
| Basic AI (patrol → detect → chase → attack) | 3-4h | Code | Enemy entity |
| Player takes damage (hull/shield) | 1h | Code | Projectiles |
| Enemy health + death + loot drop | 1-2h | Code | Enemy entity |
| Spawn enemies by danger rating | 1h | Code | Enemy AI |
| Death → respawn at last station | 1-2h | Code | Damage system |
| Sister combat callouts | 1h | Code | Bark system (2.5) |
| Enemy escape pod detail | 0.5h | Code | Enemy death |
| Second weapon type (cannon) | 1-2h | Code | Weapon system |
| Refactor: extract enemy entities | 1-2h | Code | After basics work |
| Refactor: extract HUD class | 1-2h | Code | After basics work |
| Art: enemy portraits (optional) | 1-2h | Art | Nathan |
| **Phase 3 total** | **~18-26h** | | |
| *Code only:* | *~17-24h* | | |

*Combat is meaty. The AI alone is 3-4 hours of iteration to get feeling right. Recommend building laser + drone first, playtesting until it's fun, then adding variety.*

---

## PHASE 4 — Crafting + Skills

| Feature | Est. Hours | Type | Blocked By |
|---------|-----------|------|------------|
| Recipe data (~15-20 recipes) | 1-2h | Design + Code | Resource system |
| Crafting UI | 3-4h | Code | Recipe data |
| Endgame device as crafting goal | 1h | Code + Design | Story decisions |
| Skill tree UI (4 branches × 3 tiers) | 4-6h | Code | Nothing |
| XP + leveling system | 2-3h | Code | Nothing |
| Respec at stations | 1h | Code | Skill tree + stations |
| Recipe unlock gates | 0.5h | Code | Leveling system |
| Sister crafting dialogue | 1h | Code + Writing | Bark system |
| Refactor: extract InventoryUI | 1-2h | Code | After UI works |
| **Phase 4 total** | **~15-20h** | | |

---

## PHASE 5 — Economy + Stations

| Feature | Est. Hours | Type | Blocked By |
|---------|-----------|------|------------|
| Station docking UI | 2-3h | Code | Nothing |
| Trade interface (buy/sell) | 3-4h | Code | Docking UI |
| Supply/demand price model | 2-3h | Code | Trade interface |
| Faction reputation system | 2-3h | Code | Trade system |
| NPC merchants with dialogue | 1-2h | Code | DialogueUI (2.5) + NPCs |
| Quest givers at stations | 2-3h | Code | DialogueUI (2.5) |
| Quest framework (accept/track/complete) | 3-4h | Code | NPC system |
| Art: NPC portraits (3-4) | 2-4h | Art | Nathan |
| **Phase 5 total** | **~18-24h** | | |

---

## PHASE 6 — Dungeons

| Feature | Est. Hours | Type | Blocked By |
|---------|-----------|------|------------|
| Procedural dungeon layouts | 3-4h | Code | System generation |
| Dungeon types (4 variations) | 2-3h | Code | Dungeon layouts |
| Boss encounters (multi-phase) | 4-6h | Code | Combat system |
| Boss dialogue (pre-fight) | 1-2h | Code + Writing | DialogueUI |
| Tier 4 loot tables | 1h | Code | Resource system |
| Escalating difficulty timer | 1-2h | Code | Enemy spawning |
| Story dungeon (Act 2/3 gate) | 2-3h | Code + Writing | Story decisions |
| Art: boss portraits | 1-2h | Art | Nathan |
| **Phase 6 total** | **~16-22h** | | |

---

## PHASE 7 — Polish & Ship

| Feature | Est. Hours | Type | Blocked By |
|---------|-----------|------|------------|
| Space weather event system | 3-4h | Code | Nothing |
| Full story integration (all acts) | 3-5h | Code + Writing | All story written |
| All NPC dialogue | 2-4h | Writing | NPC definitions |
| Title screen | 1-2h | Code + Art | Title art |
| Save system (localStorage) | 2-3h | Code | Nothing |
| Game over / respawn screen | 1h | Code + Art | Game over art |
| Balance tuning pass | 3-5h | Playtesting | Everything built |
| Audio (SFX + music) | 2-4h | Sourcing + Code | Nothing |
| Vercel deployment | 1h | Code | Build working |
| Art: remaining cutscenes (~6) | 4-8h | Art | Nathan + Story |
| Art: villain portraits | 1-2h | Art | Nathan |
| **Phase 7 total** | **~24-38h** | | |

---

## PROJECT SUMMARY

| Phase | Code Hours | Art/Writing Hours | Total Est. |
|-------|-----------|-------------------|------------|
| 1+2 (Done) | ~15-20h | — | ✅ Complete |
| 2 Remaining | 7-8h | — | 7-8h |
| 2.5 Narrative | 11-15h | 6-11h | 18-26h |
| 3 Combat | 17-24h | 1-2h | 18-26h |
| 4 Crafting+Skills | 14-18h | 1-2h | 15-20h |
| 5 Economy | 16-20h | 2-4h | 18-24h |
| 6 Dungeons | 14-20h | 1-2h | 16-22h |
| 7 Polish | 18-28h | 8-14h | 24-38h |
| **TOTAL REMAINING** | **~97-133h** | **~19-35h** | **~116-164h** |

### In perspective:
- **~120-160 total hours remaining** to a complete, polished game
- At **5 hours/week:** ~6-8 months
- At **10 hours/week:** ~3-4 months
- At **burst pace (15-20h/week):** ~2 months
- Already ~15-20 hours invested (Phase 1+2 + planning)

### Milestones worth celebrating:
| Milestone | After Phase | What You Have |
|-----------|------------|---------------|
| "It's a world" | 2 done ← YOU ARE HERE | Explore, mine, collect |
| "It talks" | 2.5 done | NPCs, dialogue, story begins |
| "It fights" | 3 done | Combat loop, real tension |
| "It hooks" | 4 done | Progression, builds, choices — **playable demo** |
| "It's a game" | 5+6 done | Economy, quests, dungeons — **feature complete** |
| "Ship it" | 7 done | Polished, balanced, deployed — **finished game** |
