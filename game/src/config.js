// OPAL COAST — shared configuration.
// The single place every other file reads numbers, names and story from:
// the city layout, the crew, the ranks, the weapons, the cars, the six
// jobs, the districts and the radio stations. No rendering, no DOM here.

const OPAL = {
  title: 'OPAL COAST',
  subtitle: 'a sun-soaked open-world crime story',
  city: 'Opal Coast',
  // The city is a road grid on the coast. Roads repeat every BLOCK metres;
  // east of EAST_BEACH the sand starts, then the ocean. The marina is
  // north, the desal plant west, the docks south-west.
  BLOCK: 46,
  GRID: 7,               // 7 x 7 blocks, centred on (0, 0)
  ROAD_HALF: 5,          // half-width of a road
  EAST_BEACH: 175,       // x beyond this is sand, then water
  WORLD_R: 210,          // playable radius, soft-clamped
  SEA_LEVEL: 0.4,
  GARAGE: { x: -20, z: -20 }, // Juno's garage: safehouse and respawn
  SUNSET: { skyTop: 0x2e4a7a, skyMid: 0xf2a35e, skyLow: 0xffd9a0, fog: 0xf7b06a, sun: 0xffd27a },
  DAY:    { skyTop: 0x3f8fd2, skyMid: 0x9fd8ef, skyLow: 0xffe9b0, fog: 0xcfe8f2, sun: 0xfff2c0 },
};

// The people of Opal Coast. Mero "Slick" Vance is the player; Dalia Kade
// hands out the jobs, Juno Park fixes the cars, Kiki Sol watches the
// streets, and Nacho Reyes is the rival who wants the coast for himself.
const CREW = {
  player:   { name: 'Mero Vance', alias: 'Slick', role: 'Driver · ex water-hauler', color: '#2dd4bf' },
  fixer:    { name: 'Dalia Kade', role: 'Fixer · Dock Hand', color: '#f59e0b' },
  mechanic: { name: 'Juno Park', role: 'Mechanic · Garage', color: '#a78bfa' },
  lookout:  { name: 'Kiki Sol', role: 'Lookout · Rooftops', color: '#f472b6' },
  rival:    { name: 'Nacho Reyes', role: 'Rival · Union wheelman', color: '#ef4444' },
  villain:  { name: 'The Hydration Union', role: 'Owns the water grid', color: '#38bdf8' },
};

// Respect ranks: earn RP from jobs and the rank name on the HUD changes.
const RANKS = [
  { name: 'Nobody', rp: 0 },
  { name: 'Dock Hand', rp: 250 },
  { name: 'Runner', rp: 700 },
  { name: 'Wheelman', rp: 1500 },
  { name: 'Fixer', rp: 3000 },
  { name: 'King of the Coast', rp: 5200 },
];

// Weapons. Fists and the pistol are yours from the start; the SMG and the
// rifle unlock when your respect is high enough.
const WEAPONS = [
  { id: 'fists',  name: 'FISTS',   ammo: Infinity, damage: 12, range: 2.2, rate: 0.45, icon: '1' },
  { id: 'pistol', name: 'P9',      ammo: 84,       damage: 26, range: 42,  rate: 0.28, icon: '2' },
  { id: 'smg',    name: 'MAKO 45', ammo: 208,      damage: 16, range: 36,  rate: 0.09, icon: '3', locked: true, lockRp: 700 },
  { id: 'rifle',  name: 'GATOR',   ammo: 60,       damage: 55, range: 70,  rate: 0.6,  icon: '4', locked: true, lockRp: 1500 },
];

// Cars. top is top speed in m/s, accel the approach rate, grip the steering
// response. Traffic only spawns the first four types; the police car and
// the tanker are special.
const CAR_TYPES = [
  { id: 'sedan',  name: 'Calyx Sprint GT',  top: 34, accel: 16, grip: 2.6, color: 0xd94f3d, price: 0 },
  { id: 'coupe',  name: 'Rukan Pelo GT',    top: 42, accel: 20, grip: 2.9, color: 0xf97316, price: 1200 },
  { id: 'muscle', name: 'Vela V8 Brute',   top: 38, accel: 24, grip: 2.2, color: 0x7c3aed, price: 900 },
  { id: 'taxi',   name: 'Opal Cab',        top: 30, accel: 13, grip: 2.4, color: 0xfacc15, price: 0 },
  { id: 'truck',  name: 'Union Tanker',    top: 26, accel: 10, grip: 1.8, color: 0x38bdf8, price: 0 },
  { id: 'police', name: 'OCPD Interceptor', top: 44, accel: 26, grip: 3.1, color: 0x1e293b, price: 0 },
];

// The six-job story. missions.js runs each one as a small state machine;
// kind selects the behaviour, stages are the HUD steps, target is the
// beacon position, reward and rp are paid on completion.
const MISSIONS = [
  {
    id: 'm1', job: 'JOB 1/6', title: 'THE DRY RUN', giver: 'Dalia Kade',
    brief: 'The Union cut the water and blamed the docks. Drive to the desal plant and plant the fake inspection badge.',
    stages: ['Drive to the Desal Plant', 'Plant the badge', 'Get clear'],
    kind: 'drive', target: { x: -138, z: -138 }, reward: 420, rp: 250,
    dialogue: 'Badge is in the glovebox, Slick. Smile at the gate, plant it, walk away like you own the place.',
  },
  {
    id: 'm2', job: 'JOB 2/6', title: 'SALINITY CHECK', giver: 'Dalia Kade',
    brief: 'A Union tanker is hauling the good water to the pier. Wreck it before it reaches the water.',
    stages: ['Chase the tanker', 'Ram it until it wrecks', 'Vanish'],
    kind: 'ram', target: { x: 120, z: 60 }, reward: 850, rp: 400,
    dialogue: 'That tanker is liquid gold, Mero. Ram the back, spin it out, and do not let it reach the pier.',
  },
  {
    id: 'm3', job: 'JOB 3/6', title: 'EVAPORATION', giver: 'Kiki Sol',
    brief: 'Two stars and every unit in the city is on you. Break line of sight and stay hidden until the heat dies.',
    stages: ['Break line of sight', 'Stay hidden', 'Heat clears'],
    kind: 'evade', target: { x: -60, z: 120 }, reward: 600, rp: 350,
    dialogue: 'I can see six units from my roof, Slick. Duck behind the containers by the marina and go quiet.',
  },
  {
    id: 'm4', job: 'JOB 4/6', title: 'LIQUID ASSETS', giver: 'Juno Park',
    brief: 'A flatbed of filters is waiting at the docks. Deliver it to the hideout in one piece — hard knocks crack the cargo.',
    stages: ['Pick up the flatbed', 'Deliver to the hideout', 'Park inside the halo'],
    kind: 'deliver', target: { x: 40, z: -150 }, reward: 1100, rp: 450,
    dialogue: 'Filters are fragile, Slick. Baby the throttle. One hard hit and the whole load is scrap.',
  },
  {
    id: 'm5', job: 'JOB 5/6', title: 'SILT SWEEP', giver: 'Dalia Kade',
    brief: 'Five gold filters are stashed around the marina. On foot, quiet, quick — the Union patrols the boardwalk.',
    stages: ['Collect the filters 0/5', 'Reach the stash point', 'Hand them over'],
    kind: 'collect', target: { x: 150, z: -120 }, reward: 950, rp: 500,
    dialogue: 'Five filters, five spots, all on foot. The boardwalk is crawling with Union boys. Keep it quiet.',
  },
  {
    id: 'm6', job: 'JOB 6/6', title: 'HEATWAVE SPRINT', giver: 'Nacho Reyes',
    brief: 'Nacho wants the coast. Eight checkpoints down the coastal highway, winner takes the pink slip and the street.',
    stages: ['Line up at the start', 'Hit every checkpoint', 'Beat Nacho to the line'],
    kind: 'race', target: { x: 170, z: 140 }, reward: 2400, rp: 900,
    dialogue: 'You beat me, you own the coast. You lose, you wash my cars for a year. Line up, Slick.',
  },
];

// Named districts for the HUD: the nearest district centre wins.
const DISTRICTS = [
  { name: 'Marina', x: 120, z: -120, r: 70 },
  { name: 'Desal Plant', x: -138, z: -138, r: 55 },
  { name: 'Old Town', x: -80, z: 40, r: 75 },
  { name: 'Strand Boulevard', x: 150, z: 40, r: 80 },
  { name: 'Puerto Viejo', x: -40, z: -120, r: 70 },
  { name: 'The Docks', x: -140, z: 120, r: 60 },
  { name: 'Downtown', x: 0, z: 0, r: 80 },
  { name: 'Kumala Pier', x: 170, z: -40, r: 45 },
];

// The three synth radio stations (WebAudio, no audio files).
const RADIO = [
  { name: 'Radio Mango 98.6', tag: 'Guava Sunrise', bpm: 112, root: 220, mode: 'major' },
  { name: 'Coast FM 101.1', tag: 'Salt Air Nights', bpm: 96, root: 196, mode: 'minor' },
  { name: 'Union Static 88.4', tag: 'Pirate Broadcast', bpm: 128, root: 247, mode: 'minor' },
];

// Deterministic RNG so the city layout is the same every load.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function districtAt(x, z) {
  let best = null, bd = 1e9;
  for (const d of DISTRICTS) {
    const dd = (x - d.x) * (x - d.x) + (z - d.z) * (z - d.z);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best ? best.name : 'Opal Coast';
}

function rankFor(rp) {
  let r = RANKS[0];
  for (const k of RANKS) if (rp >= k.rp) r = k;
  return r;
}
