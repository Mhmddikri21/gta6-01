// OPAL COAST — AI traffic: cars looping the street grid, near-miss detection.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { CONFIG } from './config.js';

const LOOPS = [
  [[-30, -30], [0, -30], [0, 0], [-30, 0]],
  [[0, -30], [30, -30], [30, 0], [0, 0]],
  [[-30, 0], [0, 0], [0, 30], [-30, 30]],
  [[0, 0], [30, 0], [30, 30], [0, 30]],
  [[-60, -60], [-30, -60], [-30, -30], [-60, -30]],
  [[30, -60], [60, -60], [60, -30], [30, -30]],
  [[-60, 30], [-30, 30], [-30, 60], [-60, 60]],
  [[30, 30], [60, 30], [60, 60], [30, 60]],
  [[-60, -30], [-30, -30], [-30, 0], [-60, 0]],
];

const COLORS = [0xd8d2c2, 0xc96a4a, 0x4a7ac9, 0xe0cfa0, 0x6a8a5a, 0x8a5a7a, 0xd8d8d8, 0x3a3f45];

export class Traffic {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.cars = [];
    for (let i = 0; i < CONFIG.trafficCount; i++) {
      const loop = LOOPS[i % LOOPS.length];
      const start = loop[i % loop.length];
      const car = {
        loop,
        wp: (i % loop.length + 1) % loop.length,
        pos: new THREE.Vector3(start[0], 0, start[1]),
        heading: 0,
        speed: CONFIG.trafficSpeed * (0.85 + (i % 5) * 0.07),
        hitCool: -10,
        nmCool: -10,
        mesh: this.buildCar(COLORS[i % COLORS.length]),
      };
      car.mesh.position.copy(car.pos);
      this.scene.add(car.mesh);
      this.cars.push(car);
    }
  }

  buildCar(color) {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.6), paint);
    body.position.y = 0.5;
    body.castShadow = true;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.45, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.5 })
    );
    cabin.position.set(0, 0.95, -0.2);
    g.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.26, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111214 });
    for (const [x, z] of [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.33, z);
      g.add(wheel);
    }
    return g;
  }

  update(dt, player, onEvent) {
    const now = this.state.time;
    for (const car of this.cars) {
      const target = car.loop[car.wp];
      const dx = target[0] - car.pos.x;
      const dz = target[1] - car.pos.z;
      const dist = Math.hypot(dx, dz);
      // Ease off when another car is right ahead, so traffic never piles up.
      let cruise = car.speed;
      for (const other of this.cars) {
        if (other === car) continue;
        const ox = other.pos.x - car.pos.x;
        const oz = other.pos.z - car.pos.z;
        const ahead = ox * Math.sin(car.heading) + oz * Math.cos(car.heading);
        const side = Math.abs(ox * Math.cos(car.heading) - oz * Math.sin(car.heading));
        if (ahead > 0 && ahead < 6 && side < 2.2) {
          cruise = car.speed * 0.35;
          break;
        }
      }
      if (dist < 2.5) {
        car.wp = (car.wp + 1) % car.loop.length;
      } else {
        const want = Math.atan2(dx, dz);
        let diff = want - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        car.pos.x += Math.sin(car.heading) * cruise * dt;
        car.pos.z += Math.cos(car.heading) * cruise * dt;
      }
      car.mesh.position.copy(car.pos);
      car.mesh.rotation.y = car.heading;

      if (!player) continue;
      const pdx = car.pos.x - player.pos.x;
      const pdz = car.pos.z - player.pos.z;
      const pdist = Math.hypot(pdx, pdz);
      if (player.inCar && pdist < 2.8 && now - car.hitCool > 1) {
        car.hitCool = now;
        player.speed *= 0.55;
        player.hull = Math.max(0, player.hull - 4);
        onEvent('traffic-hit', { car });
      }
      // Near-miss: fast pass close by, no contact, per-car cooldown.
      if (
        player.inCar &&
        Math.abs(player.speed) > CONFIG.nearMissSpeed &&
        pdist > 2.8 &&
        pdist < CONFIG.nearMissDist &&
        now - car.nmCool > CONFIG.nearMissCooldown
      ) {
        car.nmCool = now;
        onEvent('near-miss', { car });
      }
    }
  }
}
