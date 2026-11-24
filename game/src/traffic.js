// OPAL COAST — traffic: 14 AI cars looping the road grid, plus the
// near-miss bonus and the crash that costs heat.

import { CFG, dist2 } from './config.js';
import { S, addCash, addHeat, hint } from './state.js';

const THREE = window.THREE;

const TRAFFIC_COLORS = [0xd8d8d8, 0xc94f4f, 0x4f7ec9, 0xe8c95a, 0x7a5ac9, 0x5ac98a, 0x2a2d34];

function makeTrafficCar(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.66, 4.1),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.58;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 1.9),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 })
  );
  cabin.position.set(0, 1.12, -0.2);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.32, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.4, wz);
    g.add(w);
  }
  return g;
}

// A rectangular loop on road centrelines: corners at (cx±30, cz±30),
// which are all road lines (roads sit at multiples of 60).
function loopPoint(cx, cz, s) {
  const h = 30;
  const per = 8 * h;
  let d = ((s % per) + per) % per;
  const segs = [
    { x0: cx - h, z0: cz - h, x1: cx + h, z1: cz - h, head: Math.PI / 2 },
    { x0: cx + h, z0: cz - h, x1: cx + h, z1: cz + h, head: Math.PI },
    { x0: cx + h, z0: cz + h, x1: cx - h, z1: cz + h, head: -Math.PI / 2 },
    { x0: cx - h, z0: cz + h, x1: cx - h, z1: cz - h, head: 0 },
  ];
  for (const sg of segs) {
    const len = Math.hypot(sg.x1 - sg.x0, sg.z1 - sg.z0);
    if (d <= len) {
      const t = d / len;
      return {
        x: sg.x0 + (sg.x1 - sg.x0) * t,
        z: sg.z0 + (sg.z1 - sg.z0) * t,
        heading: sg.head,
      };
    }
    d -= len;
  }
  return { x: cx - h, z: cz - h, heading: Math.PI / 2 };
}

export function createTraffic(scene) {
  const cars = [];
  const centers = [-90, -30, 30, 90];
  const spots = [];
  for (const cx of centers) for (const cz of centers) spots.push([cx, cz]);
  for (let i = 0; i < CFG.trafficCount; i++) {
    const [cx, cz] = spots[i % spots.length];
    const color = TRAFFIC_COLORS[i % TRAFFIC_COLORS.length];
    const mesh = makeTrafficCar(color);
    scene.add(mesh);
    cars.push({
      mesh,
      cx,
      cz,
      s: (i * 53) % 240,
      speed: 8 + ((i * 7) % 6),
      cool: 0,
      nmCool: 0,
      pos: new THREE.Vector3(cx - 30, 0, cz - 30),
    });
  }

  function update(dt, player, audio) {
    for (const c of cars) {
      c.s += c.speed * dt;
      const p = loopPoint(c.cx, c.cz, c.s);
      c.pos.set(p.x, 0, p.z);
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = p.heading;
      if (c.cool > 0) c.cool -= dt;
      if (c.nmCool > 0) c.nmCool -= dt;

      if (player.onFoot) continue;
      const d2 = dist2(player.pos.x, player.pos.z, c.pos.x, c.pos.z);
      const d = Math.sqrt(d2);
      const ps = Math.abs(player.speed);
      if (d < 2.4 && ps > 2 && c.cool <= 0) {
        // Crash: heat, damage, bounce the player back.
        c.cool = 2;
        player.damage = Math.min(100, player.damage + 8);
        addHeat(CFG.hitCarHeat);
        audio.crash();
        player.speed *= -0.35;
        hint('You hit traffic — +1 star');
      } else if (d < CFG.nearMissDist && d >= 2.4 && ps > CFG.nearMissSpeed && c.nmCool <= 0) {
        // Threaded past at speed: the near-miss bonus.
        c.nmCool = CFG.nearMissCooldown;
        addCash(CFG.nearMissReward);
        S.nearMissTotal++;
        hint(`NEAR MISS +$${CFG.nearMissReward}`);
        audio.blip();
      }
    }
  }

  return { cars, update };
}
