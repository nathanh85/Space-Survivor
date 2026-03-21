// ============================================================
// Particle System — engine exhaust, explosions, effects
// ============================================================

const particles = [];
const MAX_PARTICLES = 300;

export function spawnParticle(x, y, vx, vy, color, life = 1, size = 2) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({
    x, y, vx, vy, color, size,
    life,
    decay: 0.03 + Math.random() * 0.02,
  });
}

export function spawnEngineTrail(px, py, angle) {
  for (let i = 0; i < 2; i++) {
    spawnParticle(
      px - Math.cos(angle) * 14 + (Math.random() - 0.5) * 6,
      py - Math.sin(angle) * 14 + (Math.random() - 0.5) * 6,
      -Math.cos(angle) * (1 + Math.random()) + (Math.random() - 0.5) * 0.5,
      -Math.sin(angle) * (1 + Math.random()) + (Math.random() - 0.5) * 0.5,
      Math.random() > 0.5 ? '#00d4ff' : '#0af',
      1,
      Math.random() * 2 + 1
    );
  }
}

export function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function getParticles() {
  return particles;
}
