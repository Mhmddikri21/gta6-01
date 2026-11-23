// OPAL COAST — opal shards: ten glowing stones hidden around the city.
// Walk or drive through one to pick it up: a two-note chime and $25.

// three.min.js is the classic (UMD) build: it sets window.THREE.
import { CFG, dist2d } from './config.js';
import { S, addCash, setHint } from './state.js';
import { AudioSys } from './audio.js';

const shards = [];
let scene = null;

export const Collectibles = {
  init(sceneIn) {
    scene = sceneIn;
    const geo = new THREE.OctahedronGeometry(0.7);
    for (const spot of CFG.shardSpots) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x35e0d0,
        emissive: 0x1fb5a8,
        emissiveIntensity: 1.6,
        roughness: 0.2,
        metalness: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(spot.x, 1.4, spot.z);
      mesh.castShadow = true;
      scene.add(mesh);
      shards.push({ mesh, x: spot.x, z: spot.z, taken: false, phase: Math.random() * Math.PI * 2 });
    }
  },

  get count() {
    return shards.filter((s) => !s.taken).length;
  },
  get list() {
    return shards;
  },

  update(dt) {
    if (S.paused) return;
    for (const s of shards) {
      if (s.taken) continue;
      // Float and spin so they catch the eye.
      s.phase += dt * 2;
      s.mesh.position.y = 1.4 + Math.sin(s.phase) * 0.35;
      s.mesh.rotation.y += dt * 1.5;
      if (dist2d(S.playerX, S.playerZ, s.x, s.z) < CFG.shardRadius) {
        s.taken = true;
        s.mesh.visible = false;
        S.shards += 1;
        addCash(CFG.shardReward);
        setHint(`Opal shard ${S.shards}/${S.shardsTotal} +$${CFG.shardReward}`, 2.5);
        AudioSys.chime();
      }
    }
  },
};
