// OPAL COAST — 10 opal shards hidden around the city. Each one pays $50
// with a two-note chime; finding all ten pays a $250 bonus.

import { CFG } from './config.js';
import { S, addCash, hint } from './state.js';

const THREE = window.THREE;

const SHARD_SPOTS = [
  [6, 6],
  [-40, 150],
  [180, 2],
  [-80, 50],
  [150, -20],
  [-120, 120],
  [120, -120],
  [-30, -90],
  [90, 90],
  [30, -120],
];

export function createShards(scene) {
  const list = [];
  const geo = new THREE.OctahedronGeometry(0.9);
  for (let i = 0; i < CFG.shardCount; i++) {
    const [x, z] = SHARD_SPOTS[i % SHARD_SPOTS.length];
    const mat = new THREE.MeshLambertMaterial({
      color: CFG.palette.opal,
      emissive: CFG.palette.opal,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1.4, z);
    scene.add(mesh);
    list.push({ mesh, x, z, taken: false, phase: i * 0.7 });
  }

  function update(dt, player, audio) {
    for (const s of list) {
      if (s.taken) continue;
      s.mesh.rotation.y += dt * 1.6;
      s.mesh.position.y = 1.4 + Math.sin(S.time * 2 + s.phase) * 0.35;
      const d = Math.hypot(player.pos.x - s.x, player.pos.z - s.z);
      if (d < 2.2) {
        s.taken = true;
        s.mesh.visible = false;
        S.shards++;
        addCash(CFG.shardReward);
        audio.chime();
        if (S.shards >= CFG.shardCount) {
          addCash(250);
          hint('All 10 opals found — $250 bonus!');
        } else {
          hint(`OPAL SHARD +$${CFG.shardReward} (${S.shards}/10)`);
        }
      }
    }
  }

  return { list, update };
}
