# BLOCK SURVIVAL: SPACE PIRATES — Game Script

> Master script for all dialogue, cutscenes, barks, and transmissions.
> Organized chronologically by when the player encounters them.
> ✅ = Written and in code | ✏️ = Needs writing | 🔧 = Written but not in code yet
>
> FORMAT KEY:
> - **[CUTSCENE]** = Full-screen art + typewriter text. Player presses SPACE to advance.
> - **[DIALOGUE]** = Portrait + text box. At stations or triggered encounters.
> - **[BARK]** = Small popup, Pepper's voice. 3-4 seconds, fades out.
> - **[TRANSMISSION]** = Radio-style text. Auto-advances. Amber (M.O.T.H.E.R.) or Green (Outriders).
> - **[CHOICE]** = Player picks from options. Format: > Option A / > Option B
> - Speaker names: PAX, PEPPER, M.O.T.H.E.R., MARSHAL, JUDGE, GRIX, VERA, ???

---

## ACT 1: "DUST AND RUST"
*Core Worlds. Tutorial. Getting off the ground.*

---

### SCENE 1.1 — Opening ✅
**[CUTSCENE]** | Trigger: `game_start` | Art: `act1_intro.png`

*The Outpost on Planet Zion. Wreckage. Dust. The Dustkicker sits broken on the surface.*

> PEPPER: Well Pax... we're alive. That's somethin'.

> PEPPER: The Dustkicker's seen better days, but she's still in one piece. Mostly.

> PEPPER: M.O.T.H.E.R. took everything. Our home. Mom and Dad. The whole dang planet.

> PEPPER: But we ain't done yet. Not by a long shot.

> PEPPER: See those asteroids out there? I reckon we can mine enough iron to patch her up.

> PEPPER: Let's get to work, partner.

---

### SCENE 1.2 — Hub Tutorial ✏️
**[DIALOGUE]** | Trigger: `first_hub_visit` | Location: The Outpost

*First time the player opens The Outpost. Pepper walks Pax through the base.*

> PEPPER: ✏️ [Introduce the workbench / crafting area]

> PEPPER: ✏️ [Introduce the mission board — empty for now]

> PEPPER: ✏️ [Point to the Launch button — "Ready to fly?"]

> PAX: ✏️ [First Pax line — eager to get moving? Reluctant?]

---

### BARK 1.1 — First Hub Visit ✅
**[BARK]** | Trigger: `first_hub_visit`

> PEPPER: Home sweet... well, it ain't much. But it's ours.

---

### BARK 1.2 — Near First Asteroid ✅
**[BARK]** | Trigger: `near_asteroid_first`

> PEPPER: I reckon that rock's got iron in it. Try clicking on it, Pax!

---

### BARK 1.3 — First Mine Complete ✅
**[BARK]** | Trigger: `first_mine_complete`

> PEPPER: Nice haul! I can already think of ten things to build with that.

---

### BARK 1.4 — Near First Station ✅
**[BARK]** | Trigger: `near_station_first`

> PEPPER: There's a station up ahead. Might be friendly. Might not. Let's find out.

---

### BARK 1.5 — Near First Gate ✅
**[BARK]** | Trigger: `near_gate_first`

> PEPPER: That's a warp gate! Press E when you're close and we can jump to the next system.

---

### SCENE 1.3 — First Warp ✅
**[CUTSCENE]** | Trigger: `first_warp` | Art: `act1_first_warp.png`

*The Dustkicker rattles into warp for the first time.*

> PEPPER: Warp drive's online! Well... mostly online. It's making a sound I don't love.

> PEPPER: Hold on to somethin', Pax!

> PEPPER: ...We made it! The Dustkicker flies!

> PEPPER: Next stop: anywhere that ain't here.

---

### SCENE 1.4 — M.O.T.H.E.R. Broadcast ✅
**[TRANSMISSION]** | Trigger: `enter_system_first` | Style: Amber, monospace

*First time entering a new system. M.O.T.H.E.R.'s automated broadcast.*

> M.O.T.H.E.R.: ATTENTION: THIS SECTOR IS UNDER JURISDICTION OF M.O.T.H.E.R.

> M.O.T.H.E.R.: ALL UNREGISTERED VESSELS WILL BE CATALOGUED, FINED, AND PROCESSED.

> M.O.T.H.E.R.: RESISTANCE IS INEFFICIENT. COMPLIANCE IS MANDATORY.

> M.O.T.H.E.R.: HAVE A PRODUCTIVE DAY.

---

### SCENE 1.5 — First Station Visit ✏️
**[CUTSCENE]** | Trigger: `first_station_dock` | Art: `act1_station.png`

*Pax and Pepper dock at their first station. They meet Grix.*

> PEPPER: ✏️ [Reaction to the station — impressed? Nervous?]

> PAX: ✏️ [Trying to act cool? Excited?]

> GRIX: ✏️ [Grix's dramatic entrance — he's THRILLED to have customers]

*(Transition to dialogue below)*

---

### SCENE 1.6 — Meeting Grix ✅ (partial)
**[DIALOGUE]** | Trigger: `interact_grix` | Location: Station

> GRIX: Well well WELL! If it ain't Paxton and Pepper! The Zion kids! In MY station!

> GRIX: Take a look around! All genuine parts, mostly not stolen! ...Don't check the serial numbers.

*If player has no credits:*
> GRIX: Credits first, window shoppin' second. I got mouths to feed! ...Just mine, but still.

*On return visit:*
> GRIX: You two again! Business must be boomin'. Or you're broke. Either way, welcome!

*Farewell:*
> GRIX: Y'all come back now, hear? And bring credits next time!

**✏️ NEEDS:** Grix asking about their situation. Learning about M.O.T.H.E.R. from Grix's perspective. Maybe Grix drops a hint about the Outriders.

---

### SCENE 1.7 — Meeting Commander Vera ✅ (partial)
**[DIALOGUE]** | Trigger: `interact_vera` | Location: Station

> VERA: Another ship. Great. At least you ain't shooting at us.

> VERA: Look kids, I got a job if you want it. M.O.T.H.E.R.'s drones been sniffin' around our supply routes. Nothing dangerous. ...Probably.

*On quest complete:*
> VERA: You actually did it? Huh. Maybe there's hope for this dusty old galaxy after all.

*About the Outriders:*
> VERA: The Outriders? We're just folks who got tired of M.O.T.H.E.R. takin' everything. Some of us lost homes. Some lost family. All of us lost patience.

*Farewell:*
> VERA: Try not to get processed out there. M.O.T.H.E.R. don't take kindly to folks like us.

**✏️ NEEDS:** Vera's quest briefing details. What exactly are the kids doing for her? Reaction to learning they're from Zion.

---

### SCENE 1.8 — The Informant ✅ (partial)
**[DIALOGUE]** | Trigger: `interact_informant` | Location: Station (dark corner)

> ???: ...You're the Zion kids. The ones M.O.T.H.E.R.'s been lookin' for.

> ???: The Frontier ain't safe no more. M.O.T.H.E.R.'s movin' fast. Processin' everything.

> ???: There's talk of somethin' in The Rift. Somethin' M.O.T.H.E.R. can't process. Somethin'... old.

> ???: 43LL Sector. The Factory. That's where M.O.T.H.E.R. keeps the ones who fought back. Your folks included.

> ???: Watch the dark between the stars, kids. M.O.T.H.E.R.'s always listenin'.

**✏️ NEEDS:** Pax/Pepper reactions to learning about The Factory. Emotional beat when they hear their parents are there.

---

### SCENE 1.9 — First Combat ✏️
**[CUTSCENE or BARK]** | Trigger: `first_enemy_spotted` | Needs: Phase 3 combat

> PEPPER: ✅ Tin Badges! M.O.T.H.E.R.'s patrol drones. They don't look friendly!

> PAX: ✏️ [Pax's first combat reaction]

*During combat:*
> PEPPER: ✅ Incoming from starboard, Pax!
> PEPPER: ✅ Watch your six!
> PEPPER: ✅ Yeehaw! Nice shootin', Pax!

**✏️ NEEDS:** Post-first-combat dialogue. How do the kids react to being shot at? Scared? Exhilarated? Both?

---

### SCENE 1.10 — Act 1 Transition ✏️
**[CUTSCENE]** | Trigger: `reach_level_5` or `warp_to_frontier` | Art: `act1_finale.png`

*The kids are ready to leave the Core Worlds. The Frontier awaits.*

> PEPPER: ✏️ [Reflection on how far they've come]

> PAX: ✏️ [Determination — we're going to find Mom and Dad]

> PEPPER: ✏️ [Warning about the Frontier being more dangerous]

> PAX: ✏️ [Classic cowboy "let's ride" moment]

---

## ACT 2: "POSSE UP"
*Frontier + Outer Rim. Building alliances. The Marshal hunts.*

---

### SCENE 2.1 — Frontier Arrival ✏️
**[CUTSCENE]** | Trigger: `enter_frontier_first` | Art: `act2_intro.png`

> PEPPER: ✏️ [First impression of the Frontier — rougher, more dangerous]

> PAX: ✏️ [Determined but maybe nervous]

---

### SCENE 2.2 — Outrider Transmission ✅
**[TRANSMISSION]** | Trigger: `enter_frontier_first` | Style: Green

> OUTRIDER: *static* ...you're the Zion kids, ain't ya?

> OUTRIDER: Word travels fast out here. M.O.T.H.E.R. took your planet same as ours.

> OUTRIDER: Name's not important. But if you're lookin' for friends... find the Outriders.

> OUTRIDER: We're out here. And we ain't quittin'. *static*

---

### SCENE 2.3 — Meet The Marshal ✏️
**[CUTSCENE]** | Trigger: `story_marshal_intro` | Art: `act2_marshal.png`

*The Marshal's ship drops out of warp in front of The Dustkicker. Smooth, menacing.*

> MARSHAL: ✏️ [Introduces himself — calm, professional, terrifying]

> MARSHAL: ✏️ ["M.O.T.H.E.R. has authorized your termination." or similar]

> PEPPER: ✏️ [Reaction — scared but defiant]

> PAX: ✏️ [Protective of Pepper, angry]

> MARSHAL: ✏️ [Gives them a "head start" — he's sporting about it. For now.]

**Note:** This is introduction only — no fight yet. The Marshal lets them go to build tension.

---

### SCENE 2.4 — Ally Quest: The Miner ✏️
**[DIALOGUE]** | Trigger: `interact_miner` | Location: Frontier station

> MINER: ✏️ [Introduce herself — tough, independent, angry at M.O.T.H.E.R.]

> MINER: ✏️ [Quest briefing — help reclaim her seized mining operation]

> PAX/PEPPER: ✏️ [Accept the quest]

*On quest complete:*
> MINER: ✏️ [Grateful. Joins the Outriders. Provides rare resources.]

> MINER: ✏️ [Appears at The Outpost from now on]

---

### SCENE 2.5 — Ally Quest: The Smuggler ✏️
**[DIALOGUE]** | Trigger: `interact_smuggler` | Location: Outer Rim station

> SMUGGLER: ✏️ [Charming, roguish. His routes were blockaded.]

> SMUGGLER: ✏️ [Quest briefing — run a blockade for him]

*On quest complete:*
> SMUGGLER: ✏️ [Opens hidden warp shortcuts. Joins at The Outpost.]

---

### SCENE 2.6 — Ally Quest: The Commander ✏️
**[DIALOGUE]** | Trigger: `interact_commander` | Location: Frontier station

> COMMANDER: ✏️ [Military bearing, principled. Forced to pay protection fees.]

> COMMANDER: ✏️ [Quest briefing — defend her station from Law attack]

*On quest complete:*
> COMMANDER: ✏️ [Provides safe harbor + ship upgrades. Joins at The Outpost.]

---

### SCENE 2.7 — Ally Quest: The Mechanic ✏️
**[DIALOGUE]** | Trigger: `interact_mechanic` | Location: Hidden Outer Rim location

> MECHANIC: ✏️ [Eccentric genius. Lives in exile. Obsessed with machines.]

> MECHANIC: ✏️ [Quest briefing — find rare parts for him]

> PEPPER: ✏️ [Pepper LOVES this guy — kindred spirit]

*On quest complete:*
> MECHANIC: ✏️ [Upgrades The Dustkicker. Major ship improvement. Joins at The Outpost.]

---

### SCENE 2.8 — The Law Strikes Back ✏️
**[CUTSCENE]** | Trigger: `story_law_strikes` | Art: `act2_strike.png`

*M.O.T.H.E.R. retaliates. The Marshal attacks an Outrider station the kids care about.*

> M.O.T.H.E.R.: ✏️ [Broadcast announcing the attack — cold, procedural]

> MARSHAL: ✏️ [Addresses the kids directly — "This is what happens."]

> PEPPER: ✏️ [Emotional reaction — these are their friends]

> PAX: ✏️ [Anger. Resolution. This means war.]

---

### SCENE 2.9 — Marshal Encounter 2 ✏️
**[BOSS FIGHT + DIALOGUE]** | Trigger: `story_marshal_fight_1`

*First actual fight with The Marshal.*

> MARSHAL: ✏️ [Pre-fight — more personal this time]

*During fight:*
> MARSHAL: ✏️ [Mid-fight taunts — still calm but frustrated]

> PEPPER: ✏️ [Combat callouts specific to Marshal]

*Marshal retreats (doesn't die yet):*
> MARSHAL: ✏️ [Retreats with a warning — "Next time I won't hold back."]

---

### SCENE 2.10 — The Legend of the Key ✏️
**[DIALOGUE]** | Trigger: `story_legend_revealed` | Art: `act2_legend.png`

*The Informant (or an Outrider elder) reveals what's needed to break into 43LL Sector.*

> ???: ✏️ [Explains the sealed gate to 43LL Sector]

> ???: ✏️ [Explains the key — built from materials in The Rift]

> ???: ✏️ [Explains M.O.T.H.E.R.'s defense grid — need a jammer]

> PEPPER: ✏️ ["I can build those. If we get the materials." — sets up Act 3]

> PAX: ✏️ [Determination — "Then we go to The Rift."]

---

### SCENE 2.11 — Act 2 Transition ✏️
**[CUTSCENE]** | Trigger: `act2_complete` | Art: TBD

*All allies recruited. Materials quest identified. The Rift awaits.*

> PEPPER: ✏️ [Summary of what they need — checklist mentality]

> PAX: ✏️ [Rally speech to the Outriders? Or quiet determination?]

---

## ACT 3: "JAILBREAK"
*The Rift. 43LL Sector. The Factory. Mom and Dad.*

---

### SCENE 3.1 — Into The Rift ✏️
**[CUTSCENE]** | Trigger: `enter_rift_first` | Art: `act3_intro.png`

*The kids stare at the entrance to The Rift. The most dangerous place in the galaxy.*

> PAX: ✏️ ["You sure about this?"]

> PEPPER: ✏️ ["Nope. Let's go." — or some version of brave-scared]

---

### SCENE 3.2 — Rift Dungeon Barks ✏️
**[BARK]** | Various triggers during Rift dungeon runs

> PEPPER: ✏️ [Entering a dungeon — nervous but focused]

> PEPPER: ✏️ [Finding a Tier 4 material — excited]

> PEPPER: ✏️ [Boss encounter — "That thing is BIG, Pax."]

> PEPPER: ✏️ [Defeating a boss — celebration]

> PEPPER: ✏️ [Getting a key material — "That's one piece of the puzzle!"]

---

### SCENE 3.3 — Building the Key ✏️
**[CUTSCENE]** | Trigger: `key_materials_complete` | Art: `act3_build.png`

*Back at The Outpost. Pepper at the workbench.*

> PEPPER: ✏️ ["If I cross-wire the singularity core with the star fragment..."]

> PEPPER: ✏️ ["...either this works or we become a very pretty explosion."]

> PEPPER: ✏️ [It works. The key is built.]

> PAX: ✏️ [Reaction]

---

### SCENE 3.4 — Building the Jammer ✏️
**[CUTSCENE]** | Trigger: `jammer_materials_complete`

> PEPPER: ✏️ [Building the jammer — technical Pepper at her best]

> PEPPER: ✏️ ["This should knock out M.O.T.H.E.R.'s defenses. For about five minutes."]

> PAX: ✏️ ["Five minutes?" — concern]

> PEPPER: ✏️ ["Better fly fast, partner."]

---

### SCENE 3.5 — Pepper's Readiness Check ✏️
**[DIALOGUE / UI]** | Trigger: `attempt_43ll_gate`

*Pepper's Readiness Tracker. She won't let Pax leave until they're ready.*

> PEPPER: ✏️ [If not ready — "We ain't ready, Pax. Look at this list."]

> PEPPER: ✏️ [If almost ready — "We're close. Just need a little more."]

> PEPPER: ✏️ [If ready — "Pax... I think we're ready. Are YOU ready?"]

> PAX: ✏️ [Final confirmation — "Let's go get Mom and Dad."]

---

### SCENE 3.6 — 43LL Gate Opens ✏️
**[CUTSCENE]** | Trigger: `use_key_on_43ll`

*The sealed gate to 43LL Sector. The key activates. The gate opens.*

> PEPPER: ✏️ [Awe/fear as the gate opens]

> M.O.T.H.E.R.: ✏️ [M.O.T.H.E.R. notices — "UNAUTHORIZED ACCESS DETECTED."]

> PAX: ✏️ [Defiant response]

---

### SCENE 3.7 — The Factory Approach ✏️
**[BARK / TRANSMISSION]** | During 43LL gameplay

> M.O.T.H.E.R.: ✏️ [Increasing warnings — "THREAT LEVEL ESCALATING"]

> PEPPER: ✏️ [Jammer status updates — "Jammer's holding... barely!"]

> PEPPER: ✏️ [Navigation callouts through the gauntlet]

---

### SCENE 3.8 — Marshal Final Showdown ✏️
**[BOSS FIGHT + DIALOGUE]** | Trigger: `factory_gates`

*The Marshal blocks the entrance to The Factory. Last stand.*

> MARSHAL: ✏️ [Most personal dialogue yet — no more regulations, just anger]

> MARSHAL: ✏️ ["You've been a thorn in M.O.T.H.E.R.'s side long enough. And mine."]

> PAX: ✏️ [Confrontation — maybe offers him a chance to walk away?]

> MARSHAL: ✏️ [Refuses — "The law is the law." — or breaks from script for the first time]

*During fight:*
> PEPPER: ✏️ [Specific Marshal combat callouts]

*Marshal defeated:*
> MARSHAL: ✏️ [Final words — regret? Defiance? Warning about what's inside?]

---

### SCENE 3.9 — The Factory Interior ✏️
**[CUTSCENE / BARK]** | During Factory dungeon

> PEPPER: ✏️ [Inside The Factory — dark, mechanical, oppressive]

> PEPPER: ✏️ [They're close to the parents — she can feel it]

> M.O.T.H.E.R.: ✏️ [M.O.T.H.E.R. addresses them directly for the first time — personal]

---

### SCENE 3.10 — The Judge / M.O.T.H.E.R. Final Boss ✏️
**[BOSS FIGHT + DIALOGUE]** | Trigger: `factory_core`

*The Judge — M.O.T.H.E.R.'s avatar. The final boss.*

> JUDGE/M.O.T.H.E.R.: ✏️ [Introduction — "CASE FILE: PAXTON AND PEPPER OF ZION."]

> JUDGE/M.O.T.H.E.R.: ✏️ ["CHARGES: RESISTANCE, VANDALISM, UNAUTHORIZED EXISTENCE."]

> JUDGE/M.O.T.H.E.R.: ✏️ ["VERDICT: PROCESSING."]

> PAX: ✏️ [Defiance — the big hero line]

> PEPPER: ✏️ [Smart quip before the fight]

*During fight phases:*
> M.O.T.H.E.R.: ✏️ [Phase 1 dialogue — mechanical, procedural]

> M.O.T.H.E.R.: ✏️ [Phase 2 — starting to glitch, less composed]

> M.O.T.H.E.R.: ✏️ [Phase 3 — desperate, system failing, "THIS DOES NOT COMPUTE"]

*Boss defeated:*
> M.O.T.H.E.R.: ✏️ [System shutdown — "PROCESSING... ERROR... ERROR..."]

---

### SCENE 3.11 — Jailbreak ✏️
**[CUTSCENE]** | Trigger: `boss_defeated` | Art: TBD

*The cell doors open. Mom and Dad are free.*

> PAX: ✏️ [Seeing parents for the first time — emotional]

> PEPPER: ✏️ [Running to them — drops the sarcasm, just a kid who missed her parents]

> MOM: ✏️ [First words]

> DAD: ✏️ [First words — maybe something about The Dustkicker?]

---

### SCENE 3.12 — Victory / Ending ✏️
**[CUTSCENE]** | Trigger: `ending` | Art: `act3_victory.png`

*Planet Zion. The Outpost. The family reunited. Binary star sunset.*

> PEPPER: ✏️ [Reflection — what they accomplished]

> PAX: ✏️ [Looking at the stars]

> PAX: "So... what do we do now?"

> PEPPER: "I hear there's a whole universe out there."

*Credits or free-roam unlocked.*

---

## RECURRING / SYSTEMIC BARKS

These fire throughout the game based on gameplay triggers, not story progression.

### Warning Barks ✅
| Trigger | Line |
|---------|------|
| Fuel < 20% | "We're runnin' on fumes, Pax. Maybe don't warp anywhere far?" |
| Hull < 25% | "The Dustkicker's fallin' apart! We need to patch her up, pronto!" |
| Inventory full | "We're packed to the gills, Pax. Gotta sell or use some of this stuff." |
| Danger 6+ system | "Pax... this sector's got a real high danger rating. Keep your eyes peeled." |
| Near dungeon gate | "That gate's unstable. Whatever's on the other side ain't gonna be friendly. You sure about this?" |

### Exploration Barks ✅
| Trigger | Line |
|---------|------|
| New system | "New system! Let me get a scan goin'. Never know what's out here." |

### Idle Barks ✅ (Random, 30-45s inactivity, 60s cooldown)
| Line | Tone |
|------|------|
| "You think Mom and Dad are okay in there, Pax?" | Emotional |
| "I miss Zion. I miss how it was before M.O.T.H.E.R. showed up." | Emotional |
| "Hey Pax, what do you call a ship that won't start? ...The Dustkicker. Oh wait." | Humor |
| "We're burnin' daylight! ...Well, starlight. Same thing out here." | Humor |

### Idle Barks — Additional ✏️ (Write more to add variety)
| Line | Tone |
|------|------|
| ✏️ | Humor |
| ✏️ | Humor |
| ✏️ | Emotional |
| ✏️ | Random observation |
| ✏️ | Lore / world-building |
| ✏️ | About The Dustkicker |
| ✏️ | About a specific ally (after recruited) |

### Combat Barks ✅ (Stubbed — fire during Phase 3 combat)
| Trigger | Line |
|---------|------|
| First enemy | "Tin Badges! M.O.T.H.E.R.'s patrol drones. They don't look friendly!" |
| Random | "Incoming from starboard, Pax!" |
| Random | "Watch your six!" |
| Random | "Yeehaw! Nice shootin', Pax!" |

### Combat Barks — Additional ✏️
| Trigger | Line |
|---------|------|
| Enemy destroyed | ✏️ |
| Multiple enemies | ✏️ |
| Player hit | ✏️ |
| Boss appears | ✏️ |
| Close call / low health | ✏️ |
| Victory / all clear | ✏️ |

### Crafting Barks ✏️ (Phase 4 — fire during crafting)
| Trigger | Line |
|---------|------|
| Crafting success | ✏️ |
| Crafting rare item | ✏️ |
| Not enough materials | ✏️ |
| Level unlock | ✏️ |

### Trading Barks ✏️ (Phase 5 — fire during trading)
| Trigger | Line |
|---------|------|
| Good deal | ✏️ |
| Ripped off | ✏️ |
| Selling loot | ✏️ |

---

## M.O.T.H.E.R. SYSTEM BROADCASTS ✏️

*Additional M.O.T.H.E.R. transmissions that could fire in various systems. All CAPS, amber, monospace.*

| Trigger | Lines |
|---------|-------|
| Near Law patrol | ✏️ "PATROL UNIT [NUMBER] REPORTING. SCANNING FOR UNREGISTERED VESSELS." |
| After destroying drones | ✏️ "UNIT LOSS DETECTED. REPLACEMENT DISPATCHED. EFFICIENCY WILL BE MAINTAINED." |
| Entering heavily patrolled system | ✏️ |
| Near 43LL Sector | ✏️ |
| Random propaganda | ✏️ "M.O.T.H.E.R. PROVIDES. M.O.T.H.E.R. PROTECTS. M.O.T.H.E.R. PROCESSES." |

---

## OUTRIDER TRANSMISSIONS ✏️

*Additional Outrider messages. Green text, through static.*

| Trigger | Lines |
|---------|-------|
| Near Outrider station | ✏️ |
| After helping allies | ✏️ |
| Reputation milestone | ✏️ |
| Act 3 rally | ✏️ "The Outriders are with you, Zion kids. All of us." |

---

## NOTES FOR WRITERS

### Pepper's Voice Checklist
- [ ] Does she sound like a smart 10-year-old, not an adult?
- [ ] Is there at least one western word? (reckon, ain't, dang, partner, y'all)
- [ ] Would this be funny to a kid?
- [ ] Does it sound different from Pax? (She's sarcastic/clever, he's earnest/brave)
- [ ] If emotional, is it earned? (She doesn't cry easy — when she's vulnerable, it hits hard)

### Pax's Voice Checklist
- [ ] Does he sound like a brave 14-year-old, not an action hero?
- [ ] Is he protective of Pepper?
- [ ] Does he use humor to cover fear?
- [ ] Is he earnest where Pepper is sarcastic?

### M.O.T.H.E.R.'s Voice Checklist
- [ ] ALL CAPS?
- [ ] Procedural / bureaucratic language?
- [ ] Absurdly formal for the situation?
- [ ] Zero emotion — humans are data entries?

### Marshal's Voice Checklist
- [ ] Calm and measured?
- [ ] Quotes regulations or M.O.T.H.E.R.'s authority?
- [ ] Does he get more personal in later encounters?
- [ ] Is there a hint that he knows what he's doing is wrong?
