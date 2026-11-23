// OPAL COAST — the player: arcade car physics and on-foot walking.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { CONFIG } from './config.js';

export class Player {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.pos = new THREE.Vector3(-30, 0, 45);
    this.heading = Math.PI;
    this.speed = 0;
    this.steer = 0;
    this.hull = 100;
    this.inCar = true;
    this.carGroup = this.buildCar(0x2fa3a3);
    this.walkerGroup = this.buildWalker(0x2fa3a3);
    this.walkerGroup.visible = false;
    this.scene.add(this.carGroup);
    this.scene.add(this.walkerGroup);
    this.syncMeshes();
  }

  buildCar(color) {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.6, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.3), paint);
    body.position.y = 0.55;
    body.castShadow = true;
    g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.0), dark);
    cabin.position.set(0, 1.05, -0.25);
    cabin.castShadow = true;
    g.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.9 });
    this.wheels = [];
    for (const [x, z] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.36, z);
      wheel.castShadow = true;
      g.add(wheel);
      this.wheels.push(wheel);
    }
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 1.4 });
    for (const x of [-0.6, 0.6]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headMat);
      lamp.position.set(x, 0.6, 2.16);
      g.add(lamp);
    }
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xcc2222, emissiveIntensity: 0.9 });
    for (const x of [-0.6, 0.6]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), tailMat);
      lamp.position.set(x, 0.6, -2.16);
      g.add(lamp);
    }
    return g;
  }

  buildWalker(color) {
    const g = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 1.1, 10), jacket);
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 })
    );
    head.position.y = 1.72;
    head.castShadow = true;
    g.add(head);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.29, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0x223344 })
    );
    cap.position.y = 1.92;
    g.add(cap);
    return g;
  }

  teleport(x, z, heading) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.syncMeshes();
  }

  exitCar() {
    if (!this.inCar) return;
    this.inCar = false;
    this.state.mode = 'foot';
    this.pos.x += Math.cos(this.heading) * 2.2;
    this.pos.z -= Math.sin(this.heading) * 2.2;
    this.speed = 0;
    this.syncMeshes();
  }

  enterCar() {
    if (this.inCar) return;
    this.inCar = true;
    this.state.mode = 'car';
    this.speed = 0;
    this.syncMeshes();
  }

  syncMeshes() {
    this.carGroup.position.copy(this.pos);
    this.carGroup.rotation.y = this.heading;
    this.walkerGroup.position.copy(this.pos);
    this.walkerGroup.rotation.y = this.heading;
    this.carGroup.visible = this.inCar;
    this.walkerGroup.visible = !this.inCar;
    for (const w of this.wheels || []) w.rotation.x += this.speed * 0.016;
  }

  // Headless self-test drive: straight ahead, no input.
  autoDrive(dt, world) {
    this.speed = Math.min(this.speed + CONFIG.playerAccel * dt, 20);
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    world.clampPos(this.pos, 1.4);
    world.collideCircle(this.pos, 1.4, this.speed);
    this.syncMeshes();
  }

  update(dt, input, world, onEvent) {
    if (input.hit('KeyE')) {
      if (this.inCar) this.exitCar();
      else {
        // Re-enter only when standing close to the car.
        const dx = this.pos.x - this.carGroup.position.x;
        const dz = this.pos.z - this.carGroup.position.z;
        if (dx * dx + dz * dz < 25) this.enterCar();
      }
    }
    if (this.inCar) this.drive(dt, input, world, onEvent);
    else this.walk(dt, input, world);
    this.syncMeshes();
  }

  drive(dt, input, world, onEvent) {
    const fwd = input.down('KeyW', 'ArrowUp');
    const rev = input.down('KeyS', 'ArrowDown');
    const left = input.down('KeyA', 'ArrowLeft');
    const right = input.down('KeyD', 'ArrowRight');
    const hand = input.down('Space');
    if (fwd) this.speed += CONFIG.playerAccel * dt;
    if (rev) this.speed -= (this.speed > 0.5 ? CONFIG.playerBrake : CONFIG.playerAccel * 0.6) * dt;
    if (!fwd && !rev) this.speed -= this.speed * 0.6 * dt;
    if (hand) this.speed -= Math.sign(this.speed) * 22 * dt;
    // A blown engine (hull 0) limps at 6 m/s until Juno repairs it.
    const topSpeed = this.hull <= 0 ? 6 : CONFIG.playerMaxSpeed;
    if (this.speed > topSpeed) this.speed = topSpeed;
    if (this.speed < -CONFIG.playerReverseMax) this.speed = -CONFIG.playerReverseMax;
    if (Math.abs(this.speed) < 0.05 && !fwd && !rev) this.speed = 0;

    const steerInput = (left ? 1 : 0) - (right ? 1 : 0);
    const speedFactor = Math.min(Math.abs(this.speed) / CONFIG.playerMaxSpeed, 1);
    const maxSteer = CONFIG.playerSteerMax * (1 - speedFactor * 0.5) * (hand ? 1.5 : 1);
    const targetSteer = steerInput * maxSteer;
    this.steer += (targetSteer - this.steer) * Math.min(1, dt * 8);
    const yawRate = (this.speed / CONFIG.wheelBase) * Math.tan(this.steer) * 0.5;
    this.heading += yawRate * dt;

    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    world.clampPos(this.pos, 1.4);
    const impact = world.collideCircle(this.pos, 1.4, this.speed);
    if (impact > 4) {
      this.speed *= 0.55;
      this.hull = Math.max(0, this.hull - impact * 0.12);
      onEvent('crash-wall', { impact });
    }
  }

  walk(dt, input, world) {
    const fwd = input.down('KeyW', 'ArrowUp') ? 1 : 0;
    const back = input.down('KeyS', 'ArrowDown') ? 1 : 0;
    const left = input.down('KeyA', 'ArrowLeft') ? 1 : 0;
    const right = input.down('KeyD', 'ArrowRight') ? 1 : 0;
    this.heading += ((left ? 1 : 0) - (right ? 1 : 0)) * 2.4 * dt;
    const move = (fwd - back) * CONFIG.walkSpeed;
    this.pos.x += Math.sin(this.heading) * move * dt;
    this.pos.z += Math.cos(this.heading) * move * dt;
    world.clampPos(this.pos, 0.5);
    world.collideCircle(this.pos, 0.5, move);
  }
}
