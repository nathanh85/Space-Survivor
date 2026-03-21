// ============================================================
// Resource System — node spawning, mining, drops
// ============================================================

import Phaser from 'phaser';
import { RESOURCES, getAvailableResources } from '../data/resources.js';
import { RNG } from '../config/constants.js';

export default class ResourceSystem {
  constructor(scene) {
    this.scene = scene;
  }

  // Assign resources to asteroids based on system region and nearby planets
  assignResources(asteroids, systemData, planets) {
    const rng = new RNG(systemData.seed + 7777);
    const regionKey = systemData.region.key;

    for (const asteroid of asteroids) {
      // Find nearest planet to determine resource type
      let nearestPlanet = planets[0];
      let nearestDist = Infinity;
      for (const planet of planets) {
        const dist = Phaser.Math.Distance.Between(
          asteroid.x, asteroid.y,
          planet.x, planet.y
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestPlanet = planet;
        }
      }

      const available = getAvailableResources(nearestPlanet.planetType, regionKey);
      if (available.length > 0) {
        asteroid.resourceId = rng.pick(available).id;
      }

      // Mining time varies: bigger asteroids take longer, rarer resources take longer
      const res = RESOURCES[asteroid.resourceId];
      if (res) {
        asteroid.mineTime = 1.0 + (res.tier.level - 1) * 0.5 + asteroid.asteroidSize * 0.05;
      }
    }
  }

  // Try to start/continue mining an asteroid
  mine(asteroid, delta, inventory) {
    if (!asteroid || asteroid.mined || !asteroid.resourceId) return null;

    asteroid.mineProgress += delta / asteroid.mineTime;
    asteroid.drawMiningHighlight(Math.min(asteroid.mineProgress, 1));

    if (asteroid.mineProgress >= 1) {
      asteroid.mined = true;
      const res = RESOURCES[asteroid.resourceId];
      if (res) {
        // Add to inventory
        const amount = 1 + Math.floor(Math.random() * 2); // 1-2 per asteroid
        const added = inventory.addItem(asteroid.resourceId, amount);

        // Visual feedback
        this.spawnPickupText(asteroid.x, asteroid.y, res, added);
        this.spawnMineParticles(asteroid.x, asteroid.y, res.color);

        // Fade out the asteroid
        this.scene.tweens.add({
          targets: asteroid,
          alpha: 0.2,
          duration: 500,
        });

        return { resourceId: asteroid.resourceId, amount: added };
      }
    }

    return null;
  }

  cancelMine(asteroid) {
    if (!asteroid || asteroid.mined) return;
    asteroid.mineProgress = 0;
    asteroid.drawAsteroid();
  }

  spawnPickupText(x, y, resource, amount) {
    const text = this.scene.add.text(x, y - 20, `+${amount} ${resource.name}`, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: resource.tier.color,
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1200,
      onComplete: () => text.destroy(),
    });
  }

  spawnMineParticles(x, y, colorStr) {
    const color = Phaser.Display.Color.HexStringToColor(colorStr).color;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const particle = this.scene.add.rectangle(
        x, y, 3, 3, color
      ).setDepth(150);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 600,
        onComplete: () => particle.destroy(),
      });
    }
  }
}
