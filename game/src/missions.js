// OPAL COAST — missions and story.
// One job: run the six-job story chain as a state machine (drive / ram /
// evade / deliver / collect / race), plus markers, dialogue and rewards.

function createMissions(scene) {
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.55 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 24, 16, 1, true), beaconMat);
  beacon.position.set(0, 12, 0);
  beacon.visible = false;
  scene.add(beacon);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.3, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  ring.visible = false;
  scene.add(ring);
  return {
    index: 0, stage: 0, active: false, done: false,
    beacon, ring, target: null, targetCar: null,
    collectibles: [], checkpoints: [], raceRival: null,
    timer: 0, hiddenTimer: 0, collected: 0, hits: 0,
    banner: '', bannerTimer: 0, dialogue: '', dialogueTimer: 0,
    cargoHp: 100, raceCp: 0, raceTime: 0, hullWarned: false,
  };
}

function missionDef(m) { return MISSIONS[m.index] || null; }

function startMission(m, game) {
  const def = missionDef(m);
  if (!def) { m.done = true; return; }
  m.active = true;
  m.stage = 0;
  m.timer = 0;
  m.collected = 0;
  m.hits = 0;
  m.raceCp = 0;
  m.raceTime = 0;
  m.cargoHp = 100;
  m.hullWarned = false;
  m.target = { x: def.target.x, z: def.target.z };
  m.beacon.visible = true;
  m.ring.visible = true;
  m.beacon.position.set(m.target.x, 12, m.target.z);
  m.ring.position.set(m.target.x, 0.3, m.target.z);
  showDialogue(m, def.giver, def.dialogue);
  showBanner(m, def.job + ' · ' + def.title, def.brief);
  setupMissionTarget(m, game, def);
}

function showDialogue(m, who, text) {
  m.dialogue = who + ' — ' + text;
  m.dialogueTimer = 9;
}

function showBanner(m, title, sub) {
  m.banner = title + '||' + sub;
  m.bannerTimer = 6;
}

function setupMissionTarget(m, game, def) {
  // Clear old mission props.
  for (const c of m.collectibles) game.scene.remove(c.mesh);
  m.collectibles = [];
  for (const c of m.checkpoints) game.scene.remove(c.mesh);
  m.checkpoints = [];
  if (m.targetCar) { game.scene.remove(m.targetCar); m.targetCar = null; }
  if (m.raceRival) { game.scene.remove(m.raceRival); m.raceRival = null; }

  if (def.kind === 'ram') {
    const tanker = makeCar('truck', 0x38bdf8);
    tanker.position.set(120, 0, 60);
    tanker.userData.angle = Math.PI / 2;
    tanker.userData.speed = 12;
    tanker.userData.hp = 100;
    tanker.userData.vertical = false;
    game.scene.add(tanker);
    m.targetCar = tanker;
    m.target = { x: tanker.position.x, z: tanker.position.z };
  }
  if (def.kind === 'collect') {
    const spots = [[150, -120], [120, -90], [168, -60], [140, -150], [176, -100]];
    for (const [x, z] of spots) {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.9),
        new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0xaa8800 }));
      mesh.position.set(x, 1.2, z);
      game.scene.add(mesh);
      m.collectibles.push({ mesh, x, z, taken: false });
    }
  }
  if (def.kind === 'race') {
    const cps = [];
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const x = 165 - t * 40 + Math.sin(t * 9) * 12;
      const z = 150 - t * 330;
      cps.push([x, z]);
    }
    for (const [x, z] of cps) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(4, 0.4, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      mesh.position.set(x, 2.5, z);
      game.scene.add(mesh);
      m.checkpoints.push({ mesh, x, z, hit: false });
    }
    const rival = makeCar('muscle', 0xef4444);
    rival.position.set(168, 0, 148);
    rival.userData.angle = Math.PI;
    rival.userData.speed = 0;
    game.scene.add(rival);
    m.raceRival = rival;
    // Player starts on the line too.
    game.player.x = 160;
    game.player.z = 148;
    if (game.player.car) {
      game.player.car.position.set(160, 0, 148);
      game.player.car.userData.angle = Math.PI;
      game.player.car.userData.speed = 0;
    }
  }
  if (def.kind === 'evade') {
    addHeat(game.police, 34); // two stars to lose
  }
}

function completeMission(m, game) {
  const def = missionDef(m);
  m.active = false;
  m.beacon.visible = false;
  m.ring.visible = false;
  if (m.targetCar) { game.scene.remove(m.targetCar); m.targetCar = null; }
  game.player.cash += def.reward;
  game.player.rp += def.rp;
  showBanner(m, 'JOB COMPLETE · ' + def.title, '+$' + def.reward + '  ·  +' + def.rp + ' respect  ·  ' + rankFor(game.player.rp).name);
  showDialogue(m, def.giver, 'Clean work, Slick. The money is in your pocket. Come see me for the next one.');
  m.index += 1;
  if (m.index >= MISSIONS.length) {
    m.done = true;
    showBanner(m, 'OPAL COAST · STORY COMPLETE', 'You own the coast now, Slick. Free roam, races and side jobs remain.');
  }
  game.save();
}

function failMission(m, game, reason) {
  m.active = false;
  m.beacon.visible = false;
  m.ring.visible = false;
  showBanner(m, 'JOB FAILED', reason + ' — talk to Dalia to try again.');
  showDialogue(m, 'Dalia Kade', 'It happens, Slick. Shake it off. The job is still open when you are ready.');
}

// Per-kind stage logic. Each handler gets the mission state, the game and
// dt, and advances stages, shows banners or completes/fails the job.
const KIND_HANDLERS = {
  drive(m, game, dt, distTarget) { advanceArrival(m, game, distTarget); },
  deliver(m, game, dt, distTarget) {
    advanceArrival(m, game, distTarget);
    const p = game.player;
    if (p.car && Math.abs(p.car.userData.speed || 0) > 26) {
      m.cargoHp -= dt * 6;
      if (m.cargoHp <= 0) failMission(m, game, 'The cargo cracked on a hard hit');
    }
  },
  ram(m, game, dt, distTarget) {
    const def = missionDef(m);
    const p = game.player;
    if (!m.targetCar) return;
    if (!p.onFoot && p.car) {
      const d = Math.hypot(p.car.position.x - m.targetCar.position.x, p.car.position.z - m.targetCar.position.z);
      const spd = Math.abs(p.car.userData.speed || 0);
      if (d < 5.5 && spd > 10) {
        m.targetCar.userData.hp -= spd * dt * 2.2;
        m.hits += dt;
        if (m.targetCar.userData.hp <= 0) {
          m.stage = 2;
          showBanner(m, def.job + ' · ' + def.title, 'Tanker wrecked — vanish before the units arrive');
          addHeat(game.police, 20);
          completeMission(m, game);
        }
      }
    }
    if (m.targetCar.userData.hp < 60 && m.stage === 0) {
      m.stage = 1;
      showBanner(m, def.job + ' · ' + def.title, def.stages[1] + ' — hull ' + Math.max(0, Math.round(m.targetCar.userData.hp)) + '%');
    }
    if (m.targetCar.userData.hp < 30 && m.stage === 1 && !m.hullWarned) {
      m.hullWarned = true;
      showBanner(m, def.job + ' · ' + def.title, 'Hull critical — one more hit and she goes down');
    }
  },
  evade(m, game, dt, distTarget) {
    const def = missionDef(m);
    const stars = wantedStars(game.police);
    if (stars === 0) completeMission(m, game);
    else if (game.police.cooldown > 4 && m.stage === 0) {
      m.stage = 1;
      showBanner(m, def.job + ' · ' + def.title, 'They lost you — stay hidden until the heat dies');
    }
  },
  collect(m, game, dt, distTarget) {
    const def = missionDef(m);
    const p = game.player;
    for (const c of m.collectibles) {
      if (!c.taken && Math.hypot(p.x - c.x, p.z - c.z) < 2.4) {
        c.taken = true;
        m.collected += 1;
        c.mesh.visible = false;
        game.audio.blip(880);
        showBanner(m, def.job + ' · ' + def.title, 'Filters ' + m.collected + '/5');
      }
      if (!c.taken) c.mesh.rotation.y += dt * 2;
    }
    if (m.collected >= 5) completeMission(m, game);
  },
  race(m, game, dt, distTarget) {
    const def = missionDef(m);
    const p = game.player;
    if (m.stage === 0) {
      if (!p.onFoot && Math.abs(p.car.userData.speed || 0) > 2) m.stage = 1;
      return;
    }
    m.raceTime += dt;
    const cp = m.checkpoints[m.raceCp];
    if (cp && Math.hypot(p.x - cp.x, p.z - cp.z) < 7) {
      cp.hit = true;
      cp.mesh.material.color.setHex(0x22c55e);
      m.raceCp += 1;
      game.audio.blip(660 + m.raceCp * 60);
      showBanner(m, def.job + ' · ' + def.title, 'Checkpoint ' + m.raceCp + '/8');
    }
    if (m.raceCp >= 8) completeMission(m, game);
    else if (m.raceTime > 150) failMission(m, game, 'Nacho took the pink slip — too slow');
  },
};

// Drive/deliver share one pattern: reach the beacon, then reach the ring.
function advanceArrival(m, game, distTarget) {
  const def = missionDef(m);
  if (m.stage === 0 && distTarget < 7) {
    m.stage = 1;
    showBanner(m, def.job + ' · ' + def.title, def.stages[1]);
    if (def.kind === 'deliver') showDialogue(m, 'Juno Park', 'Load is on. Easy does it — the halo at the hideout is waiting.');
  } else if (m.stage === 1 && distTarget < 4) {
    completeMission(m, game);
  }
}

function updateMissions(m, game, dt) {
  if (m.bannerTimer > 0) m.bannerTimer -= dt;
  if (m.dialogueTimer > 0) m.dialogueTimer -= dt;
  if (!m.active || m.done) return;
  const def = missionDef(m);
  const p = game.player;
  m.timer += dt;
  // Beacon follows a moving target (the tanker).
  if (m.targetCar) {
    m.target = { x: m.targetCar.position.x, z: m.targetCar.position.z };
    m.beacon.position.set(m.target.x, 12, m.target.z);
    m.ring.position.set(m.target.x, 0.3, m.target.z);
    // Tanker flees along the boulevard toward the pier.
    const t = m.targetCar;
    t.userData.angle += Math.sin(m.timer * 0.7) * 0.1 * dt;
    t.position.x += Math.sin(t.userData.angle) * t.userData.speed * dt;
    t.position.z += Math.cos(t.userData.angle) * t.userData.speed * dt;
    t.rotation.y = -t.userData.angle + Math.PI / 2;
    if (t.position.z > 190) t.userData.angle = Math.PI;
    if (t.position.z < -190) t.userData.angle = 0;
  }
  // Race rival follows the checkpoints.
  if (m.raceRival && def.kind === 'race' && m.stage >= 1) {
    const r = m.raceRival;
    const cp = m.checkpoints[Math.min(m.raceCp, m.checkpoints.length - 1)];
    if (cp) {
      const dx = cp.x - r.position.x, dz = cp.z - r.position.z;
      r.userData.angle = steerToward(r.userData.angle, Math.atan2(dx, dz), dt, 1.8);
      r.userData.speed += (30 - r.userData.speed) * Math.min(1, dt);
      r.position.x += Math.sin(r.userData.angle) * r.userData.speed * dt;
      r.position.z += Math.cos(r.userData.angle) * r.userData.speed * dt;
      r.rotation.y = -r.userData.angle + Math.PI / 2;
    }
  }
  const distTarget = m.target ? Math.hypot(p.x - m.target.x, p.z - m.target.z) : 1e9;
  const handler = KIND_HANDLERS[def.kind];
  if (handler) handler(m, game, dt, distTarget);
}
