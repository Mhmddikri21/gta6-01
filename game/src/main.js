// OPAL COAST — bootstrap, game loop, camera, garage repair, self-test.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { CONFIG } from './config.js';
import { createState, addCash } from './state.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Peds } from './peds.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Collectibles } from './collectibles.js';
import { UI } from './ui.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shot = Number(params.get('shot') || 0);
const selftest = params.get('selftest') === '1';
const autostart = params.get('autostart') === '1' || shot > 0 || selftest;

const state = createState();
const input = new Input();
const audio = new AudioSys();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d6);
scene.fog = new THREE.Fog(0x87b5d6, 120, 260);

const camera = new THREE.PerspectiveCamera(CONFIG.cameraFovMin, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(-30, 6, 58);

const sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
sun.position.set(60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9));

const world = new World(scene);
const player = new Player(scene, state);
const traffic = new Traffic(scene, state);
const peds = new Peds(scene, state);
const police = new Police(scene, state);
const missions = new Missions(scene, state);
const collectibles = new Collectibles(scene, state);
const ui = new UI(state);

const ctx = { state, scene, camera, renderer, world, player, traffic, peds, police, missions, collectibles, ui, input, audio };
window.__game = ctx;
let engineWarned = false;

function onEvent(type, data) {
  if (type === 'traffic-hit') {
    police.addHeat(CONFIG.heatPerCarHit);
    audio.thud();
    ui.toast('Traffic collision — the OCPD noticed');
  } else if (type === 'ped-hit') {
    police.addHeat(CONFIG.heatPerPedHit);
    audio.thud();
    ui.toast('Pedestrian down — wanted level up');
  } else if (type === 'near-miss') {
    addCash(state, CONFIG.nearMissReward);
    audio.blip(990);
    ui.toast(`NEAR MISS +$${CONFIG.nearMissReward}`);
  } else if (type === 'rammed') {
    audio.thud();
    ui.toast('Interceptor rammed you');
  } else if (type === 'shard') {
    addCash(state, CONFIG.shardReward);
    audio.chime();
    ui.toast(`OPAL SHARD +$${CONFIG.shardReward} (${state.shardsCollected}/10)`);
  } else if (type === 'mission-complete') {
    addCash(state, data.reward);
    audio.chime();
    ui.toast(`Job done — +$${data.reward}`);
  } else if (type === 'checkpoint') {
    addCash(state, data.reward);
    audio.blip(1200);
    ui.toast(`Checkpoint ${data.index + 1}/5 +$${data.reward}`);
  } else if (type === 'tanker-hit') {
    audio.thud();
    ui.toast(`Tanker hull ${Math.round(data.hull)}%`);
  } else if (type === 'hull-warning') {
    audio.blip(220);
    ui.toast('HULL CRITICAL — protect the tanker!');
  } else if (type === 'tanker-lost') {
    ui.toast('Tanker lost — run the escort again');
  } else if (type === 'crash-wall') {
    audio.thud();
  }
}

function updateCamera(dt) {
  const anchor = player.inCar ? player.carGroup.position : player.walkerGroup.position;
  const backX = -Math.sin(player.heading);
  const backZ = -Math.cos(player.heading);
  const dist = player.inCar ? 9.5 : 5.5;
  const height = player.inCar ? 4.2 : 2.8;
  const desired = new THREE.Vector3(
    anchor.x + backX * dist,
    height,
    anchor.z + backZ * dist
  );
  // Snap when far away (staging a shot, entering/exit) instead of
  // sweeping across the whole city; lerp smoothly the rest of the time.
  if (camera.position.distanceTo(desired) > 25) {
    camera.position.copy(desired);
  } else {
    camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
  }
  camera.lookAt(anchor.x, anchor.y + 1.2, anchor.z);
  const speedNorm = Math.min(Math.abs(player.speed) / CONFIG.playerMaxSpeed, 1);
  const fov = CONFIG.cameraFovMin + (CONFIG.cameraFovMax - CONFIG.cameraFovMin) * speedNorm;
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

function repairAtGarage(dt) {
  if (!player.inCar || player.hull >= 100) return;
  const dx = player.pos.x - world.garage.x;
  const dz = player.pos.z - world.garage.z;
  if (dx * dx + dz * dz < world.garage.r * world.garage.r && Math.abs(player.speed) < 1) {
    player.hull = Math.min(100, player.hull + CONFIG.garageRepairRate * dt);
    if (world.garageRing) {
      world.garageRing.material.opacity = 0.4 + Math.sin(state.time * 6) * 0.25;
    }
  }
}

function step(dt) {
  state.time += dt;
  player.update(dt, input, world, onEvent);
  traffic.update(dt, player, onEvent);
  peds.update(dt, player, onEvent);
  police.update(dt, player, onEvent);
  missions.update(dt, ctx, onEvent);
  collectibles.update(dt, player, onEvent);
  repairAtGarage(dt);
  if (player.hull <= 0 && !engineWarned) {
    engineWarned = true;
    ui.toast('ENGINE BLOWN — limp to Juno\u2019s garage');
  }
  if (player.hull > 20) engineWarned = false;
  audio.setEngine(Math.min(Math.abs(player.speed) / CONFIG.playerMaxSpeed, 1), state.muted);
  audio.sirenTick(dt, state.stars);
  updateCamera(dt);
  ui.update(player, missions, police, traffic, collectibles, world);
  input.endFrame();
}

function runSelfTest() {
  state.started = true;
  missions.setMission('m2');
  police.forceStars(4);
  for (let i = 0; i < 30; i++) {
    const dt = 1 / 60;
    state.time += dt;
    player.autoDrive(dt, world);
    traffic.update(dt, player, () => {});
    peds.update(dt, player, () => {});
    police.update(dt, player, () => {});
    missions.update(dt, ctx, () => {});
    collectibles.update(dt, player, () => {});
  }
  console.log(
    `SELFTEST OK frames=30 traffic=${traffic.cars.length} peds=${peds.walkers.length} wanted=${state.stars} mission=${state.missionId}`
  );
}

const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const startBtn = document.getElementById('start-btn');

function beginPlay() {
  audio.ensure();
  state.started = true;
  if (startScreen) startScreen.classList.add('hidden');
}

if (startBtn) startBtn.addEventListener('click', beginPlay);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (input.hit('Escape', 'KeyP') && state.started) {
    if (input.hit('KeyP')) {
      state.photoMode = !state.photoMode;
      document.body.classList.toggle('photo', state.photoMode);
    } else {
      state.paused = !state.paused;
      if (pauseScreen) pauseScreen.classList.toggle('hidden', !state.paused);
    }
  }
  if (input.hit('KeyM')) state.muted = !state.muted;
  if (state.started && !state.paused) step(dt);
  else input.endFrame();
  renderer.render(scene, camera);
}

if (shot > 0) stageShot(shot, ctx);
if (selftest) runSelfTest();
if (autostart) beginPlay();
loop();
