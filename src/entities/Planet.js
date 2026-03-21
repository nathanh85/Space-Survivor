// ============================================================
// Planet Entity — visual + overlap zone for landing
// ============================================================

import Phaser from 'phaser';

export default class Planet extends Phaser.GameObjects.Container {
  constructor(scene, planetData) {
    super(scene, planetData.x, planetData.y);
    scene.add.existing(this);

    this.planetData = planetData;
    this.planetRadius = planetData.radius;
    this.planetType = planetData.type;
    this.orbitDist = planetData.orbitDist;

    // Planet body graphics
    const g = scene.add.graphics();

    // Glow
    g.fillStyle(Phaser.Display.Color.HexStringToColor(this.planetType.color).color, 0.08);
    g.fillCircle(0, 0, this.planetRadius * 1.5);

    // Main body
    g.fillStyle(Phaser.Display.Color.HexStringToColor(this.planetType.color).color);
    g.fillCircle(0, 0, this.planetRadius);

    // Shading highlight
    g.fillStyle(0xffffff, 0.15);
    g.fillCircle(-this.planetRadius * 0.25, -this.planetRadius * 0.25, this.planetRadius * 0.6);

    // Shading shadow
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(this.planetRadius * 0.15, this.planetRadius * 0.15, this.planetRadius * 0.8);

    this.add(g);

    // Label
    const label = scene.add.text(0, this.planetRadius + 13, this.planetType.name, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5, 0);
    this.add(label);

    // Physics body for overlap detection (landing zone)
    scene.physics.add.existing(this, true); // static body
    this.body.setCircle(this.planetRadius + 20, -(this.planetRadius + 20), -(this.planetRadius + 20));

    this.setDepth(20);
  }
}
