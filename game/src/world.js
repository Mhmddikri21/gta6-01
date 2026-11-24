// OPAL COAST — builds the city: road grid, buildings, beach, marina, pier, garage.
// Uses the global THREE (classic UMD build). Deterministic via the seeded RNG.

import { CFG, PLACES, mulberry32, streetLines } from './config.js';

export const world = {
  group: null,
  colliders: [], // {x, z, r} circles the car and peds avoid
  roadSet: new Set(), // "x,z" grid cells that are road, for traffic routing
  buildings: [],
};

const PALETTE = [0x2e4a6b, 0x8a6d4b, 0x5b7a5e, 0x7a4b5e, 0x4b6a7a, 0x9a8a6b, 0x3d5a80];

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

export function buildWorld(scene) {
  const g = new THREE.Group();
  world.group = g;
  const rng = mulberry32(20261124);
  const half = (CFG.grid * CFG.blockSize) / 2;

  // Ground: grass inland, sand near the sea.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 80, half * 2 + 80),
    new THREE.MeshLambertMaterial({ color: 0x4a7a4a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(20, 0, 0);
  g.add(ground);

  // Beach strip and sea.
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(18, half * 2 + 80),
    new THREE.MeshLambertMaterial({ color: 0xd8c28a })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(CFG.beachX + 4, 0.02, 0);
  g.add(beach);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(90, half * 2 + 80),
    new THREE.MeshLambertMaterial({ color: 0x1e6a8a })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(CFG.seaX + 45, 0.01, 0);
  g.add(sea);

  // Roads: dark strips along every street line.
  for (const line of streetLines()) {
    const len = half * 2 + CFG.roadWidth;
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(line.axis === 'x' ? len : CFG.roadWidth, line.axis === 'x' ? CFG.roadWidth : len),
      new THREE.MeshLambertMaterial({ color: 0x2a2a2e })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(line.axis === 'x' ? 0 : line.at, 0.03, line.axis === 'x' ? line.at : 0);
    g.add(road);
  }

  // Buildings: one or two per block, never on roads.
  for (let bx = 0; bx < CFG.grid; bx++) {
    for (let bz = 0; bz < CFG.grid; bz++) {
      const cx = -half + bx * CFG.blockSize + CFG.blockSize / 2;
      const cz = -half + bz * CFG.blockSize + CFG.blockSize / 2;
      if (cx > CFG.beachX - 20) continue; // keep the beach clear
      const n = 1 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const w = 10 + rng() * 10;
        const d = 10 + rng() * 10;
        const h = 6 + rng() * 18;
        const x = cx + (rng() - 0.5) * (CFG.blockSize - w - 8);
        const z = cz + (rng() - 0.5) * (CFG.blockSize - d - 8);
        const color = PALETTE[Math.floor(rng() * PALETTE.length)];
        const b = box(w, h, d, color, x, h / 2, z);
        g.add(b);
        world.colliders.push({ x, z, r: Math.max(w, d) * 0.7 });
        world.buildings.push({ x, z, w, h, d });
        // Lit windows: a lighter slab on the roof edge.
        const trim = box(w * 0.9, 0.4, d * 0.9, 0xf2d38a, x, h + 0.2, z);
        g.add(trim);
      }
    }
  }

  // Marina: wooden dock + three boats.
  const dock = box(8, 0.6, 60, 0x8a6d4b, PLACES.marina.x, 0.3, PLACES.marina.z);
  g.add(dock);
  for (let i = 0; i < 3; i++) {
    const bx = PLACES.marina.x - 8 - i * 4;
    const bz = PLACES.marina.z - 18 + i * 18;
    const hull = box(4, 1.5, 10, 0xe8e8e8, bx, 0.8, bz);
    g.add(hull);
    const mast = box(0.3, 9, 0.3, 0x5a4a3a, bx, 5, bz);
    g.add(mast);
  }

  // Pier: planks out over the sea.
  const pier = box(30, 0.6, 8, 0x7a5a3a, PLACES.pier.x + 8, 0.3, PLACES.pier.z);
  g.add(pier);

  // Juno's garage: open-front shed with a teal sign slab.
  const garage = box(16, 7, 12, 0x3a5a6a, PLACES.garage.x, 3.5, PLACES.garage.z);
  g.add(garage);
  const sign = box(14, 1.6, 0.5, 0x2ec4b6, PLACES.garage.x, 7.6, PLACES.garage.z - 6.2);
  g.add(sign);

  // Plaza: pale paving circle at the centre.
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(16, 24),
    new THREE.MeshLambertMaterial({ color: 0xc8b89a })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(PLACES.plaza.x, 0.04, PLACES.plaza.z);
  g.add(plaza);

  // Palms along the beach.
  for (let i = 0; i < 12; i++) {
    const z = -half + i * ((half * 2) / 12);
    const trunk = box(0.6, 6, 0.6, 0x6a4a2a, CFG.beachX + 2, 3, z);
    g.add(trunk);
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x2a7a3a })
    );
    top.position.set(CFG.beachX + 2, 6.8, z);
    g.add(top);
  }

  scene.add(g);
  return world;
}

// True when (x, z) is on a road (within half a road width of a street line).
export function onRoad(x, z) {
  const half = CFG.roadWidth / 2;
  const lines = streetLines();
  for (const line of lines) {
    const v = line.axis === 'x' ? z : x;
    if (Math.abs(v - line.at) <= half) return true;
  }
  return false;
}

// Circle-collider test for the car and peds.
export function hitsCollider(x, z, r) {
  for (const c of world.colliders) {
    const dx = x - c.x;
    const dz = z - c.z;
    if (dx * dx + dz * dz < (c.r + r) * (c.r + r)) return c;
  }
  return null;
}
