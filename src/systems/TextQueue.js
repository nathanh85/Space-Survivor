// ============================================================
// Text Queue Manager — ensures only one text box at a time
// Priority: dialogue > transmission > bark
// v0.6.0: chain pacing — 500ms gap between barks, shorter hold in chains
// ============================================================

const PRIORITY = { bark: 0, transmission: 1, dialogue: 2 };
const MIN_GAP = 5000; // 5 seconds between auto-triggered messages
const DISMISS_DELAY = 500; // 500ms gap between chained barks

export default class TextQueue {
  constructor() {
    this.active = null;       // { type, speaker, data, onShow, onDismiss }
    this.queue = [];
    this.lastFireTime = 0;
    this.onShowCallback = null;   // set by FlightScene
    this.onDismissCallback = null;
    this._dismissTimeout = null;
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
   * Check if there are pending items in the queue.
   */
  hasPending() {
    return this.queue.length > 0;
  }

  /**
   * Get the hold time for the current bark.
   * If next item is also a bark (chain), use shorter 3s hold.
   * Otherwise use standard 6s hold.
   */
  getBarkHoldTime() {
    if (this.queue.length > 0 && this.queue[0].type === 'bark') {
      return 3000; // chained bark — shorter hold
    }
    return 6000; // standalone bark — full hold
  }

  /**
   * Call when the active text box is done (timed out, clicked through, etc.)
   */
  dismiss() {
    const was = this.active;
    this.active = null;
    if (was && this.onDismissCallback) this.onDismissCallback(was);

    // Clear any pending dismiss timeout
    if (this._dismissTimeout) {
      clearTimeout(this._dismissTimeout);
      this._dismissTimeout = null;
    }

    // Fire next after dismiss delay
    if (this.queue.length > 0) {
      // Sort by priority (highest first)
      this.queue.sort((a, b) => (PRIORITY[b.type] ?? 0) - (PRIORITY[a.type] ?? 0));
      const next = this.queue.shift();

      // Apply 500ms gap when next item is a bark (chain pacing)
      const delay = (was && was.type === 'bark' && next.type === 'bark') ? DISMISS_DELAY : 300;
      this._dismissTimeout = setTimeout(() => {
        this._dismissTimeout = null;
        if (!this.active) this.show(next);
        else this.queue.unshift(next); // put it back if something jumped in
      }, delay);
    }
  }

  /**
   * Force-dismiss the active item (for dialogue opening, etc.)
   */
  dismissActive() {
    if (this._dismissTimeout) {
      clearTimeout(this._dismissTimeout);
      this._dismissTimeout = null;
    }
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
    if (this._dismissTimeout) {
      clearTimeout(this._dismissTimeout);
      this._dismissTimeout = null;
    }
    this.active = null;
    this.queue = [];
  }
}
