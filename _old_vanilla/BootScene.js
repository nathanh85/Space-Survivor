// ============================================================
// Boot Scene — initialization and loading
// ============================================================

import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    console.log('[BootScene] create() called');

    // Write to DOM to verify
    const d = document.createElement('div');
    d.id = 'boot-debug';
    d.style.cssText = 'position:fixed;top:0;left:0;color:lime;font:14px monospace;z-index:99999;background:rgba(0,0,0,0.9);padding:10px;white-space:pre;';
    d.textContent = '[BootScene] Starting...\n';
    document.body.appendChild(d);

    try {
      // Check if FlightScene exists in the scene manager
      const fs = this.scene.get('FlightScene');
      d.textContent += '[BootScene] FlightScene exists: ' + !!fs + '\n';
      if (fs) {
        d.textContent += '[BootScene] FlightScene type: ' + fs.constructor.name + '\n';
      }

      // List all scene keys
      const keys = Object.keys(this.scene.manager.keys);
      d.textContent += '[BootScene] Scene keys: ' + keys.join(', ') + '\n';

      this.scene.start('FlightScene');
      d.textContent += '[BootScene] scene.start called OK\n';

      // Check scene status after start
      this.time.delayedCall(100, () => {
        const fs2 = this.scene.get('FlightScene');
        d.textContent += '[After 100ms] FlightScene active: ' + fs2?.sys?.settings?.active + '\n';
        d.textContent += '[After 100ms] FlightScene status: ' + fs2?.sys?.settings?.status + '\n';
      });
    } catch(e) {
      d.textContent += '[BootScene] ERROR: ' + e.message + '\n' + e.stack;
    }
  }
}
