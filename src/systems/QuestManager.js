// ============================================================
// Quest Manager — tracks active quests, progress, turn-in
// ============================================================

import { getQuest, getAvailableQuests } from '../data/quests.js';

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default class QuestManager {
  constructor() {
    this.activeQuests = [];   // deep copies of quest data with mutable objective.current
    this.completedQuests = []; // array of quest IDs
  }

  // B25: inventory is optional; if provided, pre-fills collect objectives from current stock
  acceptQuest(questId, inventory = null) {
    const template = getQuest(questId);
    if (!template) return false;
    if (this.activeQuests.some(q => q.id === questId)) return false;
    if (this.completedQuests.includes(questId)) return false;
    const quest = deepCopy(template);

    if (inventory) {
      for (const obj of quest.objectives) {
        if (obj.type === 'collect_resource') {
          const have = inventory.countItem(obj.resource);
          obj.current = Math.min(obj.target, have);
        }
      }
    }

    this.activeQuests.push(quest);
    return true;
  }

  /**
   * Update progress on active quests.
   * @param {string} eventType — 'collect_resource', 'kill_enemy', 'visit_system'
   * @param {object} eventData — { resource, amount } | { enemy } | {}
   * @returns {Array} list of quest IDs that became complete
   */
  updateProgress(eventType, eventData) {
    const newlyComplete = [];
    for (const quest of this.activeQuests) {
      let changed = false;
      for (const obj of quest.objectives) {
        if (obj.current >= obj.target) continue;
        if (eventType === 'collect_resource' && obj.type === 'collect_resource') {
          if (obj.resource === eventData.resource) {
            obj.current = Math.min(obj.target, obj.current + (eventData.amount || 1));
            changed = true;
          }
        } else if (eventType === 'kill_enemy' && obj.type === 'kill_enemy') {
          if (!obj.enemy || obj.enemy === eventData.enemy) {
            obj.current = Math.min(obj.target, obj.current + 1);
            changed = true;
          }
        } else if (eventType === 'visit_system' && obj.type === 'visit_system') {
          obj.current = Math.min(obj.target, obj.current + 1);
          changed = true;
        }
      }
      if (changed && this.isQuestComplete(quest.id)) {
        newlyComplete.push(quest.id);
      }
    }
    return newlyComplete;
  }

  isQuestComplete(questId) {
    const quest = this.activeQuests.find(q => q.id === questId);
    if (!quest) return false;
    return quest.objectives.every(o => o.current >= o.target);
  }

  /**
   * Turn in a completed quest. For collect quests, removes resources from inventory.
   * Moves quest to completed. Returns rewards object.
   */
  turnInQuest(questId, inventory) {
    const quest = this.activeQuests.find(q => q.id === questId);
    if (!quest) return null;
    if (!this.isQuestComplete(questId)) return null;

    // Remove collected resources from inventory for collect objectives
    for (const obj of quest.objectives) {
      if (obj.type === 'collect_resource' && inventory) {
        inventory.removeItem(obj.resource, obj.target);
      }
    }

    // Move to completed
    this.activeQuests = this.activeQuests.filter(q => q.id !== questId);
    this.completedQuests.push(questId);

    return quest.rewards;
  }

  getActiveQuestForNPC(npcId) {
    return this.activeQuests.find(q => q.turnIn === npcId);
  }

  getAvailableQuestForNPC(npcId, playerLevel) {
    const available = getAvailableQuests(
      this.completedQuests,
      this.activeQuests.map(q => q.id),
      playerLevel
    );
    return available.find(q => q.giver === npcId);
  }

  serialize() {
    return {
      activeQuests: deepCopy(this.activeQuests),
      completedQuests: [...this.completedQuests],
    };
  }

  deserialize(data) {
    if (!data) return;
    this.activeQuests = data.activeQuests || [];
    this.completedQuests = data.completedQuests || [];
  }
}
