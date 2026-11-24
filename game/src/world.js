// OPAL COAST — the city itself: ground, sea, roads, buildings, beach,
// marina, pier, Juno's garage, plaza, streetlights and palms.
// Returns the colliders (building AABBs) and the named spots.

import { CFG, makeRng, pick } from './config.js';

const THREE = window.THREE;

function box(w, h, d, color, x, y, z, emissive = 0) {
  const mat = new THREE.MeshLambertMaterial({ color });
  if (emissive) mat.emissive = new THREE.Color(emissive);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function cyl(rt, rb, h, color, x, y, z, seg = 10) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, seg),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x, y, z);
  return m;
}

export function buildWorld(scene) {
  const rng = makeRng(CFG.seed);
  const colliders = [];
  const H = CFG.cityHalf;

  // Land, sea and beach.
  const land = new THREE.Mesh(
    new THREE.PlaneGeometry(H * 2 + 20, H * 2 + 20),
    new THREE.MeshLambertMaterial({ color: CFG.palette.ground })
  );
  land.rotation.x = -Math.PI / 2;
  land.position.set(0, 0, 0);
  scene.add(land);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshLambertMaterial({ color: CFG.palette.water })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(120, -0.6, 60);
  scene.add(sea);

  const sand = box(H * 2 + 20, 0.3, 26, CFG.palette.sand, 0, 0.15, H - 2);
  scene.add(sand);
  const sandEast = box(26, 0.3, H * 2 + 20, CFG.palette.sand, H - 2, 0.15, 0);
  scene.add(sandEast);

  // Roads: grid lines every 60 m, both axes. Sidewalks flank each road.
  const lines = [-120, -60, 0, 60, 120];
  for (const c of lines) {
    const ns = box(CFG.roadWidth, 0.1, H * 2 + 20, CFG.palette.road, c, 0.05, 0);
    scene.add(ns);
    const ew = box(H * 2 + 20, 0.1, CFG.roadWidth, CFG.palette.road, 0, 0.05, c);
    scene.add(ew);
    for (const side of [-1, 1]) {
      const off = CFG.roadWidth / 2 + 1.4;
      scene.add(box(2.6, 0.12, H * 2 + 20, CFG.palette.sidewalk, c + side * off, 0.06, 0));
      scene.add(box(H * 2 + 20, 0.12, 2.6, CFG.palette.sidewalk, 0, 0.06, c + side * off));
    }
  }

  // Buildings fill the blocks between roads; the plaza block stays open.
  const centers = [-90, -30, 30, 90];
  for (const bx of centers) {
    for (const bz of centers) {
      if (bx === -30 && bz === 30) continue; // Juno's garage block
      if (bx === 30 && bz === -30) continue; // plaza annex, kept low
      if (bx === 0 || bz === 0) continue; // plaza is the centre block
      const n = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const w = 9 + rng() * 11;
        const d = 9 + rng() * 11;
        const h = 8 + rng() * 30;
        const ox = (rng() - 0.5) * (40 - w);
        const oz = (rng() - 0.5) * (40 - d);
        const x = bx + ox;
        const z = bz + oz;
        const color = pick(rng, CFG.palette.building);
        const b = box(w, h, d, color, x, h / 2, z);
        scene.add(b);
        // Roof rim so buildings read at a glance.
        scene.add(box(w + 0.6, 0.5, d + 0.6, 0x5a5f6a, x, h + 0.25, z));
        // A few lit windows on the street face.
        for (let k = 0; k < 3; k++) {
          const win = box(1.6, 1.2, 0.15, 0xffe9a8, x - w / 2 + 2 + k * 3, 3 + Math.floor(rng() * 3) * 3, z + d / 2 + 0.1, 0xffe9a8);
          scene.add(win);
        }
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // Plaza: disc, fountain and a flag pole at the city centre.
  const disc = cyl(16, 16, 0.4, 0xb8bec8, 0, 0.2, 0, 24);
  scene.add(disc);
  scene.add(cyl(4, 5, 1.2, 0x8a93a3, 0, 0.8, 0, 16));
  scene.add(cyl(3.2, 3.2, 0.3, CFG.palette.water, 0, 1.5, 0, 16));
  scene.add(cyl(0.2, 0.2, 14, 0xdddddd, 0, 7, 0, 6));
  scene.add(box(4, 2.4, 0.2, CFG.palette.gold, 2.1, 12.5, 0, CFG.palette.gold));

  // Juno's garage: wide low block with a gold sign, repair zone in front.
  const g = CFG.garage;
  const gb = box(26, 9, 16, 0x4a6a8a, g.x, 4.5, g.z - 8);
  scene.add(gb);
  scene.add(box(20, 2, 0.4, CFG.palette.gold, g.x, 9.5, g.z + 0.2, CFG.palette.gold));
  colliders.push({ minX: g.x - 13, maxX: g.x + 13, minZ: g.z - 16, maxZ: g.z });

  // Marina: wooden docks and three moored boats on the east edge.
  const m = CFG.marina;
  for (let i = -1; i <= 1; i++) {
    scene.add(box(16, 0.5, 4, 0x8a6a42, m.x + 8, 0.4, m.z + i * 14));
    const hull = box(7, 1.6, 2.6, pick(rng, [0xe8e8e8, 0xc94f4f, 0x4f7ec9]), m.x + 14, 0.6, m.z + i * 14 + 4);
    scene.add(hull);
    scene.add(box(2.4, 1.8, 2, 0xdddddd, m.x + 13, 2.2, m.z + i * 14 + 4));
    scene.add(cyl(0.12, 0.12, 7, 0x666666, m.x + 14, 4.5, m.z + i * 14 + 4, 6));
  }

  // Pier: planks running out to sea from the marina, with posts.
  const p = CFG.pier;
  scene.add(box(42, 0.6, 7, 0x8a6a42, p.x - 4, 0.5, p.z));
  for (let i = 0; i < 5; i++) {
    scene.add(cyl(0.35, 0.35, 2.4, 0x5a4632, p.x - 22 + i * 9, -0.6, p.z - 3, 6));
    scene.add(cyl(0.35, 0.35, 2.4, 0x5a4632, p.x - 22 + i * 9, -0.6, p.z + 3, 6));
  }

  // Beach palms and umbrellas along the south sand.
  for (let i = 0; i < 7; i++) {
    const x = -140 + i * 46 + rng() * 10;
    const z = H - 8 + rng() * 6;
    scene.add(cyl(0.35, 0.5, 7, 0x7a5230, x, 3.5, z, 6));
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 3.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x2e8b57 })
    );
    top.position.set(x, 8.4, z);
    scene.add(top);
    if (i % 2 === 0) {
      const um = new THREE.Mesh(
        new THREE.ConeGeometry(3, 1.6, 10),
        new THREE.MeshLambertMaterial({ color: pick(rng, [0xe86a6a, 0x6aa8e8, 0xe8c95a]) })
      );
      um.position.set(x + 8, 2.6, z + 4);
      scene.add(um);
      scene.add(cyl(0.08, 0.08, 2.4, 0xdddddd, x + 8, 1.2, z + 4, 6));
    }
  }

  // Streetlights along the main roads.
  for (const c of lines) {
    for (const t of [-90, 30]) {
      scene.add(cyl(0.14, 0.18, 6.5, 0x3a3f47, c + 6.5, 3.25, t, 6));
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xfff2b0 })
      );
      lamp.position.set(c + 6.5, 6.7, t);
      scene.add(lamp);
      scene.add(cyl(0.14, 0.18, 6.5, 0x3a3f47, t, 3.25, c + 6.5, 6));
      const lamp2 = lamp.clone();
      lamp2.position.set(t, 6.7, c + 6.5);
      scene.add(lamp2);
    }
  }

  return {
    colliders,
    spots: {
      garage: { x: g.x, z: g.z + 8 },
      marina: { x: m.x, z: m.z },
      pier: { x: p.x, z: p.z },
      plaza: { x: 0, z: 0 },
      beach: { x: 0, z: H - 8 },
    },
  };
}

// Circle-vs-AABB resolve: returns the push-out vector or null.
export function collideCircleAABBs(x, z, r, colliders) {
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      return { x: (dx / d) * (r - d), z: (dz / d) * (r - d) };
    }
  }
  return null;
}
