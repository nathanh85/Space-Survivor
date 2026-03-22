# BLOCK SURVIVAL: SPACE PIRATES — Narrative Report

> Everything story-related: what's in the code, what's designed, and the full arc.
> Current as of Phase 2.5b completion.

---

## THE STORY SO FAR

### The World

The galaxy is controlled by **M.O.T.H.E.R.** — Mechanical Overlord Terrorizing Humans Everywhere Relentlessly. She's a corrupt AI system that runs a galactic authority called **The Law**. M.O.T.H.E.R. claims independent planets through automated "eminent domain" decrees, strips them of resources, and imprisons anyone who fights back. She's coldly efficient, absurdly bureaucratic, and completely without mercy. She issues termination orders and tax forms with the same mechanical indifference.

The galaxy has four regions:
- **Core Worlds** — "Civilized" space, fully under M.O.T.H.E.R.'s thumb. Safe but oppressed.
- **The Frontier** — Contested territory where M.O.T.H.E.R. is expanding. The fight is here.
- **The Outer Rim** — Lawless, dangerous, where the displaced and defiant end up.
- **The Rift** — Uncharted and deadly. Even M.O.T.H.E.R. won't go here. Ancient, dangerous things live in the dark.

Beyond all of this, sealed behind an impenetrable gate, lies the **43LL Sector** — M.O.T.H.E.R.'s domain. At its heart sits **The Factory**, where she processes seized resources and holds prisoners. Including two very specific prisoners.

### The Heroes

**Paxton "Pax"** is fourteen years old, and he's angry. M.O.T.H.E.R. took his home, arrested his parents, and left him with nothing but a busted ship and his little sister. He's the pilot — brave, impulsive, protective, and prone to bad jokes when things get scary. He's a kid playing cowboy in a universe that's very real and very dangerous. But he won't quit. Not while his parents are locked up in The Factory.

**Pepper "Pep"** is ten, maybe eleven, and she's the reason they're still alive. She's the brains — the one who patches the ship, reads the scans, cracks the codes, and builds the things that keep them flying. She's whip-smart, sarcastic, science-obsessed, and she teases her brother constantly. But underneath the jokes, she's scared. She misses home. She misses Mom and Dad. She just won't admit it unless the stars are quiet and Pax isn't looking.

Together, they fly **The Dustkicker** — their dad's old junker ship. It rattles. It groans. It makes sounds that no ship should make. Pepper has patched it with duct tape, welded iron, and what she calls "aggressive optimism." It's held together by stubbornness and love, and it's the only home they have left.

### The Mission

Pax and Pepper's parents were arrested by M.O.T.H.E.R. and taken to The Factory in the 43LL Sector. The gate to 43LL is sealed — no one gets in without a key, and no one survives the approach without disabling M.O.T.H.E.R.'s defense grid.

The kids need to:
1. Rebuild from nothing on Planet Zion
2. Explore the galaxy, mine resources, make allies
3. Find The Outriders — the resistance — and earn their trust
4. Venture into The Rift to collect legendary materials from dungeon bosses
5. Build a key to open the 43LL gate
6. Build a jammer to disable M.O.T.H.E.R.'s defenses
7. Stock up enough weapons and supplies to survive the gauntlet
8. Storm The Factory, defeat The Marshal and M.O.T.H.E.R., and break their parents out

It's a jailbreak. The whole game is a jailbreak.

### The Villains

**M.O.T.H.E.R.** never raises her voice. She doesn't need to. She issues decrees with the same flat tone whether she's approving a supply shipment or ordering a planet stripped bare. She's terrifying because she's efficient — not cruel for cruelty's sake, just completely indifferent to the humans caught in her systems. The irony of her name — a machine called "Mother" that took their actual mother — is something Pepper notices but doesn't joke about.

**The Marshal** is human. That's what makes him complicated. He chose M.O.T.H.E.R.'s side. Maybe he believes in order. Maybe he's afraid. Maybe he sold out for power. He's smooth, calm, and dangerous. He quotes regulations while shooting at children. He shows up two or three times across the story, each time tougher, each time more personal. His final stand is at the gates of The Factory.

**The Judge** is M.O.T.H.E.R.'s avatar inside The Factory — her voice given a face, her will given a weapon. Part AI terminal, part war machine. The final boss.

### The Allies

**The Outriders** are the resistance. Displaced people, smugglers, rebels, and everyone else M.O.T.H.E.R. has wronged. They're scattered across the Frontier and Outer Rim, running, hiding, fighting in small ways. When Pax and Pepper show up — two kids in a junk ship who refuse to quit — the Outriders take notice.

Four key allies are recruited through quests in Act 2:
- **The Miner** — Her operation was seized. Help her get it back, she provides rare resources.
- **The Smuggler** — His routes were blockaded. Run a blockade for him, he opens hidden warp shortcuts.
- **The Commander** — Forced to pay M.O.T.H.E.R.'s "protection fees." Defend her station, she provides safe harbor and upgrades.
- **The Mechanic** — A genius in exile. Find rare parts, he upgrades The Dustkicker.

Each ally, once recruited, appears at The Outpost on Planet Zion. The base grows. The posse assembles.

---

## WHAT'S IN THE CODE RIGHT NOW

### Story Beats (20 total in `src/data/story.js`)

**Cutscenes (2):**

| ID | Trigger | What Happens |
|----|---------|--------------|
| `act1_intro` | Game start | Pepper addresses Pax at The Outpost. Establishes the situation: M.O.T.H.E.R. took everything, parents are gone, The Dustkicker needs repairs. "Well Pax... we're alive. That's somethin'." Sets up the mining tutorial. |
| `act1_first_warp` | First warp | Pepper's excitement as The Dustkicker's warp drive fires for the first time. "She flies!" / "She rattles." / "Same thing." The universe opens up. |

**Transmissions (2):**

| ID | Trigger | What Happens |
|----|---------|--------------|
| `transmission_mother_warning` | First new system entry | M.O.T.H.E.R.'s cold bureaucratic broadcast. "ALL UNREGISTERED VESSELS WILL BE CATALOGUED, FINED, AND PROCESSED. HAVE A PRODUCTIVE DAY." Amber text, monospace font. Establishes the villain's presence without a face-to-face encounter. |
| `transmission_outrider_contact` | First Frontier entry | A crackling, anonymous Outrider radio message through static. "You're the Zion kids, ain't ya? Word travels fast." Establishes the resistance exists and is watching. Green text. |

**Pepper Barks (16):**

Tutorial barks (fire once, teach mechanics):

| ID | Trigger | Line |
|----|---------|------|
| `bark_first_asteroid` | Near first asteroid | "I reckon that rock's got iron in it. Try clicking on it, Pax!" |
| `bark_first_mine` | First mine complete | "Nice haul! I can already think of ten things to build with that." |
| `bark_near_station` | Near first station | "There's a station up ahead. Might be friendly. Might not. Let's find out." |
| `bark_first_gate` | Near first warp gate | "That's a warp gate! Press E when you're close and we can jump to the next system." |

Warning barks (fire once per session, alert to danger):

| ID | Trigger | Line |
|----|---------|------|
| `bark_low_fuel` | Fuel below 20% | "We're runnin' on fumes, Pax. Maybe don't warp anywhere far?" |
| `bark_low_hull` | Hull below 25% | "The Dustkicker's fallin' apart! We need to patch her up, pronto!" |
| `bark_inventory_full` | Inventory full | "We're packed to the gills, Pax. Gotta sell or use some of this stuff." |
| `bark_danger_high` | Enter danger 6+ system | "Pax... this sector's got a real high danger rating. Keep your eyes peeled." |
| `bark_dungeon_entry` | Near dungeon gate | "That gate's unstable. Whatever's on the other side ain't gonna be friendly. You sure about this?" |

Exploration barks (fire per new system):

| ID | Trigger | Line |
|----|---------|------|
| `bark_new_system` | Enter any new system | "New system! Let me get a scan goin'. Never know what's out here." |

Combat barks (stubbed for Phase 3 — triggers exist but won't fire until enemies exist):

| ID | Trigger | Line |
|----|---------|------|
| `bark_mother_drones` | First enemy spotted | "Tin Badges! M.O.T.H.E.R.'s patrol drones. They don't look friendly!" |
| `bark_combat_callout_1` | Random during combat | "Incoming from starboard, Pax!" |
| `bark_combat_callout_2` | Random during combat | "Watch your six!" |
| `bark_combat_callout_3` | Random during combat | "Yeehaw! Nice shootin', Pax!" |

Idle barks (fire randomly after 30-45s of inactivity, 60s cooldown):

| ID | Trigger | Line | Tone |
|----|---------|------|------|
| `bark_emotional_parents` | Random idle | "You think Mom and Dad are okay in there, Pax?" | Emotional — quiet moment |
| `bark_emotional_home` | Random idle | "I miss Zion. I miss how it was before M.O.T.H.E.R. showed up." | Emotional — homesick |
| `bark_idle_humor_1` | Random idle | "Hey Pax, what do you call a ship that won't start? ...The Dustkicker. Oh wait." | Humor — self-deprecating |
| `bark_idle_humor_2` | Random idle | "We're burnin' daylight! ...Well, starlight. Same thing out here." | Humor — western |

### NPCs (3 in `src/data/npcs.js`)

**Grix (Merchant)**
- Personality: Talks too fast, enthusiastic, slightly shady, heart of gold
- Greeting: "Well well WELL! If it ain't Paxton and Pepper! The Zion kids! In MY station!"
- Browse: "All genuine parts, mostly not stolen! ...Don't check the serial numbers."
- No money: "Credits first, window shoppin' second."
- Return visit: "You two again! Business must be boomin'. Or you're broke."

**Commander Vera (Quest Giver)**
- Personality: Tired Outrider, dry humor, seen too much
- Greeting: "Another ship. Great. At least you ain't shooting at us."
- Quest offer: "M.O.T.H.E.R.'s drones been sniffin' around our supply routes. Nothing dangerous. ...Probably."
- About Outriders: "We're just folks who got tired of M.O.T.H.E.R. takin' everything."

**??? (Informant)**
- Personality: Mysterious, speaks in fragments, knows too much
- Greeting: "...You're the Zion kids. The ones M.O.T.H.E.R.'s been lookin' for."
- About The Factory: "43LL Sector. The Factory. That's where M.O.T.H.E.R. keeps the ones who fought back. Your folks included."
- Farewell: "Watch the dark between the stars, kids. M.O.T.H.E.R.'s always listenin'."

### Hub System

- **Planet Zion** exists in the starting system (green, radius 40, `isHub: true`)
- **[F] Land at The Outpost** prompt appears within 100px
- **HubScene** loads with header "THE OUTPOST — Planet Zion"
- **Launch button** returns to FlightScene in orbit near Zion
- Pepper bark on first hub visit: "Home sweet... well, it ain't much. But it's ours."

---

## WHAT'S DESIGNED BUT NOT CODED YET

### Act 1 Beats Still Needed
- First station visit scene (meeting Grix in full cutscene)
- First combat encounter with Law drones (needs Phase 3 combat)
- Outrider contact quest (needs Phase 5 quest system)
- Act 1 gate: reaching level 5 + warping to Frontier

### Act 2 (Entire)
- The Marshal introduction cutscene
- Four ally recruitment quest chains (Miner, Smuggler, Commander, Mechanic)
- The Law attacks an Outrider station (escalation beat)
- Informant reveals the legend of The Rift and the key
- All Frontier/Outer Rim NPC dialogue

### Act 3 (Entire)
- Building the key cutscene (Pepper at workbench)
- Building the jammer cutscene
- Pepper's Readiness Tracker UI
- 43LL Sector gate opening
- The Factory approach (gauntlet gameplay)
- Marshal final showdown (boss fight + dialogue)
- M.O.T.H.E.R./Judge final boss (multi-phase)
- Jailbreak cutscene (parents freed)
- Victory cutscene (binary star sunset)

### Dialogue Still Needed
- More NPC types (Act 2 allies, ambient NPCs, additional merchants)
- Marshal dialogue (encounter 1, 2, 3)
- The Judge/M.O.T.H.E.R. dialogue (final boss)
- Quest briefings and completions
- More Pepper barks (crafting, trading, ally-specific, Act 2/3 story moments)
- Pax lines (currently Pepper does all the talking — Pax needs voice in cutscenes)

### Systems Still Needed
- Quest framework (accept, track, complete, reward)
- Branching dialogue with choices
- Lore collectibles (dungeon data fragments)
- Pepper's Readiness Tracker (Act 3 checklist UI)
- Hub visual evolution (5 background art stages)
- Cutscene art integration (waiting on Nathan's images)

---

## NARRATIVE TONE REFERENCE

### How Pepper Talks
- Western slang: "I reckon," "burnin' daylight," "much obliged," "this ain't our first rodeo"
- Science + western mashup: "If I cross-wire the flux capacitor... just kidding. Hand me the titanium."
- Sarcastic: "She flies!" / "She rattles." / "Same thing."
- Emotional (rare, hits hard): "I miss home." / "You think Mom and Dad are okay?"
- Never loses hope: even scared, she's planning, building, figuring it out

### How M.O.T.H.E.R. Talks
- ALL CAPS for system broadcasts
- Coldly procedural: "YOUR APPEAL HAS BEEN PROCESSED. RESULT: DENIED."
- Absurdly bureaucratic: "HAVE A PRODUCTIVE DAY." after threatening termination
- Never emotional, never personal — humans are line items in her system

### How The Marshal Talks
- Smooth, calm, almost regretful
- Quotes regulations: "M.O.T.H.E.R. has authorized your termination."
- Believes he's righteous: "The law is the law, kids."
- Gets more personal each encounter — by the third fight, it's not about regulations anymore

### How NPCs Talk
- Every NPC is a character, not a menu
- Western archetypes: the shopkeeper, the tired commander, the mysterious stranger
- Quirky, funny, memorable — even throwaway lines should have personality
- They reference M.O.T.H.E.R., the kids' reputation, current events

---

## PLAYER EXPERIENCE ARC

| Moment | Feeling | What's Happening |
|--------|---------|-----------------|
| Game start | "We've got nothing" | Wrecked on Zion, barely flying |
| First mine | "We can do this" | Pepper's enthusiasm is contagious |
| First station | "We're not alone" | Grix is weird but friendly |
| M.O.T.H.E.R. broadcast | "Oh no" | The villain is real and everywhere |
| First combat | "It's dangerous out here" | Tin Badges are scary at first |
| Outrider contact | "There's hope" | Others are fighting too |
| Frontier arrival | "This is bigger than us" | The galaxy is huge and hurting |
| Meet The Marshal | "This just got personal" | He's hunting US specifically |
| Ally recruitment | "We're building something" | The posse grows, The Outpost grows |
| The Law strikes back | "Stakes are real" | They can hurt the people we care about |
| Into The Rift | "Point of no return" | Scariest place in the galaxy |
| Building the key | "We're ready" | Everything we gathered, assembled |
| 43LL Sector | "All or nothing" | Final push, everything on the line |
| Parents freed | "We did it" | The whole point, the emotional payoff |
| Sunset ending | "What's next?" | The universe is open. Adventure continues. |
