// OPAL COAST — screenshot staging.
// One job: given ?shot=N in the URL, place the player, cars, police and
// mission into a real playable game state so a headless browser can capture
// a true render of the game (never a fake image). Every staged state is
// reachable by playing.

// Put the chase camera exactly where the frame loop would settle it, so
// the very first rendered frame already shows the player and the action.
function snapCamera(game) {
  const p = game.player;
  const dist = p.onFoot ? 7.5 : 11;
  const height = p.onFoot ? 3.4 : 4.6;
  const back = { x: Math.sin(p.angle), z: Math.cos(p.angle) };
  game.camera.position.set(p.x - back.x * dist, height, p.z - back.z * dist);
  game.camera.lookAt(p.x + back.x * 6, p.onFoot ? 1.6 : 1.4, p.z + back.z * 6);
}

function applyShot(game, shot) {
  const stager = SHOT_STAGERS[shot];
  if (stager) stager(game);
  updateHud(game, 0);
}

// One stager per screenshot. Each puts the player, the cars, the police
// and a mission into a real playable state.
const SHOT_STAGERS = {
  1(game) { stageChase(game); },
  2(game) { stageOnFoot(game); },
  3(game) { stageRace(game); },
  4(game) { stagePier(game); },
};

// COVER: sunset chase on the coastal boulevard — 4 stars, police closing
// in from the sides, Air One above, the Union tanker ahead.
function stageChase(game) {
  const p = game.player;
  startMission(game.missions, game);
  game.missions.index = 1;
  startMission(game.missions, game);
  addHeat(game.police, 62);
  const car = game.trafficCars[0];
  enterCar(p, car, game.scene);
  car.position.set(168, 0, 60);
  car.userData.angle = Math.PI;
  car.userData.speed = 30;
  car.userData.type = 'coupe';
  car.userData.bodyMat.color.setHex(0xf97316);
  p.x = 168; p.z = 60; p.angle = Math.PI;
  game.missions.targetCar.position.set(168, 0, 22);
  game.missions.targetCar.userData.angle = Math.PI;
  game.missions.targetCar.userData.speed = 14;
  // OCPD interceptors flanking the player, in frame ahead of the camera.
  for (let i = 0; i < 2; i++) {
    const pc = spawnPoliceCar(game.scene, p, Math.random);
    pc.position.set(152 + i * 30, 0, 30 - i * 8);
    pc.userData.angle = Math.PI;
    game.police.cars.push(pc);
  }
  // Air One hovering ahead-left, low enough to stay in frame.
  const heli = makeHelicopter();
  heli.position.set(148, 25, 12);
  game.scene.add(heli);
  game.police.heli = heli;
  game.timeOfDay = 17.6;
  snapCamera(game);
}

// On foot on the marina boardwalk at dusk, filters ahead, traffic and
// pedestrians around, open sky to the east.
function stageOnFoot(game) {
  const p = game.player;
  game.missions.index = 4;
  startMission(game.missions, game);
  // On the boulevard itself, clear of the building row, facing the marina.
  p.x = 168; p.z = -92; p.angle = Math.PI;
  p.mesh.position.set(p.x, 0, p.z);
  p.health = 82; p.armour = 55; p.cash = 6420;
  game.timeOfDay = 17.9;
  snapCamera(game);
}

// Coastal highway race: checkpoints ahead, rival beside the player.
function stageRace(game) {
  const p = game.player;
  game.missions.index = 5;
  startMission(game.missions, game);
  const car = game.trafficCars[1] || game.trafficCars[0];
  enterCar(p, car, game.scene);
  car.position.set(160, 0, 148);
  car.userData.angle = Math.PI;
  car.userData.speed = 26;
  car.userData.type = 'muscle';
  car.userData.bodyMat.color.setHex(0xf97316);
  p.x = 160; p.z = 148; p.angle = Math.PI;
  game.missions.stage = 1;
  game.timeOfDay = 16.8;
  snapCamera(game);
}

// Pier shootout at dusk: on foot on the sand, pistol out, police cars
// and Air One closing in, the pier and the ocean ahead.
function stagePier(game) {
  const p = game.player;
  game.missions.index = 2;
  startMission(game.missions, game);
  p.x = 168; p.z = -28; p.angle = Math.PI / 2;
  p.mesh.position.set(p.x, 0, p.z);
  p.weaponIndex = 1;
  p.health = 72; p.armour = 40; p.cash = 18450;
  addHeat(game.police, 45);
  // Staged interceptors start well out (40 m+) so that, by the time the
  // shot is taken, they are visibly closing in — not parked on the player
  // between the camera and the pier.
  for (let i = 0; i < 2; i++) {
    const pc = spawnPoliceCar(game.scene, p, Math.random);
    pc.position.set(205 + i * 6, 0, -56 + i * 48);
    pc.userData.angle = 2.6;
    game.police.cars.push(pc);
  }
  const heli = makeHelicopter();
  heli.position.set(185, 32, -55);
  game.scene.add(heli);
  game.police.heli = heli;
  game.timeOfDay = 18.2;
  snapCamera(game);
}
