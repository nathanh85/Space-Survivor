// ============================================================
// Text Queue Manager — ensures only one text box at a time
// Priority: dialogue > transmission > bark
// ============================================================

const PRIORITY = { bark: 0, transmission: 1, dialogue: 2 };
const MIN_GAP = 2000; // 2 seconds between auto-triggered messages

export default class TextQueue {
  constructor() {
    this.active = null;       // { type, speaker, data, onShow, onDismiss }
    this.queue = [];
    this.lastFireTime = 0;
    this.onShowCallback = null;   // set by FlightScene
    this.onDismissCallback = null;
  }

  /**
   * Enqueue a text item.
   * @param {object} item - { type: 'bark'|'transmission'|'dialogue', speaker: string, data: any }
   */
  enqueue(item) {
    const itemPriority = PRIORITY[item.type] ?? 0;

    // Same-speaker suppression: replace active if same speaker
    if (this.active && this.active.speaker === item.speaker && this.active.type === item.type) {
      this.dismissActive();
      this.show(item);
      return;
    }

    // Dialogue bumps bark immediately
    if (itemPriority === PRIORITY.dialogue && this.active && this.active.type === 'bark') {
      this.dismissActive();
      this.show(item);
      return;
    }

    // If nothing active, check cadence then show
    if (!this.active) {
      const now = Date.now();
      if (item.type !== 'dialogue' && now - this.lastFireTime < MIN_GAP) {
        this.queue.push(item);
        return;
      }
      this.show(item);
      return;
    }

    // Something active — queue it (sorted by priority, FIFO within same priority)
    // Don't queue duplicate speakers of same type
    const isDupe = this.queue.some(q => q.speaker === item.speaker && q.type === item.type);
    if (!isDupe) {
      this.queue.push(item);
    }
  }

  show(item) {
    this.active = item;
    this.lastFireTime = Date.now();
    if (this.onShowCallback) this.onShowCallback(item);
  }

  /**
   * Call when the active text box is done (timed out, clicked through, etc.)
   */
  dismiss() {
    const was = this.active;
    this.active = null;
    if (was && this.onDismissCallback) this.onDismissCallback(was);

    // Fire next after short delay
    if (this.queue.length > 0) {
      // Sort by priority (highest first)
      this.queue.sort((a, b) => (PRIORITY[b.type] ?? 0) - (PRIORITY[a.type] ?? 0));
      const next = this.queue.shift();
      setTimeout(() => {
        if (!this.active) this.show(next);
        else this.queue.unshift(next); // put it back if something jumped in
      }, 300);
    }
  }

  /**
   * Force-dismiss the active item (for dialogue opening, etc.)
   */
  dismissActive() {
    if (this.active && this.onDismissCallback) {
      this.onDismissCallback(this.active);
    }
    this.active = null;
  }

  /**
   * Is something currently showing?
   */
  isActive() {
    return this.active !== null;
  }

  clear() {
    this.active = null;
    this.queue = [];
  }
}
