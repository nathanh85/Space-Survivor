// ============================================================
// Quest Definitions — P.E.S.T.S. v0.6.0
// ============================================================

export const QUESTS = [
  {
    id: 'quest_supply_run',
    name: 'Supply Run',
    description: "Vera needs iron and carbon to keep the Outpost running.",
    giver: 'quest_vera',
    turnIn: 'quest_vera',
    requiredLevel: 1,
    requires: [],
    objectives: [
      { type: 'collect_resource', resource: 'iron', target: 10, current: 0 },
      { type: 'collect_resource', resource: 'carbon', target: 5, current: 0 },
    ],
    rewards: { credits: 50, xp: 75 },
    dialogue: {
      offer: [
        "Look kids, the Outpost's runnin' low on supplies.",
        "I need 10 Iron Ore and 5 Carbon. Think you can scrounge some up?",
        "Mine some asteroids — shouldn't be too hard out there.",
      ],
      inProgress: [
        "Still workin' on those supplies? We're countin' on you.",
      ],
      complete: [
        "You actually pulled it off! The Outpost'll hold together a while longer.",
        "Here — you earned this. Don't spend it all in one place.",
      ],
    },
  },
  {
    id: 'quest_pest_control',
    name: 'Pest Control',
    description: "M.O.T.H.E.R.'s Tin Badges are sniffing around. Time to clean house.",
    giver: 'quest_vera',
    turnIn: 'quest_vera',
    requiredLevel: 2,
    requires: ['quest_supply_run'],
    objectives: [
      { type: 'kill_enemy', enemy: 'tin_badge', target: 5, current: 0 },
    ],
    rewards: { credits: 100, xp: 120, fuel: 10 },
    dialogue: {
      offer: [
        "Those Tin Badges — M.O.T.H.E.R.'s patrol drones — they been gettin' bolder.",
        "I need someone to take out 5 of 'em. Send a message.",
        "Think the Dustkicker's up for it?",
      ],
      inProgress: [
        "Still got Tin Badges buzzin' around. Keep at it.",
      ],
      complete: [
        "Five down! That'll make 'em think twice.",
        "Here's your pay — plus some fuel. You'll need it out there.",
      ],
    },
  },
  {
    id: 'quest_informant_lead',
    name: "Informant's Lead",
    description: "A mysterious contact wants you to scout nearby systems.",
    giver: 'info_whisper',
    turnIn: 'info_whisper',
    requiredLevel: 3,
    requires: [],
    objectives: [
      { type: 'visit_system', target: 3, current: 0 },
    ],
    rewards: { credits: 150, xp: 100 },
    dialogue: {
      offer: [
        "...I need eyes out there. M.O.T.H.E.R.'s movin' fast.",
        "Visit 3 different systems. See what you see. Report back.",
        "Don't ask why. Just... trust me on this one.",
      ],
      inProgress: [
        "...Still waitin'. Keep explorin'.",
      ],
      complete: [
        "Good. What you saw out there... it confirms what I feared.",
        "Here. You've earned more than credits, kid. You've earned a warning: watch your back.",
      ],
    },
  },
];

export function getQuest(id) {
  return QUESTS.find(q => q.id === id);
}

export function getAvailableQuests(completedIds, activeIds, playerLevel) {
  return QUESTS.filter(q => {
    if (completedIds.includes(q.id)) return false;
    if (activeIds.includes(q.id)) return false;
    if (playerLevel < q.requiredLevel) return false;
    if (q.requires.length > 0 && !q.requires.every(r => completedIds.includes(r))) return false;
    return true;
  });
}
