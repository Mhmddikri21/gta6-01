// OPAL COAST — world builder. One clear job: build the three.js city once
// (sky, ocean, beach, road grid, buildings, palms, props) and hand back the
// meshes and helpers the gameplay systems drive. No game logic lives here.

function makeBuildingTexture(rng) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  const base = ['#f3e2c7', '#e8b4a0', '#a8c8d8', '#f7d774', '#d8a7b1', '#b8d8b8'][Math.floor(rng() * 6)];
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 128, 10);
  for (let y = 22; y < 240; y += 26) {
    for (let x = 12; x < 116; x += 24) {
      const lit = rng() < 0.35;
      g.fillStyle = lit ? '#ffd97a' : 'rgba(20,40,70,0.85)';
      g.fillRect(x, y, 14, 18);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, 14, 3);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildWorld(scene, rng) {
  const world = { buildings: [], palms: [], roadMeshes: [], colliders: [], markers: {} };
  const palette = OPAL.SUNSET;

  scene.background = new THREE.Color(palette.skyMid);
  scene.fog = new THREE.Fog(palette.fog, 120, 420);

  const hemi = new THREE.HemisphereLight(0xffe0b3, 0x3a5a7a, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(palette.sun, 2.1);
  sun.position.set(120, 90, -60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 500;
  scene.add(sun);
  world.sun = sun;

  // Sun disc + sky dome gradient (big sphere, back side).
  const skyGeo = new THREE.SphereGeometry(600, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(palette.skyTop) }, mid: { value: new THREE.Color(palette.skyMid) }, low: { value: new THREE.Color(palette.skyLow) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low; void main(){ float h = normalize(vP).y; vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.8, h)) : mix(low, mid, smoothstep(-0.05, 0.25, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(18, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xffdf8a, fog: false }));
  sunDisc.position.set(300, 110, -380);
  scene.add(sunDisc);

  // Ground: city slab, sand strip, ocean plane.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700),
    new THREE.MeshLambertMaterial({ color: 0x8a8f7a }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(90, 700),
    new THREE.MeshLambertMaterial({ color: 0xe8d29a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(OPAL.EAST_BEACH + 22, 0.05, 0);
  sand.receiveShadow = true;
  scene.add(sand);
  // Ocean starts where the sand ends (sand runs to EAST_BEACH + 67), so the
  // coastal boulevard is never drowned by the sea plane.
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(320, 700),
    new THREE.MeshLambertMaterial({ color: 0x2e7fa8 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(OPAL.EAST_BEACH + 227, OPAL.SEA_LEVEL, 0);
  scene.add(ocean);
  world.ocean = ocean;

  // Roads: grid strips + centre dashes + sidewalks.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x414958 });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const half = OPAL.BLOCK * OPAL.GRID / 2 + OPAL.ROAD_HALF;
  for (let i = 0; i <= OPAL.GRID; i++) {
    const p = -OPAL.BLOCK * OPAL.GRID / 2 + i * OPAL.BLOCK;
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(OPAL.ROAD_HALF * 2, half * 2), roadMat);
    roadV.rotation.x = -Math.PI / 2; roadV.position.set(p, 0.08, 0); roadV.receiveShadow = true;
    scene.add(roadV);
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, OPAL.ROAD_HALF * 2), roadMat);
    roadH.rotation.x = -Math.PI / 2; roadH.position.set(0, 0.08, p); roadH.receiveShadow = true;
    scene.add(roadH);
    for (let d = -half + 12; d < half - 6; d += 24) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5), dashMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(p, 0.12, d);
      scene.add(dash);
    }
  }
  // Coastal boulevard (wide, along the beach).
  const blvd = new THREE.Mesh(new THREE.PlaneGeometry(16, 460), roadMat);
  blvd.rotation.x = -Math.PI / 2; blvd.position.set(OPAL.EAST_BEACH - 6, 0.09, 0);
  blvd.receiveShadow = true; scene.add(blvd);

  // Buildings: one per block, skipped on roads / beach / plaza.
  const facade = makeBuildingTexture(rng);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let ix = 0; ix < OPAL.GRID; ix++) {
    for (let iz = 0; iz < OPAL.GRID; iz++) {
      const cx = -OPAL.BLOCK * OPAL.GRID / 2 + OPAL.BLOCK / 2 + ix * OPAL.BLOCK;
      const cz = -OPAL.BLOCK * OPAL.GRID / 2 + OPAL.BLOCK / 2 + iz * OPAL.BLOCK;
      if (cx > OPAL.EAST_BEACH - 30) continue;               // beach front is open
      if (Math.abs(cx) < 12 && Math.abs(cz) < 12) continue;   // central plaza
      if (rng() < 0.12) continue;                            // parking lots / parks
      const w = 18 + rng() * 14, d = 18 + rng() * 14, h = 10 + rng() * rng() * 46;
      const tint = [0xffffff, 0xffe8c8, 0xcfe8ff, 0xffd9c0][Math.floor(rng() * 4)];
      const mat = new THREE.MeshLambertMaterial({ map: facade, color: tint });
      const b = new THREE.Mesh(boxGeo, mat);
      b.scale.set(w, h, d);
      b.position.set(cx + (rng() - 0.5) * 6, h / 2, cz + (rng() - 0.5) * 6);
      b.castShadow = true; b.receiveShadow = true;
      scene.add(b);
      world.buildings.push(b);
      world.colliders.push({ x: b.position.x, z: b.position.z, r: Math.max(w, d) * 0.62 });
      // Rooftop box / AC unit for silhouette.
      if (rng() < 0.6) {
        const roof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x5a5f6a }));
        roof.scale.set(w * 0.3, 2.5, d * 0.3);
        roof.position.set(b.position.x, h + 1.2, b.position.z);
        scene.add(roof);
      }
    }
  }

  // Palms along the boulevard and the pier.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2fae6e, flatShading: true });
  function palm(x, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.55 * s, 9 * s, 6), trunkMat);
    trunk.position.y = 4.5 * s; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1 * s, 5.5 * s, 4), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 2.2 * s, 9.2 * s, Math.sin(a) * 2.2 * s);
      leaf.rotation.z = Math.cos(a) * 1.1; leaf.rotation.x = -Math.sin(a) * 1.1;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    scene.add(g); world.palms.push(g);
    return g;
  }
  for (let z = -200; z <= 200; z += 22) {
    palm(OPAL.EAST_BEACH - 18, z, 1 + rng() * 0.3);
    if (rng() < 0.5) palm(OPAL.EAST_BEACH + 12, z + 8, 0.9 + rng() * 0.3);
  }
  for (let i = 0; i < 26; i++) palm(-160 + rng() * 300, -190 + rng() * 380, 0.8 + rng() * 0.5);

  // Pier (Kumala Pier) jutting into the ocean + lighthouse.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 90),
    new THREE.MeshLambertMaterial({ color: 0x9a7a55 }));
  pier.position.set(OPAL.EAST_BEACH + 55, 1.2, -40); pier.castShadow = true;
  scene.add(pier);
  const light = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 22, 10),
    new THREE.MeshLambertMaterial({ color: 0xf3f3f3 }));
  light.position.set(OPAL.EAST_BEACH + 55, 12, -82); light.castShadow = true;
  scene.add(light);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  lamp.position.set(OPAL.EAST_BEACH + 55, 24, -82);
  scene.add(lamp);

  // Streetlights + traffic-light poles at intersections.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (let ix = 0; ix <= OPAL.GRID; ix += 2) {
    for (let iz = 0; iz <= OPAL.GRID; iz += 2) {
      const x = -OPAL.BLOCK * OPAL.GRID / 2 + ix * OPAL.BLOCK + 7;
      const z = -OPAL.BLOCK * OPAL.GRID / 2 + iz * OPAL.BLOCK + 7;
      if (x > OPAL.EAST_BEACH - 25) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 6), poleMat);
      pole.position.set(x, 3.5, z); scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), lampMat);
      bulb.position.set(x, 7.1, z); scene.add(bulb);
    }
  }

  // Parked cars, dumpsters, crates, containers as simple props.
  const propColors = [0xd94f3d, 0x38bdf8, 0xfacc15, 0x94a3b8, 0x22c55e];
  for (let i = 0; i < 40; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 1.8),
      new THREE.MeshLambertMaterial({ color: propColors[i % propColors.length] }));
    const x = -170 + rng() * 320, z = -170 + rng() * 340;
    c.position.set(x, 0.7, z); c.rotation.y = rng() * Math.PI;
    c.castShadow = true; scene.add(c);
    world.colliders.push({ x, z, r: 2.4 });
  }
  return world;
}

// Car factory: low-poly car from boxes — body, cabin, wheels, lights.
// Returns a Group with .userData { type, speed, ... } for the gameplay code.
function makeCar(type, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: color || 0xd94f3d, flatShading: true });
  g.userData.bodyMat = bodyMat;
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111827, flatShading: true });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd8ef, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 2.0), bodyMat);
  body.position.y = 0.75; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 1.8), glassMat);
  cabin.position.set(-0.3, 1.5, 0); cabin.castShadow = true; g.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 1.9), bodyMat);
  nose.position.set(2.4, 0.62, 0); g.add(nose);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  g.userData.wheels = [];
  for (const [wx, wz] of [[1.5, 0.95], [1.5, -0.95], [-1.5, 0.95], [-1.5, -0.95]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.x = Math.PI / 2; w.position.set(wx, 0.42, wz);
    g.add(w); g.userData.wheels.push(w);
  }
  const lightGeo = new THREE.BoxGeometry(0.15, 0.25, 0.4);
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const wz of [0.6, -0.6]) {
    const h = new THREE.Mesh(lightGeo, hl); h.position.set(2.88, 0.75, wz); g.add(h);
  }
  if (type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 1.1),
      new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    bar.position.set(-0.3, 2.0, 0); g.add(bar);
    g.userData.lightbar = bar;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.3, 2.02),
      new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
    stripe.position.y = 0.95; g.add(stripe);
  }
  if (type === 'truck') {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 4.2, 12),
      new THREE.MeshLambertMaterial({ color: 0xe0f2fe, flatShading: true }));
    tank.rotation.z = Math.PI / 2; tank.position.set(-1.2, 1.5, 0);
    tank.castShadow = true; g.add(tank);
  }
  g.userData.type = type || 'sedan';
  return g;
}

// Pedestrian: capsule-ish low-poly person with a coloured shirt.
function makePedestrian(shirtColor, skinColor) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor, flatShading: true });
  const skin = new THREE.MeshLambertMaterial({ color: skinColor || 0xd9a066, flatShading: true });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x1e293b }));
  legs.position.y = 0.4; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.35), shirt);
  torso.position.y = 1.15; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), skin);
  head.position.y = 1.78; head.castShadow = true; g.add(head);
  const armGeo = new THREE.BoxGeometry(0.16, 0.7, 0.16);
  const aL = new THREE.Mesh(armGeo, shirt); aL.position.set(-0.4, 1.15, 0); g.add(aL);
  const aR = new THREE.Mesh(armGeo, shirt); aR.position.set(0.4, 1.15, 0); g.add(aR);
  g.userData.arms = [aL, aR];
  return g;
}

// Helicopter: body, tail, rotor (spins in police.js).
function makeHelicopter() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true }));
  body.scale.set(1.6, 1, 1); body.castShadow = true; g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x334155 }));
  tail.position.set(-3.4, 0.4, 0); g.add(tail);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0x9fd8ef }));
  glass.position.set(1.9, -0.2, 0); g.add(glass);
  const rotor = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x111827 }));
  rotor.add(blade);
  const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2; rotor.add(blade2);
  rotor.position.y = 1.6; g.add(rotor);
  g.userData.rotor = rotor;
  const spot = new THREE.SpotLight(0xfff6c0, 60, 90, 0.35, 0.5);
  spot.position.set(0, -1, 0);
  const spotTarget = new THREE.Object3D(); spotTarget.position.set(0, -40, 0);
  g.add(spotTarget); spot.target = spotTarget; g.add(spot);
  g.userData.spot = spot;
  return g;
}
