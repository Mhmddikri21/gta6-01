// OPAL COAST — the four staged screenshot scenes (?shot=1..4).
// Each one poses the player, the mission, the police and the camera so a
// single frame shows several systems at once.

import { setWanted } from './state.js';

export function stageShot(n, ctx) {
  const { player, police, missions } = ctx;

  if (n === 1) {
    // Chase: 4 stars, three interceptors flanking, the tanker ahead.
    missions.setM2();
    missions.tankerState.pos.set(0, 0, 28);
    missions.tankerState.heading = Math.PI;
    missions.tanker.position.copy(missions.tankerState.pos);
    missions.tanker.rotation.y = Math.PI;
    player.resetTo(0, 62, Math.PI, 28, false);
    setWanted(4);
    police.place(police.interceptors[0], -7, 44, Math.PI);
    police.place(police.interceptors[1], 7, 50, Math.PI);
    police.place(police.interceptors[2], 0, 84, Math.PI);
  } else if (n === 2) {
    // On foot at the marina, facing east toward the docks, the boats
    // and Dalia's marker — the sea behind them.
    missions.setM1();
    setWanted(0);
    player.resetTo(138, 8, Math.PI / 2, 0, true);
  } else if (n === 3) {
    // Race: on the road south of the first ring, facing it, with
    // Nacho beside the player.
    player.resetTo(-60, 100, Math.PI, 0, false);
    missions.setM3();
    player.speed = 0;
  } else {
    // Pier: racing the tanker route with interceptors closing in.
    missions.setM2();
    missions.tankerState.pos.set(185, 0, 0);
    missions.tankerState.heading = Math.PI / 2;
    missions.tanker.position.copy(missions.tankerState.pos);
    missions.tanker.rotation.y = Math.PI / 2;
    player.resetTo(148, 0, Math.PI / 2, 12, false);
    setWanted(4);
    police.place(police.interceptors[0], 132, -5, Math.PI / 2);
    police.place(police.interceptors[1], 136, 6, Math.PI / 2);
  }
  player.snapCamera();
}
