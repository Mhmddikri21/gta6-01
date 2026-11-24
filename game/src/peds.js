// OPAL COAST — pedestrians: 26 walkers on the sidewalks. They scatter
// when a car bears down on them, and getting hit costs a wanted star.

import { CFG, dist2 } from './config.js';
import { S, addHeat, hint } from './state.js';

const THREE = window.THREE;

const SHIRTS = [0xe86a6a, 0x6aa8e8, 0xe8c95a, 0x7ac98a, 0xc97ac9, 0xe8e8e8, 0x5a6a8a];

function makePedMesh(shirt) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.38, 0.95, 8),
    new THREE.MeshLambertMaterial({ color: shirt })
  );
  body.position.y = 0.9;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b88a })
  );
  head.position.y = 1.62;
  g.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.45, 0.26),
    new THREE.MeshLambertMaterial({ color: 0x2a3a5a })
  );
  legs.position.y = 0.22;
  g.add(legs);
  return g;
}

export function createPeds(scene) {
  const list = [];
  const lines = [-120, -60, 0, 60, 120];
  for (let i = 0; i < CFG.pedCount; i++) {
    const road = lines[i % lines.length];
    const horizontal = i % 2 === 0;
    // Sidewalk offset: 6.4 m off the road centreline.
    const fixed = road + (i % 4 < 2 ? 6.4 : -6.4);
    const lo = -140 + (i * 11) % 40;
    const hi = lo + 60 + (i * 7) % 60;
    const mesh = makePedMesh(SHIRTS[i % SHIRTS.length]);
    scene.add(mesh);
    list.push({
      mesh,
      horizontal,
      fixed,
      lo,
      hi,
      t: lo + ((i * 13) % Math.max(1, hi - lo)),
      dir: i % 2 === 0 ? 1 : -1,
      speed: 1 + ((i * 37) % 80) / 100,
      fleeT: 0,
      downT: 0,
      hitCool: 0,
      pos: new THREE.Vector3(0, 0, 0),
    });
  }

  function place(p) {
    if (p.horizontal) p.pos.set(p.t, 0, p.fixed);
    else p.pos.set(p.fixed, 0, p.t);
    p.mesh.position.copy(p.pos);
    p.mesh.rotation.y = p.horizontal ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : p.dir > 0 ? Math.PI : 0;
  }

  for (const p of list) place(p);

  function update(dt, player, audio) {
    for (const p of list) {
      if (p.hitCool > 0) p.hitCool -= dt;
      if (p.downT > 0) {
        p.downT -= dt;
        if (p.downT <= 0) {
          p.mesh.rotation.z = 0;
          p.mesh.position.y = 0;
          p.t = p.lo + 5;
          place(p);
        }
        continue;
      }
      // Scatter when the player's car closes in fast.
      const d = Math.sqrt(dist2(player.pos.x, player.pos.z, p.pos.x, p.pos.z));
      if (!player.onFoot && d < 7 && Math.abs(player.speed) > 5) {
        p.fleeT = 1.2;
      }
      if (p.fleeT > 0) {
        p.fleeT -= dt;
        const awayX = p.pos.x - player.pos.x;
        const awayZ = p.pos.z - player.pos.z;
        const len = Math.hypot(awayX, awayZ) || 1;
        p.pos.x += (awayX / len) * 3.5 * dt;
        p.pos.z += (awayZ / len) * 3.5 * dt;
        p.mesh.position.copy(p.pos);
      } else {
        p.t += p.dir * p.speed * dt;
        if (p.t > p.hi) {
          p.t = p.hi;
          p.dir = -1;
        } else if (p.t < p.lo) {
          p.t = p.lo;
          p.dir = 1;
        }
        place(p);
      }
      // Hit: a star of heat, the ped goes down, then gets back up.
      if (!player.onFoot && d < 1.3 && p.hitCool <= 0 && Math.abs(player.speed) > 1) {
        p.hitCool = 6;
        p.downT = 6;
        p.mesh.rotation.z = Math.PI / 2;
        p.mesh.position.y = 0.3;
        addHeat(CFG.hitPedHeat);
        audio.crash();
        hint('You hit a pedestrian — +1 star');
      }
    }
  }

  return { list, update };
}
