// OPAL COAST — shared mutable game state and small helpers.
// Every module reads/writes this one object, so the loop stays the source of truth.

import { CFG } from './config.js';

export const S = {
  started: false,
  paused: false,
  photo: false,
  muted: false,
  time: 0,
  cash: 0,
  heat: 0, // 0..4 stars, fractional while decaying
  stars: 0,
  lastCrime: -999, // time of the last crime (drives heat decay)
  speed: 0, // m/s, signed
  damage: 0, // 0..100
  onFoot: false,
  busted: false,
  mission: 'm1',
  missionText: 'Meet Dalia at the marina',
  hull: CFG.tankerHullMax,
  hullWarned: false,
  shards: 0,
  nearMissTotal: 0,
  hint: '', // transient hint text
  hintUntil: 0,
  player: { x: 0, z: 84, heading: 0 },
  car: { x: 0, z: 84, heading: 0 },
};

export function addCash(n) {
  S.cash += n;
}

export function showHint(text, seconds = 2) {
  S.hint = text;
  S.hintUntil = S.time + seconds;
}

export function addHeat(n) {
  S.heat = Math.min(CFG.maxStars, S.heat + n);
  S.stars = Math.floor(S.heat);
  S.lastCrime = S.time;
}

// One star cools off after hiding out of sight for heatDecaySeconds.
export function decayHeat(dt) {
  if (S.stars <= 0) return;
  if (S.time - S.lastCrime >= CFG.heatDecaySeconds) {
    S.heat = Math.max(0, S.heat - dt / CFG.heatDecaySeconds);
    S.stars = Math.floor(S.heat);
  }
}

export function resetRun() {
  S.cash = 0;
  S.heat = 0;
  S.stars = 0;
  S.damage = 0;
  S.onFoot = false;
  S.busted = false;
  S.mission = 'm1';
  S.missionText = 'Meet Dalia at the marina';
  S.hull = CFG.tankerHullMax;
  S.hullWarned = false;
  S.shards = 0;
  S.nearMissTotal = 0;
  S.hint = '';
  S.player = { x: 0, z: 84, heading: 0 };
  S.car = { x: 0, z: 84, heading: 0 };
}
