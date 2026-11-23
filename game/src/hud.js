// OPAL COAST — HUD, minimap, menus and save.
// One job: every pixel of interface (cash, stars, health, weapons,
// mission card, dispatch list, dialogue, minimap, start/pause screens)
// and the localStorage save.

function createHud(game) {
  const hud = { minimap: null, mmCtx: null };
  hud.minimap = document.getElementById('minimap');
  if (hud.minimap) hud.mmCtx = hud.minimap.getContext('2d');
  return hud;
}

function el(id) { return document.getElementById(id); }

function fmtCash(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

function updateHud(game, dt) {
  renderVitals(game);
  renderWeaponSlots(game);
  renderMissionCard(game);
  renderDispatch(game);
  renderDialogueBanner(game);
  renderSpeed(game);
  renderStatus(game);
  drawMinimap(game);
}

// Cash, stars, health, armour, rank and opals.
function renderVitals(game) {
  const p = game.player, pol = game.police;
  const cash = el('cash');
  if (cash) cash.textContent = fmtCash(p.cash);
  const stars = el('stars');
  if (stars) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < pol.wanted ? '★' : '☆';
    stars.textContent = s;
    stars.className = 'stars' + (pol.wanted >= 3 ? ' hot' : '');
  }
  setBar('health-fill', 'health-num', p.health);
  setBar('armour-fill', 'armour-num', p.armour);
  const rank = rankFor(p.rp);
  const rk = el('rank-name');
  if (rk) rk.textContent = rank.name.toUpperCase();
  const rpBar = el('rank-fill');
  if (rpBar) {
    const next = RANKS[RANKS.indexOf(rank) + 1];
    rpBar.style.width = next
      ? Math.min(100, (p.rp - rank.rp) / (next.rp - rank.rp) * 100) + '%'
      : '100%';
  }
  const rpT = el('rank-rp');
  if (rpT) rpT.textContent = p.rp.toLocaleString() + ' RP';
  // Opal shards found.
  const oc = el('opal-count');
  if (oc && game.collectibles) oc.textContent = '◆ ' + game.collectibles.found + '/' + game.collectibles.total;
}

function setBar(fillId, numId, value) {
  const fill = el(fillId);
  if (fill) fill.style.width = Math.max(0, value) + '%';
  const num = el(numId);
  if (num) num.textContent = Math.round(value);
}

// Weapon slots along the bottom right.
function renderWeaponSlots(game) {
  const p = game.player;
  const wslots = el('weapons');
  if (!wslots) return;
  let html = '';
  WEAPONS.forEach(function (w, i) {
    const locked = w.locked && p.rp < w.lockRp;
    const ammo = locked ? 'LOCKED' : (w.ammo === Infinity ? '∞' : p.ammo[i]);
    html += '<div class="wslot' + (i === p.weaponIndex ? ' active' : '') + '"><b>' + (i + 1) + '</b><span>' + w.name + '</span><em>' + ammo + '</em></div>';
  });
  wslots.innerHTML = html;
}

// Mission card, top left.
function renderMissionCard(game) {
  const m = game.missions;
  const mc = el('mission-card');
  if (!mc) return;
  if (m.active) {
    const def = MISSIONS[m.index];
    const stage = def.stages[Math.min(m.stage, def.stages.length - 1)];
    let extra = '';
    if (def.kind === 'collect') extra = ' · ' + m.collected + '/5';
    if (def.kind === 'race') extra = ' · CP ' + m.raceCp + '/8 · ' + Math.round(m.raceTime) + 's';
    if (def.kind === 'ram' && m.targetCar) extra = ' · HULL ' + Math.max(0, Math.round(m.targetCar.userData.hp)) + '%';
    if (def.kind === 'deliver') extra = ' · CARGO ' + Math.round(m.cargoHp) + '%';
    mc.innerHTML = '<div class="m-job">' + def.job + ' · ' + def.title + '</div>' +
      '<div class="m-stage">STAGE ' + (m.stage + 1) + '/' + def.stages.length + ' — ' + stage + extra + '</div>' +
      '<div class="m-brief">' + def.brief + '</div>';
    mc.style.display = 'block';
  } else if (m.done) {
    mc.innerHTML = '<div class="m-job">FREE ROAM · STORY COMPLETE</div><div class="m-brief">You own the coast. Races, side jobs and the garage are yours. Press M for the next job board.</div>';
    mc.style.display = 'block';
  } else {
    mc.innerHTML = '<div class="m-job">OPAL COAST</div><div class="m-brief">Press M to take the next job from Dalia. Steal a car with E. Lose the cops to cool the heat.</div>';
    mc.style.display = 'block';
  }
}

// OCPD dispatch list, under the mission card.
function renderDispatch(game) {
  const p = game.player, pol = game.police;
  const dp = el('dispatch');
  if (!dp) return;
  if (pol.wanted > 0) {
    let html = '<div class="d-head">OCPD DISPATCH · ' + pol.cars.length + ' UNITS · ' + pol.wanted + '★</div>';
    pol.cars.slice(0, 5).forEach(function (c, i) {
      const d = Math.round(Math.hypot(c.position.x - p.x, c.position.z - p.z));
      const tactic = d < 15 ? 'RAMMING' : (d < 60 ? 'CLOSING IN' : 'EN ROUTE');
      html += '<div class="d-row"><span>OCPD-' + (10 + i) + '</span><span>' + d + ' m</span><b>' + tactic + '</b></div>';
    });
    if (pol.heli) html += '<div class="d-row"><span>AIR ONE</span><span>36 m</span><b>SPOTLIGHT</b></div>';
    if (pol.cooldown > 0) html += '<div class="d-row"><span>HEAT</span><span>cooling…</span><b>HIDDEN ' + Math.round(pol.cooldown) + 's</b></div>';
    dp.innerHTML = html;
    dp.style.display = 'block';
  } else {
    dp.style.display = 'none';
  }
}

// Dialogue line and centre banner.
function renderDialogueBanner(game) {
  const m = game.missions;
  const dg = el('dialogue');
  if (dg) {
    if (m.dialogueTimer > 0) {
      const parts = m.dialogue.split(' — ');
      dg.innerHTML = '<b>' + parts[0] + '</b><span>' + (parts[1] || '') + '</span>';
      dg.style.display = 'flex';
    } else dg.style.display = 'none';
  }
  const bn = el('banner');
  if (bn) {
    if (m.bannerTimer > 0) {
      const parts = m.banner.split('||');
      bn.innerHTML = '<b>' + parts[0] + '</b><span>' + (parts[1] || '') + '</span>';
      bn.style.display = 'block';
    } else bn.style.display = 'none';
  }
}

// Speedometer and car condition, bottom right.
function renderSpeed(game) {
  const p = game.player;
  const sp = el('speed');
  if (!sp) return;
  if (!p.onFoot && p.car) {
    const kmh = Math.round(Math.abs(p.car.userData.speed || 0) * 3.2);
    const spec = CAR_TYPES.find(c => c.id === p.car.userData.type) || CAR_TYPES[0];
    const hp = p.car.userData.hp === undefined ? 100 : Math.max(0, Math.round(p.car.userData.hp));
    sp.innerHTML = '<b>' + kmh + '</b><span>KM/H</span><div class="carname">' + spec.name + ' · ' + hp + '% CONDITION</div>';
    sp.style.display = 'block';
  } else sp.style.display = 'none';
}

// District, clock, radio and the contextual hint, bottom centre.
function renderStatus(game) {
  const p = game.player;
  const dt2 = el('district');
  if (dt2) dt2.textContent = districtAt(p.x, p.z);
  const ck = el('clock');
  if (ck) {
    const mins = Math.floor(game.timeOfDay * 60) % 1440;
    ck.textContent = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
  }
  const rd = el('radio');
  if (rd) rd.textContent = '♪ ' + RADIO[game.audio.radioIndex % RADIO.length].name + ' — "' + RADIO[game.audio.radioIndex % RADIO.length].tag + '"';
  const hint = el('hint');
  if (hint) {
    if (game.nearMissTimer > 0) {
      hint.textContent = 'NEAR MISS +$10 — THREAD THE NEEDLE, SLICK';
    } else if (game.collectibles && game.collectibles.garageReady) {
      hint.textContent = 'G — REPAIR AT JUNO\'S GARAGE ($100) · H — PHOTO MODE';
    } else if (p.onFoot) {
      const car = nearestCar(p, game.trafficCars, 5);
      hint.textContent = car ? 'E — STEAL CAR    F — PUNCH    CLICK — SHOOT    M — JOB' : 'WASD — MOVE · SHIFT — RUN · M — JOB · R — RADIO';
    } else {
      hint.textContent = 'W/S — DRIVE · A/D — STEER · SPACE — HANDBRAKE · E — EXIT CAR · R — RADIO';
    }
  }
}

function drawMinimap(game) {
  const hud = game.hud;
  if (!hud || !hud.mmCtx) return;
  const ctx = hud.mmCtx, S = 168, C = S / 2;
  const scale = S / 440;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, C - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#1d2b3a';
  ctx.fillRect(0, 0, S, S);
  // Ocean east, sand strip beside it.
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(C + OPAL.EAST_BEACH * scale, 0, S, S);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(C + (OPAL.EAST_BEACH - 14) * scale, 0, 14 * scale, S);
  // Roads.
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 7;
  for (let i = 0; i <= OPAL.GRID; i++) {
    const p = -OPAL.BLOCK * OPAL.GRID / 2 + i * OPAL.BLOCK;
    ctx.beginPath(); ctx.moveTo(C + p * scale, 0); ctx.lineTo(C + p * scale, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, C + p * scale); ctx.lineTo(S, C + p * scale); ctx.stroke();
  }
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= OPAL.GRID; i++) {
    const p = -OPAL.BLOCK * OPAL.GRID / 2 + i * OPAL.BLOCK;
    ctx.beginPath(); ctx.moveTo(C + p * scale, 0); ctx.lineTo(C + p * scale, S); ctx.stroke();
  }
  function dot(x, z, color, r) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(C + x * scale, C + z * scale, r || 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission target, collectibles and checkpoints.
  const m = game.missions;
  if (m.active && m.target) dot(m.target.x, m.target.z, '#facc15', 5);
  for (const c of m.collectibles) if (!c.taken) dot(c.x, c.z, '#facc15', 3);
  for (const cp of m.checkpoints) if (!cp.hit) dot(cp.x, cp.z, '#22d3ee', 3);
  // Police.
  for (const c of game.police.cars) dot(c.position.x, c.position.z, '#ef4444', 3);
  if (game.police.heli) dot(game.police.heli.position.x, game.police.heli.position.z, '#ef4444', 4);
  // Traffic.
  for (const c of game.trafficCars) dot(c.position.x, c.position.z, '#e5e7eb', 2);
  // Player arrow, rotated with the heading.
  ctx.save();
  ctx.translate(C + game.player.x * scale, C + game.player.z * scale);
  ctx.rotate(game.player.angle);
  ctx.fillStyle = '#2dd4bf';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // Compass ring and N.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(C, C, C - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', C, 14);
}

function saveGame(game) {
  try {
    const p = game.player;
    localStorage.setItem('opal-coast-save', JSON.stringify({
      cash: p.cash, rp: p.rp, health: p.health, armour: p.armour,
      missionIndex: game.missions.index, x: p.x, z: p.z, time: Date.now(),
    }));
  } catch (e) {}
}

function loadGame(game) {
  try {
    const raw = localStorage.getItem('opal-coast-save');
    if (!raw) return false;
    const s = JSON.parse(raw);
    game.player.cash = s.cash;
    game.player.rp = s.rp;
    game.player.health = s.health;
    game.player.armour = s.armour;
    game.missions.index = s.missionIndex || 0;
    game.player.x = s.x || 0;
    game.player.z = s.z || 8;
    game.player.mesh.position.set(game.player.x, 0, game.player.z);
    return true;
  } catch (e) { return false; }
}
