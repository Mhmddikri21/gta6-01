// OPAL COAST — pedestrians wandering the sidewalks.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { CONFIG } from './config.js';

const SHIRT_COLORS = [0xe08a5a, 0x5a9ac9, 0x9ac95a, 0xc95a7a, 0xd8d2c2, 0x7a6ac9, 0x5ac9b0, 0xc9b458];

export class Peds {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.walkers = [];
    for (let i = 0; i < CONFIG.pedCount; i++) {
      const pos = this.randomSidewalkPoint(i);
      const walker = {
        pos,
        heading: (i * 1.7) % (Math.PI * 2),
        target: this.randomSidewalkPoint(i + 40),
        speed: CONFIG.pedSpeed * (0.8 + (i % 4) * 0.12),
        downUntil: -10,
        mesh: this.buildWalker(SHIRT_COLORS[i % SHIRT_COLORS.length]),
      };
      walker.mesh.position.copy(pos);
      this.scene.add(walker.mesh);
      this.walkers.push(walker);
    }
  }

  randomSidewalkPoint(seed) {
    const s = CONFIG.streets[seed % CONFIG.streets.length];
    const along = -70 + ((seed * 37) % 140);
    const side = seed % 2 === 0 ? 7.4 : -7.4;
    if (seed % 2 === 0) return new THREE.Vector3(along, 0, s + side);
    return new THREE.Vector3(s + side, 0, along);
  }

  buildWalker(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.34, 1.05, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
    );
    body.position.y = 0.85;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 })
    );
    head.position.y = 1.58;
    g.add(head);
    return g;
  }

  update(dt, player, onEvent) {
    const now = this.state.time;
    for (const w of this.walkers) {
      if (now < w.downUntil) continue;
      if (w.mesh.rotation.x !== 0) {
        w.mesh.rotation.x = 0;
        w.mesh.position.y = 0;
        w.pos.copy(this.randomSidewalkPoint(Math.floor(now * 7 + w.pos.x)));
        w.target = this.randomSidewalkPoint(Math.floor(now * 13 + w.pos.z));
      }
      const dx = w.target.x - w.pos.x;
      const dz = w.target.z - w.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        w.target = this.randomSidewalkPoint(Math.floor(now * 17 + w.pos.x + w.pos.z));
      } else {
        const want = Math.atan2(dx, dz);
        let diff = want - w.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        w.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
        w.pos.x += Math.sin(w.heading) * w.speed * dt;
        w.pos.z += Math.cos(w.heading) * w.speed * dt;
      }
      w.mesh.position.copy(w.pos);
      w.mesh.rotation.y = w.heading;

      if (player && player.inCar && Math.abs(player.speed) > 3) {
        const pdx = w.pos.x - player.pos.x;
        const pdz = w.pos.z - player.pos.z;
        if (pdx * pdx + pdz * pdz < 1.8 * 1.8) {
          w.downUntil = now + 4;
          w.mesh.rotation.x = Math.PI / 2;
          w.mesh.position.y = 0.3;
          player.speed *= 0.6;
          onEvent('ped-hit', { walker: w });
        }
      }
    }
  }
}
