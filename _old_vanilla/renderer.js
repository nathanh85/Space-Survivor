// ============================================================
// Renderer — system view, galaxy map, warp, HUD, minimap
// ============================================================

import { SYS_W, SYS_H, UNIVERSE_COLS, UNIVERSE_ROWS, REGIONS, DANGER_COLORS } from './core.js';
import { worldToScreen, isOnScreen } from './camera.js';
import { isPlayerMoving } from './player.js';
import { getParticles } from './particles.js';

// --- SYSTEM VIEW ---
export function renderSystem(ctx, system, player, camera, frame, W, H) {
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0, 0, W, H);

  drawBgStars(ctx, system.bgStars, camera, frame);
  drawStar(ctx, system.star, camera);
  drawAsteroids(ctx, system.asteroids, camera, frame, W, H);
  drawOrbitRings(ctx, system, camera);
  drawPlanets(ctx, system.planets, camera, W, H);
  drawStations(ctx, system.stations, camera, frame, W, H);
  drawWarpGates(ctx, system.gates, camera, frame, W, H);
  drawParticles(ctx, camera);
  drawPlayer(ctx, player, camera);
  drawCrosshair(ctx, player, camera);
}

function drawBgStars(ctx, stars, camera, frame) {
  // Deep parallax layer
  for (let i = 0; i < stars.length; i += 3) {
    const s = stars[i];
    ctx.globalAlpha = s.brightness * 0.3;
    ctx.fillStyle = '#aaccff';
    ctx.fillRect(s.x * 0.15 - camera.x * 0.15, s.y * 0.15 - camera.y * 0.15, 1, 1);
  }
  // Main layer
  for (const s of stars) {
    const twinkle = Math.sin(frame * s.twinkleSpeed) * 0.3 + 0.7;
    ctx.globalAlpha = s.brightness * twinkle;
    ctx.fillStyle = '#fff';
    ctx.fillRect(s.x * 0.4 - camera.x * 0.4, s.y * 0.4 - camera.y * 0.4, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function drawStar(ctx, star, camera) {
  const { x, y } = worldToScreen(star.x, star.y, camera);

  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, star.radius * 3);
  glow.addColorStop(0, star.color + '40');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(x - star.radius * 3, y - star.radius * 3, star.radius * 6, star.radius * 6);

  // Core
  const core = ctx.createRadialGradient(x, y, 0, x, y, star.radius);
  core.addColorStop(0, '#fff');
  core.addColorStop(0.3, star.color);
  core.addColorStop(1, star.color + '00');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(x, y, star.radius, 0, Math.PI * 2); ctx.fill();
}

function drawAsteroids(ctx, asteroids, camera, frame, W, H) {
  for (const a of asteroids) {
    if (!isOnScreen(a.x, a.y, camera, W, H, 20)) continue;
    const { x, y } = worldToScreen(a.x, a.y, camera);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a.rotation + frame * a.rotSpeed);
    ctx.fillStyle = a.color;
    ctx.fillRect(-a.size / 2, -a.size / 2, a.size, a.size * 0.8);
    ctx.restore();
  }
}

function drawOrbitRings(ctx, system, camera) {
  const { x: ox, y: oy } = worldToScreen(system.star.x, system.star.y, camera);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (const pl of system.planets) {
    ctx.beginPath();
    ctx.arc(ox, oy, pl.orbitDist, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlanets(ctx, planets, camera, W, H) {
  for (const pl of planets) {
    if (!isOnScreen(pl.x, pl.y, camera, W, H, 80)) continue;
    const { x, y } = worldToScreen(pl.x, pl.y, camera);

    // Planet body
    ctx.shadowBlur = 12;
    ctx.shadowColor = pl.type.color;
    ctx.fillStyle = pl.type.color;
    ctx.beginPath(); ctx.arc(x, y, pl.radius, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Shading
    const shade = ctx.createRadialGradient(x - pl.radius * 0.3, y - pl.radius * 0.3, 0, x, y, pl.radius);
    shade.addColorStop(0, 'rgba(255,255,255,0.2)');
    shade.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.arc(x, y, pl.radius, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pl.type.name, x, y + pl.radius + 13);
  }
}

function drawStations(ctx, stations, camera, frame, W, H) {
  for (const st of stations) {
    if (!isOnScreen(st.x, st.y, camera, W, H, 40)) continue;
    const { x, y } = worldToScreen(st.x, st.y, camera);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(frame * 0.005);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(-st.size / 2, -st.size / 2, st.size, st.size);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-st.size / 2 - 3, -st.size / 2 - 3, st.size + 6, st.size + 6);
    // Docking lights
    ctx.fillStyle = frame % 60 < 30 ? '#0f0' : '#060';
    ctx.fillRect(-st.size / 2 - 1, -2, 3, 4);
    ctx.fillRect(st.size / 2 - 2, -2, 3, 4);
    ctx.restore();

    ctx.fillStyle = '#00d4ff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(st.name, x, y + st.size + 12);
  }
}

function drawWarpGates(ctx, gates, camera, frame, W, H) {
  for (const g of gates) {
    if (!isOnScreen(g.x, g.y, camera, W, H, 40)) continue;
    const { x, y } = worldToScreen(g.x, g.y, camera);
    const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;
    const color = g.isDungeon ? '#ff00ff' : '#00d4ff';

    // Ring
    ctx.strokeStyle = color;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, g.size, 0, Math.PI * 2); ctx.stroke();

    // Inner glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, g.size);
    glow.addColorStop(0, color + '60');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, g.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Spinning bits
    for (let i = 0; i < 4; i++) {
      const a = frame * 0.03 + i * Math.PI / 2;
      ctx.fillStyle = color;
      ctx.fillRect(x + Math.cos(a) * g.size * 0.7 - 2, y + Math.sin(a) * g.size * 0.7 - 2, 4, 4);
    }

    // Label
    ctx.fillStyle = color;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.7;
    ctx.fillText(g.targetName + (g.isDungeon ? ' ⚠' : ''), x, y + g.size + 13);
    ctx.globalAlpha = 1;
  }
}

function drawParticles(ctx, camera) {
  for (const p of getParticles()) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    const s = p.size * p.life;
    ctx.fillRect(p.x - camera.x - s / 2, p.y - camera.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, player, camera) {
  const { x, y } = worldToScreen(player.x, player.y, camera);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle);

  // Engine glow when moving
  if (isPlayerMoving(player)) {
    ctx.fillStyle = 'rgba(0,180,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(-10, -6); ctx.lineTo(-22, 0); ctx.lineTo(-10, 6);
    ctx.fill();
  }

  // Hull
  ctx.fillStyle = '#ddd';  ctx.fillRect(-6, -5, 16, 10);
  // Nose
  ctx.fillStyle = '#00d4ff'; ctx.fillRect(10, -3, 6, 6);
  // Wings
  ctx.fillStyle = '#999'; ctx.fillRect(-4, -11, 10, 5); ctx.fillRect(-4, 6, 10, 5);
  // Wing tips
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(-4, -12, 3, 2); ctx.fillRect(-4, 10, 3, 2);
  // Engine block
  ctx.fillStyle = '#666'; ctx.fillRect(-10, -4, 5, 8);
  // Cockpit
  ctx.fillStyle = '#0af'; ctx.fillRect(4, -2, 4, 4);

  ctx.restore();
}

function drawCrosshair(ctx, player, camera) {
  const { x, y } = worldToScreen(player.x, player.y, camera);
  const dist = 40;
  const cx = x + Math.cos(player.angle) * dist;
  const cy = y + Math.sin(player.angle) * dist;

  ctx.strokeStyle = 'rgba(0,212,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy); ctx.lineTo(cx - 3, cy);
  ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 7, cy);
  ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy - 3);
  ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 7);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.stroke();
}

// --- HUD ---
export function renderHUD(ctx, player, systemData, W, H) {
  const bars = [
    { label: 'HULL', val: player.hull, max: player.maxHull, c1: '#e74c3c', c2: '#e67e22', lc: '#e74c3c' },
    { label: 'SHLD', val: player.shield, max: player.maxShield, c1: '#3498db', c2: '#00d4ff', lc: '#00d4ff' },
    { label: 'FUEL', val: player.fuel, max: player.maxFuel, c1: '#f39c12', c2: '#f1c40f', lc: '#f1c40f' },
    { label: 'LV' + player.level, val: player.xp, max: player.xpNext, c1: '#8e44ad', c2: '#bb6bd9', lc: '#bb6bd9' },
  ];

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const by = 12 + i * 18;
    ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = b.lc; ctx.fillText(b.label, 10, by + 9);

    const bx = 48, bw = 110, bh = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx, by + 1, bw, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(bx, by + 1, bw, bh);

    const fill = Math.max(0, b.val / b.max);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw * fill, 0);
    grad.addColorStop(0, b.c1); grad.addColorStop(1, b.c2);
    ctx.fillStyle = grad; ctx.fillRect(bx, by + 1, bw * fill, bh);

    ctx.fillStyle = '#888'; ctx.font = '9px monospace';
    ctx.fillText(Math.floor(b.val) + '/' + b.max, bx + bw + 6, by + 9);
  }

  // System info
  const iy = H - 58;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(8, iy - 4, 200, 52);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.strokeRect(8, iy - 4, 200, 52);
  ctx.font = '10px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = '#888'; ctx.fillText('System:', 14, iy + 8);
  ctx.fillStyle = '#00d4ff'; ctx.fillText(systemData.name, 70, iy + 8);
  ctx.fillStyle = '#888'; ctx.fillText('Region:', 14, iy + 22);
  ctx.fillStyle = systemData.region.color; ctx.fillText(systemData.region.name, 70, iy + 22);
  ctx.fillStyle = '#888'; ctx.fillText('Danger:', 14, iy + 36);
  ctx.fillStyle = DANGER_COLORS[systemData.danger] || '#e74c3c';
  ctx.fillText('⚠'.repeat(Math.min(systemData.danger, 10)) + ' ' + systemData.danger + '/10', 70, iy + 36);

  // Controls hint
  ctx.fillStyle = '#444'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
  ctx.fillText('[WASD] Move  [Mouse] Aim  [M] Map  [E] Warp', W - 14, H - 10);
}

// --- MINIMAP ---
export function renderMinimap(ctx, system, player, camera, W, H) {
  const mw = 160, mh = 120, mx = W - mw - 10, my = 10;
  const sx = mw / SYS_W, sy = mh / SYS_H;

  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(0,200,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(mx, my, mw, mh);

  // Star
  ctx.fillStyle = system.star.color;
  ctx.beginPath(); ctx.arc(mx + system.star.x * sx, my + system.star.y * sy, 2.5, 0, Math.PI * 2); ctx.fill();

  // Planets
  for (const p of system.planets) {
    ctx.fillStyle = p.type.color;
    ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Stations
  for (const s of system.stations) {
    ctx.fillStyle = '#fff'; ctx.fillRect(mx + s.x * sx - 1, my + s.y * sy - 1, 3, 3);
  }

  // Gates
  for (const g of system.gates) {
    ctx.fillStyle = g.isDungeon ? '#ff00ff' : '#00d4ff';
    ctx.beginPath(); ctx.arc(mx + g.x * sx, my + g.y * sy, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // Player
  ctx.fillStyle = '#0f0'; ctx.fillRect(mx + player.x * sx - 2, my + player.y * sy - 2, 4, 4);

  // Viewport indicator
  ctx.strokeStyle = 'rgba(0,255,0,0.2)';
  ctx.strokeRect(mx + camera.x * sx, my + camera.y * sy, W * sx, H * sy);
}

// --- WARP PROMPT ---
export function renderWarpPrompt(ctx, gate, frame, W, H) {
  if (!gate) return;
  const txt = '[E] WARP → ' + gate.targetName + (gate.isDungeon ? ' ⚠ DUNGEON' : '');
  ctx.font = '12px monospace'; ctx.textAlign = 'center';
  const tw = ctx.measureText(txt).width + 30;
  const bx = W / 2 - tw / 2, by = H - 80;
  const pulse = Math.sin(frame * 0.08) * 0.15 + 0.85;

  ctx.globalAlpha = pulse;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeStyle = gate.isDungeon ? '#ff00ff' : '#00d4ff';
  ctx.lineWidth = 1;
  ctx.fillRect(bx, by, tw, 28); ctx.strokeRect(bx, by, tw, 28);
  ctx.fillStyle = gate.isDungeon ? '#ff00ff' : '#00d4ff';
  ctx.fillText(txt, W / 2, by + 18);
  ctx.globalAlpha = 1;
}

// --- GALAXY MAP ---
export function renderGalaxyMap(ctx, universe, currentId, visited, fog, mapOffset, W, H) {
  ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
  ctx.fillText('⬡ GALACTIC CHART', W / 2, 24);
  ctx.fillStyle = '#555'; ctx.font = '9px monospace';
  ctx.fillText('[M] Close   [Click] Warp to adjacent   [Drag] Pan', W / 2, 40);

  const cw = 160, ch = 140;

  // Grid
  ctx.strokeStyle = 'rgba(0,200,255,0.03)'; ctx.lineWidth = 1;
  for (let c = 0; c <= UNIVERSE_COLS; c++) {
    const x = c * cw + mapOffset.x;
    ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let r = 0; r <= UNIVERSE_ROWS; r++) {
    const y = r * ch + mapOffset.y;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Connections
  for (const s of universe) {
    if (!fog.has(`${s.col}_${s.row}`)) continue;
    const sx = (s.col + 0.5) * cw + mapOffset.x;
    const sy = (s.row + 0.5) * ch + mapOffset.y;
    for (const cid of s.connections) {
      const o = universe.find(u => u.id === cid);
      if (!o || !fog.has(`${o.col}_${o.row}`)) continue;
      ctx.strokeStyle = 'rgba(0,200,255,0.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo((o.col + 0.5) * cw + mapOffset.x, (o.row + 0.5) * ch + mapOffset.y);
      ctx.stroke();
    }
  }

  // Systems
  for (const s of universe) {
    const sx = (s.col + 0.5) * cw + mapOffset.x;
    const sy = (s.row + 0.5) * ch + mapOffset.y;
    if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;

    if (!fog.has(`${s.col}_${s.row}`)) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    const isCur = s.id === currentId;
    const isVis = visited.has(s.id);

    if (isCur) { ctx.shadowBlur = 16; ctx.shadowColor = '#00d4ff'; }
    ctx.fillStyle = s.region.color;
    ctx.globalAlpha = isVis ? 1 : 0.45;
    ctx.beginPath(); ctx.arc(sx, sy, isCur ? 9 : 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    if (s.hasDungeon) {
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath(); ctx.arc(sx + 10, sy - 8, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    if (isCur) {
      ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, 13, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = isCur ? '#00d4ff' : isVis ? '#bbb' : '#555';
    ctx.font = (isCur ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(s.name, sx, sy + (isCur ? 9 : 6) + 13);

    // Danger pips
    ctx.fillStyle = DANGER_COLORS[s.danger] || '#e74c3c';
    ctx.font = '8px monospace';
    ctx.fillText('◆'.repeat(Math.min(s.danger, 5)), sx, sy + (isCur ? 9 : 6) + 24);
  }

  // Region labels
  ctx.globalAlpha = 0.15; ctx.font = '11px monospace'; ctx.textAlign = 'center';
  const rcx = UNIVERSE_COLS / 2 * cw + mapOffset.x;
  const rcy = UNIVERSE_ROWS / 2 * ch + mapOffset.y;
  ctx.fillStyle = REGIONS.CORE.color;  ctx.fillText('CORE WORLDS', rcx, rcy - 120);
  ctx.fillStyle = REGIONS.FRONT.color; ctx.fillText('FRONTIER', rcx + 280, rcy);
  ctx.fillStyle = REGIONS.OUTER.color; ctx.fillText('OUTER RIM', rcx - 300, rcy + 200);
  ctx.fillStyle = REGIONS.RIFT.color;  ctx.fillText('THE RIFT', rcx + 300, rcy + 280);
  ctx.globalAlpha = 1;
}

// --- WARP TRANSITION ---
export function renderWarpTransition(ctx, frame, warpTimer, targetName, W, H) {
  const prog = 1 - warpTimer / 90;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  // Streak stars
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * Math.max(W, H) * 0.6;
    const sx = W / 2 + Math.cos(a) * d;
    const sy = H / 2 + Math.sin(a) * d;
    const len = 20 + prog * 80;
    ctx.strokeStyle = `rgba(${150 + Math.random() * 105},${200 + Math.random() * 55},255,${0.3 + Math.random() * 0.5})`;
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    ctx.stroke();
  }

  // Text
  if (Math.sin(frame * 0.15) > 0) {
    ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
    ctx.fillText('W A R P I N G', W / 2, H / 2);
  }
  if (targetName) {
    ctx.fillStyle = '#0af'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('→ ' + targetName, W / 2, H / 2 + 24);
  }
}
