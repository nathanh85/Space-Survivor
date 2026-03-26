// ============================================================
// Save Manager — localStorage save/load for P.E.S.T.S.
// ============================================================

const SAVE_KEY = 'pests_save_v1';

const SaveManager = {
  save(gameState) {
    try {
      const data = JSON.stringify(gameState);
      localStorage.setItem(SAVE_KEY, data);
      return true;
    } catch (e) {
      console.error('[SaveManager] save failed:', e);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[SaveManager] load failed:', e);
      return null;
    }
  },

  hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  },

  deleteSave() {
    localStorage.removeItem(SAVE_KEY);
  },

  exportSave() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dustkicker_save.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importSave(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          // Basic validation
          if (!data.version || !data.player || !data.universe) {
            reject(new Error('Invalid save file format'));
            return;
          }
          localStorage.setItem(SAVE_KEY, JSON.stringify(data));
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
};

export default SaveManager;
