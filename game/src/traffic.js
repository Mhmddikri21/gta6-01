// OPAL COAST — traffic: fourteen AI cars cruising the grid.
// Each car loops a rectangle of road around one city block. Thread past
// one at over 20 m/s without touching it and the game pays a near-miss
// bonus of $10 (per car, 4-second cooldown).

// three.min.js is the classic (UMD) build: it sets window.THREE.
import { CFG, ROAD_LINES, dist2d, mulberry32, clamp } from './config.js';
import { S, addCash, setHint, commitCrime } from './state.js';
import { AudioSys } from './audio.js';

const cars = [];
let scene = null;
const palette = [0xe8e4da, 0x3a6ea8, 0xd9a441, 0x5a7a4a, 0x8a5a9a, 0x2c2f36, 0xc9c9c9];

function buildTrafficCar(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.6, 4.0),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 }),
  );
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.55, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.2, metalness: 0.6 }),
  );
  top.position.set(0, 1.05, -0.2);
  g.add(top);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 });
  for (const [wx, wz] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    g.add(w);
  }
  return g;
}

function makeRoute(rng) {
  // A rectangle loop around one block, on the road lines.
  const gx = ROAD_LINES[Math.floor(rng() * ROAD_LINES.length)];
  const gz = ROAD_LINES[Math.floor(rng() * ROAD_LINES.length)];
  const hw = CFG.roadSpacing / 2;
  const corners = [
    { x: gx - hw, z: gz - hw },
    { x: gx + hw, z: gz - hw },
    { x: gx + hw, z: gz + hw },
    { x: gx - hw, z: gz + hw },
  ];
  if (rng() < 0.5) corners.reverse();
  return corners;
}

export const Traffic = {
  init(sceneIn) {
    scene = sceneIn;
    const rng = mulberry32(777);
    for (let i = 0; i < CFG.trafficCount; i++) {
      const mesh = buildTrafficCar(palette[i % palette.length]);
      scene.add(mesh);
      const route = makeRoute(rng);
      const start = route[0];
      cars.push({
        mesh,
        route,
        wp: 1,
        x: start.x,
        z: start.z,
        heading: 0,
        speed: CFG.trafficSpeedMin + rng() * (CFG.trafficSpeedMax - CFG.trafficSpeedMin),
        nearMissAt: -999,
        bumpAt: -999,
      });
    }
  },

  get count() {
    return cars.length;
  },
  get list() {
    return cars;
  },

  update(dt) {
    if (S.paused) return;
    for (const c of cars) {
      const target = c.route[c.wp];
      const dx = target.x - c.x;
      const dz = target.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < 2) {
        c.wp = (c.wp + 1) % c.route.length;
        continue;
      }
      const want = Math.atan2(dx, dz);
      let dh = want - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += clamp(dh, -1.6 * dt, 1.6 * dt);
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;

      // Near-miss bonus: fast pass, close but no contact.
      const pd = dist2d(S.playerX, S.playerZ, c.x, c.z);
      if (!S.onFoot && Math.abs(S.playerSpeed) > CFG.nearMissSpeed && pd < CFG.nearMissRange && pd > 2.4) {
        if (S.time - c.nearMissAt > CFG.nearMissCooldown) {
          c.nearMissAt = S.time;
          addCash(CFG.nearMissReward);
          S.nearMisses += 1;
          setHint(`NEAR MISS +$${CFG.nearMissReward}`, 1.6);
          AudioSys.blip(1180, 0.08, 0.14);
        }
      }
      // Contact with the player: a scrape, heat, and a shove.
      if (pd < 2.6 && S.time - c.bumpAt > 1.5) {
        c.bumpAt = S.time;
        if (!S.onFoot && Math.abs(S.playerSpeed) > 4) {
          commitCrime(CFG.heatPerCarHit);
          S.carDamage = Math.min(100, S.carDamage + 6);
          setHint('You clipped a car — the cops noticed', 2);
          AudioSys.crash(0.7);
        }
      }
    }
  },
};
