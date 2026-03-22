export const NPCS = [
  {
    id: 'merchant_grix',
    name: 'Grix',
    type: 'merchant',
    portrait: 'npc_merchant1',
    personality: 'Enthusiastic mechanic, talks too fast',
    dialogue: {
      greeting: "WELCOME! You two look like you need... basically everything.",
      browse: "Take a look! All genuine, mostly not stolen!",
      farewell: "Come back soon! Or don't! But do!",
      noMoney: "Credits first, window shopping second. I got bills!",
    },
    inventory: ['iron', 'carbon', 'fuel', 'titanium'],
    priceModifier: 1.0,
  },
  {
    id: 'quest_vera',
    name: 'Commander Vera',
    type: 'quest_giver',
    portrait: 'npc_quest1',
    personality: 'Tired station commander, seen too much',
    dialogue: {
      greeting: "Another ship. Great. At least you're not shooting at us.",
      quest_offer: "Look, I've got a job if you want it. Nothing dangerous. ...Probably.",
      quest_complete: "You actually did it? Huh. Maybe there's hope for the universe after all.",
      farewell: "Try to stay in one piece out there.",
    },
    quests: ['quest_patrol_1'],
  },
  {
    id: 'info_whisper',
    name: '???',
    type: 'informant',
    portrait: 'npc_informant',
    personality: 'Mysterious, speaks in fragments, knows too much',
    dialogue: {
      greeting: "...You're the ones they're looking for, aren't you?",
      hint: "The Frontier isn't safe anymore. Something's moving out there.",
      farewell: "Watch the dark between the stars.",
    },
  }
];

export function getNPC(id) {
  return NPCS.find(n => n.id === id);
}

export function getNPCsByType(type) {
  return NPCS.filter(n => n.type === type);
}
