// Entity configs — Station types
export const STATION_CONFIGS = {
  hub:      { id: 'hub',      name: 'Hub',          services: ['quest_board', 'crafting', 'save', 'trade'], size: 30 },
  trading:  { id: 'trading',  name: 'Trading Post', services: ['trade', 'save'], size: 24 },
  refinery: { id: 'refinery', name: 'Refinery',     services: ['refine', 'save'], size: 22 },
  outpost:  { id: 'outpost',  name: 'Outpost',      services: ['save'], size: 18 },
};
