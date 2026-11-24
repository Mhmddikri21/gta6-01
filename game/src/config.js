// OPAL COAST — tuning constants and the seeded city layout.
// All numbers the other modules share live here, so one edit retunes the game.

export const CFG = {
  // World: a street grid on the coast, sea to the east.
  blockSize: 42,
  roadWidth: 12,
  grid: 5, // 5x5 blocks
  seaX: 128, // x beyond this is water
  beachX: 112,

  // Player car.
  topSpeed: 38, // m/s (~137 km/h)
  accel: 16,
  brake: 30,
  reverseSpeed: 12,
  steerMax: 0.55, // rad at standstill
  handbrakeGrip: 0.35,
  fovBase: 62,
  fovTop: 71,

  // Traffic.
  trafficCount: 14,
  trafficSpeed: 9,
  nearMissSpeed: 20,
  nearMissReward: 10,
  nearMissCooldown: 4, // seconds per car

  // Pedestrians.
  pedCount: 26,

  // Police / wanted.
  maxStars: 4,
  heatPerPed: 1,
  heatPerCar: 1,
  heatDecaySeconds: 8, // hidden this long cools one star
  bustedFine: 100,

  // Missions.
  tankerHullMax: 100,
  tankerHullWarnAt: 30, // warn once below this
  missionReward: 500,

  // Collectibles.
  shardCount: 10,
  shardReward: 50,
  shardAllBonus: 250,

  // Garage.
  repairCost: 0, // free repair at Juno's garage — drive inside to fix damage
  // Minimap.
  mapRange: 260, // world units the minimap spans
};

// Seeded RNG (mulberry32) so the city layout is identical every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Street centre lines for the grid, derived from the constants.
export function streetLines() {
  const lines = [];
  const half = (CFG.grid * CFG.blockSize) / 2;
  for (let i = 0; i <= CFG.grid; i++) {
    const c = -half + i * CFG.blockSize;
    lines.push({ axis: 'x', at: c });
    lines.push({ axis: 'z', at: c });
  }
  return lines;
}

// Named places in the city.
export const PLACES = {
  marina: { x: 96, z: -84 },
  pier: { x: 122, z: 20 },
  garage: { x: -63, z: 42 },
  plaza: { x: 0, z: 0 },
  beach: { x: 116, z: -40 },
};
