// ============================================================
// Quest Definitions — P.E.S.T.S. v0.7.d (8 Act 1 quests)
// ============================================================

export const QUESTS = [
  // Quest 1: Supply Run (unchanged)
  {
    id: 'quest_supply_run',
    name: 'Supply Run',
    description: "Vera needs iron and carbon to keep the Outpost running.",
    giver: 'quest_vera', turnIn: 'quest_vera',
    requiredLevel: 1, requires: [],
    objectives: [
      { type: 'collect_resource', resource: 'iron', target: 8, current: 0 },
      { type: 'collect_resource', resource: 'carbon', target: 4, current: 0 },
    ],
    rewards: { credits: 50, xp: 75 },
    dialogue: {
      offer: ["Look kids, the Outpost's runnin' low on supplies.", "I need 8 Iron Ore and 4 Carbon. Think you can scrounge some up?"],
      inProgress: ["Still workin' on those supplies? We're countin' on you."],
      complete: ["You actually pulled it off!", "Here \u2014 you earned this."],
    },
  },

  // Quest 2: Find Grix (NEW — teaches warp + trade)
  {
    id: 'quest_find_grix',
    name: 'Find Grix',
    description: "Vera wants you to deliver supplies to a trader named Grix.",
    giver: 'quest_vera', turnIn: 'merchant_grix',
    requiredLevel: 1, requires: ['quest_supply_run'],
    objectives: [
      { type: 'visit_npc', npc: 'merchant_grix', target: 1, current: 0 },
    ],
    rewards: { credits: 75, xp: 50 },
    dialogue: {
      offer: ["There's a trader named Grix out at Grix Station.", "Take these supplies to him. And look around \u2014 never hurts to know your neighbors."],
      inProgress: ["Find Grix \u2014 he's at the trading post."],
      complete: ["Delivery received! Grix is pleased."],
    },
  },

  // Quest 3: Pest Control (giver changed to Grix)
  {
    id: 'quest_pest_control',
    name: 'Pest Control',
    description: "Tin Badges are sniffing around. Time to thin the herd.",
    giver: 'merchant_grix', turnIn: 'merchant_grix',
    requiredLevel: 2, requires: ['quest_find_grix'],
    objectives: [
      { type: 'kill_enemy', enemy: 'tin_badge', target: 5, current: 0 },
    ],
    rewards: { credits: 100, xp: 120, fuel: 10 },
    dialogue: {
      offer: ["Tin Badges been sniffin' around out past Farpoint.", "Do me a favor and thin the herd. Five oughta send a message."],
      inProgress: ["Still got Tin Badges buzzin' around. Keep at it."],
      complete: ["Five down! That'll make 'em think twice.", "Here's your pay \u2014 plus some fuel."],
    },
  },

  // Quest 4: Outrider Contact (NEW)
  {
    id: 'quest_outrider_contact',
    name: 'Outrider Contact',
    description: "The Outriders have reached out. Explore the Frontier to find them.",
    giver: 'auto', turnIn: 'auto',
    requiredLevel: 2, requires: ['quest_pest_control'],
    objectives: [
      { type: 'visit_system', target: 3, current: 0 },
    ],
    rewards: { credits: 100, xp: 100 },
    dialogue: {
      offer: ["A mysterious signal... the Outriders want to meet."],
      inProgress: ["Keep exploring. The Outriders are out there."],
      complete: ["Contact established. The Outriders know who you are now."],
    },
  },

  // Quest 5: The Heist (NEW — placeholder)
  {
    id: 'quest_the_heist',
    name: 'The Heist',
    description: "The Outriders need something from the Scrapyard.",
    giver: 'auto', turnIn: 'auto',
    requiredLevel: 3, requires: ['quest_outrider_contact'],
    objectives: [
      { type: 'visit_system_specific', system: 'Scrapyard', target: 1, current: 0 },
    ],
    rewards: { credits: 150, xp: 150 },
    dialogue: {
      offer: ["There's a shipment in the Scrapyard. M.O.T.H.E.R. won't miss it... probably."],
      inProgress: ["Get to the Scrapyard and grab that shipment."],
      complete: ["Got it! The Outriders owe you one."],
    },
  },

  // Quest 6: Meet the Informant (NEW)
  {
    id: 'quest_meet_informant',
    name: 'Meet the Informant',
    description: "Someone at Signal Peak knows about your parents.",
    giver: 'auto', turnIn: 'auto',
    requiredLevel: 3, requires: ['quest_the_heist'],
    objectives: [
      { type: 'visit_system_specific', system: 'Signal Peak', target: 1, current: 0 },
    ],
    rewards: { credits: 150, xp: 100 },
    dialogue: {
      offer: ["Word is there's someone at Signal Peak who knows about The Factory."],
      inProgress: ["Find the informant at Signal Peak."],
      complete: ["43LL Sector. The Factory. That's where M.O.T.H.E.R. keeps the ones who fought back."],
    },
  },

  // Quest 7: Radio Booster (NEW — fetch in dangerous territory)
  {
    id: 'quest_radio_booster',
    name: 'Radio Booster',
    description: "Boost the signal past M.O.T.H.E.R.'s jammers.",
    giver: 'auto', turnIn: 'auto',
    requiredLevel: 4, requires: ['quest_meet_informant'],
    objectives: [
      { type: 'collect_resource', resource: 'titanium', target: 5, current: 0 },
      { type: 'collect_resource', resource: 'cryo', target: 5, current: 0 },
    ],
    rewards: { credits: 200, xp: 200 },
    dialogue: {
      offer: ["I need Titanium and Cryo Crystals to build a signal booster. Dangerous territory."],
      inProgress: ["Still need those materials. The Frontier's your best bet."],
      complete: ["Good. With this we can reach people M.O.T.H.E.R. thought she'd silenced."],
    },
  },

  // Quest 8: Deputy Harlan (NEW — boss fight placeholder)
  {
    id: 'quest_deputy_harlan',
    name: 'Deputy Harlan',
    description: "M.O.T.H.E.R.'s enforcer is waiting. Time for a reckoning.",
    giver: 'auto', turnIn: 'auto',
    requiredLevel: 5, requires: ['quest_radio_booster'],
    objectives: [
      { type: 'visit_system_specific', system: "Harlan's Reach", target: 1, current: 0 },
    ],
    rewards: { credits: 500, xp: 500 },
    dialogue: {
      offer: ["Deputy Harlan's at Harlan's Reach. He's the one standing between us and the Outer Rim."],
      inProgress: ["Harlan's waiting. Head to Harlan's Reach."],
      complete: ["Harlan's down. The gate to the Outer Rim is open."],
    },
  },

  // Side quest: Informant's Lead (unchanged, no prerequisite)
  {
    id: 'quest_informant_lead',
    name: "Informant's Lead",
    description: "A mysterious contact wants you to scout nearby systems.",
    giver: 'info_whisper', turnIn: 'info_whisper',
    requiredLevel: 3, requires: [],
    objectives: [
      { type: 'visit_system', target: 3, current: 0 },
    ],
    rewards: { credits: 150, xp: 100 },
    dialogue: {
      offer: ["I need eyes out there. Visit 3 different systems."],
      inProgress: ["Still waitin'. Keep explorin'."],
      complete: ["Good. What you saw confirms what I feared."],
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
