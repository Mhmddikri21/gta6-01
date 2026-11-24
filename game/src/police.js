// OPAL COAST — the OCPD wanted system: heat decays after 8 quiet seconds,
// interceptors chase from 2 stars, and 3 stars up can bust you for $100.

import { CFG, clamp } from './config.js';
import { S, addCash, hint } from './state.js';

const THREE = window.THREE;

function makeInterceptor() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.7, 4.4),
    new THREE.MeshLambertMaterial({ color: CFG.palette.police })
  );
  body.position.y = 0.6;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 2),
    new THREE.MeshLambertMaterial({ color: 0x30343e })
  );
  cabin.position.set(0, 1.2, -0.2);
  g.add(cabin);
  const barGeo = new THREE.BoxGeometry(0.7, 0.22, 0.5);
  const red = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  red.position.set(-0.45, 1.62, -0.2);
  const blue = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0x2a6aff }));
  blue.position.set(0.45, 1.62, -0.2);
  g.add(red);
  g.add(blue);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-1.05, 1.45], [1.05, 1.45], [-1.05, -1.45], [1.05, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
  }
  g.visible = false;
  return { group: g, red, blue };
}

export function createPolice(scene) {
  const interceptors = [];
  for (let i = 0; i < 4; i++) {
    const built = makeInterceptor();
    scene.add(built.group);
    interceptors.push({
      mesh: built.group,
      red: built.red,
      blue: built.blue,
      pos: new THREE.Vector3(0, 0, 0),
      heading: 0,
      speed: 0,
      active: false,
    });
  }

  function place(it, x, z, heading) {
    it.pos.set(x, 0, z);
    it.heading = heading;
    it.active = true;
    it.mesh.visible = true;
    it.mesh.position.copy(it.pos);
    it.mesh.rotation.y = heading;
  }

  function update(dt, player, audio) {
    // Heat cools after 8 seconds without a crime.
    if (S.time - S.lastCrime > CFG.heatDecayDelay && S.heat > 0) {
      S.heat = Math.max(0, S.heat - CFG.heatDecayRate * dt);
      S.wanted = Math.min(4, Math.floor(S.heat / 25));
    }

    const want = S.wanted >= 2 ? Math.min(S.wanted - 1, 3) : 0;
    let active = 0;
    for (const it of interceptors) if (it.active) active++;

    // Spawn up to the wanted count, ahead of the player on the road.
    while (active < want) {
      const it = interceptors.find((x) => !x.active);
      if (!it) break;
      const f = { x: Math.sin(player.heading), z: Math.cos(player.heading) };
      const side = active % 2 === 0 ? 1 : -1;
      place(
        it,
        player.pos.x + f.x * 45 + -f.z * side * 6,
        player.pos.z + f.z * 45 + f.x * side * 6,
        player.heading
      );
      active++;
    }
    // Stand down when the heat is gone.
    if (want === 0) {
      for (const it of interceptors) {
        it.active = false;
        it.mesh.visible = false;
      }
    }

    const flash = Math.floor(S.time * 4) % 2 === 0;
    for (const it of interceptors) {
      if (!it.active) continue;
      it.red.visible = flash;
      it.blue.visible = !flash;
      // Steer toward the player and close in.
      const dx = player.pos.x - it.pos.x;
      const dz = player.pos.z - it.pos.z;
      const dist = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - it.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      it.heading += clamp(dh, -2.2 * dt, 2.2 * dt);
      const targetSpeed = Math.min(46, Math.abs(player.speed) + 6);
      it.speed += (targetSpeed - it.speed) * Math.min(1, 1.5 * dt);
      it.pos.x += Math.sin(it.heading) * it.speed * dt;
      it.pos.z += Math.cos(it.heading) * it.speed * dt;
      it.mesh.position.copy(it.pos);
      it.mesh.rotation.y = it.heading;

      // Busted: caught at 3+ stars.
      if (dist < 3.6 && S.wanted >= 3 && !player.onFoot) {
        const fine = Math.min(S.cash, CFG.bustedFine);
        addCash(-fine);
        S.busted++;
        S.heat = 0;
        S.wanted = 0;
        hint(`BUSTED — $${fine} fine, back to the garage`);
        player.resetTo(-90, 46, Math.PI / 2, 0, false);
        for (const o of interceptors) {
          o.active = false;
          o.mesh.visible = false;
        }
        break;
      }
    }

    audio.siren(interceptors.some((it) => it.active));
  }

  return { interceptors, update, place };
}
