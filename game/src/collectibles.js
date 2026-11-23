// OPAL COAST — side systems: opal shards and the garage.
// One job: the things to do between jobs. Ten opal shards are hidden
// around the city (find them all for a bonus), and Juno's garage repairs
// a battered car and tops up armour for cash. Neither is on the story
// path; both pay cash and respect.

// Hand-picked hiding spots, each near a landmark the player will pass.
const OPAL_SPOTS = [
  { x: 168, z: -70, note: 'Kumala Pier' },
  { x: 150, z: -128, note: 'Marina' },
  { x: -138, z: -120, note: 'Desal Plant' },
  { x: -140, z: 128, note: 'The Docks' },
  { x: 0, z: 0, note: 'Central Plaza' },
  { x: 186, z: 40, note: 'Strand Beach' },
  { x: -20, z: -34, note: 'Garage' },
  { x: -80, z: 52, note: 'Old Town' },
  { x: 160, z: 120, note: 'South Strand' },
  { x: 230, z: -40, note: 'Pier End' },
];

const OPAL_REWARD_CASH = 150;
const OPAL_REWARD_RP = 50;
const OPAL_ALL_BONUS = 1000;
const GARAGE_PRICE = 100;
const GARAGE_RADIUS = 10;

function createCollectibles(scene, rng) {
  const group = new THREE.Group();
  const shards = [];
  for (const spot of OPAL_SPOTS) {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85),
      new THREE.MeshLambertMaterial({ color: 0x22d3ee, emissive: 0x0e7490 }));
    mesh.position.set(spot.x, 1.4, spot.z);
    mesh.castShadow = true;
    group.add(mesh);
    // A faint ring on the ground marks the spot from a distance.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.12, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(spot.x, 0.25, spot.z);
    group.add(ring);
    shards.push({ mesh, ring, x: spot.x, z: spot.z, note: spot.note, taken: false, phase: rng() * Math.PI * 2 });
  }
  scene.add(group);
  // Garage halo: a violet ring around Juno's workshop, showing where a
  // repair happens. It brightens when the player is close enough to use it.
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(GARAGE_RADIUS, 0.35, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.35 }));
  halo.rotation.x = Math.PI / 2;
  halo.position.set(OPAL.GARAGE.x, 0.3, OPAL.GARAGE.z);
  scene.add(halo);
  return { shards, halo, found: 0, total: OPAL_SPOTS.length, garageReady: false, bonusPaid: false };
}

function updateCollectibles(sys, game, dt) {
  const p = game.player;
  const now = performance.now() * 0.001;
  for (const s of sys.shards) {
    if (s.taken) continue;
    // Spin and bob so the shard catches the eye from down the street.
    s.mesh.rotation.y += dt * 1.8;
    s.mesh.position.y = 1.4 + Math.sin(now * 2 + s.phase) * 0.25;
    s.ring.rotation.z += dt * 0.5;
    if (Math.hypot(p.x - s.x, p.z - s.z) < 2.4) {
      s.taken = true;
      s.mesh.visible = false;
      s.ring.visible = false;
      sys.found += 1;
      p.cash += OPAL_REWARD_CASH;
      p.rp += OPAL_REWARD_RP;
      game.audio.blip(1180);
      showBanner(game.missions, 'OPAL SHARD ' + sys.found + '/' + sys.total,
        s.note + ' · +$' + OPAL_REWARD_CASH + ' · +' + OPAL_REWARD_RP + ' respect');
      if (sys.found >= sys.total && !sys.bonusPaid) {
        sys.bonusPaid = true;
        p.cash += OPAL_ALL_BONUS;
        p.rp += 200;
        showBanner(game.missions, 'ALL OPALS FOUND', 'Juno is impressed. +$' + OPAL_ALL_BONUS + ' bonus.');
        showDialogue(game.missions, 'Juno Park', 'Every last shard, Slick. The coast hides nothing from you.');
      }
    }
  }
  // Garage: ready when the player is inside the halo with something to fix.
  const dGarage = Math.hypot(p.x - OPAL.GARAGE.x, p.z - OPAL.GARAGE.z);
  const carHp = p.car && p.car.userData.hp !== undefined ? p.car.userData.hp : 100;
  const needsFix = (!p.onFoot && carHp < 100) || p.armour < 100 || p.health < 100;
  sys.garageReady = dGarage < GARAGE_RADIUS && needsFix && p.cash >= GARAGE_PRICE;
  sys.halo.material.opacity = sys.garageReady ? 0.85 : 0.35;
  sys.halo.material.color.setHex(sys.garageReady ? 0xc4b5fd : 0xa78bfa);
}

function repairAtGarage(sys, game) {
  const p = game.player;
  if (!sys.garageReady) return false;
  if (p.cash < GARAGE_PRICE) return false;
  p.cash -= GARAGE_PRICE;
  if (p.car) p.car.userData.hp = 100;
  p.armour = 100;
  p.health = Math.min(100, p.health + 25);
  game.audio.blip(520);
  showBanner(game.missions, 'GARAGE · PATCHED UP', 'Car repaired, armour restocked. -$' + GARAGE_PRICE);
  showDialogue(game.missions, 'Juno Park', 'Good as new, Slick. Try not to bend it again before lunch.');
  sys.garageReady = false;
  return true;
}

// Photo mode: hide every HUD panel so a screenshot shows only the city.
function togglePhotoMode(game) {
  const on = document.body.classList.toggle('photo');
  game.audio.blip(on ? 980 : 660);
  return on;
}
