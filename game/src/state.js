// OPAL COAST — shared mutable game state, one object passed everywhere.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
export function createState() {
  return {
    time: 0,
    cash: 250,
    shardsCollected: 0,
    mode: 'car',
    started: false,
    paused: false,
    photoMode: false,
    muted: false,
    heat: 0,
    stars: 0,
    lastCrimeAt: -100,
    missionId: 'm1',
    objective: 'Drive to the marina and meet Dalia',
    hullWarned: false,
  };
}

export function addCash(state, amount) {
  state.cash += amount;
  return state.cash;
}
