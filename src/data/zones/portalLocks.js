// Portal lock definitions — checked on every warp
// CONNECTION_LOCKS: block a specific A<->B connection
// DESTINATION_LOCKS: block ALL warps INTO a system

export const CONNECTION_LOCKS = {
  // Checkpoint -> Ambush Run (quest milestone: 3+ quests completed)
  'hex_4_-3|hex_4_-4': { locked: true, type: 'quest', condition: 'quest_milestone_3',
    bark: "Pepper: That gate's locked down. We need more experience before heading in there." },
  // Harlan's Reach -> Ashfall (beat Deputy Harlan)
  'hex_5_-1|hex_5_-2': { locked: true, type: 'boss', condition: 'boss_harlan',
    bark: "Pepper: M.O.T.H.E.R.'s Law has that gate sealed tight." },
  // Borderwatch -> Waypoint (Act 1->2 transition)
  'hex_-2_1|hex_-2_2': { locked: true, type: 'story', condition: 'act2_start',
    bark: "Pepper: That sector's locked down. We ain't ready for what's out there." },
  // Ironvale -> Cinder (mid-Act 2)
  'hex_-1_1|hex_-1_2': { locked: true, type: 'story', condition: 'act2_mid',
    bark: "Pepper: Something's blocking that gate. We need to find another way." },
  // Singularity -> Waypoint (beat Act 2 boss)
  'hex_-2_2|hex_-3_3': { locked: true, type: 'boss', condition: 'boss_judge',
    bark: "Pepper: That shortcut's sealed. Something powerful is holding it shut." },
  // Dawn -> Haven (Act 3 story trigger)
  'hex_-1_0|hex_-2_-1': { locked: true, type: 'story', condition: 'act3_start',
    bark: "Pepper: That portal's dormant. Maybe we can activate it later." },
};

export const DESTINATION_LOCKS = {
  // Cinder — locked until mid-Act 2
  'hex_-1_2': { locked: true, condition: 'act2_mid',
    bark: "Pepper: That whole sector's under M.O.T.H.E.R.'s lockdown." },
};

/**
 * Check if a warp between two systems is blocked.
 * @returns {object|null} — lock object if blocked, null if clear
 */
export function checkWarpLock(fromId, toId, gameState) {
  // Destination lock
  const destLock = DESTINATION_LOCKS[toId];
  if (destLock && destLock.locked && !isConditionMet(destLock.condition, gameState)) {
    return destLock;
  }

  // Connection lock
  const key = [fromId, toId].sort().join('|');
  const connLock = CONNECTION_LOCKS[key];
  if (connLock && connLock.locked) {
    if (connLock.type === 'oneway') {
      const actual = `${fromId}->${toId}`;
      if (actual !== connLock.direction) return connLock;
      return null;
    }
    if (!isConditionMet(connLock.condition, gameState)) {
      return connLock;
    }
  }

  return null;
}

function isConditionMet(condition, gameState) {
  if (!condition || !gameState) return false;
  if (condition === 'quest_milestone_3') {
    return (gameState.completedQuests || []).length >= 3;
  }
  // All other conditions stay locked until unlock system exists
  return false;
}
