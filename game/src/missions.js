// OPAL COAST — the mission chain. m1 meet Dalia at the marina, m2 escort
// the tanker (hull above 30%, warned once below it), m3 lose the tail
// through 3 checkpoints against Nacho. Completing m3 pays $500.

import { CFG } from './config.js';
import { S, addCash, setMission, setObjective, hint } from './state.js';

const THREE = window.THREE;

const TANKER_ROUTE = [
  [140, 0],
  [60, 0],
  [60, -60],
  [0, -60],
  [0, 0],
  [60, 0],
  [120, 0],
  [185, 0],
];

const RING_SPOTS = [
  [-60, 60],
  [-120, 0],
  [-60, -120],
];

function makeTanker() {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.2, 2.6),
    new THREE.MeshLambertMaterial({ color: CFG.palette.tanker })
  );
  cab.position.set(0, 1.4, 3.4);
  g.add(cab);
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 5.4, 14),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d8 })
  );
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, 1.5, -1.2);
  g.add(tank);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.34, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-1.15, 4.2], [1.15, 4.2], [-1.15, -2.6], [1.15, -2.6], [-1.15, 0.4], [1.15, 0.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.45, wz);
    g.add(w);
  }
  g.visible = false;
  return g;
}

function makeRival(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.68, 4.2),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.6;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 1.9),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 })
  );
  cabin.position.set(0, 1.15, -0.2);
  g.add(cabin);
  g.visible = false;
  return g;
}

export function createMissions(ctx) {
  const { scene, world, player, input, audio } = ctx;

  // The gold marker ring + beacon pillar showing the current objective.
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 3.4, 28),
    new THREE.MeshBasicMaterial({ color: CFG.palette.gold, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  marker.add(ring);
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 30, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: CFG.palette.gold,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beacon.position.y = 15;
  marker.add(beacon);
  marker.position.set(world.spots.marina.x, 0, world.spots.marina.z);
  scene.add(marker);

  const tanker = makeTanker();
  scene.add(tanker);
  const tankerState = { wp: 0, pos: new THREE.Vector3(140, 0, 0), heading: Math.PI / 2 };

  const rivals = [];
  for (const color of [0xc94f4f, 0x8a2a2a]) {
    const mesh = makeRival(color);
    scene.add(mesh);
    rivals.push({ mesh, mode: 'approach', cool: 0, tx: 0, tz: 0 });
  }

  const rings = [];
  for (const [rx, rz] of RING_SPOTS) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(5, 0.45, 8, 26),
      new THREE.MeshBasicMaterial({ color: CFG.palette.gold })
    );
    m.position.set(rx, 2.6, rz);
    m.visible = false;
    scene.add(m);
    rings.push(m);
  }

  const nacho = makeRival(CFG.palette.gold);
  scene.add(nacho);

  function setM1() {
    setMission('m1');
    setObjective('Meet Dalia at the marina');
    tanker.visible = false;
    for (const r of rivals) r.mesh.visible = false;
    for (const m of rings) m.visible = false;
    nacho.visible = false;
    marker.position.set(world.spots.marina.x, 0, world.spots.marina.z);
  }

  function setM2() {
    setMission('m2');
    setObjective('Escort the tanker — keep hull above 30%');
    S.hull = CFG.tankerHull;
    S.hullWarned = false;
    tankerState.wp = 0;
    tankerState.pos.set(TANKER_ROUTE[0][0], 0, TANKER_ROUTE[0][1]);
    tankerState.heading = Math.PI / 2;
    tanker.visible = true;
    tanker.position.copy(tankerState.pos);
    for (const m of rings) m.visible = false;
    nacho.visible = false;
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      r.mode = 'approach';
      r.cool = 1 + i * 2;
      r.mesh.visible = true;
      r.mesh.position.set(tankerState.pos.x - 20 - i * 12, 0, tankerState.pos.z + (i === 0 ? 14 : -14));
    }
    hint('Dalia: keep that tanker rolling, hull above 30%');
  }

  function setM3() {
    setMission('m3');
    setObjective('Lose the tail — hit 3 checkpoints');
    S.checkpoint = 0;
    tanker.visible = false;
    for (const r of rivals) r.mesh.visible = false;
    for (let i = 0; i < rings.length; i++) {
      rings[i].visible = true;
      rings[i].material.color.set(CFG.palette.gold);
    }
    nacho.visible = true;
    nacho.position.set(player.pos.x + 5, 0, player.pos.z + 6);
    marker.position.set(RING_SPOTS[0][0], 0, RING_SPOTS[0][1]);
    hint('Nacho: first to the last checkpoint buys the drinks');
  }

  function update(dt) {
    // Marker bobs gently; beacon follows the current target.
    marker.rotation.y += dt * 0.8;
    ring.scale.setScalar(1 + Math.sin(S.time * 3) * 0.06);

    if (S.mission === 'm1') {
      const m = world.spots.marina;
      const d = Math.hypot(player.pos.x - m.x, player.pos.z - m.z);
      if (d < 8 && input.pressed('KeyE')) {
        setM2();
      }
      return;
    }

    if (S.mission === 'm2') {
      // Drive the tanker along its route.
      const wp = TANKER_ROUTE[tankerState.wp];
      const dx = wp[0] - tankerState.pos.x;
      const dz = wp[1] - tankerState.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 2) {
        tankerState.wp++;
        if (tankerState.wp >= TANKER_ROUTE.length) {
          setM3();
          return;
        }
      } else {
        const h = Math.atan2(dx, dz);
        tankerState.heading = h;
        tankerState.pos.x += Math.sin(h) * CFG.tankerSpeed * dt;
        tankerState.pos.z += Math.cos(h) * CFG.tankerSpeed * dt;
        tanker.position.copy(tankerState.pos);
        tanker.rotation.y = h;
      }
      marker.position.copy(tankerState.pos);

      // Rivals ram the tanker; each hit costs hull.
      for (const r of rivals) {
        if (r.cool > 0) r.cool -= dt;
        const rp = r.mesh.position;
        if (r.mode === 'approach') {
          const ax = tankerState.pos.x - rp.x;
          const az = tankerState.pos.z - rp.z;
          const ad = Math.hypot(ax, az);
          if (ad < 4.5 && r.cool <= 0) {
            S.hull = Math.max(0, S.hull - CFG.rivalHitDamage);
            r.cool = 3;
            r.mode = 'retreat';
            const len = ad || 1;
            r.tx = tankerState.pos.x + (rp.x - tankerState.pos.x) / len * 40;
            r.tz = tankerState.pos.z + (rp.z - tankerState.pos.z) / len * 40;
            audio.crash();
            hint(`Tanker hull ${Math.round(S.hull)}% — rivals on it!`);
          } else {
            const h = Math.atan2(ax, az);
            rp.x += Math.sin(h) * 16 * dt;
            rp.z += Math.cos(h) * 16 * dt;
            r.mesh.rotation.y = h;
          }
        } else {
          const bx = r.tx - rp.x;
          const bz = r.tz - rp.z;
          const bd = Math.hypot(bx, bz);
          if (bd < 3 || r.cool <= 0) {
            r.mode = 'approach';
          } else {
            const h = Math.atan2(bx, bz);
            rp.x += Math.sin(h) * 16 * dt;
            rp.z += Math.cos(h) * 16 * dt;
            r.mesh.rotation.y = h;
          }
        }
      }

      // Warn once when the hull drops below 30%.
      if (S.hull < CFG.hullWarnAt && !S.hullWarned) {
        S.hullWarned = true;
        audio.alarm();
        hint('WARNING — tanker hull below 30%!');
      }
      if (S.hull <= 0) {
        hint('The tanker is wrecked — job failed');
        setM1();
      }
      return;
    }

    if (S.mission === 'm3') {
      // Nacho shadows the player, 12 m back.
      const f = { x: Math.sin(player.heading), z: Math.cos(player.heading) };
      const tx = player.pos.x - f.x * 12;
      const tz = player.pos.z - f.z * 12;
      const nx = nacho.position.x + (tx - nacho.position.x) * Math.min(1, 2 * dt);
      const nz = nacho.position.z + (tz - nacho.position.z) * Math.min(1, 2 * dt);
      nacho.position.set(nx, 0, nz);
      nacho.rotation.y = player.heading;

      const idx = S.checkpoint;
      if (idx < rings.length) {
        const spot = RING_SPOTS[idx];
        marker.position.set(spot[0], 0, spot[1]);
        rings[idx].rotation.y += dt * 1.2;
        const d = Math.hypot(player.pos.x - spot[0], player.pos.z - spot[1]);
        if (d < 6) {
          rings[idx].material.color.set(0x3aff7a);
          S.checkpoint++;
          if (S.checkpoint >= rings.length) {
            addCash(CFG.missionReward);
            S.jobsDone++;
            hint(`JOB DONE +$${CFG.missionReward} — Dalia sends her regards`);
            audio.chime();
            setM1();
          } else {
            hint(`Checkpoint ${S.checkpoint} of ${S.checkpointsTotal}`);
            audio.blip();
          }
        }
      }
    }
  }

  return { update, setM1, setM2, setM3, tanker, tankerState, rivals, rings, nacho, marker };
}
