// OPAL COAST — staged screenshot scenes for ?shot=N.
// Each scene sets the player, wanted level, mission and camera so the four
// screenshots show the game's systems at a glance.

import { CFG, PLACES } from './config.js';
import { S } from './state.js';
import { Player, resetTo, setOnFoot, snapCamera } from './player.js';
import { Police } from './police.js';
import { Missions, placeTanker, setMission } from './missions.js';

function setStars(n) {
  S.heat = n;
  S.stars = n;
  S.lastCrime = S.time;
}

function spawnInterceptors(n) {
  // Flank close in (radius 12) so they are in frame: left-front, right-front,
  // then one behind. Angles are relative to the car's heading.
  const spots = [
    { dx: -7, dz: 9 },
    { dx: 7, dz: 9 },
    { dx: 0, dz: -12 },
    { dx: -9, dz: -4 },
  ];
  for (let i = 0; i < n; i++) {
    const s = spots[i % spots.length];
    const h = Player.heading;
    const x = S.car.x + s.dx * Math.cos(h) - s.dz * Math.sin(h);
    const z = S.car.z + s.dx * Math.sin(h) + s.dz * Math.cos(h);
    // Interceptors are spawned by the police module in the live game; here we
    // place their meshes directly so the shot shows the chase.
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.7, 4.4),
      new THREE.MeshLambertMaterial({ color: 0x1a1a2a })
    );
    body.position.y = 0.55;
    g.add(body);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.25, 0.5),
      new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0xff2020 : 0x2020ff })
    );
    bar.position.set(0, 1.55, -0.2);
    g.add(bar);
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(S.car.x - x, S.car.z - z);
    Police.scene.add(g);
    Police.interceptors.push({ mesh: g, x, z, speed: 0, sirenT: 0 });
  }
}

export function applyShot(n) {
  // Reset the police to a clean slate first.
  for (const it of Police.interceptors) Police.scene.remove(it.mesh);
  Police.interceptors.length = 0;
  S.damage = 0;
  S.cash = 1250;
  S.shards = 3;

  if (n === 1) {
    // Chase: 4 stars, interceptors flanking close, tanker ahead, on a road.
    // Road x=63 runs north-south; the car faces south (+z) down it.
    resetTo(63, 0, 0);
    setStars(4);
    S.speed = 26;
    Player.speed = 26;
    setMission('m2', 'Escort the tanker — keep its hull above 30%');
    placeTanker(S.car.x, S.car.z + 18);
    S.hull = 100;
    spawnInterceptors(3);
  } else if (n === 2) {
    // On foot at the marina, facing east toward the sea horizon.
    // Stand on road x=105 (clear of buildings) so the beach and sea are in
    // frame; park the car on the same road, south of the player, at the
    // frame edge. The camera sits 4 m behind the player, so the car must
    // never sit on the camera-player line.
    resetTo(105, -76, Math.PI * 0.5);
    setOnFoot(true);
    S.player.x = 105;
    S.player.z = -84;
    S.player.heading = Math.PI * 0.5;
    Player.person.position.set(S.player.x, 0, S.player.z);
    S.car.x = 105;
    S.car.z = -92;
    Player.mesh.position.set(S.car.x, 0, S.car.z);
    setStars(0);
    setMission('m1', 'Meet Dalia at the marina');
  } else if (n === 3) {
    // Race: checkpoint ring and beacon dead ahead, rival beside the player.
    // Road x=84 runs north-south; the first checkpoint is 21 m ahead.
    resetTo(84, -63, 0);
    setStars(2);
    S.speed = 18;
    Player.speed = 18;
    setMission('m3', 'Getaway — hit 3 checkpoints, beat Nacho');
    if (Missions.rival) {
      Missions.rival.x = 80;
      Missions.rival.z = -60;
      Missions.rival.speed = 0;
      Missions.rival.mesh.position.set(80, 0, -60);
    }
  } else {
    // Pier: on the planks between boats, tanker at the pier end, 4 stars.
    resetTo(PLACES.pier.x + 2, PLACES.pier.z, Math.PI * 0.5);
    setStars(4);
    setMission('m2', 'Escort the tanker — keep its hull above 30%');
    placeTanker(PLACES.pier.x + 26, PLACES.pier.z);
    S.hull = 64;
    spawnInterceptors(2);
  }
  snapCamera();
}

export const SHOT_TITLES = {
  1: 'chase',
  2: 'marina',
  3: 'race',
  4: 'pier',
};
