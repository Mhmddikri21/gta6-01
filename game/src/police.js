// OPAL COAST — the wanted system and the OCPD interceptors.
// Heat 0..100 maps to 0..4 stars. Hide out of sight for 8 seconds and
// the heat cools; at 2+ stars interceptors spawn and chase, and if one
// sits on you while you crawl, you get busted.

// three.min.js is the classic (UMD) build: it sets window.THREE.
import { CFG, dist2d, clamp } from './config.js';
import { S, addCash, setHint, setToast } from './state.js';
import { AudioSys } from './audio.js';

const interceptors = [];
let scene = null;
let stagedExtra = 0; // extra interceptors placed by the screenshot staging

function buildInterceptor() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.62, 4.3),
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.5 }),
  );
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 2.1),
    new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.3, metalness: 0.4 }),
  );
  cabin.position.set(0, 1.05, -0.2);
  g.add(cabin);
  // The light bar: red and blue, flashing in the animation step.
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.22, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }),
  );
  bar.position.set(0, 1.45, -0.2);
  g.add(bar);
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.2, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }),
  );
  red.position.set(-0.32, 1.45, -0.2);
  red.name = 'lightR';
  g.add(red);
  const blue = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.2, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 2 }),
  );
  blue.position.set(0.32, 1.45, -0.2);
  blue.name = 'lightB';
  g.add(blue);
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0e10, roughness: 0.9 });
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.4, wz);
    g.add(w);
  }
  return g;
}

function wantedCount() {
  if (S.wanted <= 1) return 0;
  if (S.wanted === 2) return 1;
  if (S.wanted === 3) return 2;
  return 3;
}

function spawnInterceptor(x, z) {
  const mesh = buildInterceptor();
  scene.add(mesh);
  const it = { mesh, x, z, heading: 0, speed: 0, hold: 0 };
  interceptors.push(it);
  return it;
}

function removeInterceptor(it) {
  scene.remove(it.mesh);
  const i = interceptors.indexOf(it);
  if (i >= 0) interceptors.splice(i, 1);
}

export const Police = {
  init(sceneIn) {
    scene = sceneIn;
  },

  get count() {
    return interceptors.length;
  },
  get list() {
    return interceptors;
  },

  // Place interceptors by hand (screenshot staging, mission m3). The spots
  // sit ahead of the anchor point, flanking it, so they read in the frame.
  stage(count, aroundX, aroundZ) {
    const spots = [
      { x: aroundX - 7, z: aroundZ + 16 },
      { x: aroundX + 8, z: aroundZ + 10 },
      { x: aroundX - 2, z: aroundZ + 26 },
    ];
    for (let i = 0; i < count && i < spots.length; i++) {
      spawnInterceptor(spots[i].x, spots[i].z);
    }
    stagedExtra = count;
  },

  clearStaged() {
    while (interceptors.length > stagedExtra) removeInterceptor(interceptors[interceptors.length - 1]);
    stagedExtra = 0;
  },

  update(dt) {
    if (S.paused) return;
    // Heat cools only after 8 quiet seconds out of trouble.
    if (S.time - S.lastCrimeAt > CFG.heatDecayDelay && S.heat > 0) {
      S.heat = Math.max(0, S.heat - CFG.heatDecayRate * dt);
      S.wanted = Math.min(CFG.maxWanted, Math.floor(S.heat / CFG.heatPerStar));
    }
    // Speeding past the law: if an interceptor is close and you fly by,
    // that counts as a crime too.
    for (const it of interceptors) {
      if (!S.onFoot && Math.abs(S.playerSpeed) > 26 && dist2d(S.playerX, S.playerZ, it.x, it.z) < 12) {
        if (S.time - S.lastCrimeAt > 2) {
          S.heat = Math.min(100, S.heat + CFG.heatPerSpeeding);
          S.lastCrimeAt = S.time;
          S.wanted = Math.min(CFG.maxWanted, Math.floor(S.heat / CFG.heatPerStar));
        }
      }
    }

    // Keep the interceptor count matched to the wanted level.
    const want = wantedCount();
    while (interceptors.length < want) {
      const a = Math.random() * Math.PI * 2;
      spawnInterceptor(
        clamp(S.playerX + Math.sin(a) * 55, -190, 190),
        clamp(S.playerZ + Math.cos(a) * 55, -190, 190),
      );
    }
    while (interceptors.length > want) removeInterceptor(interceptors[interceptors.length - 1]);

    // Chase: steer at the player, ram when close, hold to bust.
    for (const it of interceptors) {
      const dx = S.playerX - it.x;
      const dz = S.playerZ - it.z;
      const d = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - it.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      it.heading += clamp(dh, -2.2 * dt, 2.2 * dt);
      const targetSpeed = S.onFoot ? 10 : Math.min(34, 12 + Math.abs(S.playerSpeed) * 0.9);
      it.speed += (targetSpeed - it.speed) * Math.min(1, dt * 1.5);
      it.x += Math.sin(it.heading) * it.speed * dt;
      it.z += Math.cos(it.heading) * it.speed * dt;
      it.mesh.position.set(it.x, 0, it.z);
      it.mesh.rotation.y = it.heading;
      // Flash the light bar.
      const phase = Math.floor(S.time * 6) % 2 === 0;
      const r = it.mesh.getObjectByName('lightR');
      const b = it.mesh.getObjectByName('lightB');
      if (r) r.material.emissiveIntensity = phase ? 2.4 : 0.3;
      if (b) b.material.emissiveIntensity = phase ? 0.3 : 2.4;

      if (d < 4.5) {
        if (!S.onFoot && Math.abs(S.playerSpeed) < 3) {
          it.hold += dt;
          if (it.hold > CFG.bustedHoldTime) this.bust();
        } else {
          it.hold = 0;
        }
        if (!S.onFoot && Math.abs(S.playerSpeed) > 3) {
          S.carDamage = Math.min(100, S.carDamage + 10 * dt);
        }
      } else {
        it.hold = 0;
      }
    }
    AudioSys.siren(interceptors.length > 0 && S.started && !S.paused);
  },

  bust() {
    if (S.busted) return;
    S.busted = true;
    S.over = true;
    addCash(-CFG.bustedFine);
    S.heat = 0;
    S.wanted = 0;
    while (interceptors.length > 0) removeInterceptor(interceptors[0]);
    setToast(`BUSTED — the OCPD took $${CFG.bustedFine}. Back to Juno's garage.`, 5);
    AudioSys.quiet();
  },

  // After the busted overlay, put the player back at the garage, clean.
  resetAfterBust() {
    S.busted = false;
    S.over = false;
    S.carDamage = 0;
    S.onFoot = false;
  },
};
