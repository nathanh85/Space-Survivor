// ============================================================
// Input Manager — keyboard, mouse, and click tracking
// ============================================================

export class Input {
  constructor(canvas) {
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.click = false;
    this.clickConsumed = false;
    this._bindings = [];

    window.addEventListener('keydown', e => {
      this.keys[e.key.toLowerCase()] = true;
      for (const b of this._bindings) {
        if (b.key === e.key.toLowerCase()) b.fn();
      }
      // Prevent scrolling with arrow keys / space
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    canvas.addEventListener('mousedown', e => {
      this.click = true;
      this.clickConsumed = false;
      this.clickX = e.clientX;
      this.clickY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
      this.click = false;
    });
  }

  /** Register a key press callback (fires once on keydown) */
  onKey(key, fn) {
    this._bindings.push({ key: key.toLowerCase(), fn });
  }

  /** Check if a movement direction is active */
  movingUp()    { return this.keys['w'] || this.keys['arrowup']; }
  movingDown()  { return this.keys['s'] || this.keys['arrowdown']; }
  movingLeft()  { return this.keys['a'] || this.keys['arrowleft']; }
  movingRight() { return this.keys['d'] || this.keys['arrowright']; }

  /** Get normalized movement vector */
  getMoveVector() {
    let ax = 0, ay = 0;
    if (this.movingUp())    ay = -1;
    if (this.movingDown())  ay = 1;
    if (this.movingLeft())  ax = -1;
    if (this.movingRight()) ax = 1;
    if (ax && ay) {
      const len = Math.SQRT2;
      ax /= len;
      ay /= len;
    }
    return { x: ax, y: ay };
  }

  /** Consume a click (so it only fires once) */
  consumeClick() {
    this.clickConsumed = true;
  }
}
