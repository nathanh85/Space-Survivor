// Story beats — cutscenes, transmissions, barks
// Each has: id, type, trigger, speaker, portrait, lines, choices, next

export const STORY_BEATS = [
  {
    id: 'act1_intro',
    type: 'cutscene',
    trigger: 'game_start',
    speaker: 'sister',
    portrait: 'sister_neutral',
    lines: [
      "We made it! I can't believe that rusty warp drive actually worked.",
      "Sensors are picking up a station nearby.",
      "Let's dock before anything else falls off the ship."
    ],
    choices: null,
    next: null
  },
  {
    id: 'act1_first_system',
    type: 'transmission',
    trigger: 'enter_system_first',
    speaker: 'station',
    portrait: null,
    lines: [
      "Incoming vessel, you are cleared for approach.",
      "Welcome to the Core Worlds. Try not to hit anything."
    ],
    choices: null,
    next: null
  },
  {
    id: 'bark_first_asteroid',
    type: 'bark',
    trigger: 'near_asteroid_first',
    speaker: 'sister',
    portrait: null,
    lines: [
      "That asteroid looks like it has iron deposits. Try clicking on it!"
    ],
    choices: null,
    next: null
  },
  {
    id: 'bark_low_fuel',
    type: 'bark',
    trigger: 'fuel_below_20',
    speaker: 'sister',
    portrait: null,
    lines: [
      "We're running low on fuel. Maybe don't warp anywhere far?"
    ],
    choices: null,
    next: null
  },
  {
    id: 'bark_first_mine',
    type: 'bark',
    trigger: 'first_mine_complete',
    speaker: 'sister',
    portrait: null,
    lines: [
      "Nice! We got some resources. I can already think of ten things to build with that."
    ],
    choices: null,
    next: null
  }
];

// Helper to find a story beat by trigger
export function getStoryBeat(trigger) {
  return STORY_BEATS.find(b => b.trigger === trigger);
}
