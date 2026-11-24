// OPAL COAST — game loop: scene setup, per-frame updates, self-test, shot staging.

import { CFG, PLACES } from './config.js';
import { S, resetRun } from './state.js';
import { initInput, wasPressed, endFrame } from './input.js';
import { initAudio, engine } from './audio.js';
import { buildWorld } from './world.js';
import { initPlayer, updatePlayer, resetTo, snapCamera } from './player.js';
import { initTraffic, updateTraffic, Traffic } from './traffic.js';
import { initPeds, updatePeds, Peds } from './peds.js';
import { initPolice, updatePolice } from './police.js';
import { initMissions, updateMissions } from './missions.js';
import { initCollectibles, updateCollectibles } from './collectibles.js';
import { initUI, updateUI } from './ui.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SELFTEST = params.get('selftest') === '1';
const SHOT = Number(params.get('shot') || 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1280, 720);
renderer.setPixelRatio(1);
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b8d8);
scene.fog = new THREE.Fog(0x87b8d8, 120, 320);
const camera = new THREE.PerspectiveCamera(CFG.fovBase, 1280 / 720, 0.1, 600);

const sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
sun.position.set(60, 100, 40);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x88aacc, 0.7));

buildWorld(scene);
initPlayer(scene, camera);
initTraffic(scene);
initPeds(scene);
initPolice(scene);
initMissions(scene);
initCollectibles(scene);
initUI();
initInput();
initAudio();

const startEl = document.getElementById('start');
const pauseEl = document.getElementById('pause');

function forceStart() {
  if (S.started) return;
  S.started = true;
  startEl.style.display = 'none';
  pauseEl.style.display = 'none';
}

startEl.addEventListener('click', forceStart);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && S.started) {
    S.paused = !S.paused;
    pauseEl.style.display = S.paused ? 'flex' : 'none';
  }
  if (e.code === 'KeyM') S.muted = !S.muted;
  if (e.code === 'KeyP') {
    S.photo = !S.photo;
    document.getElementById('hud').style.display = S.photo ? 'none' : 'block';
  }
});

// Staged screenshot: apply the scene, then render one frame.
if (SHOT >= 1 && SHOT <= 4) {
  forceStart();
  applyShot(SHOT);
  // Let the world settle one frame so traffic/peds are placed.
  updateTraffic(0.016);
  updatePeds(0.016);
  snapCamera();
  updateUI();
  renderer.render(scene, camera);
} else if (SELFTEST) {
  // Headless self-test: run 30 frames of the full loop and report.
  forceStart();
  S.cash = 500;
  S.heat = 4;
  S.stars = 4;
  S.lastCrime = 0;
  // Start at the marina so mission m1 completes and the chain reaches m2.
  resetTo(PLACES.marina.x - 3, PLACES.marina.z + 4, Math.PI * 0.5);
  const dt = 1 / 60;
  for (let f = 0; f < 30; f++) {
    S.time += dt;
    updatePlayer(dt);
    updateTraffic(dt);
    updatePeds(dt);
    updatePolice(dt);
    updateMissions(dt);
    updateCollectibles(dt);
    renderer.render(scene, camera);
  }
  updateUI();
  console.log(
    `SELFTEST OK frames=30 traffic=${Traffic.cars.length} peds=${Peds.list.length} wanted=${S.stars} mission=${S.mission}`
  );
} else {
  // Normal play loop.
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!S.started || S.paused) {
      renderer.render(scene, camera);
      return;
    }
    S.time += dt;
    updatePlayer(dt);
    updateTraffic(dt);
    updatePeds(dt);
    updatePolice(dt);
    updateMissions(dt);
    updateCollectibles(dt);
    updateUI();
    engine(S.speed, CFG.topSpeed);
    renderer.render(scene, camera);
    endFrame();
    if (wasPressed('KeyR')) resetRun();
  }
  requestAnimationFrame(loop);
}
