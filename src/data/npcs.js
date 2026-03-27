export const NPCS = [
  {
    id: 'merchant_grix',
    name: 'Grix',
    type: 'merchant',
    portrait: 'grix',
    personality: 'Talks too fast, enthusiastic, slightly shady, heart of gold',
    dialogue: {
      greeting: "Well well WELL! If it ain't Paxton and Pepper! The Zion kids! In MY station!",
      browse: "Take a look around! All genuine parts, mostly not stolen! ...Don't check the serial numbers.",
      farewell: "Y'all come back now, hear? And bring credits next time!",
      noMoney: "Credits first, window shoppin' second. I got mouths to feed! ...Just mine, but still.",
      secondVisit: "You two again! Business must be boomin'. Or you're broke. Either way, welcome!",
    },
    inventory: ['iron', 'carbon', 'fuel', 'titanium'],
    priceModifier: 1.0,
  },
  {
    id: 'quest_vera',
    name: 'Commander Vera',
    type: 'quest_giver',
    portrait: 'vera',
    personality: 'Tired Outrider station commander, dry humor, seen too much',
    dialogue: {
      greeting: "Another ship. Great. At least you ain't shooting at us.",
      quest_offer: "Look kids, I got a job if you want it. M.O.T.H.E.R.'s drones been sniffin' around our supply routes. Nothing dangerous. ...Probably.",
      quest_complete: "You actually did it? Huh. Maybe there's hope for this dusty old galaxy after all.",
      farewell: "Try not to get processed out there. M.O.T.H.E.R. don't take kindly to folks like us.",
      about_outriders: "The Outriders? We're just folks who got tired of M.O.T.H.E.R. takin' everything. Some of us lost homes. Some lost family. All of us lost patience.",
    },
    quests: ['quest_patrol_1'],
  },
  {
    id: 'info_whisper',
    name: '???',
    type: 'informant',
    portrait: 'informant',
    personality: 'Mysterious, speaks in fragments, knows too much about M.O.T.H.E.R.',
    dialogue: {
      greeting: "...You're the Zion kids. The ones M.O.T.H.E.R.'s been lookin' for.",
      hint: "The Frontier ain't safe no more. M.O.T.H.E.R.'s movin' fast. Processin' everything.",
      hint2: "There's talk of somethin' in The Rift. Somethin' M.O.T.H.E.R. can't process. Somethin'... old.",
      about_factory: "43LL Sector. The Factory. That's where M.O.T.H.E.R. keeps the ones who fought back. Your folks included.",
      farewell: "Watch the dark between the stars, kids. M.O.T.H.E.R.'s always listenin'.",
    },
  },

  // H5: Refinery flavor NPC
  {
    id: 'refinery_worker',
    name: 'Refinery Worker',
    type: 'flavor',
    portrait: 'mechanic',
    personality: 'Tired, no-nonsense, covered in ore dust',
    dialogue: {
      greeting: "These ore processors haven't been calibrated in months. Don't touch anything.",
      line2: "Conversion bay's running hot today. Watch your hull near the exhaust vents.",
      line3: "We melt down what the miners bring in. Not glamorous, but it pays.",
    },
  },

  // H5: Outpost drifter flavor NPC
  {
    id: 'outpost_drifter',
    name: 'Drifter',
    type: 'flavor',
    portrait: 'smuggler',
    personality: 'Weathered, wary, seen too much',
    dialogue: {
      greeting: "Just passin' through? Smart. Don't stay too long.",
      line2: "Seen three ships blow past here last week. None of 'em came back.",
      line3: "Got a tip: avoid the Rift. Whatever M.O.T.H.E.R. is buildin' out there... it ain't for us.",
    },
  },

  // H5: Outpost settler flavor NPC
  {
    id: 'outpost_settler',
    name: 'Settler',
    type: 'flavor',
    portrait: 'miner',
    personality: 'Stubborn optimist clinging to life on the frontier',
    dialogue: {
      greeting: "We came out here for a fresh start. Some days I think we just found fresh trouble.",
      line2: "Nothin' to see here. Just rust and regret.",
      line3: "You kids be careful. M.O.T.H.E.R.'s eyes are everywhere now.",
    },
  },

  // H5: Outpost mechanic flavor NPC
  {
    id: 'outpost_mechanic',
    name: 'Mechanic',
    type: 'flavor',
    portrait: 'mechanic',
    personality: 'Practical, gruff, fiercely self-reliant',
    dialogue: {
      greeting: "Your ship looks like it's held together with prayers and carbon tape. Respect.",
      line2: "Need parts? I'm fresh out. Need advice? Same answer.",
      line3: "Out here, you learn to fix what you got. No supply runs for months at a stretch.",
    },
  },
];

export function getNPC(id) {
  return NPCS.find(n => n.id === id);
}

export function getNPCsByType(type) {
  return NPCS.filter(n => n.type === type);
}
