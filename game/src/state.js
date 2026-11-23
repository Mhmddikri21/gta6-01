// OPAL COAST — the shared game state.
// Every module reads and writes this one object, so the HUD, the police,
// the missions and the player always agree about what is happening.

import { CFG } from './config.js';

// The live state of a run. resetGame() restores a fresh start.
export const S = {
  started: false, // past the start screen
  paused: false,
  photo: false, // photo mode hides the HUD
  over: false, // busted overlay showing
  time: 0,

  cash: 250,
  heat: 0, // 0..100, drives the wanted level
  wanted: 0, // 0..4 stars
  lastCrimeAt: -9999, // game time of the last crime
  hiddenTimer: 0,

  onFoot: false,
  playerX: 0,
  playerZ: 0,
  playerHeading: 0,
  playerSpeed: 0,
  carDamage: 0, // 0 = pristine, 100 = wrecked
  carX: 0,
  carZ: 0,
  carHeading: 0,

  busted: false,
  bustedHold: 0,

  mission: {
    id: 'm1',
    stage: 0,
    done: false,
    chainDone: false,
    tankerHull: CFG.tankerHull,
    hullWarned: false,
    checkpointsHit: 0,
    failed: false,
  },

  shards: 0,
  shardsTotal: CFG.shardCount,

  hint: '',
  hintTimer: 0,
  toast: '',
  toastTimer: 0,
  objective: '',

  nearMisses: 0,
  crimes: 0,
  rivalsDestroyed: 0,
};

export function resetGame() {
  S.started = false;
  S.paused = false;
  S.photo = false;
  S.over = false;
  S.time = 0;
  S.cash = 250;
  S.heat = 0;
  S.wanted = 0;
  S.lastCrimeAt = -9999;
  S.hiddenTimer = 0;
  S.onFoot = false;
  S.playerX = CFG.places.spawn.x;
  S.playerZ = CFG.places.spawn.z;
  S.playerHeading = 0;
  S.playerSpeed = 0;
  S.carDamage = 0;
  S.carX = CFG.places.spawn.x;
  S.carZ = CFG.places.spawn.z;
  S.carHeading = 0;
  S.busted = false;
  S.bustedHold = 0;
  S.mission.id = 'm1';
  S.mission.stage = 0;
  S.mission.done = false;
  S.mission.chainDone = false;
  S.mission.tankerHull = CFG.tankerHull;
  S.mission.hullWarned = false;
  S.mission.checkpointsHit = 0;
  S.mission.failed = false;
  S.shards = 0;
  S.hint = '';
  S.hintTimer = 0;
  S.toast = '';
  S.toastTimer = 0;
  S.objective = '';
  S.nearMisses = 0;
  S.crimes = 0;
  S.rivalsDestroyed = 0;
}

export function addCash(n) {
  S.cash = Math.max(0, S.cash + n);
}

// A crime raises heat and stamps the time, so the 8-second cool-down
// only starts once the player stops committing crimes.
export function commitCrime(heat) {
  S.heat = Math.min(100, S.heat + heat);
  S.lastCrimeAt = S.time;
  S.crimes += 1;
  S.wanted = Math.min(CFG.maxWanted, Math.floor(S.heat / CFG.heatPerStar));
}

export function setHint(text, secs = 2.5) {
  S.hint = text;
  S.hintTimer = secs;
}

export function setToast(text, secs = 4) {
  S.toast = text;
  S.toastTimer = secs;
}

export function setObjective(text) {
  S.objective = text;
}

// Called once per frame: decay hint/toast timers.
export function tickTimers(dt) {
  if (S.hintTimer > 0) {
    S.hintTimer -= dt;
    if (S.hintTimer <= 0) S.hint = '';
  }
  if (S.toastTimer > 0) {
    S.toastTimer -= dt;
    if (S.toastTimer <= 0) S.toast = '';
  }
}
