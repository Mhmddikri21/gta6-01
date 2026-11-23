// OPAL COAST — tuning constants and world layout.
// One source of truth for every number the other modules use.

export const CFG = {
  // World: a sun-soaked coastal city grid. West edge (-x) is the sea.
  worldHalf: 200,
  roadSpacing: 50,
  roadHalfWidth: 5,
  coastX: -185, // water starts west of here
  beachX: -170, // sand strip between coastX and beachX

  // Player car (arcade physics)
  carAccel: 16,
  carBrake: 30,
  carReverseMax: 11,
  carTopSpeed: 38,
  carSteer: 0.55, // radians per second at full lock, scaled by speed
  carGrip: 6.5,
  handbrakeGrip: 2.2,
  carRadius: 1.6,
  walkSpeed: 5.2,

  // Traffic and pedestrians
  trafficCount: 14,
  pedCount: 26,
  trafficSpeedMin: 7,
  trafficSpeedMax: 12,
  pedSpeedMin: 1.1,
  pedSpeedMax: 2.1,

  // Wanted / police
  heatPerPedHit: 25,
  heatPerCarHit: 12,
  heatPerSpeeding: 6,
  heatDecayDelay: 8, // seconds hidden before heat cools
  heatDecayRate: 6,
  heatPerStar: 25,
  maxWanted: 4,
  bustedHoldTime: 2.5, // seconds an interceptor must sit on you while slow
  bustedFine: 100,

  // Near-miss bonus
  nearMissSpeed: 20, // m/s
  nearMissRange: 4.2,
  nearMissReward: 10,
  nearMissCooldown: 4,

  // Collectibles
  shardCount: 10,
  shardReward: 25,
  shardRadius: 2.2,

  // Garage repair
  garageRepairCost: 20,
  garageHoldTime: 2,

  // Missions
  missionRewards: { m1: 150, m2: 400, m3: 600 },
  tankerHull: 100,
  tankerSpeed: 9,
  tankerWarnAt: 30,
  rivalRamDamage: 10,
  rivalRamCooldown: 3,
  rivalReward: 25,

  // Camera
  camDistance: 11,
  camHeight: 4.6,
  fovBase: 62,
  fovTop: 71,
  fovTopSpeed: 36,

  // Colours of the city (sun-soaked pastel palette)
  palette: {
    sky: 0x87c5e8,
    sea: 0x1f7fa8,
    sand: 0xe8d29a,
    asphalt: 0x3a3f46,
    sidewalk: 0xb9b3a4,
    building: [0xf2e3c6, 0xe8a87c, 0x7fb5a8, 0xd97b6c, 0xf5f0e1, 0x9db8d2, 0xe6c9a8],
    roof: [0x8a5a3b, 0x5a6b7a, 0x7a4a3a],
  },

  // Key places (x, z) on the map
  places: {
    spawn: { x: 0, z: 0 },
    garage: { x: 60, z: -60 },
    marina: { x: -168, z: 60 },
    pier: { x: -212, z: 60 },
    daliaPickup: { x: 100, z: 100 },
    tankerStart: { x: -100, z: -100 },
    tankerEnd: { x: 150, z: 150 },
    raceStart: { x: -50, z: -100 },
  },

  // The ten opal shard hiding spots
  shardSpots: [
    { x: -160, z: 20 }, { x: -175, z: -80 }, { x: -150, z: 120 },
    { x: 25, z: 25 }, { x: 75, z: -25 }, { x: -25, z: -75 },
    { x: 125, z: 75 }, { x: -75, z: 125 }, { x: 175, z: -125 },
    { x: 25, z: 150 },
  ],

  // Race checkpoints for mission m3
  raceCheckpoints: [
    { x: -50, z: 50 }, { x: 100, z: -50 }, { x: 50, z: 150 },
  ],
};

// Grid road lines (both axes), derived from the spacing.
export const ROAD_LINES = [];
for (let v = -150; v <= 150; v += CFG.roadSpacing) ROAD_LINES.push(v);

// Clamp a value between two bounds.
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Wrap an angle to [-PI, PI].
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Distance on the ground plane.
export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// A small deterministic random helper (seeded, so the city is the same every load).
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
