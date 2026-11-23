// OPAL COAST — the player: one car, one person.
// Arcade car physics (accelerate, brake, steer, handbrake drift) and an
// on-foot mode for the marina and the pier. E swaps between the two.

// three.min.js is the classic (UMD) build: it sets window.THREE, so this
// module uses the global instead of importing it.
import { CFG, clamp, wrapAngle, dist2d } from './config.js';
import { S, setHint, addCash } from './state.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { collideCircle } from './world.js';

let scene = null;
let car = null; // THREE.Group
let wheels = [];
let person = null; // THREE.Group
let cam = null;

let speed = 0;
let heading = 0;
let steerAngle = 0;
let repairHold = 0;
let footHeading = 0;

function buildCarMesh() {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xd94f3d, roughness: 0.35, metalness: 0.55 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.15, metalness: 0.7 }),
  );
  cabin.position.set(0, 1.1, -0.25);
  cabin.castShadow = true;
  g.add(cabin);
  // Headlights and tail lights.
  for (const sx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xffe9a8, emissiveIntensity: 1.6 }),
    );
    hl.position.set(sx, 0.62, 2.22);
    g.add(hl);
    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.18, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xcc1111, emissiveIntensity: 1.2 }),
    );
    tl.position.set(sx, 0.62, -2.22);
    g.add(tl);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 });
  wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }
  return g;
}

function buildPersonMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x2f6fb2, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.05, 10), jacket);
  body.position.y = 0.95;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 }),
  );
  head.position.y = 1.75;
  head.castShadow = true;
  g.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0xd94f3d, roughness: 0.7 }),
  );
  cap.position.y = 1.98;
  g.add(cap);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.85 });
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.85, 8), legMat);
    leg.position.set(sx, 0.42, 0);
    g.add(leg);
  }
  return g;
}

export const Player = {
  init(sceneIn, camera) {
    scene = sceneIn;
    cam = camera;
    car = buildCarMesh();
    person = buildPersonMesh();
    person.visible = false;
    scene.add(car);
    scene.add(person);
    speed = 0;
    heading = S.carHeading;
    this.syncToState();
  },

  // Place the meshes where the state says they are.
  syncToState() {
    car.position.set(S.carX, 0, S.carZ);
    car.rotation.y = S.carHeading;
    person.position.set(S.playerX, 0, S.playerZ);
    person.rotation.y = footHeading;
  },

  get position() {
    return S.onFoot ? { x: S.playerX, z: S.playerZ } : { x: S.carX, z: S.carZ };
  },
  get heading() {
    return S.onFoot ? footHeading : S.carHeading;
  },
  get speed() {
    return speed;
  },

  // Snap the chase camera exactly onto its target (used after staging a
  // screenshot scene, so the frame is never caught mid-ease).
  snapCamera() {
    if (!cam) return;
    const px = S.onFoot ? S.playerX : S.carX;
    const pz = S.onFoot ? S.playerZ : S.carZ;
    const hd = S.onFoot ? footHeading : heading;
    const dist = S.onFoot ? 7 : CFG.camDistance;
    const height = S.onFoot ? 3.2 : CFG.camHeight;
    cam.position.set(px - Math.sin(hd) * dist, height, pz - Math.cos(hd) * dist);
    cam.lookAt(px + Math.sin(hd) * 6, 1.4, pz + Math.cos(hd) * 6);
    cam.fov = CFG.fovBase;
    cam.updateProjectionMatrix();
  },

  // Set the on-foot state directly (staging and the self-test use this;
  // normal play goes through tryToggleVehicle).
  setOnFoot(on) {
    S.onFoot = on;
    person.visible = on;
  },
  placeCar(x, z, h, v = 0) {
    S.carX = x;
    S.carZ = z;
    S.carHeading = h;
    heading = h;
    speed = v;
    S.playerX = x;
    S.playerZ = z;
    S.playerHeading = h;
    S.playerSpeed = v;
    this.syncToState();
  },

  // Step out of the car, or climb back in when close to it.
  tryToggleVehicle() {
    if (!S.onFoot) {
      S.onFoot = true;
      S.playerX = S.carX + Math.sin(S.carHeading + Math.PI / 2) * 2.4;
      S.playerZ = S.carZ + Math.cos(S.carHeading + Math.PI / 2) * 2.4;
      footHeading = S.carHeading;
      person.visible = true;
      setHint('On foot — WASD to walk, E to get back in the car');
      return;
    }
    if (dist2d(S.playerX, S.playerZ, S.carX, S.carZ) < 4) {
      S.onFoot = false;
      person.visible = false;
      setHint('Back behind the wheel');
    } else {
      setHint('Too far from the car — walk closer, then press E');
    }
  },

  update(dt) {
    if (S.paused || !S.started) return;
    if (Input.pressed('KeyE')) this.tryToggleVehicle();

    if (S.onFoot) {
      this.updateOnFoot(dt);
    } else {
      this.updateCar(dt);
    }
    this.updateGarage(dt);
    this.updateCamera(dt);
    AudioSys.engine(S.onFoot ? 0 : speed, CFG.carTopSpeed);
  },

  updateCar(dt) {
    const throttle = Input.throttle;
    const steerInput = Input.steer;
    const handbrake = Input.handbrake;

    // Longitudinal: accelerate, brake, reverse, drag.
    if (throttle > 0) speed += CFG.carAccel * dt;
    else if (throttle < 0) {
      if (speed > 0.5) speed -= CFG.carBrake * dt;
      else speed -= CFG.carAccel * 0.7 * dt;
    } else {
      speed -= Math.sign(speed) * Math.min(Math.abs(speed), 4 * dt);
    }
    speed = clamp(speed, -CFG.carReverseMax, CFG.carTopSpeed);
    // Damage caps the top speed a little, so a wrecked car feels wrecked.
    const cap = CFG.carTopSpeed * (1 - (S.carDamage / 100) * 0.35);
    if (speed > cap) speed = Math.max(cap, speed - 8 * dt);

    // Steering: sharper at low speed, steadier at high speed, and the
    // handbrake breaks the rear loose for a drift.
    const steerTarget = steerInput * CFG.carSteer * clamp(1 - Math.abs(speed) / (CFG.carTopSpeed * 1.6), 0.35, 1);
    steerAngle += (steerTarget - steerAngle) * Math.min(1, dt * 8);
    const grip = handbrake ? CFG.handbrakeGrip : CFG.carGrip;
    heading += steerAngle * clamp(Math.abs(speed) / 6, 0, 1) * dt * (speed < 0 ? -1 : 1) * (handbrake ? 1.5 : 1);
    heading = wrapAngle(heading);

    const nx = S.carX + Math.sin(heading) * speed * dt;
    const nz = S.carZ + Math.cos(heading) * speed * dt;
    const hit = collideCircle(nx, nz, CFG.carRadius);
    if (hit.hit && Math.abs(speed) > 6) {
      S.carDamage = Math.min(100, S.carDamage + Math.abs(speed) * 0.5);
      AudioSys.crash(Math.min(1, Math.abs(speed) / 30));
      speed *= 0.4;
    }
    S.carX = clamp(hit.x, -CFG.worldHalf, CFG.worldHalf);
    S.carZ = clamp(hit.z, -CFG.worldHalf, CFG.worldHalf);
    S.carHeading = heading;
    S.playerX = S.carX;
    S.playerZ = S.carZ;
    S.playerHeading = heading;
    S.playerSpeed = speed;

    car.position.set(S.carX, 0, S.carZ);
    car.rotation.y = heading;
    // Wheels spin with speed; the fronts yaw with the steering.
    for (let i = 0; i < wheels.length; i++) {
      wheels[i].rotation.x += (speed * dt) / 0.42;
      if (i < 2) wheels[i].rotation.y = steerAngle * 0.5;
    }
  },

  updateOnFoot(dt) {
    const fwd = Input.throttle;
    const strafe = -Input.steer;
    if (fwd !== 0 || strafe !== 0) {
      const mag = Math.hypot(fwd, strafe);
      const fx = Math.sin(footHeading);
      const fz = Math.cos(footHeading);
      const rx = Math.cos(footHeading);
      const rz = -Math.sin(footHeading);
      const mx = ((fx * fwd + rx * strafe) / mag) * CFG.walkSpeed * dt;
      const mz = ((fz * fwd + rz * strafe) / mag) * CFG.walkSpeed * dt;
      const hit = collideCircle(S.playerX + mx, S.playerZ + mz, 0.5);
      S.playerX = clamp(hit.x, -CFG.worldHalf, CFG.worldHalf);
      S.playerZ = clamp(hit.z, -CFG.worldHalf, CFG.worldHalf);
      S.playerSpeed = CFG.walkSpeed;
      // Face the direction of travel.
      footHeading = Math.atan2(mx, mz);
    } else {
      S.playerSpeed = 0;
    }
    person.position.set(S.playerX, 0, S.playerZ);
    person.rotation.y = footHeading;
    S.playerHeading = footHeading;
    // Little walk bob.
    person.position.y = S.playerSpeed > 0 ? Math.abs(Math.sin(S.time * 9)) * 0.06 : 0;
  },

  updateGarage(dt) {
    // Park on Juno's teal pad and hold still to repair the car.
    if (S.onFoot || S.carDamage <= 0) {
      repairHold = 0;
      return;
    }
    const g = CFG.places.garage;
    if (dist2d(S.carX, S.carZ, g.x, g.z) < 6 && Math.abs(speed) < 0.5) {
      repairHold += dt;
      setHint(`Repairing… ${Math.min(99, Math.floor((repairHold / CFG.garageHoldTime) * 100))}%`);
      if (repairHold >= CFG.garageHoldTime) {
        const cost = Math.min(S.cash, CFG.garageRepairCost);
        addCash(-cost);
        S.carDamage = 0;
        repairHold = 0;
        setHint(`Juno patched you up — $${cost}. Car is good as new.`);
        AudioSys.blip(660, 0.15, 0.15);
      }
    } else {
      repairHold = 0;
    }
  },

  updateCamera(dt) {
    if (!cam) return;
    const px = S.onFoot ? S.playerX : S.carX;
    const pz = S.onFoot ? S.playerZ : S.carZ;
    const hd = S.onFoot ? footHeading : heading;
    const dist = S.onFoot ? 7 : CFG.camDistance;
    const height = S.onFoot ? 3.2 : CFG.camHeight;
    const tx = px - Math.sin(hd) * dist;
    const tz = pz - Math.cos(hd) * dist;
    // Smooth chase: the camera eases after the car instead of snapping.
    const k = 1 - Math.exp(-dt * 5);
    cam.position.x += (tx - cam.position.x) * k;
    cam.position.y += (height - cam.position.y) * k;
    cam.position.z += (tz - cam.position.z) * k;
    cam.lookAt(px + Math.sin(hd) * 6, 1.4, pz + Math.cos(hd) * 6);
    // Speed FOV kick: the view opens from 62 to about 71 degrees flat out.
    const ratio = clamp(Math.abs(speed) / CFG.fovTopSpeed, 0, 1);
    const targetFov = CFG.fovBase + (CFG.fovTop - CFG.fovBase) * ratio;
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 4);
      cam.updateProjectionMatrix();
    }
  },
};
