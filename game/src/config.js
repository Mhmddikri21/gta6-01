// OPAL COAST — tuning, palette and the seeded layout.
// Every number the game balances on lives here so a tweak is one line.

export const CFG = {
  seed: 20261124,
  cityHalf: 160,
  roadGap: 60,
  roadWidth: 10,
  trafficCount: 14,
  pedCount: 26,
  shardCount: 10,
  maxSpeed: 42, // m/s, about 151 km/h
  accel: 24,
  brake: 36,
  reverseMax: 12,
  steerRate: 1.9,
  drag: 0.55,
  grip: 6.5,
  handbrakeGrip: 1.6,
  nearMissSpeed: 20,
  nearMissReward: 10,
  nearMissCooldown: 4,
  nearMissDist: 4.2,
  hitPedHeat: 25,
  hitCarHeat: 15,
  heatDecayDelay: 8,
  heatDecayRate: 12,
  bustedFine: 100,
  shardReward: 50,
  missionReward: 500,
  repairCost: 20,
  fovMin: 62,
  fovMax: 71,
  walkSpeed: 6,
  tankerSpeed: 10,
  tankerHull: 100,
  hullWarnAt: 30,
  rivalHitDamage: 8,
  palette: {
    sky: 0x87bfe8,
    fog: 0x9fd0ea,
    ground: 0x3f7a4e,
    sand: 0xe8d49a,
    water: 0x1e6f9e,
    road: 0x2c2f36,
    sidewalk: 0x9aa0a8,
    building: [0xd8c9a3, 0xc9a06a, 0x8fb3c9, 0xe0a080, 0xa8c69f, 0xd0b0c0],
    car: 0x19b8a6,
    tanker: 0xd8b13a,
    police: 0x1a1d24,
    gold: 0xffc93c,
    opal: 0x7df9e8,
  },
  garage: { x: -90, z: 60 },
  marina: { x: 148, z: 0 },
  pier: { x: 188, z: 0 },
  plaza: { x: 0, z: 0 },
  beach: { x: 0, z: 150 },
};

// Deterministic RNG (mulberry32) so the city layout and the staged
// screenshots are the same on every load.
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  return mulberry32(seed);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}
