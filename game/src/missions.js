// OPAL COAST — the mission chain, told through Dalia's dispatch.
// m1: pick up the package for Dalia. m2: escort Juno's tanker across
// town while rivals ram it — warn once when its hull drops under 30%.
// m3: a four-star getaway through three checkpoints.

// three.min.js is the classic (UMD) build: it sets window.THREE.
import { CFG, dist2d, clamp } from './config.js';
import { S, addCash, setHint, setToast, setObjective, commitCrime } from './state.js';
import { AudioSys } from './audio.js';

let scene = null;
let beacon = null; // gold marker column over the current objective
let tanker = null; // THREE.Group
let tankerPath = [];
let tankerWp = 0;
let rivals = [];
let rivalTimer = 0;
let checkpointMeshes = [];
let checkpointRings = [];

function buildBeacon() {
  const g = new THREE.Group();
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc93a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  col.position.y = 30;
  g.add(col);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3, 0.3, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffc93a }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  g.add(ring);
  g.visible = false;
  scene.add(g);
  return g;
}

function buildTanker() {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.4, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x2f6fb2, roughness: 0.4, metalness: 0.4 }),
  );
  cab.position.set(0, 1.5, 3.4);
  cab.castShadow = true;
  g.add(cab);
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 5.6, 14),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.3, metalness: 0.7 }),
  );
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, 1.6, -1.2);
  tank.castShadow = true;
  g.add(tank);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 });
  for (const [wx, wz] of [[-1.05, 4.2], [1.05, 4.2], [-1.05, -3.4], [1.05, -3.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.45, wz);
    g.add(w);
  }
  g.visible = false;
  scene.add(g);
  return g;
}

function buildRival() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.6, 4.0),
    new THREE.MeshStandardMaterial({ color: 0x7a1f1f, roughness: 0.4, metalness: 0.4 }),
  );
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.5, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.5 }),
  );
  top.position.set(0, 1.0, -0.2);
  g.add(top);
  return g;
}

function buildCheckpoint(x, z) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(5, 0.45, 10, 28),
    new THREE.MeshBasicMaterial({ color: 0x2fd4c4 }),
  );
  ring.position.set(x, 4.5, z);
  ring.visible = false;
  scene.add(ring);
  return ring;
}

function startM1() {
  S.mission.id = 'm1';
  S.mission.stage = 0;
  S.mission.failed = false;
  setObjective("Dalia: pick up the package at the plaza (follow the gold beacon)");
  beacon.visible = true;
  beacon.position.set(CFG.places.daliaPickup.x, 0, CFG.places.daliaPickup.z);
}

function startM2() {
  S.mission.id = 'm2';
  S.mission.stage = 0;
  S.mission.tankerHull = CFG.tankerHull;
  S.mission.hullWarned = false;
  S.mission.failed = false;
  tankerPath = [
    { x: CFG.places.tankerStart.x, z: CFG.places.tankerStart.z },
    { x: 0, z: -100 },
    { x: 100, z: -50 },
    { x: 100, z: 50 },
    { x: CFG.places.tankerEnd.x, z: CFG.places.tankerEnd.z },
  ];
  tankerWp = 0;
  tanker.position.set(tankerPath[0].x, 0, tankerPath[0].z);
  tanker.visible = true;
  rivalTimer = 6;
  setObjective('Escort Juno\'s tanker to the east depot — keep its hull above 0%');
  setToast('m2 — TANKER ESCORT: rivals will ram the tanker. Ram them first.', 5);
  AudioSys.blip(520, 0.2, 0.15);
}

function startM3() {
  S.mission.id = 'm3';
  S.mission.stage = 0;
  S.mission.checkpointsHit = 0;
  S.mission.failed = false;
  S.heat = 100;
  S.wanted = 4;
  S.lastCrimeAt = S.time;
  for (let i = 0; i < checkpointMeshes.length; i++) {
    checkpointMeshes[i].visible = i === 0;
  }
  setObjective('m3 — THE GETAWAY: hit all 3 checkpoints with 4 stars, then lose the heat');
  setToast('m3 — THE GETAWAY: 4 stars. Hit the teal rings, then vanish.', 5);
}

export const Missions = {
  init(sceneIn) {
    scene = sceneIn;
    beacon = buildBeacon();
    tanker = buildTanker();
    checkpointMeshes = CFG.raceCheckpoints.map((c) => buildCheckpoint(c.x, c.z));
    checkpointRings = checkpointMeshes;
    startM1();
  },

  get tankerPos() {
    return tanker ? { x: tanker.position.x, z: tanker.position.z, visible: tanker.visible } : { x: 0, z: 0, visible: false };
  },
  get rivals() {
    return rivals;
  },
  get rings() {
    return checkpointRings;
  },

  // Put the tanker somewhere specific (screenshot staging): it drives on
  // from waypoint `wp` of its route.
  placeTanker(x, z, wp) {
    tanker.position.set(x, 0, z);
    tanker.visible = true;
    tankerWp = wp;
  },

  // Jump straight into a mission (used by the self-test and staging).
  forceMission(id) {
    this.clearRivals();
    tanker.visible = false;
    for (const r of checkpointMeshes) r.visible = false;
    if (id === 'm1') startM1();
    else if (id === 'm2') startM2();
    else if (id === 'm3') startM3();
  },

  clearRivals() {
    for (const r of rivals) scene.remove(r.mesh);
    rivals = [];
  },

  update(dt) {
    if (S.paused || !S.started) return;
    const m = S.mission;
    if (m.chainDone) {
      beacon.visible = false;
      return;
    }

    if (m.id === 'm1') {
      const p = CFG.places.daliaPickup;
      if (dist2d(S.playerX, S.playerZ, p.x, p.z) < 7) {
        addCash(CFG.missionRewards.m1);
        setToast(`m1 done — Dalia paid $${CFG.missionRewards.m1}. Juno needs a tanker escorted.`, 4);
        AudioSys.chime();
        startM2();
      }
      return;
    }

    if (m.id === 'm2') {
      // Drive the tanker along its route.
      const target = tankerPath[tankerWp];
      const dx = target.x - tanker.position.x;
      const dz = target.z - tanker.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 3) {
        tankerWp += 1;
        if (tankerWp >= tankerPath.length) {
          addCash(CFG.missionRewards.m2);
          tanker.visible = false;
          this.clearRivals();
          setToast(`m2 done — tanker delivered, +$${CFG.missionRewards.m2}. Nacho has a getaway for you.`, 4);
          AudioSys.chime();
          startM3();
          return;
        }
      } else {
        const hd = Math.atan2(dx, dz);
        tanker.position.x += Math.sin(hd) * CFG.tankerSpeed * dt;
        tanker.position.z += Math.cos(hd) * CFG.tankerSpeed * dt;
        tanker.rotation.y = hd;
      }
      beacon.position.set(tanker.position.x, 0, tanker.position.z);
      // Spawn rivals that hunt the tanker.
      rivalTimer -= dt;
      if (rivalTimer <= 0 && rivals.length < 2) {
        rivalTimer = 12;
        const a = Math.random() * Math.PI * 2;
        const mesh = buildRival();
        mesh.position.set(
          clamp(tanker.position.x + Math.sin(a) * 40, -190, 190),
          0,
          clamp(tanker.position.z + Math.cos(a) * 40, -190, 190),
        );
        scene.add(mesh);
        rivals.push({ mesh, x: mesh.position.x, z: mesh.position.z, heading: 0, ramAt: -999 });
        setHint('Rivals incoming — ram them off the tanker!', 2.5);
      }
      // Rivals ram the tanker; the player rams rivals to destroy them.
      for (let i = rivals.length - 1; i >= 0; i--) {
        const r = rivals[i];
        const tdx = tanker.position.x - r.x;
        const tdz = tanker.position.z - r.z;
        const td = Math.hypot(tdx, tdz);
        const hd = Math.atan2(tdx, tdz);
        r.heading = hd;
        r.x += Math.sin(hd) * 16 * dt;
        r.z += Math.cos(hd) * 16 * dt;
        r.mesh.position.set(r.x, 0, r.z);
        r.mesh.rotation.y = hd;
        if (td < 4.5 && S.time - r.ramAt > CFG.rivalRamCooldown) {
          r.ramAt = S.time;
          m.tankerHull -= CFG.rivalRamDamage;
          AudioSys.crash(0.9);
          setHint(`Tanker hit! Hull ${Math.max(0, m.tankerHull)}%`, 2);
        }
        const pd = dist2d(S.playerX, S.playerZ, r.x, r.z);
        if (!S.onFoot && pd < 3.4 && Math.abs(S.playerSpeed) > 6) {
          scene.remove(r.mesh);
          rivals.splice(i, 1);
          addCash(CFG.rivalReward);
          S.rivalsDestroyed += 1;
          setHint(`Rival wrecked +$${CFG.rivalReward}`, 2);
          AudioSys.crash(1);
          continue;
        }
      }
      // Hull-critical warning, exactly once per attempt.
      if (m.tankerHull < CFG.tankerWarnAt && !m.hullWarned) {
        m.hullWarned = true;
        setToast('WARNING — tanker hull below 30%! Get the rivals off it NOW.', 4);
        AudioSys.alarm();
      }
      setObjective(`Escort the tanker — hull ${Math.max(0, Math.round(m.tankerHull))}%`);
      if (m.tankerHull <= 0) {
        m.failed = true;
        this.clearRivals();
        tanker.visible = false;
        setToast('The tanker blew. Juno is furious — run it again (m2 restarted).', 5);
        startM2();
      }
      return;
    }

    if (m.id === 'm3') {
      const idx = m.checkpointsHit;
      if (idx < checkpointMeshes.length) {
        const cp = CFG.raceCheckpoints[idx];
        beacon.position.set(cp.x, 0, cp.z);
        if (dist2d(S.playerX, S.playerZ, cp.x, cp.z) < 7) {
          m.checkpointsHit += 1;
          checkpointMeshes[idx].visible = false;
          if (m.checkpointsHit < checkpointMeshes.length) {
            checkpointMeshes[m.checkpointsHit].visible = true;
            setHint(`Checkpoint ${m.checkpointsHit}/3 — keep moving!`, 2);
            AudioSys.blip(880, 0.12, 0.15);
          } else {
            beacon.visible = false;
            setObjective('All checkpoints hit — lose the heat (stay clean 8s)');
            setToast('All 3 checkpoints hit. Now vanish — stay clean until the heat cools.', 4);
          }
        }
      } else if (S.wanted === 0) {
        addCash(CFG.missionRewards.m3);
        m.chainDone = true;
        m.done = true;
        setObjective('Chain complete — Opal Coast is yours. Free roam!');
        setToast(`m3 done — the getaway worked, +$${CFG.missionRewards.m3}. Chain complete!`, 5);
        AudioSys.chime();
      }
    }
  },
};
