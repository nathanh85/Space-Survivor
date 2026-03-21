// ============================================================
// Camera — smooth follow, screen-to-world conversion
// ============================================================

export function createCamera() {
  return { x: 0, y: 0 };
}

export function updateCamera(camera, targetX, targetY, screenW, screenH, smoothing = 0.08) {
  camera.x += (targetX - screenW / 2 - camera.x) * smoothing;
  camera.y += (targetY - screenH / 2 - camera.y) * smoothing;
}

export function worldToScreen(wx, wy, camera) {
  return { x: wx - camera.x, y: wy - camera.y };
}

export function isOnScreen(wx, wy, camera, screenW, screenH, margin = 60) {
  const sx = wx - camera.x;
  const sy = wy - camera.y;
  return sx > -margin && sx < screenW + margin && sy > -margin && sy < screenH + margin;
}
