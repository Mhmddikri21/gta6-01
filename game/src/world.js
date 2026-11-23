// OPAL COAST — the city: street grid, beach, marina, pier, garage, plaza.
// Deterministic layout (seeded random) so every run builds the same town.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { CONFIG } from './config.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = ['#d9a05b', '#c97b5a', '#7fa3a8', '#a8b08a', '#b08a9e', '#8a9bb0', '#e0cfa0', '#c9b458'];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.garage = { x: -45, z: -33, r: 8 };
    this.marina = { x: 82, z: -10 };
    this.pier = { x0: 86, x1: 118, z: 0 };
    this.plaza = { x: 0, z: 0 };
    this.rand = mulberry32(20261124);
    this.buildGround();
    this.buildStreets();
    this.buildBuildings();
    this.buildBeachAndWater();
    this.buildMarina();
    this.buildPier();
    this.buildGarage();
    this.buildParkAndTrees();
    this.buildLamps();
  }

  box(w, h, d, color, x, y, z, emissive) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
    if (emissive) {
      mat.emissive = new THREE.Color(emissive);
      mat.emissiveIntensity = 0.7;
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(280, 280),
      new THREE.MeshStandardMaterial({ color: 0x93a06b, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  buildStreets() {
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xb5ad9c, roughness: 1 });
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.95 });
    for (const s of CONFIG.streets) {
      for (const [w, h, x, z] of [
        [170, 14, 0, s],
        [14, 170, s, 0],
      ]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(w, h), sidewalkMat);
        walk.rotation.x = -Math.PI / 2;
        walk.position.set(x, 0.01, z);
        walk.receiveShadow = true;
        this.scene.add(walk);
      }
      for (const [w, h, x, z] of [
        [170, 10, 0, s],
        [10, 170, s, 0],
      ]) {
        const road = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(x, 0.02, z);
        road.receiveShadow = true;
        this.scene.add(road);
      }
    }
    // Center dashes on the main avenues.
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xd8d23a, roughness: 0.9 });
    for (const s of [-30, 0, 30]) {
      for (let t = -70; t <= 70; t += 8) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.35), dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(t, 0.03, s);
        this.scene.add(dash);
      }
    }
  }

  buildBuildings() {
    for (const bx of CONFIG.blockCenters) {
      for (const bz of CONFIG.blockCenters) {
        if (bx === -45 && bz === -45) continue; // garage block
        if (bx === 0 && bz === 0) continue; // plaza block — never a center, kept for safety
        const h = 8 + this.rand() * 28;
        const color = PALETTE[Math.floor(this.rand() * PALETTE.length)];
        this.box(16, h, 16, color, bx, h / 2, bz);
        this.box(12, 1.2, 12, 0x5a5348, bx, h + 0.6, bz);
        if (this.rand() > 0.5) {
          this.box(4, 3, 4, 0x7a7468, bx + 4, h + 2.4, bz - 3);
        }
        this.colliders.push({ x: bx, z: bz, hx: 8.6, hz: 8.6 });
      }
    }
    // A couple of taller towers on the east side for the skyline.
    for (const [x, z, h] of [[45, -45, 44], [45, 45, 38]]) {
      this.box(14, h, 14, '#7fa3a8', x, h / 2, z);
      this.box(10, 1.5, 10, 0x5a5348, x, h + 0.7, z);
      this.colliders.push({ x, z, hx: 7.6, hz: 7.6 });
    }
  }

  buildBeachAndWater() {
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 200),
      new THREE.MeshStandardMaterial({ color: 0xd9c48f, roughness: 1 })
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(80, 0.02, 0);
    sand.receiveShadow = true;
    this.scene.add(sand);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 240),
      new THREE.MeshStandardMaterial({ color: 0x2f6f8f, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.92 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(156, 0.05, 0);
    this.scene.add(water);
  }

  buildMarina() {
    const wood = 0x8a6b45;
    for (const dz of [-26, -14, -2]) {
      this.box(16, 0.35, 2.2, wood, 94, 0.35, dz);
    }
    const boatColors = [0xe8e4da, 0xc96a4a, 0x4a7ac9, 0xe0cfa0];
    const boats = [
      [96, -30, 0.4],
      [97, -18, -0.3],
      [96, -6, 0.2],
      [100, 6, 0.5],
    ];
    boats.forEach(([x, z, yaw], i) => {
      const hull = this.box(5.5, 1.1, 2.1, boatColors[i % boatColors.length], x, 0.6, z);
      hull.rotation.y = yaw;
      this.box(2.2, 1.0, 1.5, 0xd8d2c2, x, 1.6, z);
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 5, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b5a44 })
      );
      mast.position.set(x, 3.4, z);
      this.scene.add(mast);
    });
  }

  buildPier() {
    const wood = 0x9a7b52;
    // Deck top sits just above the water so walkers and cars stand on it.
    this.box(32, 0.3, 6, wood, 102, -0.05, 0);
    for (let x = 88; x <= 116; x += 7) {
      for (const dz of [-2.6, 2.6]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 2.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x6b5a44 })
        );
        post.position.set(x, -0.6, dz);
        this.scene.add(post);
      }
    }
    for (const dz of [-2.9, 2.9]) {
      this.box(32, 0.18, 0.18, 0x6b5a44, 102, 0.8, dz);
    }
    // Shack at the pier end.
    this.box(5, 3.2, 4.5, '#b08a5e', 114, 1.6, 0);
    this.colliders.push({ x: 114, z: 0, hx: 2.8, hz: 2.5 });
  }

  buildGarage() {
    // Juno's garage: solid block with a glowing repair sign; the repair
    // zone is the marked pad in front of its open face.
    this.box(18, 7, 12, '#5a6b7a', -45, 3.5, -51);
    this.box(18, 0.8, 12.6, '#3a4750', -45, 7.4, -51);
    this.box(6, 1.4, 0.3, '#20262c', -45, 5.6, -44.8, 0x33ff99);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(6.4, 7.6, 40),
      new THREE.MeshBasicMaterial({ color: 0x33ff99, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(this.garage.x, 0.06, this.garage.z);
    this.scene.add(ring);
    this.garageRing = ring;
    this.colliders.push({ x: -45, z: -51, hx: 9.6, hz: 6.6 });
  }

  buildParkAndTrees() {
    // Central plaza: pale paving, a fountain ring, benches, palms.
    const pave = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 26),
      new THREE.MeshStandardMaterial({ color: 0xcac2ae, roughness: 1 })
    );
    pave.rotation.x = -Math.PI / 2;
    pave.position.set(0, 0.03, 0);
    pave.receiveShadow = true;
    this.scene.add(pave);
    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4.4, 0.9, 20),
      new THREE.MeshStandardMaterial({ color: 0x8a94a0, roughness: 0.7 })
    );
    fountain.position.set(0, 0.45, 0);
    fountain.castShadow = true;
    this.scene.add(fountain);
    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 0.3, 20),
      new THREE.MeshStandardMaterial({ color: 0x3f8fb5, roughness: 0.2, metalness: 0.3 })
    );
    pool.position.set(0, 0.95, 0);
    this.scene.add(pool);
    this.colliders.push({ x: 0, z: 0, hx: 4.6, hz: 4.6 });
    for (let i = 0; i < 18; i++) {
      const x = -70 + this.rand() * 140;
      const z = -70 + this.rand() * 140;
      // Keep trees out of the roadside: distance to the nearest street line.
      const nearStreet = (v) => {
        const r = ((v % 30) + 30) % 30;
        return Math.min(r, 30 - r) < 11;
      };
      if (nearStreet(x) || nearStreet(z)) continue;
      if (Math.abs(x) < 16 && Math.abs(z) < 16) continue;
      if (x > 74) continue;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.3, 2.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b4a2e })
      );
      trunk.position.set(x, 1.1, z);
      this.scene.add(trunk);
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(1.9, 4.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 1 })
      );
      top.position.set(x, 4.2, z);
      top.castShadow = true;
      this.scene.add(top);
    }
  }

  buildLamps() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffdf8a, emissiveIntensity: 1.2 });
    for (const s of [-60, -30, 0, 30, 60]) {
      for (const t of [-45, 15]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5, 6), poleMat);
        pole.position.set(s + 6, 2.5, t);
        this.scene.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), bulbMat);
        bulb.position.set(s + 6, 5.1, t);
        this.scene.add(bulb);
      }
    }
  }

  // Keep a circle inside the playable area: city streets, beach, pier.
  clampPos(pos, radius) {
    if (pos.x > CONFIG.waterX) {
      const onPier = Math.abs(pos.z) < 2.8 && pos.x <= this.pier.x1;
      const onBeach = pos.x <= 100 && Math.abs(pos.z) < 60;
      if (!onPier && !onBeach) pos.x = CONFIG.waterX - radius;
      if (onPier) pos.x = Math.min(pos.x, this.pier.x1 - radius);
      if (onBeach && !onPier) pos.x = Math.min(pos.x, 100 - radius);
    }
    if (pos.x < -78) pos.x = -78;
    if (pos.z < -78) pos.z = -78;
    if (pos.z > 78) pos.z = 78;
  }

  // Circle vs building AABBs: push out, return the impact speed lost.
  collideCircle(pos, radius, speed) {
    let hit = 0;
    for (const c of this.colliders) {
      const cx = Math.max(c.x - c.hx, Math.min(pos.x, c.x + c.hx));
      const cz = Math.max(c.z - c.hz, Math.min(pos.z, c.z + c.hz));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
        hit = Math.max(hit, Math.abs(speed));
      } else if (d2 <= 0.0001) {
        pos.x = c.x + c.hx + radius;
        hit = Math.max(hit, Math.abs(speed));
      }
    }
    return hit;
  }
}
