// OPAL COAST — 10 opal shards hidden around the map, with a pickup chime.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { CONFIG } from './config.js';

const SHARD_SPOTS = [
  [84, -24],
  [114, 0],
  [-45, -33],
  [6, 6],
  [80, 40],
  [30, -45],
  [-15, 45],
  [45, 15],
  [-60, 20],
  [15, -60],
];

export class Collectibles {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.shards = [];
    const geo = new THREE.OctahedronGeometry(0.7);
    for (let i = 0; i < CONFIG.shardCount; i++) {
      const [x, z] = SHARD_SPOTS[i % SHARD_SPOTS.length];
      const mat = new THREE.MeshStandardMaterial({
        color: 0x66e0ff,
        emissive: 0x22bbff,
        emissiveIntensity: 1.4,
        roughness: 0.2,
        metalness: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 1.6, z);
      this.scene.add(mesh);
      this.shards.push({ mesh, x, z, taken: false, phase: i * 0.9 });
    }
  }

  update(dt, player, onEvent) {
    const now = this.state.time;
    for (const s of this.shards) {
      if (s.taken) continue;
      s.mesh.rotation.y += dt * 1.6;
      s.mesh.position.y = 1.6 + Math.sin(now * 2 + s.phase) * 0.35;
      const dx = player.pos.x - s.x;
      const dz = player.pos.z - s.z;
      if (dx * dx + dz * dz < 9) {
        s.taken = true;
        s.mesh.visible = false;
        this.state.shardsCollected++;
        onEvent('shard', { x: s.x, z: s.z });
      }
    }
  }
}
