// OPAL COAST — collectibles: 10 glowing opal shards hidden around the city.

import { CFG, mulberry32 } from './config.js';
import { S, addCash, showHint } from './state.js';
import { chime } from './audio.js';

export const Collectibles = {
  shards: [], // {mesh, x, z, taken}
};

function makeShard() {
  const g = new THREE.Group();
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshLambertMaterial({ color: 0x7fe7ff, emissive: 0x2288aa })
  );
  gem.position.y = 1.2;
  g.add(gem);
  return g;
}

export function initCollectibles(scene) {
  const rng = mulberry32(31337);
  const spots = [
    [96, -84], [122, 20], [-63, 42], [0, 0], [116, -40],
    [-84, -84], [42, 84], [-42, -42], [84, 84], [21, -63],
  ];
  for (let i = 0; i < CFG.shardCount; i++) {
    const [x, z] = spots[i];
    const mesh = makeShard();
    mesh.position.set(x + (rng() - 0.5) * 4, 0, z + (rng() - 0.5) * 4);
    scene.add(mesh);
    Collectibles.shards.push({ mesh, x: mesh.position.x, z: mesh.position.z, taken: false });
  }
}

export function updateCollectibles(dt) {
  const px = S.onFoot ? S.player.x : S.car.x;
  const pz = S.onFoot ? S.player.z : S.car.z;
  for (const s of Collectibles.shards) {
    if (s.taken) continue;
    s.mesh.rotation.y += dt * 2;
    s.mesh.position.y = Math.sin(S.time * 2 + s.x) * 0.2;
    const dx = px - s.x;
    const dz = pz - s.z;
    if (dx * dx + dz * dz < 2.5 * 2.5) {
      s.taken = true;
      s.mesh.visible = false;
      S.shards++;
      addCash(CFG.shardReward);
      chime();
      showHint(`Opal shard ${S.shards}/${CFG.shardCount} — +$${CFG.shardReward}`);
      if (S.shards === CFG.shardCount) {
        addCash(CFG.shardAllBonus);
        showHint(`All ${CFG.shardCount} shards — bonus +$${CFG.shardAllBonus}!`, 3);
      }
    }
  }
}
