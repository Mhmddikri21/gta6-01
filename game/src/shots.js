// OPAL COAST — staged scenes for the four screenshots (?shot=N).
// Each shot places the player, the police, the tanker and the mission
// so one frame shows the game at its best. Called once at load when the
// URL carries ?shot=1..4; the game then runs live behind the camera.

import { CFG } from './config.js';
import { S, setObjective } from './state.js';

export const Shots = {
  // ctx: { player, police, missions, traffic, peds, collectibles }
  stage(n, ctx) {
    const { player, police, missions } = ctx;
    S.started = true;
    if (n === 1) {
      // Chase: four stars, interceptors flanking, the tanker ahead.
      missions.forceMission('m2');
      missions.placeTanker(0, 45, 3);
      S.heat = 100;
      S.wanted = 4;
      S.lastCrimeAt = S.time;
      player.placeCar(0, -20, 0, 28);
      police.stage(3, 0, -20);
      setObjective('Escort the tanker — hull 78% — 4 stars on your tail');
      return 'chase';
    }
    if (n === 2) {
      // On foot at the marina, evening light, peds strolling.
      missions.forceMission('m1');
      S.heat = 0;
      S.wanted = 0;
      player.placeCar(CFG.places.marina.x + 12, CFG.places.marina.z - 8, Math.PI * 0.5, 0);
      player.setOnFoot(true);
      S.playerX = CFG.places.marina.x + 6;
      S.playerZ = CFG.places.marina.z + 4;
      S.playerHeading = Math.PI * 0.75;
      player.syncToState();
      setObjective("Dalia: pick up the package at the plaza (follow the gold beacon)");
      return 'marina';
    }
    if (n === 3) {
      // Race: at the start line with a rival, teal checkpoints ahead.
      missions.forceMission('m3');
      S.heat = 0;
      S.wanted = 0;
      S.lastCrimeAt = -9999;
      S.toast = '';
      S.toastTimer = 0;
      player.placeCar(CFG.places.raceStart.x, CFG.places.raceStart.z, 0, 0);
      // A rival on the player's bumper: borrow the first traffic car and
      // park it there (speed 0, so it holds the pose for the shot).
      const rival = ctx.traffic.list[0];
      if (rival) {
        rival.x = CFG.places.raceStart.x + 4.5;
        rival.z = CFG.places.raceStart.z + 1;
        rival.heading = 0;
        rival.speed = 0;
        rival.mesh.position.set(rival.x, 0, rival.z);
        rival.mesh.rotation.y = 0;
      }
      setObjective('m3 — THE GETAWAY: hit checkpoint 1/3');
      return 'race';
    }
    // Shot 4: the pier shootout — on foot at the pier's end, police closing.
    missions.forceMission('m1');
    S.heat = 75;
    S.wanted = 3;
    S.lastCrimeAt = S.time;
    player.placeCar(CFG.places.pier.x + 30, CFG.places.pier.z - 10, Math.PI, 0);
    player.setOnFoot(true);
    // Stand on the pier's north edge, between the lamp posts, facing the
    // shore so the closing interceptors read in the frame.
    S.playerX = CFG.places.pier.x + 7;
    S.playerZ = CFG.places.pier.z + 3;
    S.playerHeading = Math.PI / 2;
    player.syncToState();
    police.stage(2, -170, CFG.places.pier.z - 2);
    setObjective('3 stars — the OCPD is closing in on the pier');
    return 'pier';
  },
};

// The four shots and their titles, mirrored in shots.json.
export const SHOT_DEFS = [
  { n: 1, file: '1-chase.jpg', title: 'Four-star chase — interceptors flanking, tanker ahead' },
  { n: 2, file: '2-marina.jpg', title: 'On foot at the marina — Opal Coast at golden hour' },
  { n: 3, file: '3-race.jpg', title: 'The getaway — teal checkpoints with a rival on your bumper' },
  { n: 4, file: '4-pier.jpg', title: 'Cornered on the pier — three stars and nowhere to run' },
];
