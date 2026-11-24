// OPAL COAST — the player: arcade car physics, on-foot mode, the chase
// camera with its speed FOV kick, garage repair and enter/exit.

import { CFG, clamp, lerp, dist2 } from './config.js';
import { S, addCash, hint } from './state.js';
import { collideCircleAABBs } from './world.js';

const THREE = window.THREE;

function makeCarMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.72, 4.4),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.62;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.62, 2.1),
    new THREE.MeshLambertMaterial({ color: 0x222831 })
  );
  cabin.position.set(0, 1.22, -0.25);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-1.05, 1.45], [1.05, 1.45], [-1.05, -1.45], [1.05, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), lightMat);
    hl.position.set(s * 0.7, 0.72, 2.22);
    g.add(hl);
    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.18, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a })
    );
    tl.position.set(s * 0.7, 0.72, -2.22);
    g.add(tl);
  }
  return g;
}

function makePersonMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.42, 1.05, 10),
    new THREE.MeshLambertMaterial({ color: 0xe86a6a })
  );
  body.position.y = 0.95;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b88a })
  );
  head.position.y = 1.75;
  g.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x2a3a5a })
  );
  legs.position.y = 0.25;
  g.add(legs);
  return g;
}

export function createPlayer(scene, camera, world, input, audio) {
  const car = makeCarMesh(CFG.palette.car);
  scene.add(car);
  const person = makePersonMesh();
  person.visible = false;
  scene.add(person);

  const P = {
    car,
    person,
    pos: new THREE.Vector3(0, 0, 30),
    heading: Math.PI,
    speed: 0,
    onFoot: false,
    damage: 0,
    repairCharged: false,
    camPos: new THREE.Vector3(0, 4, 42),
    fov: CFG.fovMin,
  };

  function forward() {
    return { x: Math.sin(P.heading), z: Math.cos(P.heading) };
  }

  function desiredCam() {
    const f = forward();
    const back = P.onFoot ? 5.5 : 9.5;
    const height = P.onFoot ? 2.6 : 3.8;
    return new THREE.Vector3(P.pos.x - f.x * back, height, P.pos.z - f.z * back);
  }

  P.snapCamera = function () {
    const d = desiredCam();
    P.camPos.copy(d);
    camera.position.copy(d);
    const f = forward();
    camera.lookAt(P.pos.x + f.x * 6, 1.4, P.pos.z + f.z * 6);
  };

  P.resetTo = function (x, z, heading, speed = 0, onFoot = false) {
    P.pos.set(x, 0, z);
    P.heading = heading;
    P.speed = speed;
    P.onFoot = onFoot;
    S.onFoot = onFoot;
    P.damage = 0;
    if (!onFoot) {
      car.position.copy(P.pos);
      car.rotation.y = heading;
    } else {
      // Park the car off to the side so it never blocks the camera
      // when the player is on foot.
      car.position.set(x, 0, z + 6);
      car.rotation.y = heading;
    }
    person.position.copy(P.pos);
    person.rotation.y = heading;
    person.visible = onFoot;
    P.snapCamera();
  };

  P.update = function (dt) {
    // Enter / exit the car.
    if (input.pressed('KeyE')) {
      if (!P.onFoot && Math.abs(P.speed) < 1) {
        P.onFoot = true;
        S.onFoot = true;
        person.visible = true;
        person.position.set(P.pos.x + 2.4, 0, P.pos.z);
        hint('On foot — press E near the car to get back in');
      } else if (P.onFoot && dist2(P.pos.x, P.pos.z, car.position.x, car.position.z) < 12) {
        P.onFoot = false;
        S.onFoot = false;
        person.visible = false;
        hint('Back behind the wheel');
      }
    }

    if (P.onFoot) {
      const f = forward();
      const th = input.throttle;
      const st = input.steer;
      P.heading += st * 2.4 * dt;
      const mv = th * CFG.walkSpeed;
      P.pos.x += f.x * mv * dt;
      P.pos.z += f.z * mv * dt;
      person.position.copy(P.pos);
      person.rotation.y = P.heading;
      P.speed = Math.abs(mv);
      S.speedKmh = Math.round(P.speed * 3.6);
    } else {
      const th = input.throttle;
      const st = input.steer;
      if (th > 0) P.speed += CFG.accel * dt;
      else if (th < 0) {
        if (P.speed > 0.5) P.speed -= CFG.brake * dt;
        else P.speed -= CFG.accel * 0.5 * dt;
      }
      P.speed -= P.speed * 0.12 * dt;
      if (input.handbrake) {
        P.speed -= P.speed * 1.4 * dt;
      }
      P.speed = clamp(P.speed, -CFG.reverseMax, CFG.maxSpeed);
      const steerAuthority = clamp(Math.abs(P.speed) / 8, 0, 1) * Math.sign(P.speed || 1);
      P.heading += st * CFG.steerRate * steerAuthority * dt * (input.handbrake ? 1.7 : 1);

      const f = forward();
      P.pos.x += f.x * P.speed * dt;
      P.pos.z += f.z * P.speed * dt;

      // Building collisions: push out, bounce, take damage.
      const push = collideCircleAABBs(P.pos.x, P.pos.z, 1.7, world.colliders);
      if (push) {
        P.pos.x += push.x;
        P.pos.z += push.z;
        if (Math.abs(P.speed) > 6) {
          audio.crash();
          P.damage = Math.min(100, P.damage + 3);
          hint('Crunched the paintwork');
        }
        P.speed *= -0.22;
      }
      // City bounds (the pier runs out to x 205).
      if (P.pos.x > 208 || P.pos.x < -168 || P.pos.z > 168 || P.pos.z < -168) {
        P.pos.x = clamp(P.pos.x, -168, 208);
        P.pos.z = clamp(P.pos.z, -168, 168);
        P.speed *= 0.4;
      }
      car.position.copy(P.pos);
      car.rotation.y = P.heading;
      S.speedKmh = Math.round(Math.abs(P.speed) * 3.6);
      S.damage = Math.round(P.damage);
      audio.engine(Math.abs(P.speed) / CFG.maxSpeed);
    }

    // Garage repair: stopped in the zone, damage drains, one $20 charge.
    const gz = world.spots.garage;
    const nearGarage = dist2(P.pos.x, P.pos.z, gz.x, gz.z) < 100;
    if (!P.onFoot && nearGarage && Math.abs(P.speed) < 1 && P.damage > 0) {
      if (!P.repairCharged) {
        if (S.cash >= CFG.repairCost) {
          addCash(-CFG.repairCost);
          P.repairCharged = true;
          hint(`Juno's garage — repairing ($${CFG.repairCost})`);
        }
      }
      P.damage = Math.max(0, P.damage - 25 * dt);
    } else if (!nearGarage) {
      P.repairCharged = false;
    }

    // Chase camera with the speed FOV kick.
    const target = lerp(CFG.fovMin, CFG.fovMax, Math.abs(P.speed) / CFG.maxSpeed);
    if (Math.abs(target - P.fov) > 0.05) {
      P.fov = target;
      camera.fov = P.fov;
      camera.updateProjectionMatrix();
    }
    const d = desiredCam();
    const k = 1 - Math.exp(-6 * dt);
    P.camPos.lerp(d, k);
    camera.position.copy(P.camPos);
    const f = forward();
    camera.lookAt(P.pos.x + f.x * 6, 1.4, P.pos.z + f.z * 6);
  };

  return P;
}
