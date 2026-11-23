// OPAL COAST — boot and game loop.
// One job: wire every system together (world, player, traffic, police,
// missions, HUD, audio), run the frame loop, read input, and keep a
// self-test record for local checks.

function bootOpalCoast() {
  const params = new URLSearchParams(location.search);
  const shot = parseInt(params.get('shot') || '0', 10);
  const selftest = params.get('selftest') === '1';
  const rng = mulberry32(20261120);

  const canvas = document.getElementById('game-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(-8, 4, 24);

  const world = buildWorld(scene, rng);
  const player = createPlayer(scene, rng);
  const audio = createAudio();
  const police = createPolice(scene);
  const missions = createMissions(scene);
  const collectibles = createCollectibles(scene, rng);

  const trafficCars = [];
  for (let i = 0; i < 14; i++) trafficCars.push(spawnTrafficCar(scene, rng, player));
  const pedestrians = [];
  for (let i = 0; i < 26; i++) pedestrians.push(spawnPedestrian(scene, rng, player));

  const game = {
    scene, camera, renderer, world, player, audio, police, missions,
    collectibles, trafficCars, pedestrians, timeOfDay: 17.4, paused: false, started: false,
    frames: 0, errors: [], startTime: performance.now(), rng, selftest,
    hud: null, nearMissTimer: 0,
    input: { up: false, down: false, left: false, right: false, run: false, handbrake: false },
  };
  game.save = function () { saveGame(game); };
  game.hud = createHud(game);

  window.addEventListener('error', function (e) { game.errors.push(String(e.message || e.error)); });
  bindInput(game);

  // ---- Start screen ----
  const startBtn = document.getElementById('start-btn');
  const loadBtn = document.getElementById('load-btn');
  const startScreen = document.getElementById('start-screen');
  function beginGame(loaded) {
    audio.ensure();
    audio.startRadio(0);
    game.started = true;
    if (startScreen) startScreen.style.display = 'none';
    if (!loaded) startMission(missions, game);
    else showBanner(missions, 'WELCOME BACK, SLICK', 'Save loaded. Press M for your next job.');
  }
  if (startBtn) startBtn.addEventListener('click', function () { beginGame(false); });
  if (loadBtn) loadBtn.addEventListener('click', function () {
    const ok = loadGame(game);
    beginGame(ok);
  });
  if (shot > 0) {
    // Screenshot mode: skip the menu, stage the scene, play immediately.
    game.started = true;
    if (startScreen) startScreen.style.display = 'none';
    audio.muted = true;
  }

  // ---- Frame loop ----
  // NOTE: dt comes from performance.now(), never from the rAF timestamp:
  // in software-rendered headless browsers the rAF timestamp can run
  // backwards, which made dt negative and blew the camera (and the car
  // physics) up. Clamp dt to a sane positive range either way.
  let last = performance.now();
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    let dt = (now - last) / 1000;
    if (!(dt > 0)) dt = 0.016;
    dt = Math.min(dt, 0.05);
    last = now;
    if (!game.started || game.paused) { renderer.render(scene, camera); return; }
    stepGame(game, dt, now);
    renderer.render(scene, camera);
  }
  if (shot > 0) applyShot(game, shot);
  requestAnimationFrame(frame);
  return game;
}

// All keyboard / mouse / resize wiring in one place.
function bindInput(game) {
  const player = game.player;
  const audio = game.audio;
  const keyMap = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run', Space: 'handbrake',
  };
  window.addEventListener('keydown', function (e) {
    audio.ensure();
    if (keyMap[e.code] !== undefined) { game.input[keyMap[e.code]] = true; e.preventDefault(); }
    if (e.code === 'KeyE') toggleCar(game);
    if (e.code === 'KeyM') toggleMission(game);
    if (e.code === 'KeyR') { audio.ensure(); audio.startRadio((audio.radioIndex + 1) % RADIO.length); }
    if (e.code === 'KeyF') punch(game);
    if (e.code === 'Digit1') player.weaponIndex = 0;
    if (e.code === 'Digit2') player.weaponIndex = 1;
    if (e.code === 'Digit3' && player.rp >= 700) player.weaponIndex = 2;
    if (e.code === 'Digit4' && player.rp >= 1500) player.weaponIndex = 3;
    if (e.code === 'Escape') togglePause(game);
    if (e.code === 'KeyG') repairAtGarage(game.collectibles, game);
    if (e.code === 'KeyH') togglePhotoMode(game);
    if (e.code === 'KeyP') { saveGame(game); showBanner(game.missions, 'SAVED', 'Progress saved to this browser.'); }
  });
  window.addEventListener('keyup', function (e) {
    if (keyMap[e.code] !== undefined) game.input[keyMap[e.code]] = false;
  });
  window.addEventListener('mousedown', function (e) {
    if (!game.started || game.paused) return;
    audio.ensure();
    shoot(game, e.clientX, e.clientY);
  });
  window.addEventListener('resize', function () {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// One frame of gameplay: advance the clock, move everything, then update
// the camera and the HUD. Called only while the game runs.
function stepGame(game, dt, now) {
  const player = game.player;
  const police = game.police;
  const missions = game.missions;
  const world = game.world;
  const audio = game.audio;
  game.frames += 1;
  game.timeOfDay += dt * 0.004;
  if (game.timeOfDay > 19.2) game.timeOfDay = 16.5;
  if (game.nearMissTimer > 0) game.nearMissTimer -= dt;

  // Player: on foot or behind the wheel.
  if (player.onFoot) walkPlayer(player, dt, game.input, world.colliders);
  else {
    const spd = driveCar(player, player.car, dt, game.input, world.colliders, game.trafficCars, function (v) {
      audio.crash();
      addHeat(police, 4);
      if (player.car.userData.hp === undefined) player.car.userData.hp = 100;
      player.car.userData.hp -= v * 0.4;
    });
    audio.engine(Math.min(1, spd / 40));
    if (player.car.userData.hp !== undefined && player.car.userData.hp <= 0) {
      showBanner(missions, 'CAR WRECKED', 'Your ride is scrap. Find another one.');
      addHeat(police, 6);
      exitCar(player, game.scene);
    }
    // Near miss: threading past a traffic car at speed without touching
    // it pays $10. Each car pays at most once every 4 seconds.
    if (spd > 20) {
      for (const other of game.trafficCars) {
        if (other === player.car || other.userData.driven) continue;
        const d = Math.hypot(other.position.x - player.x, other.position.z - player.z);
        if (d < 4.6 && d >= 3.2 && now / 1000 - (other.userData.nearMissAt || -10) > 4) {
          other.userData.nearMissAt = now / 1000;
          player.cash += 10;
          game.nearMissTimer = 2.5;
          audio.blip(1040);
        }
      }
    }
  }
  // Traffic and pedestrians.
  for (const c of game.trafficCars) updateTrafficCar(c, dt, world.colliders, player.car);
  for (const ped of game.pedestrians) {
    updatePedestrian(ped, dt, player, player.onFoot ? player.speed : Math.abs((player.car && player.car.userData.speed) || 0));
    // Bumping a pedestrian by car is a crime.
    const d = Math.hypot(ped.position.x - player.x, ped.position.z - player.z);
    if (d < 1.6 && !player.onFoot && Math.abs(player.car.userData.speed) > 6) {
      ped.userData.flee = 3;
      addHeat(police, 8);
    }
  }
  // Police, missions and side systems.
  updatePolice(police, game.scene, dt, player, game.rng, function () { busted(game); });
  audio.siren(police.wanted > 0);
  updateMissions(missions, game, dt);
  updateCollectibles(game.collectibles, game, dt);
  // Camera, HUD, ocean shimmer.
  updateCamera(game.camera, player, dt);
  updateHud(game, dt);
  world.ocean.position.y = OPAL.SEA_LEVEL + Math.sin(now * 0.0006) * 0.15;
  // Wasted.
  if (player.dead) wasted(game);
  // Self-test record (30 frames is enough to prove the loop, the HUD and
  // the systems all run; software rendering here is ~1 fps).
  if (game.selftest && game.frames === 30) {
    const div = document.getElementById('selftest');
    const ok = game.errors.length === 0 && game.frames > 0;
    if (div) div.textContent = (ok ? 'SELFTEST OK' : 'SELFTEST FAIL: ' + game.errors.join(';')) +
      ' frames=' + game.frames + ' traffic=' + game.trafficCars.length + ' peds=' + game.pedestrians.length +
      ' wanted=' + police.wanted + ' mission=' + (missions.active ? MISSIONS[missions.index].id : 'none');
    document.title = div ? div.textContent : 'SELFTEST';
  }
}

function toggleCar(game) {
  const p = game.player;
  if (p.onFoot) {
    const car = nearestCar(p, game.trafficCars, 5.5);
    if (car) {
      enterCar(p, car, game.scene);
      addHeat(game.police, 6); // stealing a car is a crime
      game.audio.blip(520);
    }
    const pc = nearestCar(p, game.police.cars, 5.5);
    if (pc && !car) { enterCar(p, pc, game.scene); addHeat(game.police, 10); }
  } else {
    exitCar(p, game.scene);
  }
}

function toggleMission(game) {
  const m = game.missions;
  if (m.done) { showBanner(m, 'STORY COMPLETE', 'Free roam: races at the pier, collectibles at the marina.'); return; }
  if (!m.active) startMission(m, game);
  else showBanner(m, MISSIONS[m.index].job + ' · ' + MISSIONS[m.index].title, MISSIONS[m.index].brief);
}

function punch(game) {
  const p = game.player;
  if (!p.onFoot || game.missions === undefined) return;
  p.punchTimer = 0.3;
  game.audio.blip(180);
  // Punch scares the nearest pedestrian and can start a fight heat.
  let best = null, bd = 3;
  for (const ped of game.pedestrians) {
    const d = Math.hypot(ped.position.x - p.x, ped.position.z - p.z);
    if (d < bd) { bd = d; best = ped; }
  }
  if (best) { best.userData.flee = 3; addHeat(game.police, 5); }
}

function shoot(game, clientX, clientY) {
  const p = game.player;
  if (p.onFoot === false) return; // no drive-by in this build; shoot on foot
  const now = performance.now() / 1000;
  if (now - p.lastShot < WEAPONS[p.weaponIndex].rate) return;
  if (p.weaponIndex > 0 && p.ammo[p.weaponIndex] <= 0) { game.audio.blip(140); return; }
  p.lastShot = now;
  if (p.weaponIndex > 0) p.ammo[p.weaponIndex] -= 1;
  game.audio.shot();
  addHeat(game.police, 7);
  // Hitscan toward the click point: find the nearest ped or police car in
  // the aim cone.
  const w = WEAPONS[p.weaponIndex];
  const aim = Math.atan2(clientX - window.innerWidth / 2, window.innerHeight / 2 - clientY);
  const aimAngle = p.angle + aim * 0.6;
  let best = null, bd = w.range;
  const targets = game.pedestrians.concat(game.police.cars);
  for (const t of targets) {
    const dx = t.position.x - p.x, dz = t.position.z - p.z;
    const d = Math.hypot(dx, dz);
    const a = Math.atan2(dx, dz);
    let da = a - aimAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (d < bd && Math.abs(da) < 0.25) { bd = d; best = t; }
  }
  if (best) {
    if (best.userData && best.userData.flee !== undefined) best.userData.flee = 4;
    if (best.userData && best.userData.hp !== undefined) best.userData.hp -= w.damage;
    game.audio.blip(980);
  }
}

function busted(game) {
  const p = game.player;
  showBanner(game.missions, 'BUSTED', 'The OCPD took you in. $300 bail, and the heat is off — this time.');
  p.cash = Math.max(0, p.cash - 300);
  game.police.heat = 0;
  game.police.cooldown = 0;
  for (const c of game.police.cars) game.scene.remove(c);
  game.police.cars = [];
  p.bustedTimer = 0;
  if (!p.onFoot) exitCar(p, game.scene);
  p.x = -20; p.z = -20;
  p.mesh.position.set(p.x, 0, p.z);
  p.health = 100;
}

function wasted(game) {
  const p = game.player;
  showBanner(game.missions, 'WASTED', 'You flatlined on the asphalt. The hospital patched you up — $200.');
  p.cash = Math.max(0, p.cash - 200);
  p.health = 100;
  p.armour = 0;
  p.dead = false;
  game.police.heat = Math.max(0, game.police.heat - 20);
  if (!p.onFoot) exitCar(p, game.scene);
  p.x = 0; p.z = 8;
  p.mesh.position.set(p.x, 0, p.z);
}

function togglePause(game) {
  game.paused = !game.paused;
  const pauseEl = document.getElementById('pause-screen');
  if (pauseEl) pauseEl.style.display = game.paused ? 'flex' : 'none';
}

window.addEventListener('DOMContentLoaded', function () {
  try { window.__opalGame = bootOpalCoast(); }
  catch (e) {
    const div = document.getElementById('selftest');
    if (div) div.textContent = 'BOOT FAIL: ' + (e && e.message);
    document.title = 'BOOT FAIL';
  }
});
