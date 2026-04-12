// Bark configs — all Pepper barks in one place
// Trigger types: once, once_per_session, once_per_system, cooldown_Ns, always, idle

export const BARK_CONFIGS = [
  // === TUTORIAL / FIRST-TIME ===
  { id: 'first_asteroid', trigger: 'near_asteroid_first', speaker: 'pepper',
    text: "See that rock? Shoot it, Pax! Bust it open and let's see what's inside.",
    frequency: 'once', priority: 2 },
  { id: 'first_mine', trigger: 'first_mine_complete', speaker: 'pepper',
    text: "Nice shootin'! Grab that loot before it drifts away!",
    frequency: 'once', priority: 2 },
  { id: 'first_gate', trigger: 'near_gate_first', speaker: 'pepper',
    text: "That's a warp gate! Get close and press E to jump to the next system.",
    frequency: 'once', priority: 2 },
  { id: 'first_station', trigger: 'near_station_first', speaker: 'pepper',
    text: "There's a station up ahead. Might be friendly. Might not. Let's find out.",
    frequency: 'once', priority: 2 },
  { id: 'first_enemy', trigger: 'first_enemy_spotted', speaker: 'pepper',
    text: "Pax, we got company! Those red blips are Tin Badges \u2014 M.O.T.H.E.R.'s patrol drones. Shoot 'em before they shoot us!",
    frequency: 'once', priority: 1 },
  { id: 'first_kill', trigger: 'first_enemy_kill', speaker: 'pepper',
    text: "We did it! We actually blew up a Tin Badge! ...Is it wrong that felt kinda good?",
    frequency: 'once', priority: 2 },

  // === WARNINGS ===
  { id: 'fuel_half', trigger: 'fuel_below_50', speaker: 'pepper',
    text: "Fuel's at half, Pax. Might wanna keep an eye on that.",
    frequency: 'once_per_session', priority: 3 },
  { id: 'fuel_low', trigger: 'fuel_below_20', speaker: 'pepper',
    text: "We're runnin' on fumes, Pax. Maybe don't warp anywhere far?",
    frequency: 'once_per_session', priority: 2 },
  { id: 'fuel_empty', trigger: 'fuel_at_zero', speaker: 'pepper',
    text: "We're bone dry, Pax! No fuel means no warp and barely any thrust.",
    frequency: 'once_per_session', priority: 1 },
  { id: 'fuel_empty_ext', trigger: 'fuel_zero_extended', speaker: 'pepper',
    text: "Pax, we gotta find fuel! Mine some ice asteroids or find a trading post!",
    frequency: 'once_per_session', priority: 1 },
  { id: 'hull_low', trigger: 'hull_below_25', speaker: 'pepper',
    text: "The Dustkicker's fallin' apart! We need to patch her up, pronto!",
    frequency: 'once_per_session', priority: 1 },
  { id: 'star_warning', trigger: 'near_star', speaker: 'pepper',
    text: "Pax! We're gettin' way too close to that star! Pull back!",
    frequency: 'once_per_system', priority: 1 },

  // === COMBAT ===
  { id: 'combat_1', trigger: 'enemy_destroyed', speaker: 'pepper',
    text: "Got 'em! One less Tin Badge to worry about.",
    frequency: 'cooldown_5s', priority: 4 },
  { id: 'combat_2', trigger: 'enemy_destroyed', speaker: 'pepper',
    text: "That's what you get for messin' with the Zion kids!",
    frequency: 'cooldown_5s', priority: 4 },
  { id: 'combat_3', trigger: 'enemy_destroyed', speaker: 'pepper',
    text: "Yeehaw! Nice shootin', Pax!",
    frequency: 'cooldown_5s', priority: 4 },
  { id: 'zone_clear', trigger: 'all_enemies_cleared', speaker: 'pepper',
    text: "All clear! ...For now. Let's not stick around.",
    frequency: 'once_per_system', priority: 2 },
  { id: 'hull_low_combat', trigger: 'hull_below_25_combat', speaker: 'pepper',
    text: "Pax, we gotta get outta here! The Dustkicker can't take much more!",
    frequency: 'cooldown_15s', priority: 1 },
  { id: 'shields_down', trigger: 'shields_depleted', speaker: 'pepper',
    text: "Shields are down! We're flyin' naked out here!",
    frequency: 'once_per_session', priority: 1 },
  { id: 'hit_bark', trigger: 'player_hit', speaker: 'pepper',
    text: "We're takin' hits, Pax!",
    frequency: 'cooldown_15s', priority: 3 },
  { id: 'hit_hull', trigger: 'player_hit_hull', speaker: 'pepper',
    text: "That one got through! Hull's takin' damage!",
    frequency: 'cooldown_15s', priority: 2 },

  // === EXPLORATION ===
  { id: 'level_up', trigger: 'level_up', speaker: 'pepper',
    text: "Level up, Pax! We're gettin' stronger!",
    frequency: 'always', priority: 2 },
  { id: 'respawned', trigger: 'enemies_respawned', speaker: 'pepper',
    text: "Looks like they're back. Guess they didn't get the message.",
    frequency: 'once_per_system', priority: 3 },

  // === IDLE ===
  { id: 'idle_parents', trigger: 'random_idle', speaker: 'pepper',
    text: "You think Mom and Dad are okay in there, Pax?",
    frequency: 'idle', priority: 5 },
  { id: 'idle_home', trigger: 'random_idle', speaker: 'pepper',
    text: "I miss Zion. I miss how it was before M.O.T.H.E.R. showed up.",
    frequency: 'idle', priority: 5 },
  { id: 'idle_humor_1', trigger: 'random_idle', speaker: 'pepper',
    text: "Hey Pax, what do you call a ship that won't start? ...The Dustkicker. Oh wait.",
    frequency: 'idle', priority: 5 },
  { id: 'idle_humor_2', trigger: 'random_idle', speaker: 'pepper',
    text: "We're burnin' daylight! ...Well, starlight. Same thing out here.",
    frequency: 'idle', priority: 5 },

  // === DUNGEON ===
  { id: 'dungeon_gate', trigger: 'near_dungeon_gate', speaker: 'pepper',
    text: "That gate's unstable. Whatever's on the other side ain't gonna be friendly. You sure about this?",
    frequency: 'once', priority: 2 },
];

export function getBarksByTrigger(trigger) {
  return BARK_CONFIGS.filter(b => b.trigger === trigger);
}

export function getRandomBark(trigger) {
  const barks = getBarksByTrigger(trigger);
  return barks.length ? barks[Math.floor(Math.random() * barks.length)] : null;
}
