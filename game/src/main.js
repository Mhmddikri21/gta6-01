// OPAL COAST — entry point: builds the renderer, wires every system,
// runs the game loop, and hosts the headless self-test (?selftest=1)
// and the staged screenshot scenes (?shot=N).

// three.min.js is the classic (UMD) build: it sets window.THREE, so this
// module uses the global instead of importing it.
import { CFG } from './config.js';
import { S, resetGame, tickTimers } from './state.js';
import { Input, bindInput } from './input.js';
import { AudioSys } from './audio.js';
import { buildWorld, animateWorld } from './world.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Peds } from './peds.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Collectibles } from './collectibles.js';
import { Shots } from './shots.js';
import { UI } from './ui.js';

const params = new URLSearchParams(window.location.search);
const isSelfTest = params.has('selftest');
const shotParam = params.get('shot');
const shotNum = shotParam ? parseInt(shotParam, 10) : 0;

let renderer = null;
let scene = null;
let camera = null;
let clockLast = 0;
let framesRun = 0;

// One fixed simulation step, shared by the live loop and the self-test.
function step(dt) {
  S.time += dt;
  tickTimers(dt);
  Player.update(dt);
  Traffic.update(dt);
  Peds.update(dt);
  Police.update(dt);
  Missions.update(dt);
  Collectibles.update(dt);
  animateWorld(scene, S.time);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clockLast ? (now - clockLast) / 1000 : 0.016);
  clockLast = now;
  if (!S.paused && S.started) {
    step(dt);
    framesRun += 1;
  }
  if (Input.pressed('KeyP') || Input.pressed('Escape')) {
    if (S.started && !S.over) {
      S.paused = !S.paused;
      if (S.paused) AudioSys.quiet();
    }
  }
  if (Input.pressed('KeyF')) {
    S.photo = !S.photo;
  }
  if (Input.pressed('MouseClick') && !S.started) {
    AudioSys.ensure();
    S.started = true;
  }
  if (S.over && Input.pressed('Enter')) {
    Police.resetAfterBust();
    Player.placeCar(CFG.places.garage.x, CFG.places.garage.z + 8, 0, 0);
    S.heat = 0;
    S.wanted = 0;
  }
  UI.update();
  Input.endFrame();
  renderer.render(scene, camera);
}

// Headless self-test: stage a four-star m2 chase, run 30 fixed steps,
// and log one line with the real live counts.
function runSelfTest() {
  S.started = true;
  Missions.forceMission('m2');
  S.heat = 100;
  S.wanted = 4;
  S.lastCrimeAt = S.time;
  Player.placeCar(0, -20, 0, 28);
  Police.stage(3, 0, -20);
  for (let i = 0; i < 30; i++) step(1 / 60);
  framesRun = 30;
  renderer.render(scene, camera);
  console.log(
    `SELFTEST OK frames=${framesRun} traffic=${Traffic.count} peds=${Peds.count} wanted=${S.wanted} mission=${S.mission.id}`,
  );
  document.title = 'SELFTEST OK';
  window.__selftestDone = true;
}

function boot() {
  resetGame();
  bindInput();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(CFG.fovBase, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 5, -12);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game').appendChild(renderer.domElement);

  buildWorld(scene);
  Player.init(scene, camera);
  Traffic.init(scene);
  Peds.init(scene);
  Police.init(scene);
  Missions.init(scene);
  Collectibles.init(scene);
  UI.init({ traffic: Traffic, peds: Peds, police: Police, missions: Missions, collectibles: Collectibles });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Screenshot staging runs the game live behind a fixed scene.
  if (shotNum >= 1 && shotNum <= 4) {
    Shots.stage(shotNum, {
      player: Player,
      police: Police,
      missions: Missions,
      traffic: Traffic,
      peds: Peds,
      collectibles: Collectibles,
    });
    // Let a few frames settle so the camera eases into place, then snap
    // it exactly onto its target so the shot is never caught mid-ease.
    for (let i = 0; i < 10; i++) step(1 / 60);
    Player.snapCamera();
    renderer.render(scene, camera);
    window.__shotReady = true;
  }

  if (isSelfTest) {
    runSelfTest();
    return;
  }

  requestAnimationFrame(frame);
}

boot();
