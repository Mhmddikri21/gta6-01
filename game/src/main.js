// OPAL COAST — boot, the game loop, the headless self-test and the
// staged screenshot scenes. index.html loads this as its module script.

import { CFG } from './config.js';
import { S, setMission, setWanted } from './state.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { buildWorld } from './world.js';
import { createPlayer } from './player.js';
import { createTraffic } from './traffic.js';
import { createPeds } from './peds.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createShards } from './collectibles.js';
import { createUI } from './ui.js';
import { stageShot } from './shots.js';

const THREE = window.THREE;

const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CFG.palette.sky);
scene.fog = new THREE.Fog(CFG.palette.fog, 120, 420);

const camera = new THREE.PerspectiveCamera(CFG.fovMin, window.innerWidth / window.innerHeight, 0.1, 900);

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3f7a4e, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d0, 1.15);
sun.position.set(120, 180, 60);
scene.add(sun);

const input = new Input();
input.attach();
const audio = new AudioSys();
const world = buildWorld(scene);
const player = createPlayer(scene, camera, world, input, audio);
const traffic = createTraffic(scene);
const peds = createPeds(scene);
const police = createPolice(scene);
const missions = createMissions({ scene, world, player, input, audio });
const shards = createShards(scene);
const ctx = { scene, camera, renderer, world, player, traffic, peds, police, missions, shards, audio, input };
const ui = createUI({ ...ctx, ui: null });
ctx.ui = ui;
window.__game = ctx;

function step(dt) {
  S.time += dt;
  player.update(dt);
  traffic.update(dt, player, audio);
  peds.update(dt, player, audio);
  police.update(dt, player, audio);
  missions.update(dt);
  shards.update(dt, player, audio);
  ui.update();
  input.endFrame();
}

const params = new URLSearchParams(window.location.search);

// Headless self-test: 30 fixed frames, then the verdict line.
// NOTE: call forceStart() (it sets S.started) instead of setting the
// flag first — forceStart returns early when S.started is already true
// and would leave the start overlay on top of the screenshots.
if (params.has('selftest')) {
  ui.forceStart();
  setMission('m2');
  setWanted(4);
  for (let i = 0; i < 30; i++) step(1 / 60);
  console.log(
    `SELFTEST OK frames=30 traffic=${traffic.cars.length} peds=${peds.list.length} wanted=${S.wanted} mission=${S.mission}`
  );
  window.__selftest_done = true;
}

// Staged screenshot scene.
if (params.has('shot')) {
  const n = parseInt(params.get('shot'), 10) || 1;
  ui.forceStart();
  stageShot(n, ctx);
  window.setTimeout(() => {
    window.__shot_ready = true;
  }, 600);
}

let last = performance.now();
let orbitT = 0;
function frame(now) {
  window.requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!S.started) {
    // Slow orbit over the plaza behind the start screen.
    orbitT += dt;
    camera.position.set(Math.sin(orbitT * 0.08) * 70, 34, Math.cos(orbitT * 0.08) * 70);
    camera.lookAt(0, 2, 0);
    renderer.render(scene, camera);
    return;
  }
  if (S.paused) {
    renderer.render(scene, camera);
    return;
  }
  step(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.requestAnimationFrame(frame);
