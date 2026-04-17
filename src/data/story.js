// Story beats — cutscenes, transmissions, barks
// Each has: id, type, trigger, speaker, portrait, lines, choices, next

import { characterPortraitKey } from './entities/portraits.js';

export const STORY_BEATS = [
  // === ACT 1 CUTSCENES ===
  {
    id: 'act1_intro',
    type: 'cutscene',
    trigger: 'game_start',
    speaker: 'pepper',
    portrait: characterPortraitKey('pepper', 'neutral_2'),
    lines: [
      "Well Pax... we're alive. That's somethin'.",
      "The Dustkicker's seen better days, but she's still in one piece. Mostly.",
      "M.O.T.H.E.R. took everything. Our home. Mom and Dad. The whole dang planet.",
      "But we ain't done yet. Not by a long shot.",
      "See those asteroids out there? I reckon we can mine enough iron to patch her up.",
      "Let's get to work, partner."
    ],
    choices: null,
    next: null
  },
  {
    id: 'act1_first_warp',
    type: 'cutscene',
    trigger: 'first_warp',
    speaker: 'pepper',
    portrait: characterPortraitKey('pepper', 'smile_1'),
    lines: [
      "Warp drive's online! Well... mostly online. It's making a sound I don't love.",
      "Hold on to somethin', Pax!",
      "...We made it! The Dustkicker flies!",
      "Next stop: anywhere that ain't here."
    ],
    choices: null,
    next: null
  },

  // === TRANSMISSIONS ===
  {
    id: 'transmission_mother_warning',
    type: 'transmission',
    trigger: 'enter_system_first',
    speaker: 'M.O.T.H.E.R.',
    portrait: null,
    lines: [
      "ATTENTION: THIS SECTOR IS UNDER JURISDICTION OF M.O.T.H.E.R.",
      "ALL UNREGISTERED VESSELS WILL BE CATALOGUED, FINED, AND PROCESSED.",
      "RESISTANCE IS INEFFICIENT. COMPLIANCE IS MANDATORY.",
      "HAVE A PRODUCTIVE DAY."
    ],
    choices: null,
    next: null
  },
  {
    id: 'transmission_outrider_contact',
    type: 'transmission',
    trigger: 'enter_frontier_first',
    speaker: 'outrider',
    portrait: null,
    lines: [
      "*static* ...you're the Zion kids, ain't ya?",
      "Word travels fast out here. M.O.T.H.E.R. took your planet same as ours.",
      "Name's not important. But if you're lookin' for friends... find the Outriders.",
      "We're out here. And we ain't quittin'. *static*"
    ],
    choices: null,
    next: null
  },

  // === PEPPER BARKS ===
  {
    id: 'bark_first_asteroid',
    type: 'bark',
    trigger: 'near_asteroid_first',
    speaker: 'pepper',
    portrait: null,
    lines: ["See that rock? Shoot it, Pax! Bust it open and let's see what's inside."]
  },
  {
    id: 'bark_first_mine',
    type: 'bark',
    trigger: 'first_mine_complete',
    speaker: 'pepper',
    portrait: null,
    lines: ["Nice shootin'! Grab that loot before it drifts away!"]
  },
  {
    id: 'bark_big_haul',
    type: 'bark',
    trigger: 'asteroid_dropped_3_plus',
    speaker: 'pepper',
    portrait: null,
    lines: ["Jackpot! That rock was loaded!"]
  },
  {
    id: 'bark_fuel_half',
    type: 'bark',
    trigger: 'fuel_below_50',
    speaker: 'pepper',
    portrait: null,
    lines: ["Fuel's at half, Pax. Might wanna keep an eye on that."]
  },
  {
    id: 'bark_low_fuel',
    type: 'bark',
    trigger: 'fuel_below_20',
    speaker: 'pepper',
    portrait: null,
    lines: ["We're runnin' on fumes, Pax. Maybe don't warp anywhere far?"]
  },
  {
    id: 'bark_no_fuel',
    type: 'bark',
    trigger: 'fuel_at_zero',
    speaker: 'pepper',
    portrait: null,
    lines: ["We're bone dry, Pax! No fuel means no warp and barely any thrust."]
  },
  {
    id: 'bark_no_fuel_2',
    type: 'bark',
    trigger: 'fuel_zero_extended',
    speaker: 'pepper',
    portrait: null,
    lines: ["Maybe we should signal for help... if anyone's even listenin'."]
  },
  {
    id: 'bark_low_hull',
    type: 'bark',
    trigger: 'hull_below_25',
    speaker: 'pepper',
    portrait: null,
    lines: ["The Dustkicker's fallin' apart! We need to patch her up, pronto!"]
  },
  {
    id: 'bark_new_system',
    type: 'bark',
    trigger: 'enter_new_system',
    speaker: 'pepper',
    portrait: null,
    lines: ["New system! Let me get a scan goin'. Never know what's out here."]
  },
  {
    id: 'bark_near_station',
    type: 'bark',
    trigger: 'near_station_first',
    speaker: 'pepper',
    portrait: null,
    lines: ["There's a station up ahead. Might be friendly. Might not. Let's find out."]
  },
  {
    id: 'bark_danger_high',
    type: 'bark',
    trigger: 'enter_danger_6plus',
    speaker: 'pepper',
    portrait: null,
    lines: ["Pax... this sector's got a real high danger rating. Keep your eyes peeled."]
  },
  {
    id: 'bark_first_gate',
    type: 'bark',
    trigger: 'near_gate_first',
    speaker: 'pepper',
    portrait: null,
    lines: ["That's a warp gate! Press E when you're close and we can jump to the next system."]
  },
  {
    id: 'bark_inventory_full',
    type: 'bark',
    trigger: 'inventory_full',
    speaker: 'pepper',
    portrait: null,
    lines: ["We're packed to the gills, Pax. Gotta sell or use some of this stuff."]
  },
  {
    id: 'bark_mother_drones',
    type: 'bark',
    trigger: 'first_enemy_spotted',
    speaker: 'pepper',
    portrait: null,
    lines: ["Pax, we got company! Those red blips are Tin Badges — M.O.T.H.E.R.'s patrol drones. Shoot 'em before they shoot us!"]
  },
  {
    id: 'bark_combat_callout_1',
    type: 'bark',
    trigger: 'combat_random',
    speaker: 'pepper',
    portrait: null,
    lines: ["Incoming from starboard, Pax!"]
  },
  {
    id: 'bark_combat_callout_2',
    type: 'bark',
    trigger: 'combat_random',
    speaker: 'pepper',
    portrait: null,
    lines: ["Watch your six!"]
  },
  {
    id: 'bark_combat_callout_3',
    type: 'bark',
    trigger: 'combat_random',
    speaker: 'pepper',
    portrait: null,
    lines: ["Yeehaw! Nice shootin', Pax!"]
  },
  {
    id: 'bark_star_warning',
    type: 'bark',
    trigger: 'near_star',
    speaker: 'pepper',
    portrait: null,
    lines: ["Pax! We're gettin' way too close to that star! Pull back!"]
  },
  {
    id: 'bark_dungeon_entry',
    type: 'bark',
    trigger: 'near_dungeon_gate',
    speaker: 'pepper',
    portrait: null,
    lines: ["That gate's unstable. Whatever's on the other side ain't gonna be friendly. You sure about this?"]
  },
  {
    id: 'bark_emotional_parents',
    type: 'bark',
    trigger: 'random_idle',
    speaker: 'pepper',
    portrait: null,
    lines: ["You think Mom and Dad are okay in there, Pax?"]
  },
  {
    id: 'bark_emotional_home',
    type: 'bark',
    trigger: 'random_idle',
    speaker: 'pepper',
    portrait: null,
    lines: ["I miss Zion. I miss how it was before M.O.T.H.E.R. showed up."]
  },
  {
    id: 'bark_idle_humor_1',
    type: 'bark',
    trigger: 'random_idle',
    speaker: 'pepper',
    portrait: null,
    lines: ["Hey Pax, what do you call a ship that won't start? ...The Dustkicker. Oh wait."]
  },
  {
    id: 'bark_idle_humor_2',
    type: 'bark',
    trigger: 'random_idle',
    speaker: 'pepper',
    portrait: null,
    lines: ["We're burnin' daylight! ...Well, starlight. Same thing out here."]
  },

  // === RESPAWN AWARENESS BARK ===
  {
    id: 'bark_enemies_respawned',
    type: 'bark',
    trigger: 'enemies_respawned',
    speaker: 'pepper',
    portrait: null,
    lines: ["Looks like they're back. Guess they didn't get the message."]
  },

  // === TRANSMISSION REACTION BARKS ===
  {
    id: 'bark_react_mother',
    type: 'bark',
    trigger: 'after_mother_transmission',
    speaker: 'pepper',
    portrait: null,
    lines: ["Well that's real friendly. 'Have a productive day.' ...Yeesh."]
  },
  {
    id: 'bark_react_outrider',
    type: 'bark',
    trigger: 'after_outrider_transmission',
    speaker: 'pepper',
    portrait: null,
    lines: ["Outriders... they sound like our kinda people, Pax."]
  },

  // === PLANET PROXIMITY BARK ===
  {
    id: 'bark_near_planet',
    type: 'bark',
    trigger: 'near_planet',
    speaker: 'pepper',
    portrait: null,
    lines: ["Interesting planet... but we can't land here yet. Maybe once we upgrade The Dustkicker."]
  },

  // === COMBAT BARKS ===
  {
    id: 'bark_enemy_destroyed',
    type: 'bark',
    trigger: 'enemy_destroyed',
    speaker: 'pepper',
    portrait: null,
    lines: ["Got 'em! One less Tin Badge to worry about."]
  },
  {
    id: 'bark_enemy_destroyed_2',
    type: 'bark',
    trigger: 'enemy_destroyed',
    speaker: 'pepper',
    portrait: null,
    lines: ["That's what you get for messin' with the Zion kids!"]
  },
  {
    id: 'bark_player_hit',
    type: 'bark',
    trigger: 'player_hit',
    speaker: 'pepper',
    portrait: null,
    lines: ["We're hit! Shields are takin' a beatin'!"]
  },
  {
    id: 'bark_player_hit_hull',
    type: 'bark',
    trigger: 'player_hit_hull',
    speaker: 'pepper',
    portrait: null,
    lines: ["That one got through to the hull, Pax! Be careful!"]
  },
  {
    id: 'bark_shields_down',
    type: 'bark',
    trigger: 'shields_depleted',
    speaker: 'pepper',
    portrait: null,
    lines: ["Shields are down! We're flyin' naked out here!"]
  },
  {
    id: 'bark_combat_clear',
    type: 'bark',
    trigger: 'all_enemies_cleared',
    speaker: 'pepper',
    portrait: null,
    lines: ["All clear! ...For now. Let's not stick around."]
  },
  {
    id: 'bark_low_hull_combat',
    type: 'bark',
    trigger: 'hull_below_25_combat',
    speaker: 'pepper',
    portrait: null,
    lines: ["Pax, we gotta get outta here! The Dustkicker can't take much more!"]
  },
  {
    id: 'bark_first_kill',
    type: 'bark',
    trigger: 'first_enemy_kill',
    speaker: 'pepper',
    portrait: null,
    lines: ["We did it! We actually blew up a Tin Badge! ...Is it wrong that felt kinda good?"]
  },
  {
    id: 'bark_level_up',
    type: 'bark',
    trigger: 'level_up',
    speaker: 'pepper',
    portrait: null,
    lines: ["Level up, Pax! We're gettin' stronger!"]
  }
];

// --- HELPERS ---
export function getStoryBeat(trigger) {
  return STORY_BEATS.find(b => b.trigger === trigger);
}

export function getStoryBeatById(id) {
  return STORY_BEATS.find(b => b.id === id);
}

export function getBarksByTrigger(trigger) {
  return STORY_BEATS.filter(b => b.type === 'bark' && b.trigger === trigger);
}

export function getRandomBark(trigger) {
  const barks = getBarksByTrigger(trigger);
  return barks.length ? barks[Math.floor(Math.random() * barks.length)] : null;
}
