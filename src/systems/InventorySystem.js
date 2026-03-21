// ============================================================
// Inventory System — grid-based inventory with stacking
// ============================================================

import { RESOURCES } from '../data/resources.js';

const MAX_SLOTS = 30; // 6 columns x 5 rows

export default class InventorySystem {
  constructor() {
    // Each slot: { resourceId: string, count: number } or null
    this.slots = new Array(MAX_SLOTS).fill(null);
    this.maxSlots = MAX_SLOTS;
  }

  // Add items to inventory. Returns amount actually added.
  addItem(resourceId, amount = 1) {
    const res = RESOURCES[resourceId];
    if (!res) return 0;

    let remaining = amount;

    // First try to stack onto existing slots
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.resourceId === resourceId) {
        const canAdd = Math.min(remaining, res.maxStack - slot.count);
        if (canAdd > 0) {
          slot.count += canAdd;
          remaining -= canAdd;
        }
      }
    }

    // Then try empty slots
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      if (!this.slots[i]) {
        const canAdd = Math.min(remaining, res.maxStack);
        this.slots[i] = { resourceId, count: canAdd };
        remaining -= canAdd;
      }
    }

    return amount - remaining;
  }

  // Remove items. Returns amount actually removed.
  removeItem(resourceId, amount = 1) {
    let remaining = amount;

    // Remove from last slots first (preserve order)
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      if (slot && slot.resourceId === resourceId) {
        const canRemove = Math.min(remaining, slot.count);
        slot.count -= canRemove;
        remaining -= canRemove;
        if (slot.count <= 0) {
          this.slots[i] = null;
        }
      }
    }

    return amount - remaining;
  }

  // Count total of a resource
  countItem(resourceId) {
    let total = 0;
    for (const slot of this.slots) {
      if (slot && slot.resourceId === resourceId) {
        total += slot.count;
      }
    }
    return total;
  }

  // Get total items across all slots
  getTotalItems() {
    let total = 0;
    for (const slot of this.slots) {
      if (slot) total += slot.count;
    }
    return total;
  }

  // Get count of used slots
  getUsedSlots() {
    return this.slots.filter(s => s !== null).length;
  }

  // Check if inventory is full (no empty slots and all stacks full)
  isFull() {
    for (const slot of this.slots) {
      if (!slot) return false;
      const res = RESOURCES[slot.resourceId];
      if (res && slot.count < res.maxStack) return false;
    }
    return true;
  }
}
