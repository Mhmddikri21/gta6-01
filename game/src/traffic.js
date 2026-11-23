// OPAL COAST — traffic and pedestrians.
// One job: keep the city alive with cars that follow the road grid and
// people who walk the sidewalks, both of which the player can interact
// with (steal, bump, scare).

function roadCoord(rng) {
  const i = Math.floor(rng() * (OPAL.GRID + 1));
  return -OPAL.BLOCK * OPAL.GRID / 2 + i * OPAL.BLOCK;
}

function spawnTrafficCar(scene, rng, excludeNear) {
  const type = CAR_TYPES[Math.floor(rng() * 4)];
  const color = [0xd94f3d, 0x38bdf8, 0xfacc15, 0x94a3b8, 0x22c55e, 0xe879f9, 0xfb923c][Math.floor(rng() * 7)];
  const car = makeCar(type.id, color);
  const vertical = rng() < 0.5;
  const lane = (rng() < 0.5 ? 2.6 : -2.6);
  let x, z, angle;
  if (vertical) {
    x = roadCoord(rng) + lane;
    z = -190 + rng() * 380;
    angle = rng() < 0.5 ? 0 : Math.PI;
  } else {
    z = roadCoord(rng) + lane;
    x = -190 + rng() * 340;
    angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
  }
  if (excludeNear && Math.hypot(x - excludeNear.x, z - excludeNear.z) < 25) x += 60;
  car.position.set(x, 0, z);
  car.userData.angle = angle;
  car.userData.speed = 7 + rng() * 6;
  car.userData.cruise = car.userData.speed;
  car.userData.vertical = vertical;
  car.userData.lane = lane;
  car.rotation.y = -angle + Math.PI / 2;
  scene.add(car);
  return car;
}

function updateTrafficCar(car, dt, colliders, playerCar) {
  if (car.userData.driven) return;
  const v = car.userData.vertical;
  const dir = v
    ? (car.userData.angle === 0 ? 1 : -1)
    : (car.userData.angle === Math.PI / 2 ? 1 : -1);
  // Ease toward cruise speed, then roll along the road.
  const speed = car.userData.cruise;
  car.userData.speed += (speed - car.userData.speed) * Math.min(1, dt * 1.5);
  const step = car.userData.speed * dt * dir;
  if (v) car.position.z += step;
  else car.position.x += step;
  // Wrap around the city edge onto another road.
  if (car.position.z > 205 || car.position.z < -205 || car.position.x > OPAL.EAST_BEACH + 30 || car.position.x < -205) {
    const rng = Math.random;
    const lane = (rng() < 0.5 ? 2.6 : -2.6);
    if (v) {
      car.position.z = dir > 0 ? -200 : 200;
      car.position.x = roadCoord(rng) + lane;
    } else {
      car.position.x = dir > 0 ? -200 : OPAL.EAST_BEACH + 20;
      car.position.z = roadCoord(rng) + lane;
    }
  }
  car.rotation.y = -car.userData.angle + Math.PI / 2;
}

function spawnPedestrian(scene, rng, playerPos) {
  const shirts = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xec4899, 0x8b5cf6, 0xf8fafc];
  const ped = makePedestrian(shirts[Math.floor(rng() * shirts.length)]);
  const vertical = rng() < 0.5;
  let x, z;
  if (vertical) {
    x = roadCoord(rng) + (rng() < 0.5 ? 7.5 : -7.5);
    z = -190 + rng() * 380;
  } else {
    z = roadCoord(rng) + (rng() < 0.5 ? 7.5 : -7.5);
    x = -190 + rng() * 340;
  }
  if (playerPos && Math.hypot(x - playerPos.x, z - playerPos.z) < 12) x += 30;
  ped.position.set(x, 0, z);
  ped.userData = ped.userData || {};
  ped.userData.angle = rng() * Math.PI * 2;
  ped.userData.speed = 1.2 + rng() * 1.1;
  ped.userData.vertical = vertical;
  ped.userData.dir = rng() < 0.5 ? 1 : -1;
  ped.userData.flee = 0;
  scene.add(ped);
  return ped;
}

function updatePedestrian(ped, dt, playerPos, playerSpeed) {
  if (ped.userData.flee > 0) {
    ped.userData.flee -= dt;
    // Run away from the player.
    const dx = ped.position.x - playerPos.x, dz = ped.position.z - playerPos.z;
    const d = Math.hypot(dx, dz) || 1;
    ped.position.x += (dx / d) * 6 * dt;
    ped.position.z += (dz / d) * 6 * dt;
    ped.userData.angle = Math.atan2(dx, dz);
  } else {
    const step = ped.userData.speed * dt * ped.userData.dir;
    if (ped.userData.vertical) ped.position.z += step;
    else ped.position.x += step;
    if (ped.position.z > 200 || ped.position.z < -200 || ped.position.x > 195 || ped.position.x < -200) {
      ped.userData.dir *= -1;
    }
  }
  // Scared by a fast car nearby.
  if (playerPos && playerSpeed > 14) {
    const d = Math.hypot(ped.position.x - playerPos.x, ped.position.z - playerPos.z);
    if (d < 9) ped.userData.flee = 2.5;
  }
  ped.rotation.y = -ped.userData.angle + Math.PI;
  const swing = Math.sin(performance.now() * 0.011 + ped.position.x) * 0.45;
  if (ped.userData.arms) {
    ped.userData.arms[0].rotation.x = swing;
    ped.userData.arms[1].rotation.x = -swing;
  }
}
