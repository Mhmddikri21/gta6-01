// OPAL COAST — wanted system and police interceptors that chase the player.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { CONFIG } from './config.js';

export class Police {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.interceptors = [];
    this.flashTimer = 0;
    this.flashOn = false;
  }

  addHeat(amount) {
    this.state.heat = Math.min(100, this.state.heat + amount);
    this.state.lastCrimeAt = this.state.time;
    this.refreshStars();
  }

  forceStars(n) {
    this.state.heat = Math.max(0, Math.min(100, n * 25));
    this.state.lastCrimeAt = this.state.time;
    this.refreshStars();
  }

  refreshStars() {
    this.state.stars = this.state.heat <= 0 ? 0 : Math.min(4, Math.ceil(this.state.heat / 25));
  }

  buildInterceptor() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.55, 4.3),
      new THREE.MeshStandardMaterial({ color: 0x1c2f4a, roughness: 0.35, metalness: 0.5 })
    );
    body.position.y = 0.55;
    body.castShadow = true;
    g.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.4, 1.9),
      new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.3 })
    );
    roof.position.set(0, 1.0, -0.2);
    g.add(roof);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, emissive: 0xff2222, emissiveIntensity: 1.6 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1111cc, emissive: 0x2222ff, emissiveIntensity: 1.6 });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4), redMat);
    red.position.set(-0.45, 1.3, -0.2);
    g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4), blueMat);
    blue.position.set(0.45, 1.3, -0.2);
    g.add(blue);
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111214 });
    for (const [x, z] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.36, z);
      g.add(wheel);
    }
    g.userData.redMat = redMat;
    g.userData.blueMat = blueMat;
    return g;
  }

  spawnInterceptorAt(x, z, heading) {
    const mesh = this.buildInterceptor();
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const unit = { mesh, pos: mesh.position, heading: heading || 0, speed: 0, ramCool: -10 };
    this.interceptors.push(unit);
    return unit;
  }

  spawnNearPlayer(player) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 55 + Math.random() * 20;
    let x = player.pos.x + Math.cos(angle) * dist;
    let z = player.pos.z + Math.sin(angle) * dist;
    x = Math.max(-75, Math.min(75, x));
    z = Math.max(-75, Math.min(75, z));
    return this.spawnInterceptorAt(x, z, 0);
  }

  update(dt, player, onEvent) {
    const now = this.state.time;
    // Cool down after hiding out of sight for a while.
    if (now - this.state.lastCrimeAt > CONFIG.heatCoolDelay && this.state.heat > 0) {
      let nearest = Infinity;
      for (const u of this.interceptors) {
        const d = Math.hypot(u.pos.x - player.pos.x, u.pos.z - player.pos.z);
        if (d < nearest) nearest = d;
      }
      if (nearest > 45) {
        this.state.heat = Math.max(0, this.state.heat - CONFIG.heatCoolRate * dt);
        this.refreshStars();
      }
    }
    const wanted = this.state.stars >= 2 ? Math.min(this.state.stars, 4) : 0;
    while (this.interceptors.length < wanted) this.spawnNearPlayer(player);
    while (this.interceptors.length > wanted) {
      const gone = this.interceptors.pop();
      this.scene.remove(gone.mesh);
    }
    // Flash the light bars.
    this.flashTimer += dt;
    if (this.flashTimer > 0.4) {
      this.flashTimer = 0;
      this.flashOn = !this.flashOn;
      for (const u of this.interceptors) {
        u.mesh.userData.redMat.emissiveIntensity = this.flashOn ? 2.2 : 0.2;
        u.mesh.userData.blueMat.emissiveIntensity = this.flashOn ? 0.2 : 2.2;
      }
    }
    for (const u of this.interceptors) {
      const dx = player.pos.x - u.pos.x;
      const dz = player.pos.z - u.pos.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let diff = want - u.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      u.heading += Math.max(-2.8 * dt, Math.min(2.8 * dt, diff));
      const targetSpeed = Math.min(30 + this.state.stars * 1.5, dist * 0.9 + 8);
      u.speed += (targetSpeed - u.speed) * Math.min(1, dt * 1.2);
      u.pos.x += Math.sin(u.heading) * u.speed * dt;
      u.pos.z += Math.cos(u.heading) * u.speed * dt;
      u.mesh.rotation.y = u.heading;
      if (dist < 3 && now - u.ramCool > 1) {
        u.ramCool = now;
        player.speed *= 0.7;
        player.hull = Math.max(0, player.hull - 2);
        this.addHeat(3);
        onEvent('rammed', { unit: u });
      }
    }
  }
}
