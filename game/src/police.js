// OPAL COAST — wanted system and police response.
// One job: turn crimes into stars, stars into pursuing police cars, a
// helicopter and roadblocks, and let the heat cool when the player breaks
// line of sight.

function createPolice(scene) {
  return {
    wanted: 0, heat: 0, // heat 0..100 feeds the star count
    cars: [], heli: null, heliActive: false,
    cooldown: 0, // seconds hidden while wanted; fills to clear the stars
    lastSeen: 0, roadblock: null, busted: false,
    sirenPhase: 0,
  };
}

function wantedStars(police) {
  if (police.heat <= 0) return 0;
  if (police.heat < 20) return 1;
  if (police.heat < 40) return 2;
  if (police.heat < 60) return 3;
  if (police.heat < 85) return 4;
  return 5;
}

function addHeat(police, amount) {
  police.heat = Math.min(100, police.heat + amount);
  police.cooldown = 0;
  police.wanted = wantedStars(police);
}

function spawnPoliceCar(scene, playerPos, rng) {
  const car = makeCar('police', 0x1e293b);
  const a = rng() * Math.PI * 2;
  const d = 55 + rng() * 30;
  car.position.set(playerPos.x + Math.sin(a) * d, 0, playerPos.z + Math.cos(a) * d);
  car.userData.angle = Math.atan2(playerPos.x - car.position.x, playerPos.z - car.position.z);
  car.userData.speed = 0;
  car.rotation.y = -car.userData.angle + Math.PI / 2;
  scene.add(car);
  return car;
}

// Steer an angle toward a target angle, limited to maxTurn radians per
// second, taking the shortest way around the circle.
function steerToward(angle, want, dt, maxTurn) {
  let da = want - angle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  return angle + Math.max(-maxTurn * dt, Math.min(maxTurn * dt, da * 2.2));
}

// Ease a speed toward a target speed.
function easeSpeed(speed, target, dt, rate) {
  return speed + (target - speed) * Math.min(1, dt * rate);
}

// How far the nearest pursuit car is from the player (1e9 when none).
function nearestPursuit(police, player) {
  let nearest = 1e9;
  for (const car of police.cars) {
    nearest = Math.min(nearest, Math.hypot(car.position.x - player.x, car.position.z - player.z));
  }
  return nearest;
}

function updatePolice(police, scene, dt, player, rng, onBusted) {
  const stars = wantedStars(police);
  police.wanted = stars;
  const wantCars = stars === 0 ? 0 : Math.min(2 + stars, 7);
  // Spawn / despawn pursuit cars to match the wanted level.
  while (police.cars.length < wantCars) {
    police.cars.push(spawnPoliceCar(scene, player, rng));
  }
  while (police.cars.length > wantCars) {
    const c = police.cars.pop();
    scene.remove(c);
  }
  // Helicopter from 3 stars up.
  if (stars >= 3 && !police.heli) {
    police.heli = makeHelicopter();
    police.heli.position.set(player.x + 20, 42, player.z - 20);
    scene.add(police.heli);
  }
  if (stars < 3 && police.heli) {
    scene.remove(police.heli);
    police.heli = null;
  }
  if (police.heli) {
    const h = police.heli;
    const tx = player.x + 14, tz = player.z - 14;
    h.position.x += (tx - h.position.x) * Math.min(1, dt * 0.8);
    h.position.z += (tz - h.position.z) * Math.min(1, dt * 0.8);
    h.position.y = 40 + Math.sin(performance.now() * 0.001) * 2;
    h.userData.rotor.rotation.y += dt * 22;
    h.lookAt(player.x, h.position.y, player.z);
    h.userData.spot.target.position.set(player.x - h.position.x, -h.position.y, player.z - h.position.z);
  }
  police.sirenPhase += dt * 6;
  // Chase: steer toward the player, ram, and slow down when close.
  const spec = CAR_TYPES.find(c => c.id === 'police');
  for (const car of police.cars) {
    const dx = player.x - car.position.x, dz = player.z - car.position.z;
    const dist = Math.hypot(dx, dz);
    car.userData.angle = steerToward(car.userData.angle, Math.atan2(dx, dz), dt, 2.4);
    const target = dist > 8 ? spec.top : spec.top * 0.4;
    car.userData.speed = easeSpeed(car.userData.speed, target, dt, 1.4);
    car.position.x += Math.sin(car.userData.angle) * car.userData.speed * dt;
    car.position.z += Math.cos(car.userData.angle) * car.userData.speed * dt;
    car.rotation.y = -car.userData.angle + Math.PI / 2;
    if (car.userData.lightbar) {
      car.userData.lightbar.material.color.setHex(Math.sin(police.sirenPhase) > 0 ? 0xef4444 : 0x3b82f6);
    }
    // Ramming the player's car damages it; touching the player on foot
    // starts the busted timer.
    if (dist < 3.4) {
      if (!player.onFoot && player.car) {
        player.car.userData.speed *= 0.75;
        if (player.car.userData.hp === undefined) player.car.userData.hp = 100;
        player.car.userData.hp -= dt * 9;
      } else {
        player.bustedTimer += dt;
        if (player.bustedTimer > 2.0 && onBusted) onBusted();
      }
    } else if (player.onFoot) {
      player.bustedTimer = Math.max(0, player.bustedTimer - dt);
    }
  }
  // Heat cools only while no police car is close (broken line of sight):
  // hide for 8 seconds, then the stars start falling.
  const nearest = nearestPursuit(police, player);
  if (stars > 0 && nearest > 42 && (!police.heli || stars < 3)) {
    police.cooldown += dt;
    if (police.cooldown > 8) {
      police.heat = Math.max(0, police.heat - dt * 14);
      if (police.heat <= 0) police.cooldown = 0;
    }
  } else {
    police.cooldown = Math.max(0, police.cooldown - dt * 2);
  }
  return stars;
}
