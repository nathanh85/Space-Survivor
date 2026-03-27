// ============================================================
// Text Queue Manager — ensures only one text box at a time
// v0.6.1: 4-tier priority, max 3 queue, higher cancels lower
// ============================================================

const PRIORITY = {
  bark: 0,           // combat/system barks (lowest)
  flavor: 1,         // Pepper/Pax flavor, idle barks
  transmission: 2,   // M.O.T.H.E.R. transmissions
  dialogue: 3,       // NPC/helper barks, quest dialogue (highest)
};
const MAX_QUEUE = 3;
const MIN_GAP = 1500; // 1.5s minimum between bark end and next bark start
const DISMISS_DELAY = 500;

export default class TextQueue {
  constructor() {
    this.active = null;
    this.queue = [];
    this.lastFireTime = 0;
    this.onShowCallback = null;
    this.onDismissCallback = null;
    this._dismissTimeout = null;
  }

  _getPriority(item) {
    return PRIORITY[item.type] ?? PRIORITY[item.priority] ?? 0;
  }

  enqueue(item) {
    const itemPri = this._getPriority(item);

    // Same-speaker suppression: replace active if same speaker+type
    if (this.active && this.active.speaker === item.speaker && this.active.type === item.type) {
      this.dismissActive();
      this.show(item);
      return;
    }

    // Higher priority cancels lower priority active item
    if (this.active) {
      const activePri = this._getPriority(this.active);
      if (itemPri > activePri) {
        this.dismissActive();
        this.show(item);
        return;
      }
    }

    // If nothing active, check cadence then show
    if (!this.active) {
      const now = Date.now();
      if (itemPri < PRIORITY.dialogue && now - this.lastFireTime < MIN_GAP) {
        this._addToQueue(item);
        return;
      }
      this.show(item);
      return;
    }

    // Something active — add to queue
    this._addToQueue(item);
  }

  _addToQueue(item) {
    // Don't queue duplicate speakers of same type
    const isDupe = this.queue.some(q => q.speaker === item.speaker && q.type === item.type);
    if (isDupe) return;

    this.queue.push(item);

    // Enforce max queue: drop lowest priority if over limit
    if (this.queue.length > MAX_QUEUE) {
      this.queue.sort((a, b) => this._getPriority(b) - this._getPriority(a));
      this.queue.pop(); // drop lowest priority (last after sort)
    }
  }

  show(item) {
    this.active = item;
    this.lastFireTime = Date.now();
    if (this.onShowCallback) this.onShowCallback(item);
  }

  hasPending() {
    return this.queue.length > 0;
  }

  getBarkHoldTime() {
    if (this.queue.length > 0 && this.queue[0].type === 'bark') {
      return 3000;
    }
    return 6000;
  }

  dismiss() {
    const was = this.active;
    this.active = null;
    if (was && this.onDismissCallback) this.onDismissCallback(was);

    if (this._dismissTimeout) {
      clearTimeout(this._dismissTimeout);
      this._dismissTimeout = null;
    }

    if (this.queue.length > 0) {
      this.queue.sort((a, b) => this._getPriority(b) - this._getPriority(a));
      const next = this.queue.shift();
      const delay = (was && was.type === 'bark' && next.type === 'bark') ? DISMISS_DELAY : 300;
      this._dismissTimeout = setTimeout(() => {
        this._dismissTimeout = null;
        if (!this.active) this.show(next);
        else this.queue.unshift(next);
      }, delay);
    }
  }

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
