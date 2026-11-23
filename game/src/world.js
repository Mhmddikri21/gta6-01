// OPAL COAST — the city itself.
// Builds the coastal grid: roads, sidewalks, buildings, the beach, the
// marina and the pier, plus the collision boxes the cars use. The layout
// is seeded, so the same city appears on every load.

// three.min.js is the classic (UMD) build: it sets window.THREE, so the
// modules below use the global instead of importing it.
import { CFG, ROAD_LINES, mulberry32 } from './config.js';

// A collision box: { minX, maxX, minZ, maxZ } on the ground plane.
export const colliders = [];

// Named spots other modules need: garage pad, marina, pier, spawn.
export const spots = {
  garage: { x: CFG.places.garage.x, z: CFG.places.garage.z },
  marina: { x: CFG.places.marina.x, z: CFG.places.marina.z },
  pier: { x: CFG.places.pier.x, z: CFG.places.pier.z },
};

let sceneRef = null;

function box(w, h, d, color, x, y, z, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.05,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  m.castShadow = true;
  m.receiveShadow = true;
  sceneRef.add(m);
  return m;
}

function flat(w, d, color, x, z, y = 0.02) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  sceneRef.add(m);
  return m;
}

function buildGround() {
  // City base slab.
  flat(420, 420, 0x9aa07a, 0, 0, 0.0);
  // The sea, west of the coast, with a slow swell in the animation step.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 420, 24, 24),
    new THREE.MeshStandardMaterial({ color: CFG.palette.sea, roughness: 0.25, metalness: 0.35 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(CFG.coastX - 55, 0.15, 0);
  sea.name = 'sea';
  sceneRef.add(sea);
  // Sand strip between the city and the water.
  flat(16, 420, CFG.palette.sand, CFG.coastX + 7, 0, 0.05);
}

function buildRoads() {
  // Asphalt strips on every grid line, both directions.
  for (const v of ROAD_LINES) {
    flat(420, CFG.roadHalfWidth * 2, CFG.palette.asphalt, 0, v, 0.08);
    flat(CFG.roadHalfWidth * 2, 420, CFG.palette.asphalt, v, 0, 0.08);
  }
  // Dashed centre lines along each road.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f0dc });
  for (const v of ROAD_LINES) {
    for (let d = -195; d <= 195; d += 10) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(d, 0.12, v);
      sceneRef.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(v, 0.12, d);
      sceneRef.add(dash2);
    }
  }
  // Sidewalks: pale strips hugging each road.
  for (const v of ROAD_LINES) {
    flat(420, 3, CFG.palette.sidewalk, 0, v - CFG.roadHalfWidth - 1.5, 0.06);
    flat(420, 3, CFG.palette.sidewalk, 0, v + CFG.roadHalfWidth + 1.5, 0.06);
    flat(3, 420, CFG.palette.sidewalk, v - CFG.roadHalfWidth - 1.5, 0, 0.06);
    flat(3, 420, CFG.palette.sidewalk, v + CFG.roadHalfWidth + 1.5, 0, 0.06);
  }
}

function buildBuildings() {
  const rng = mulberry32(1337);
  const pal = CFG.palette.building;
  const roofs = CFG.palette.roof;
  // One building per city block (the squares between roads), skipping
  // the coast strip, the garage block and the marina block.
  for (let gx = -150; gx <= 150; gx += CFG.roadSpacing) {
    for (let gz = -150; gz <= 150; gz += CFG.roadSpacing) {
      const cx = gx + CFG.roadSpacing / 2;
      const cz = gz + CFG.roadSpacing / 2;
      if (cx < CFG.beachX + 18) continue; // keep the coast open
      if (Math.abs(cx - CFG.places.garage.x) < 30 && Math.abs(cz - CFG.places.garage.z) < 30) continue;
      if (Math.abs(cx - 100) < 30 && Math.abs(cz - 100) < 30) continue; // Dalia's plaza
      const w = 18 + rng() * 14;
      const d = 18 + rng() * 14;
      const h = 8 + rng() * rng() * 34;
      const color = pal[Math.floor(rng() * pal.length)];
      box(w, h, d, color, cx, h / 2, cz);
      box(w + 1, 1.2, d + 1, roofs[Math.floor(rng() * roofs.length)], cx, h + 0.6, cz);
      // Lit windows: a few emissive strips on the facade.
      const wins = 2 + Math.floor(rng() * 4);
      for (let i = 0; i < wins; i++) {
        const wy = 3 + rng() * (h - 5);
        box(w * 0.7, 0.9, 0.15, 0xffe9a8, cx, wy, cz + d / 2 + 0.08, { emissive: 0xffdf8a, emissiveIntensity: 0.9 });
      }
      colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    }
  }
}

function buildMarinaAndPier() {
  const rng = mulberry32(4242);
  // Wooden docks jutting into the bay.
  for (let i = 0; i < 3; i++) {
    const z = 20 + i * 40;
    box(26, 0.8, 5, 0x8a6a42, CFG.coastX - 12, 0.6, z);
  }
  // Little moored boats: hull + cabin, bobbing in the animation step.
  for (let i = 0; i < 5; i++) {
    const z = 8 + i * 34;
    const g = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(9, 1.6, 3.4),
      new THREE.MeshStandardMaterial({ color: [0xe8e4da, 0xd97b6c, 0x7fb5a8, 0xf2e3c6, 0x9db8d2][i], roughness: 0.5 }),
    );
    hull.position.y = 0.8;
    hull.castShadow = true;
    g.add(hull);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.6, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
    );
    cabin.position.set(-0.5, 2.2, 0);
    g.add(cabin);
    g.position.set(CFG.coastX - 14 - rng() * 10, 0.2, z);
    g.name = 'boat';
    sceneRef.add(g);
  }
  // The pier: a long boardwalk out to sea, with lamps and a bait shack.
  const pierX0 = CFG.coastX - 2;
  const pierX1 = -235;
  const len = pierX0 - pierX1;
  box(len, 0.9, 8, 0x9a7a52, (pierX0 + pierX1) / 2, 0.7, CFG.places.pier.z);
  for (let d = 0; d < len; d += 12) {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 4.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.6, metalness: 0.5 }),
    );
    lamp.position.set(pierX0 - d, 3, CFG.places.pier.z - 3.4);
    sceneRef.add(lamp);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffdf8a, emissiveIntensity: 1.4 }),
    );
    bulb.position.set(pierX0 - d, 5.4, CFG.places.pier.z - 3.4);
    sceneRef.add(bulb);
  }
  box(8, 5, 7, 0x6b8cae, pierX1 + 6, 3.2, CFG.places.pier.z);
  colliders.push({ minX: pierX1 + 2, maxX: pierX1 + 10, minZ: CFG.places.pier.z - 3.5, maxZ: CFG.places.pier.z + 3.5 });
}

function buildGarage() {
  // Juno's garage: a wide workshop with an open front and a repair pad.
  const g = CFG.places.garage;
  box(26, 9, 18, 0x4a6b8a, g.x, 4.5, g.z - 12);
  box(27, 1, 19, 0x8a5a3b, g.x, 9.5, g.z - 12);
  // The repair pad: a glowing teal square the player parks on.
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({ color: 0x2fd4c4, roughness: 0.4, emissive: 0x1a8a80, emissiveIntensity: 0.7 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(g.x, 0.1, g.z);
  pad.name = 'garagePad';
  sceneRef.add(pad);
  // A big JUNO sign made of emissive boxes (no textures, no fonts needed).
  box(10, 1.4, 0.4, 0xffe9a8, g.x, 8, g.z - 2.4, { emissive: 0xffc93a, emissiveIntensity: 1.2 });
  colliders.push({ minX: g.x - 13, maxX: g.x + 13, minZ: g.z - 21, maxZ: g.z - 3 });
}

function buildProps() {
  const rng = mulberry32(99);
  // Palm trees along the beach and the marina road.
  for (let i = 0; i < 26; i++) {
    const x = CFG.beachX - 2 - rng() * 6;
    const z = -190 + rng() * 380;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.4, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 }),
    );
    trunk.position.set(x, 3.5, z);
    trunk.rotation.z = (rng() - 0.5) * 0.25;
    sceneRef.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x3f8f4f, roughness: 0.9 }),
    );
    crown.position.set(x + trunk.rotation.z * -8, 7.4, z);
    crown.scale.y = 0.55;
    sceneRef.add(crown);
  }
  // Street lamps at intersections.
  for (const v of ROAD_LINES) {
    for (const w of [-100, 0, 100]) {
      if (v < CFG.beachX + 10) continue;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.6, metalness: 0.5 }),
      );
      pole.position.set(v + 6.5, 3, w + 6.5);
      sceneRef.add(pole);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffdf8a, emissiveIntensity: 1.2 }),
      );
      lamp.position.set(v + 6.5, 6.2, w + 6.5);
      sceneRef.add(lamp);
    }
  }
}

// Push a circle (x, z, radius) out of every building collider it overlaps.
// Returns true when a push happened.
export function collideCircle(x, z, radius) {
  let hit = false;
  let nx = x;
  let nz = z;
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(nx, c.maxX));
    const cz = Math.max(c.minZ, Math.min(nz, c.maxZ));
    const dx = nx - cx;
    const dz = nz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        nx = cx + (dx / d) * radius;
        nz = cz + (dz / d) * radius;
      } else {
        nz = c.maxZ + radius;
      }
    }
  }
  return { x: nx, z: nz, hit };
}

export function buildWorld(scene) {
  sceneRef = scene;
  scene.background = new THREE.Color(CFG.palette.sky);
  scene.fog = new THREE.Fog(CFG.palette.sky, 180, 420);

  const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd8e8, 0.9));

  buildGround();
  buildRoads();
  buildBuildings();
  buildMarinaAndPier();
  buildGarage();
  buildProps();
  return { colliders, spots };
}

// Gentle idle motion: sea swell and bobbing boats.
export function animateWorld(scene, t) {
  const sea = scene.getObjectByName('sea');
  if (sea) sea.position.y = 0.15 + Math.sin(t * 0.7) * 0.08;
  for (const child of scene.children) {
    if (child.name === 'boat') {
      child.position.y = 0.2 + Math.sin(t * 0.9 + child.position.z) * 0.15;
      child.rotation.z = Math.sin(t * 0.6 + child.position.z) * 0.02;
    }
  }
}
