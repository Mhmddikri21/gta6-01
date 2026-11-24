// OPAL COAST — the player car: arcade physics, on-foot mode, garage repair, camera.
// The car is a teal box with a cabin; the on-foot player is a small capsule figure.

import { CFG, PLACES } from './config.js';
import { S, addHeat, showHint } from './state.js';
import { down, wasPressed } from './input.js';
import { hitsCollider } from './world.js';
import { crash } from './audio.js';

export const Player = {
  mesh: null,
  person: null,
  speed: 0,
  heading: 0,
  steer: 0,
  camera: null,
  camPos: new THREE.Vector3(0, 6, -10),
};

function makeCar() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.7, 4.4),
    new THREE.MeshLambertMaterial({ color: 0x2ec4b6 })
  );
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1a2a3a })
  );
  cabin.position.set(0, 1.1, -0.3);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    g.add(w);
  }
  return g;
}

function makePerson() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 1.5, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b04b })
  );
  body.position.y = 0.9;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8a070 })
  );
  head.position.y = 1.95;
  g.add(head);
  return g;
}

export function initPlayer(scene, camera) {
  Player.mesh = makeCar();
  Player.person = makePerson();
  Player.person.visible = false;
  Player.camera = camera;
  Player.heading = S.car.heading;
  scene.add(Player.mesh);
  scene.add(Player.person);
  Player.mesh.position.set(S.car.x, 0, S.car.z);
  Player.person.position.set(S.player.x, 0, S.player.z);
}

// Park the car mesh beside the player when on foot (never on top of them).
export function snapCamera() {
  const cam = Player.camera;
  if (!cam) return;
  const h = Player.heading;
  const back = S.onFoot ? 4 : 9;
  const tx = (S.onFoot ? S.player.x : S.car.x) - Math.sin(h) * back;
  const tz = (S.onFoot ? S.player.z : S.car.z) - Math.cos(h) * back;
  cam.position.set(tx, S.onFoot ? 3.2 : 5.2, tz);
  cam.lookAt(S.onFoot ? S.player.x : S.car.x, 1.2, S.onFoot ? S.player.z : S.car.z);
}

export function setOnFoot(onFoot) {
  S.onFoot = onFoot;
  Player.person.visible = onFoot;
  if (onFoot) {
    S.player.x = S.car.x + Math.sin(S.car.heading) * 3;
    S.player.z = S.car.z + Math.cos(S.car.heading) * 3;
    S.player.heading = S.car.heading;
  }
}

// Teleport the car (used by shots and mission resets).
export function resetTo(x, z, heading) {
  S.car.x = x;
  S.car.z = z;
  S.car.heading = heading;
  Player.heading = heading;
  Player.speed = 0;
  Player.mesh.position.set(x, 0, z);
  Player.mesh.rotation.y = heading;
}

export function updatePlayer(dt) {
  const speedLimit = S.onFoot ? 6 : CFG.topSpeed;

  if (wasPressed('KeyE')) {
    setOnFoot(!S.onFoot);
    showHint(S.onFoot ? 'On foot — press E to get back in' : 'Back in the car');
  }

  if (S.onFoot) {
    // Walk with WASD, relative to the camera heading.
    let mx = 0;
    let mz = 0;
    if (down('KeyW') || down('ArrowUp')) mz += 1;
    if (down('KeyS') || down('ArrowDown')) mz -= 1;
    if (down('KeyA') || down('ArrowLeft')) mx -= 1;
    if (down('KeyD') || down('ArrowRight')) mx += 1;
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      const h = Player.heading;
      const nx = (mx / len) * Math.cos(h) - (mz / len) * Math.sin(h);
      const nz = (mx / len) * Math.sin(h) + (mz / len) * Math.cos(h);
      S.player.x += nx * 6 * dt;
      S.player.z += nz * 6 * dt;
      Player.person.position.set(S.player.x, 0, S.player.z);
      Player.person.rotation.y = Math.atan2(nx, nz);
    }
    S.speed = 0;
  } else {
    // Drive.
    const fwd = (down('KeyW') || down('ArrowUp') ? 1 : 0) - (down('KeyS') || down('ArrowDown') ? 1 : 0);
    const steerIn = (down('KeyA') || down('ArrowLeft') ? 1 : 0) - (down('KeyD') || down('ArrowRight') ? 1 : 0);
    const handbrake = down('Space');
    const grip = handbrake ? CFG.handbrakeGrip : 1;

    if (fwd > 0) Player.speed += CFG.accel * dt;
    else if (fwd < 0) Player.speed -= (Player.speed > 0.5 ? CFG.brake : CFG.accel * 0.7) * dt;
    else Player.speed -= Math.sign(Player.speed) * Math.min(Math.abs(Player.speed), 8 * dt);
    Player.speed = Math.max(-CFG.reverseSpeed, Math.min(CFG.topSpeed, Player.speed));

    const steerTarget = steerIn * CFG.steerMax * (1 - Math.min(0.6, Math.abs(Player.speed) / CFG.topSpeed));
    Player.steer += (steerTarget - Player.steer) * Math.min(1, dt * 8);
    Player.heading += (Player.steer * Player.speed * grip * dt) / 2.6;

    const nx = S.car.x + Math.sin(Player.heading) * Player.speed * dt;
    const nz = S.car.z + Math.cos(Player.heading) * Player.speed * dt;
    const hit = hitsCollider(nx, nz, 1.6);
    if (hit) {
      if (Math.abs(Player.speed) > 6) {
        S.damage = Math.min(100, S.damage + 8);
        addHeat(1);
        crash();
        showHint('CRASH — damage ' + Math.round(S.damage) + '%');
      }
      Player.speed *= 0.4;
    } else {
      S.car.x = nx;
      S.car.z = nz;
    }
    S.car.heading = Player.heading;
    S.speed = Player.speed;
    Player.mesh.position.set(S.car.x, 0, S.car.z);
    Player.mesh.rotation.y = Player.heading;

    // Garage repair: drive into Juno's garage to fix the car, free.
    const dx = S.car.x - PLACES.garage.x;
    const dz = S.car.z - PLACES.garage.z;
    if (dx * dx + dz * dz < 100 && S.damage > 0) {
      S.damage = 0;
      showHint("Juno's garage — car repaired, free");
    }
  }

  // Chase camera with FOV kick at speed.
  const cam = Player.camera;
  if (cam) {
    const h = Player.heading;
    const back = S.onFoot ? 5 : 9 + Math.abs(S.speed) * 0.06;
    const tx = (S.onFoot ? S.player.x : S.car.x) - Math.sin(h) * back;
    const tz = (S.onFoot ? S.player.z : S.car.z) - Math.cos(h) * back;
    const ty = S.onFoot ? 3.4 : 5 + Math.abs(S.speed) * 0.02;
    Player.camPos.x += (tx - Player.camPos.x) * Math.min(1, dt * 5);
    Player.camPos.y += (ty - Player.camPos.y) * Math.min(1, dt * 5);
    Player.camPos.z += (tz - Player.camPos.z) * Math.min(1, dt * 5);
    cam.position.copy(Player.camPos);
    cam.lookAt(S.onFoot ? S.player.x : S.car.x, 1.2, S.onFoot ? S.player.z : S.car.z);
    const fovT = Math.min(1, Math.abs(S.speed) / CFG.topSpeed);
    const fov = CFG.fovBase + (CFG.fovTop - CFG.fovBase) * fovT;
    if (Math.abs(cam.fov - fov) > 0.1) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
}
