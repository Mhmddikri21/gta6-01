// OPAL COAST — police: wanted stars drive interceptor spawns, chases, and busts.

import { CFG, mulberry32 } from './config.js';
import { S, decayHeat, showHint } from './state.js';
import { sirenTick } from './audio.js';

export const Police = {
  interceptors: [], // {mesh, x, z, speed, sirenT}
  spawnT: 0,
};

function makeInterceptor() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.7, 4.4),
    new THREE.MeshLambertMaterial({ color: 0x1a1a2a })
  );
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2),
    new THREE.MeshLambertMaterial({ color: 0xdddddd })
  );
  cabin.position.set(0, 1.1, -0.2);
  g.add(cabin);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.25, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xff2020, emissive: 0x880000 })
  );
  bar.position.set(0, 1.55, -0.2);
  bar.name = 'lightbar';
  g.add(bar);
  return g;
}

export function initPolice(scene) {
  Police.scene = scene;
}

export function wantedLevel() {
  return S.stars;
}

export function updatePolice(dt) {
  decayHeat(dt);
  const want = S.stars;
  const rng = mulberry32(99);

  // Spawn interceptors up to the wanted level (max 4).
  Police.spawnT -= dt;
  if (want > 0 && Police.interceptors.length < want && Police.spawnT <= 0) {
    Police.spawnT = 2;
    const mesh = makeInterceptor();
    const a = rng() * Math.PI * 2;
    const x = S.car.x + Math.sin(a) * 40;
    const z = S.car.z + Math.cos(a) * 40;
    mesh.position.set(x, 0, z);
    Police.scene.add(mesh);
    Police.interceptors.push({ mesh, x, z, speed: 14 + want * 3, sirenT: 0 });
  }
  // Despawn when the heat is gone.
  if (want === 0 && Police.interceptors.length > 0) {
    for (const it of Police.interceptors) Police.scene.remove(it.mesh);
    Police.interceptors.length = 0;
  }

  // Chase the player; flash the light bar; siren blips.
  for (const it of Police.interceptors) {
    const dx = S.car.x - it.x;
    const dz = S.car.z - it.z;
    const d = Math.hypot(dx, dz) || 1;
    it.x += (dx / d) * it.speed * dt;
    it.z += (dz / d) * it.speed * dt;
    it.mesh.position.set(it.x, 0, it.z);
    it.mesh.rotation.y = Math.atan2(dx, dz);
    const bar = it.mesh.getObjectByName('lightbar');
    if (bar) {
      const on = Math.floor(S.time * 6) % 2 === 0;
      bar.material.color.setHex(on ? 0xff2020 : 0x2020ff);
    }
    it.sirenT -= dt;
    if (it.sirenT <= 0 && d < 60) {
      it.sirenT = 1.2;
      sirenTick();
    }
    // Busted: caught at low speed with the police on top of you.
    if (d < 3 && Math.abs(S.speed) < 2 && !S.busted) {
      S.busted = true;
      S.cash = Math.max(0, S.cash - CFG.bustedFine);
      S.heat = 0;
      S.stars = 0;
      showHint('BUSTED — $' + CFG.bustedFine + ' fine', 3);
    }
  }
  if (S.busted && S.stars === 0) {
    // After the fine, the player is free to drive again.
    S.busted = false;
  }
}
