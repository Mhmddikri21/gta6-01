// OPAL COAST — pedestrians: 26 sidewalk walkers who scatter when the car comes close.

import { CFG, mulberry32, streetLines } from './config.js';
import { S, addHeat, showHint } from './state.js';
import { crash } from './audio.js';

export const Peds = {
  list: [], // {mesh, x, z, dir, speed, hit}
};

const SHIRTS = [0xd84b4b, 0x4b7ad8, 0x4bd87a, 0xd8c24b, 0x9a4bd8, 0xe8e8e8, 0x3a3a3a];

function makePed(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 1.3, 8),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.85;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xd8a070 })
  );
  head.position.y = 1.75;
  g.add(head);
  return g;
}

export function initPeds(scene) {
  const rng = mulberry32(4242);
  const lines = streetLines();
  for (let i = 0; i < CFG.pedCount; i++) {
    const line = lines[Math.floor(rng() * lines.length)];
    const side = rng() < 0.5 ? -1 : 1;
    const along = -100 + rng() * 200;
    const off = CFG.roadWidth / 2 + 2 + rng() * 3;
    const x = line.axis === 'x' ? along : line.at + side * off;
    const z = line.axis === 'x' ? line.at + side * off : along;
    const mesh = makePed(SHIRTS[Math.floor(rng() * SHIRTS.length)]);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    Peds.list.push({ mesh, x, z, dir: rng() < 0.5 ? 1 : -1, speed: 1 + rng() * 1.2, hit: false, axis: line.axis });
  }
}

export function updatePeds(dt) {
  for (const p of Peds.list) {
    if (p.hit) continue;
    // Scatter when the player car gets close.
    const px = S.onFoot ? S.player.x : S.car.x;
    const pz = S.onFoot ? S.player.z : S.car.z;
    const dx = p.x - px;
    const dz = p.z - pz;
    const d = Math.hypot(dx, dz);
    if (!S.onFoot && d < 6) {
      p.x += (dx / (d || 1)) * 4 * dt;
      p.z += (dz / (d || 1)) * 4 * dt;
    } else {
      // Stroll along the sidewalk.
      if (p.axis === 'x') p.x += p.dir * p.speed * dt;
      else p.z += p.dir * p.speed * dt;
      if (p.x > 110 || p.x < -110 || p.z > 110 || p.z < -110) p.dir *= -1;
    }
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = Math.atan2(dx, dz);

    // The player car hitting a pedestrian: +1 star, and the ped is knocked down.
    if (!S.onFoot && d < 1.6) {
      p.hit = true;
      p.mesh.rotation.x = Math.PI / 2;
      p.mesh.position.y = 0.4;
      addHeat(CFG.heatPerPed);
      S.damage = Math.min(100, S.damage + 4);
      crash();
      showHint('You hit a pedestrian — wanted level up');
    }
  }
}
