// ============================================================
// Enemy Manager — spawning, tracking, AI updates, cleanup
// ============================================================

import Enemy from '../entities/Enemy.js';
import { TIN_BADGE, SPAWN_CONFIG, ENEMY_TYPE_MAP, pickRankForDanger } from '../data/enemies.js';

export default class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.enemyProjectiles = scene.physics.add.group();
    this.lastSpawnTime = 0;
    this.killCount = 0;
    this.totalKills = 0;    // kills THIS system (reset in clearAll)
    this.totalSpawned = 0;  // spawns THIS system (reset in clearAll)
  }

  update(time, delta, playerX, playerY, dangerRating) {
    // Update spawning
    this.updateSpawning(time, playerX, playerY, dangerRating);

    // Update all enemies
    for (const enemy of this.enemies) {
      if (enemy.alive) {
        enemy.update(time, delta, playerX, playerY, this.enemyProjectiles);
      }
    }

    // Cleanup dead/distant
    this.cleanup(playerX, playerY, delta);
  }

  updateSpawning(time, playerX, playerY, danger) {
    // Stop respawns if zone was cleared
    if (this.scene.systemCleared) return;

    // H2: Danger 1-2 → no spawns at all
    if (danger <= 2) return;

    const config = SPAWN_CONFIG[danger] || SPAWN_CONFIG[3];
    if (!config || config.max === 0) return;

    if (time - this.lastSpawnTime < config.interval) return;
    this.lastSpawnTime = time;

    const aliveCount = this.getEnemyCount();
    if (aliveCount >= config.max) return;

    // Spawn at 800-1200px from player, random angle
    const angle = Math.random() * Math.PI * 2;
    const dist = 800 + Math.random() * 400;
    const sx = playerX + Math.cos(angle) * dist;
    const sy = playerY + Math.sin(angle) * dist;

    // Bounds check
    if (sx < 100 || sx > 4700 || sy < 100 || sy > 3500) return;

    // v0.7.g.3: type from zone pool, danger-gated (stinger D4+, enforcer D5+).
    // Weighting via repetition: tin_badge x3, scout x2, stinger x2, enforcer x1.
    const zonePool = (this.scene.currentSystem && this.scene.currentSystem.zoneConfig
      && this.scene.currentSystem.zoneConfig.enemies
      && this.scene.currentSystem.zoneConfig.enemies.pool) || ['tin_badge'];
    const WEIGHTS = { tin_badge: 3, scout: 2, stinger: 2, enforcer: 1 };
    const MIN_DANGER = { stinger: 4, enforcer: 5 };
    const weighted = [];
    for (const id of zonePool) {
      if (!ENEMY_TYPE_MAP[id]) continue;
      if (MIN_DANGER[id] && danger < MIN_DANGER[id]) continue;
      for (let i = 0; i < (WEIGHTS[id] || 1); i++) weighted.push(id);
    }
    const typeId = weighted.length > 0
      ? weighted[Math.floor(Math.random() * weighted.length)] : 'tin_badge';
    const enemyType = ENEMY_TYPE_MAP[typeId] || TIN_BADGE;

    // v0.7.g.1: rank by danger (E3 weights)
    this.spawnEnemy(sx, sy, enemyType, pickRankForDanger(danger));
  }

  spawnEnemy(x, y, config, rank = null) {
    const enemy = new Enemy(this.scene, x, y, config, rank);
    this.enemies.push(enemy);
    this.totalSpawned++;
    return enemy;
  }

  handleEnemyDeath(enemy) {
    this.killCount++;
    this.totalKills++;
    enemy.alive = false;
  }

  isZoneCleared() {
    return this.totalSpawned > 0 && this.totalKills >= this.totalSpawned && this.getEnemyCount() === 0;
  }

  cleanup(playerX, playerY, delta) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Despawn enemies far from player for >10s
      // Do NOT count distant-despawned enemies as kills
      const dist = Math.hypot(e.x - playerX, e.y - playerY);
      if (dist > 2000) {
        e.distantTime += delta;
        if (e.distantTime > 10000) {
          e.destroy();
          this.enemies.splice(i, 1);
        }
      } else {
        e.distantTime = 0;
      }
    }
  }

  getEnemyCount() {
    return this.enemies.filter(e => e.alive).length;
  }

  getEnemyBodies() {
    return this.enemies.filter(e => e.alive).map(e => e.body);
  }

  findEnemyByBody(body) {
    return this.enemies.find(e => e.alive && e.body === body);
  }

  clearAll() {
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    // Clear enemy projectiles
    this.enemyProjectiles.clear(true, true);
    // Reset zone tracking counters
    this.totalKills = 0;
    this.totalSpawned = 0;
    // B22: Reset spawn timer so first spawn on new system entry is immediate
    this.lastSpawnTime = -99999;
  }
}
