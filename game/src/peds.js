// OPAL COAST — pedestrians: twenty-six people on the sidewalks.
// They stroll between intersections, bob as they walk, and scatter when
// a car comes at them. Hit one and the heat jumps a full star.

// three.min.js is the classic (UMD) build: it sets window.THREE.
import { CFG, ROAD_LINES, dist2d, mulberry32 } from './config.js';
import { S, commitCrime, setHint } from './state.js';
import { AudioSys } from './audio.js';

const peds = [];
let scene = null;
const shirts = [0xd94f3d, 0x2f6fb2, 0xe8a83c, 0x5a7a4a, 0x8a5a9a, 0xe8e4da, 0x3a3f46];

function buildPedMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.36, 1.0, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  body.position.y = 0.9;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 }),
  );
  head.position.y = 1.62;
  g.add(head);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.85 });
  for (const sx of [-0.13, 0.13]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.8, 6), legMat);
    leg.position.set(sx, 0.4, 0);
    g.add(leg);
  }
  return g;
}

// A random sidewalk stroll: pick an intersection, walk to the next one
// along the sidewalk edge, then pick again.
function pickTarget(rng) {
  const line = ROAD_LINES[Math.floor(rng() * ROAD_LINES.length)];
  const other = ROAD_LINES[Math.floor(rng() * ROAD_LINES.length)];
  const side = (rng() < 0.5 ? -1 : 1) * (CFG.roadHalfWidth + 1.5);
  if (rng() < 0.5) return { x: other, z: line + side };
  return { x: line + side, z: other };
}

export const Peds = {
  init(sceneIn) {
    scene = sceneIn;
    const rng = mulberry32(2024);
    for (let i = 0; i < CFG.pedCount; i++) {
      const mesh = buildPedMesh(shirts[i % shirts.length]);
      scene.add(mesh);
      const line = ROAD_LINES[Math.floor(rng() * ROAD_LINES.length)];
      const other = ROAD_LINES[Math.floor(rng() * ROAD_LINES.length)];
      const side = (rng() < 0.5 ? -1 : 1) * (CFG.roadHalfWidth + 1.5);
      const start = rng() < 0.5 ? { x: other, z: line + side } : { x: line + side, z: other };
      peds.push({
        mesh,
        x: start.x,
        z: start.z,
        target: pickTarget(rng),
        speed: CFG.pedSpeedMin + rng() * (CFG.pedSpeedMax - CFG.pedSpeedMin),
        phase: rng() * Math.PI * 2,
        down: false,
        downAt: -999,
        rng,
      });
    }
  },

  get count() {
    return peds.length;
  },
  get list() {
    return peds;
  },

  update(dt) {
    if (S.paused) return;
    for (const p of peds) {
      if (p.down) {
        // Knocked down: lie flat for a while, then get up elsewhere.
        if (S.time - p.downAt > 6) {
          p.down = false;
          const t = pickTarget(p.rng);
          p.x = t.x;
          p.z = t.z;
          p.target = pickTarget(p.rng);
          p.mesh.rotation.set(0, 0, 0);
          p.mesh.visible = true;
        }
        continue;
      }
      const dx = p.target.x - p.x;
      const dz = p.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) {
        p.target = pickTarget(p.rng);
        continue;
      }
      // Scatter: if the player's car is bearing down, step aside.
      let mx = dx / d;
      let mz = dz / d;
      const pd = dist2d(S.playerX, S.playerZ, p.x, p.z);
      if (!S.onFoot && pd < 9 && Math.abs(S.playerSpeed) > 8) {
        const away = Math.atan2(p.x - S.playerX, p.z - S.playerZ);
        mx = Math.sin(away);
        mz = Math.cos(away);
      }
      p.x += mx * p.speed * dt;
      p.z += mz * p.speed * dt;
      p.phase += dt * 7;
      p.mesh.position.set(p.x, Math.abs(Math.sin(p.phase)) * 0.05, p.z);
      p.mesh.rotation.y = Math.atan2(mx, mz);

      // Hit by the player's car: down they go, heat jumps a star.
      if (!S.onFoot && pd < 1.4 && Math.abs(S.playerSpeed) > 2) {
        p.down = true;
        p.downAt = S.time;
        p.mesh.rotation.z = Math.PI / 2;
        p.mesh.position.y = 0.3;
        commitCrime(CFG.heatPerPedHit);
        setHint('You hit a pedestrian! The whole city saw that.', 3);
        AudioSys.crash(1);
      }
    }
  },
};
