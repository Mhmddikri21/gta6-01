// OPAL COAST — the one shared mutable state object.
// Every system reads and writes this; nothing else holds game state.

export const S = {
  time: 0,
  started: false,
  paused: false,
  photo: false,
  cash: 250,
  heat: 0,
  wanted: 0,
  lastCrime: -999,
  hull: 100,
  hullWarned: false,
  mission: 'm1',
  objective: 'Meet Dalia at the marina',
  speedKmh: 0,
  damage: 0,
  shards: 0,
  nearMissTotal: 0,
  busted: 0,
  jobsDone: 0,
  onFoot: false,
  hint: '',
  hintUntil: 0,
  checkpoint: 0,
  checkpointsTotal: 3,
};

export function addCash(n) {
  S.cash += n;
}

export function addHeat(n) {
  S.heat = Math.min(100, S.heat + n);
  S.lastCrime = S.time;
  S.wanted = Math.min(4, Math.floor(S.heat / 25));
}

export function setWanted(n) {
  S.wanted = Math.max(0, Math.min(4, n));
  S.heat = S.wanted * 25;
  // Setting the wanted level counts as a fresh crime: the 8-second
  // cool-down only starts ticking from now.
  S.lastCrime = S.time;
}

export function hint(text, ms = 2600) {
  S.hint = text;
  S.hintUntil = S.time + ms / 1000;
}

export function setObjective(text) {
  S.objective = text;
}

export function setMission(m) {
  S.mission = m;
}

export function resetRun() {
  S.cash = 250;
  S.heat = 0;
  S.wanted = 0;
  S.hull = 100;
  S.hullWarned = false;
  S.mission = 'm1';
  S.objective = 'Meet Dalia at the marina';
  S.damage = 0;
  S.shards = 0;
  S.nearMissTotal = 0;
  S.busted = 0;
  S.jobsDone = 0;
  S.checkpoint = 0;
}
