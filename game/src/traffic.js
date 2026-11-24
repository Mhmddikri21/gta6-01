// OPAL COAST — traffic: 14 AI cars looping the street grid, near-miss bonuses.

import { CFG, mulberry32, streetLines } from './config.js';
import { S, addCash, showHint } from './state.js';
import { blip } from './audio.js';

export const Traffic = {
  cars: [], // {mesh, axis, at, pos, dir, speed, color, cooldown}
};

const COLORS = [0xc8c8c8, 0x8a2a2a, 0x2a4a8a, 0xd8a020, 0x3a6a3a, 0x6a3a6a, 0x9a9a9a];

function makeTrafficCar(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.65, 4),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.5;
  g.add(body);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.55, 2),
    new THREE.MeshLambertMaterial({ color: 0x222831 })
  );
  top.position.set(0, 1, -0.2);
  g.add(top);
  return g;
}

export function initTraffic(scene) {
  const rng = mulberry32(777);
  const lines = streetLines();
  for (let i = 0; i < CFG.trafficCount; i++) {
    const line = lines[Math.floor(rng() * lines.length)];
    const color = COLORS[Math.floor(rng() * COLORS.length)];
    const mesh = makeTrafficCar(color);
    const car = {
      mesh,
      axis: line.axis,
      at: line.at,
      pos: -100 + rng() * 200,
      dir: rng() < 0.5 ? 1 : -1,
      speed: CFG.trafficSpeed * (0.8 + rng() * 0.4),
      cooldown: 0,
    };
    scene.add(mesh);
    Traffic.cars.push(car);
  }
}

export function updateTraffic(dt) {
  const half = (CFG.grid * CFG.blockSize) / 2 + 6;
  for (const car of Traffic.cars) {
    car.pos += car.dir * car.speed * dt;
    if (car.pos > half) car.pos = -half;
    if (car.pos < -half) car.pos = half;
    if (car.cooldown > 0) car.cooldown -= dt;
    const x = car.axis === 'x' ? car.pos : car.at;
    const z = car.axis === 'x' ? car.at : car.pos;
    car.mesh.position.set(x, 0, z);
    car.mesh.rotation.y = car.axis === 'x' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : car.dir > 0 ? 0 : Math.PI;

    // Near miss: player threads past at speed without touching.
    if (!S.onFoot && Math.abs(S.speed) > CFG.nearMissSpeed && car.cooldown <= 0) {
      const dx = S.car.x - x;
      const dz = S.car.z - z;
      const d = Math.hypot(dx, dz);
      if (d > 2.6 && d < 5.5) {
        car.cooldown = CFG.nearMissCooldown;
        addCash(CFG.nearMissReward);
        S.nearMissTotal++;
        showHint('NEAR MISS +$' + CFG.nearMissReward);
        blip();
      }
    }

    // Collision with the player car.
    if (!S.onFoot) {
      const dx = S.car.x - x;
      const dz = S.car.z - z;
      if (dx * dx + dz * dz < 3.2 * 3.2 && car.cooldown <= 0) {
        car.cooldown = 1.5;
        S.damage = Math.min(100, S.damage + 6);
      }
    }
  }
}
