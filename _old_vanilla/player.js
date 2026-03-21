// ============================================================
// Player — state, movement, physics
// ============================================================

import { SYS_W, SYS_H, PLAYER_DEFAULTS } from './core.js';

export function createPlayer() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,

    // Stats
    hull: PLAYER_DEFAULTS.hull,
    maxHull: PLAYER_DEFAULTS.hull,
    shield: PLAYER_DEFAULTS.shield,
    maxShield: PLAYER_DEFAULTS.shield,
    fuel: PLAYER_DEFAULTS.fuel,
    maxFuel: PLAYER_DEFAULTS.fuel,

    // Progression
    xp: 0,
    xpNext: PLAYER_DEFAULTS.xpNext,
    level: 1,
    credits: 500,

    // Physics tuning
    speed: PLAYER_DEFAULTS.speed,
    drag: PLAYER_DEFAULTS.drag,
    accel: PLAYER_DEFAULTS.accel,
    turnSmooth: PLAYER_DEFAULTS.turnSmooth,
  };
}

export function updatePlayer(player, input, camera, W, H) {
  // Movement input
  const move = input.getMoveVector();
  player.vx += move.x * player.accel;
  player.vy += move.y * player.accel;

  // Drag
  player.vx *= player.drag;
  player.vy *= player.drag;

  // Speed cap
  const spd = Math.sqrt(player.vx ** 2 + player.vy ** 2);
  if (spd > player.speed) {
    player.vx = (player.vx / spd) * player.speed;
    player.vy = (player.vy / spd) * player.speed;
  }

  // Position
  player.x += player.vx;
  player.y += player.vy;

  // Clamp to system bounds
  player.x = Math.max(30, Math.min(SYS_W - 30, player.x));
  player.y = Math.max(30, Math.min(SYS_H - 30, player.y));

  // Aim toward mouse
  const screenX = player.x - camera.x;
  const screenY = player.y - camera.y;
  const targetAngle = Math.atan2(input.mouse.y - screenY, input.mouse.x - screenX);
  let angleDiff = targetAngle - player.angle;
  while (angleDiff > Math.PI)  angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  player.angle += angleDiff * player.turnSmooth;

  // Shield regen
  if (player.shield < player.maxShield) {
    player.shield = Math.min(player.maxShield, player.shield + 0.015);
  }
}

export function isPlayerMoving(player) {
  return Math.abs(player.vx) > 0.3 || Math.abs(player.vy) > 0.3;
}
