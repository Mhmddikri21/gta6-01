// OPAL COAST — player controller.
// One job: the player on foot and behind the wheel (movement, camera,
// entering and stealing cars, punching and shooting), plus health, armour
// and the busted / wasted flow.

function createPlayer(scene, rng) {
  const mesh = makePedestrian(0x2dd4bf, 0xc98a5a);
  mesh.position.set(0, 0, 8);
  scene.add(mesh);
  const player = {
    mesh, x: 0, z: 8, angle: 0, speed: 0,
    health: 100, armour: 50, cash: 1250, rp: 0,
    onFoot: true, car: null, dead: false, bustedTimer: 0,
    weaponIndex: 1, ammo: [Infinity, 84, 208, 60],
    lastShot: 0, punchTimer: 0, runStamina: 100,
    keys: {}, mouseDown: false, mouseX: 0, mouseY: 0,
  };
  return player;
}

function playerForward(player) {
  return { x: Math.sin(player.angle), z: Math.cos(player.angle) };
}

function clampToWorld(v, r) {
  const d = Math.hypot(v.x, v.z);
  if (d > r) { v.x *= r / d; v.z *= r / d; }
  return v;
}

// Push a point out of every circle collider it overlaps.
function collideWorld(x, z, colliders, radius) {
  for (const c of colliders) {
    const dx = x - c.x, dz = z - c.z;
    const d = Math.hypot(dx, dz);
    if (d < c.r + radius && d > 0.001) {
      const push = (c.r + radius - d);
      x += (dx / d) * push;
      z += (dz / d) * push;
    }
  }
  return { x, z };
}

// Slide a moving car off the building colliders: stop at the wall, lose
// speed, and report whether the hit was hard enough to count as a crash.
function collideCarWithBuildings(car, nx, nz, colliders) {
  let hit = false;
  for (const c of colliders) {
    const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz);
    if (d < c.r + 2.2) {
      hit = true;
      nx = car.position.x;
      nz = car.position.z;
      car.userData.speed *= 0.35;
    }
  }
  return { x: nx, z: nz, hit };
}

// Soft bounce between the player's car and a traffic car.
function bounceOffTraffic(car, nx, nz, other) {
  const dx = nx - other.position.x, dz = nz - other.position.z, d = Math.hypot(dx, dz);
  if (d >= 4.6 || d <= 0.01) return { x: nx, z: nz };
  car.userData.speed *= 0.6;
  other.userData.speed = (other.userData.speed || 0) * 0.5 + car.userData.speed * 0.2;
  return { x: car.position.x + (dx / d) * 0.6, z: car.position.z + (dz / d) * 0.6 };
}

// Arcade car physics: throttle, steering that scales with speed, drift on
// the handbrake, sliding off buildings and a soft bounce off other cars.
function driveCar(player, car, dt, input, colliders, trafficCars, onCrash) {
  const spec = CAR_TYPES.find(c => c.id === car.userData.type) || CAR_TYPES[0];
  let throttle = 0;
  if (input.up) throttle += 1;
  if (input.down) throttle -= 0.7;
  const target = throttle * spec.top;
  const accel = throttle !== 0 ? spec.accel : 18;
  car.userData.speed += (target - car.userData.speed) * Math.min(1, accel / spec.top * dt * 2.2);
  if (input.handbrake) car.userData.speed *= (1 - 1.6 * dt);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const steerAmt = steer * spec.grip * 0.55 * Math.min(1, Math.abs(car.userData.speed) / 12) * Math.sign(car.userData.speed || 1);
  car.userData.angle += steerAmt * dt * (input.handbrake ? 1.5 : 1);
  const nf = { x: Math.sin(car.userData.angle), z: Math.cos(car.userData.angle) };
  let nx = car.position.x + nf.x * car.userData.speed * dt;
  let nz = car.position.z + nf.z * car.userData.speed * dt;
  // Building collision: slide along, lose speed, spark a crash event.
  const bump = collideCarWithBuildings(car, nx, nz, colliders);
  nx = bump.x; nz = bump.z;
  if (bump.hit && Math.abs(car.userData.speed) > 8 && onCrash) onCrash(Math.abs(car.userData.speed));
  // Soft car-car bounce.
  for (const other of trafficCars) {
    if (other === car) continue;
    const b = bounceOffTraffic(car, nx, nz, other);
    nx = b.x; nz = b.z;
  }
  nx = Math.max(-205, Math.min(OPAL.EAST_BEACH + 40, nx));
  nz = Math.max(-205, Math.min(205, nz));
  car.position.x = nx;
  car.position.z = nz;
  car.rotation.y = -car.userData.angle + Math.PI / 2;
  // Wheel spin and body lean.
  const spin = car.userData.speed * dt * 2;
  for (const w of car.userData.wheels) w.rotation.y += spin;
  car.rotation.z = -steer * Math.min(0.06, Math.abs(car.userData.speed) * 0.002);
  player.x = nx;
  player.z = nz;
  player.angle = car.userData.angle;
  return Math.abs(car.userData.speed);
}

function walkPlayer(player, dt, input, colliders) {
  const run = input.run && player.runStamina > 0;
  let spd = run ? 9.5 : 5.2;
  // Hurt and limping: under 30 health the player moves at 70% speed, so a
  // shootout escape feels different from a healthy sprint.
  if (player.health < 30) spd *= 0.7;
  if (run) player.runStamina = Math.max(0, player.runStamina - dt * 18);
  else player.runStamina = Math.min(100, player.runStamina + dt * 12);
  let mx = 0, mz = 0;
  if (input.up) mz += 1;
  if (input.down) mz -= 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (mx || mz) {
    const len = Math.hypot(mx, mz);
    mx /= len; mz /= len;
    const targetAngle = Math.atan2(mx, mz);
    let da = targetAngle - player.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    player.angle += da * Math.min(1, dt * 12);
    let nx = player.x + Math.sin(player.angle) * spd * dt;
    let nz = player.z + Math.cos(player.angle) * spd * dt;
    const c = collideWorld(nx, nz, colliders, 0.8);
    nx = c.x; nz = c.z;
    nx = Math.max(-205, Math.min(OPAL.EAST_BEACH + 70, nx));
    nz = Math.max(-205, Math.min(205, nz));
    player.x = nx;
    player.z = nz;
    player.speed = spd;
  } else {
    player.speed = 0;
  }
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = -player.angle + Math.PI;
  // Walk swing on the arms.
  const swing = player.speed > 0 ? Math.sin(performance.now() * 0.012) * 0.5 : 0;
  if (player.mesh.userData.arms) {
    player.mesh.userData.arms[0].rotation.x = swing;
    player.mesh.userData.arms[1].rotation.x = -swing;
  }
}

// Third-person chase camera: behind and above, smoothed, never under ground.
function updateCamera(camera, player, dt, mode) {
  const dist = player.onFoot ? 7.5 : 11;
  const height = player.onFoot ? 3.4 : 4.6;
  const back = { x: Math.sin(player.angle), z: Math.cos(player.angle) };
  const tx = player.x - back.x * dist;
  const tz = player.z - back.z * dist;
  // Exponential smoothing with a dt that is always >= 0: a negative factor
  // here would throw the camera away from the player instead of toward it.
  const k = 1 - Math.exp(-Math.max(0, dt) * 8);
  camera.position.x += (tx - camera.position.x) * k;
  camera.position.z += (tz - camera.position.z) * k;
  camera.position.y += (height - camera.position.y) * k;
  if (camera.position.y < 1.6) camera.position.y = 1.6;
  const lookY = player.onFoot ? 1.6 : 1.4;
  camera.lookAt(player.x + back.x * 6, lookY, player.z + back.z * 6);
}

function nearestCar(player, cars, maxDist) {
  let best = null, bd = maxDist;
  for (const c of cars) {
    const d = Math.hypot(c.position.x - player.x, c.position.z - player.z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function enterCar(player, car, scene) {
  player.onFoot = false;
  player.car = car;
  car.userData.driven = true;
  car.userData.speed = car.userData.speed || 0;
  player.mesh.visible = false;
  player.x = car.position.x;
  player.z = car.position.z;
  player.angle = car.userData.angle || 0;
}

function exitCar(player, scene) {
  if (!player.car) return;
  const car = player.car;
  car.userData.driven = false;
  player.onFoot = true;
  player.car = null;
  player.mesh.visible = true;
  const side = { x: Math.cos(player.angle), z: -Math.sin(player.angle) };
  player.x = car.position.x + side.x * 2.4;
  player.z = car.position.z + side.z * 2.4;
  player.mesh.position.set(player.x, 0, player.z);
}

// Armour absorbs 60% of a hit first; the rest goes to health.
function damagePlayer(player, amount) {
  if (player.armour > 0) {
    const absorbed = Math.min(player.armour, amount * 0.6);
    player.armour -= absorbed;
    amount -= absorbed;
  }
  player.health -= amount;
  if (player.health <= 0) { player.health = 0; player.dead = true; }
  return player.dead;
}
