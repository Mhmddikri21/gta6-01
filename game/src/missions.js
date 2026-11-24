// OPAL COAST — missions: m1 meet Dalia at the marina, m2 tanker escort, m3 getaway race.
// The tanker escort warns the player exactly once when its hull drops below 30%.

import { CFG, PLACES } from './config.js';
import { S, addCash, showHint } from './state.js';
import { alarm } from './audio.js';
import { resetTo } from './player.js';

export const Missions = {
  tanker: null, // {mesh, x, z, hull}
  checkpoints: [], // {mesh, x, z, done}
  rival: null,
};

function makeTanker() {
  const g = new THREE.Group();
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 12, 12),
    new THREE.MeshLambertMaterial({ color: 0xc8b060 })
  );
  tank.rotation.x = Math.PI / 2;
  tank.position.y = 2.4;
  g.add(tank);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.4, 2.4),
    new THREE.MeshLambertMaterial({ color: 0x8a2a2a })
  );
  cab.position.set(0, 1.4, 7);
  g.add(cab);
  return g;
}

function makeCheckpoint(x, z) {
  // Torus in the XY plane: its hole already faces along Z, the road direction,
  // so a car driving the road passes through it. Do NOT rotate it around Y
  // (that turns the ring edge-on to the road).
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(5, 0.5, 8, 24),
    new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x664400 })
  );
  ring.position.set(x, 4, z);
  return ring;
}

function makeRival() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.7, 4.4),
    new THREE.MeshLambertMaterial({ color: 0xd84b4b })
  );
  body.position.y = 0.55;
  g.add(body);
  return g;
}

export function initMissions(scene) {
  Missions.scene = scene;
  const tanker = makeTanker();
  tanker.position.set(PLACES.marina.x + 6, 0, PLACES.marina.z);
  scene.add(tanker);
  Missions.tanker = { mesh: tanker, x: PLACES.marina.x + 6, z: PLACES.marina.z, hull: CFG.tankerHullMax };
  // Three race checkpoints for m3, in a line down the coast road.
  const cps = [
    { x: 84, z: -42 },
    { x: 84, z: 0 },
    { x: 84, z: 42 },
  ];
  for (const c of cps) {
    const ring = makeCheckpoint(c.x, c.z);
    scene.add(ring);
    Missions.checkpoints.push({ mesh: ring, x: c.x, z: c.z, done: false });
  }
  const rival = makeRival();
  rival.position.set(84, 0, -60);
  scene.add(rival);
  Missions.rival = { mesh: rival, x: 84, z: -60, speed: 0 };
}

export function placeTanker(x, z) {
  if (!Missions.tanker) return;
  Missions.tanker.x = x;
  Missions.tanker.z = z;
  Missions.tanker.mesh.position.set(x, 0, z);
}

function distTo(x, z) {
  const px = S.onFoot ? S.player.x : S.car.x;
  const pz = S.onFoot ? S.player.z : S.car.z;
  return Math.hypot(px - x, pz - z);
}

export function setMission(id, text) {
  S.mission = id;
  S.missionText = text;
  showHint(text, 3);
}

export function updateMissions(dt) {
  if (S.mission === 'm1') {
    if (distTo(PLACES.marina.x, PLACES.marina.z) < 10) {
      setMission('m2', 'Escort the tanker — keep its hull above 30%');
      placeTanker(S.car.x + 8, S.car.z + 4);
    }
  } else if (S.mission === 'm2') {
    // The tanker trundles along; rivals chip at its hull while you are near.
    const t = Missions.tanker;
    t.z += 3 * dt;
    if (t.z > 100) t.z = -100;
    t.mesh.position.set(t.x, 0, t.z);
    t.mesh.rotation.y = 0;
    const near = distTo(t.x, t.z) < 25;
    if (near) {
      t.hull = Math.max(0, t.hull - 1.2 * dt);
    } else {
      t.hull = Math.max(0, t.hull - 2.5 * dt);
    }
    S.hull = Math.round(t.hull);
    // Warn exactly once when the hull drops below 30%.
    if (t.hull < CFG.tankerHullWarnAt && !S.hullWarned) {
      S.hullWarned = true;
      alarm();
      showHint('WARNING — tanker hull below 30%!', 3);
    }
    if (t.hull <= 0) {
      setMission('m1', 'The tanker was lost — meet Dalia again');
      t.hull = CFG.tankerHullMax;
      S.hull = CFG.tankerHullMax;
      S.hullWarned = false;
      return;
    }
    if (distTo(PLACES.pier.x, PLACES.pier.z) < 12 && t.hull > 0) {
      addCash(CFG.missionReward);
      setMission('m3', 'Getaway — hit 3 checkpoints, beat Nacho');
      resetTo(84, -63, 0);
      Missions.rival.speed = 16;
    }
  } else if (S.mission === 'm3') {
    // Nacho's rival car drives the checkpoint line.
    const r = Missions.rival;
    r.z += r.speed * dt;
    if (r.z > 60) r.z = 60;
    r.mesh.position.set(r.x, 0, r.z);
    let done = 0;
    for (const cp of Missions.checkpoints) {
      if (!cp.done && distTo(cp.x, cp.z) < 6) {
        cp.done = true;
        cp.mesh.material.color.setHex(0x2ec44b);
        addCash(100);
        showHint('Checkpoint — +$100');
      }
      if (cp.done) done++;
    }
    if (done === Missions.checkpoints.length) {
      addCash(CFG.missionReward);
      showHint('Getaway complete — +$' + CFG.missionReward, 3);
      setMission('m1', 'Meet Dalia at the marina');
      for (const cp of Missions.checkpoints) {
        cp.done = false;
        cp.mesh.material.color.setHex(0xffd23e);
      }
      Missions.tanker.hull = CFG.tankerHullMax;
      S.hull = CFG.tankerHullMax;
      S.hullWarned = false;
    }
  }
}
