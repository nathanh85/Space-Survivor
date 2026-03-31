// ============================================================
// Enemy Manager — spawning, tracking, AI updates, cleanup
// ============================================================

import Enemy from '../entities/Enemy.js';
import { TIN_BADGE, SCOUT, SPAWN_CONFIG } from '../data/enemies.js';

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

    // H2: Enemy type selection by danger level
    let enemyType = TIN_BADGE;
    if (danger >= 5 && danger <= 6) {
      // 25% chance of Scout, 75% Tin Badge
      enemyType = (Math.random() < 0.25 && SCOUT) ? SCOUT : TIN_BADGE;
    } else if (danger >= 7 && danger <= 8) {
      // 50/50 mixed
      enemyType = (Math.random() < 0.5 && SCOUT) ? SCOUT : TIN_BADGE;
    } else if (danger >= 9) {
      // 60% Scout, 40% Tin Badge
      enemyType = (Math.random() < 0.6 && SCOUT) ? SCOUT : TIN_BADGE;
    }

    this.spawnEnemy(sx, sy, enemyType);
  }

  spawnEnemy(x, y, config) {
    const enemy = new Enemy(this.scene, x, y, config);
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
