// OPAL COAST — mission chain: pickup, tanker escort, losing the tail, race.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { CONFIG } from './config.js';

const REWARDS = { m1: 150, m2: 300, m3: 250, m4: 500 };

const CHECKPOINTS = [
  [60, -45],
  [60, -15],
  [60, 15],
  [60, 45],
  [75, 60],
];

export class Missions {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.current = 'm1';
    this.tanker = null;
    this.tankerHull = 100;
    this.tankerWp = 0;
    this.enemies = [];
    this.rival = null;
    this.checkpointIndex = 0;
    this.checkpointMeshes = [];
    this.m3Timer = 0;
    this.marker = this.buildMarker();
    this.setMission('m1');
  }

  buildMarker() {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 30, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 15;
    g.add(beam);
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9),
      new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb800, emissiveIntensity: 1.2 })
    );
    diamond.position.y = 4;
    g.add(diamond);
    g.userData.diamond = diamond;
    this.scene.add(g);
    return g;
  }

  setMarker(x, z) {
    this.marker.position.set(x, 0, z);
    this.marker.visible = true;
  }

  hideMarker() {
    this.marker.visible = false;
  }

  buildTanker() {
    const g = new THREE.Group();
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.2, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xc9a13a, roughness: 0.5, metalness: 0.3 })
    );
    cab.position.set(0, 1.4, 3.4);
    cab.castShadow = true;
    g.add(cab);
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 6.4, 14),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.35, metalness: 0.6 })
    );
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 1.5, -1.2);
    tank.castShadow = true;
    g.add(tank);
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111214 });
    for (const [x, z] of [[-1.05, 4.2], [1.05, 4.2], [-1.05, -3.6], [1.05, -3.6], [-1.05, -1.2], [1.05, -1.2]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.42, z);
      g.add(wheel);
    }
    return g;
  }

  buildEnemyCar() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x8a1f1f, roughness: 0.4, metalness: 0.4 })
    );
    body.position.y = 0.55;
    body.castShadow = true;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.45, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x20242a })
    );
    cabin.position.set(0, 0.95, -0.2);
    g.add(cabin);
    return g;
  }

  buildCheckpointRing() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.28, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb800, emissiveIntensity: 0.9 })
    );
    // Default torus faces ±Z: the gate stands across the road the race runs.
    return ring;
  }

  setMission(id) {
    this.current = id;
    this.state.missionId = id;
    this.teardownMissionEntities();
    if (id === 'm1') {
      this.state.objective = 'Drive to the marina and meet Dalia';
      this.setMarker(82, -10);
    } else if (id === 'm2') {
      this.state.objective = 'Escort the tanker — keep its hull above 30%';
      this.state.hullWarned = false;
      this.tankerHull = 100;
      this.tankerWp = 0;
      this.tanker = this.buildTanker();
      this.tanker.position.set(-60, 0, -60);
      this.tanker.userData.route = [[-60, -60], [60, -60], [60, 0], [60, 60], [-60, 60]];
      this.tanker.userData.heading = Math.PI / 2;
      this.scene.add(this.tanker);
      for (let i = 0; i < 2; i++) {
        const enemy = this.buildEnemyCar();
        enemy.position.set(-40 + i * 30, 0, -30);
        this.scene.add(enemy);
        this.enemies.push({ mesh: enemy, pos: enemy.position, heading: 0, speed: 0, ramCool: -10 });
      }
      this.setMarker(60, -60);
    } else if (id === 'm3') {
      this.state.objective = 'Lose the tail — reach Juno\u2019s garage';
      this.m3Timer = 0;
      this.setMarker(-45, -33);
    } else if (id === 'm4') {
      this.state.objective = 'Coast race — hit all 5 checkpoints, beat Nacho';
      this.checkpointIndex = 0;
      for (const [x, z] of CHECKPOINTS) {
        const ring = this.buildCheckpointRing();
        ring.position.set(x, 2.2, z);
        this.scene.add(ring);
        this.checkpointMeshes.push(ring);
      }
      this.rival = this.buildEnemyCar();
      this.rival.children[0].material = new THREE.MeshStandardMaterial({ color: 0xd81f1f, roughness: 0.35, metalness: 0.5 });
      this.rival.position.set(56, 0, -48);
      this.scene.add(this.rival);
      this.setMarker(CHECKPOINTS[0][0], CHECKPOINTS[0][1]);
    }
  }

  teardownMissionEntities() {
    if (this.tanker) {
      this.scene.remove(this.tanker);
      this.tanker = null;
    }
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
    if (this.rival) {
      this.scene.remove(this.rival);
      this.rival = null;
    }
    for (const r of this.checkpointMeshes) this.scene.remove(r);
    this.checkpointMeshes = [];
  }

  placeTanker(x, z) {
    if (this.tanker) this.tanker.position.set(x, 0, z);
  }

  placeRival(x, z) {
    if (this.rival) this.rival.position.set(x, 0, z);
  }

  complete(id, onEvent) {
    const reward = REWARDS[id] || 100;
    onEvent('mission-complete', { mission: id, reward });
    const next = { m1: 'm2', m2: 'm3', m3: 'm4', m4: 'm1' }[id];
    this.setMission(next);
  }

  update(dt, ctx, onEvent) {
    const { player, police } = ctx;
    const now = this.state.time;
    this.marker.userData.diamond.rotation.y += dt * 2;
    this.marker.userData.diamond.position.y = 4 + Math.sin(now * 2.5) * 0.5;

    if (this.current === 'm1') {
      if (this.near(player.pos, 82, -10, 5)) this.complete('m1', onEvent);
    } else if (this.current === 'm2') {
      this.updateTanker(dt, onEvent);
    } else if (this.current === 'm3') {
      this.m3Timer += dt;
      if (this.near(player.pos, -45, -33, 6)) {
        police.forceStars(0);
        this.complete('m3', onEvent);
      }
    } else if (this.current === 'm4') {
      this.updateRace(dt, player, onEvent);
    }
  }

  near(pos, x, z, r) {
    const dx = pos.x - x;
    const dz = pos.z - z;
    return dx * dx + dz * dz < r * r;
  }

  updateTanker(dt, onEvent) {
    if (!this.tanker) return;
    const route = this.tanker.userData.route;
    const target = route[this.tankerWp];
    const dx = target[0] - this.tanker.position.x;
    const dz = target[1] - this.tanker.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) {
      this.tankerWp++;
      if (this.tankerWp >= route.length) {
        this.complete('m2', onEvent);
        return;
      }
    } else {
      const want = Math.atan2(dx, dz);
      this.tanker.userData.heading = want;
      this.tanker.rotation.y = want;
      this.tanker.position.x += Math.sin(want) * 8 * dt;
      this.tanker.position.z += Math.cos(want) * 8 * dt;
    }
    this.setMarker(route[Math.min(this.tankerWp, route.length - 1)][0], route[Math.min(this.tankerWp, route.length - 1)][1]);
    // Enemy sedans ram the tanker.
    for (const e of this.enemies) {
      const ex = this.tanker.position.x - e.pos.x;
      const ez = this.tanker.position.z - e.pos.z;
      const ed = Math.hypot(ex, ez);
      const want = Math.atan2(ex, ez);
      e.heading = want;
      e.mesh.rotation.y = want;
      const speed = Math.min(16, ed * 0.8 + 6);
      e.pos.x += Math.sin(want) * speed * dt;
      e.pos.z += Math.cos(want) * speed * dt;
      if (ed < 3.6 && this.state.time - e.ramCool > 1) {
        e.ramCool = this.state.time;
        this.tankerHull = Math.max(0, this.tankerHull - 7);
        onEvent('tanker-hit', { hull: this.tankerHull });
        if (this.tankerHull < 30 && !this.state.hullWarned) {
          this.state.hullWarned = true;
          onEvent('hull-warning', { hull: this.tankerHull });
        }
        if (this.tankerHull <= 0) {
          onEvent('tanker-lost', {});
          this.tankerHull = 100;
          this.state.hullWarned = false;
          this.tankerWp = 0;
          this.tanker.position.set(-60, 0, -60);
        }
      }
    }
  }

  updateRace(dt, player, onEvent) {
    if (this.checkpointIndex >= CHECKPOINTS.length) return;
    const [cx, cz] = CHECKPOINTS[this.checkpointIndex];
    const ring = this.checkpointMeshes[this.checkpointIndex];
    if (ring) {
      ring.rotation.z += dt * 0.8;
      ring.scale.setScalar(1 + Math.sin(this.state.time * 3) * 0.06);
    }
    // Rival Nacho runs the same gates, aiming just past each one.
    if (this.rival) {
      const rx = cx - 4;
      const rz = cz + 4;
      const dx = rx - this.rival.position.x;
      const dz = rz - this.rival.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 1) {
        const want = Math.atan2(dx, dz);
        this.rival.rotation.y = want;
        this.rival.position.x += Math.sin(want) * 22 * dt;
        this.rival.position.z += Math.cos(want) * 22 * dt;
      }
    }
    if (this.near(player.pos, cx, cz, 5)) {
      onEvent('checkpoint', { index: this.checkpointIndex, reward: 50 });
      this.checkpointIndex++;
      if (this.checkpointIndex >= CHECKPOINTS.length) {
        this.complete('m4', onEvent);
      } else {
        this.setMarker(CHECKPOINTS[this.checkpointIndex][0], CHECKPOINTS[this.checkpointIndex][1]);
      }
    }
  }
}
