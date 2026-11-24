// OPAL COAST — HUD, minimap, start screen, pause and photo mode.
// All DOM lives in index.html; this module only drives it.

import { S } from './state.js';

function el(id) {
  return document.getElementById(id);
}

export function createUI(ctx) {
  const { audio, input } = ctx;
  const hud = el('hud');
  const speedEl = el('speed');
  const cashEl = el('cash');
  const starsEl = el('stars');
  const objectiveEl = el('objectiveText');
  const hintEl = el('hint');
  const damageEl = el('damage');
  const hullEl = el('hull');
  const map = el('minimap');
  const mctx = map ? map.getContext('2d') : null;
  const startEl = el('start');
  const pauseEl = el('pause');

  function forceStart() {
    if (S.started) return;
    S.started = true;
    audio.ensure();
    if (startEl) startEl.style.display = 'none';
  }

  function start() {
    forceStart();
  }

  if (startEl) {
    startEl.addEventListener('click', start);
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && !S.started) start();
  });

  function drawMinimap() {
    if (!mctx || !map) return;
    const W = map.width;
    const H = map.height;
    const sx = (x) => (x + 170) * (W / 380);
    const sy = (z) => (z + 170) * (H / 340);
    mctx.fillStyle = 'rgba(10, 24, 38, 0.85)';
    mctx.fillRect(0, 0, W, H);
    // Sea on the east and south edges.
    mctx.fillStyle = 'rgba(30, 111, 158, 0.9)';
    mctx.fillRect(sx(160), 0, W - sx(160), H);
    mctx.fillRect(0, sy(160), W, H - sy(160));
    // Roads.
    mctx.strokeStyle = 'rgba(200, 200, 210, 0.55)';
    mctx.lineWidth = 2;
    for (const c of [-120, -60, 0, 60, 120]) {
      mctx.beginPath();
      mctx.moveTo(sx(c), 0);
      mctx.lineTo(sx(c), H);
      mctx.stroke();
      mctx.beginPath();
      mctx.moveTo(0, sy(c));
      mctx.lineTo(W, sy(c));
      mctx.stroke();
    }
    const dot = (x, z, color, r) => {
      mctx.fillStyle = color;
      mctx.beginPath();
      mctx.arc(sx(x), sy(z), r, 0, Math.PI * 2);
      mctx.fill();
    };
    // Mission marker and tanker.
    const { missions, police, player } = ctx;
    if (missions && missions.marker) {
      dot(missions.marker.position.x, missions.marker.position.z, '#ffc93c', 4);
    }
    if (missions && missions.tanker.visible) {
      dot(missions.tanker.position.x, missions.tanker.position.z, '#ff8c2a', 3.5);
    }
    if (missions && missions.nacho.visible) {
      dot(missions.nacho.position.x, missions.nacho.position.z, '#ffd94a', 3);
    }
    for (const it of police.interceptors) {
      if (it.active) dot(it.pos.x, it.pos.z, '#ff2a2a', 3);
    }
    // The player, as a triangle pointing along the heading. On the map
    // east is right and south is down, so forward (sin a, cos a) in
    // (x, z) is the screen angle atan2(cos a, sin a).
    const px = sx(player.pos.x);
    const py = sy(player.pos.z);
    const a = Math.atan2(Math.cos(player.heading), Math.sin(player.heading));
    mctx.fillStyle = '#19b8a6';
    mctx.beginPath();
    mctx.moveTo(px + Math.cos(a) * 7, py + Math.sin(a) * 7);
    mctx.lineTo(px + Math.cos(a + 2.5) * 5, py + Math.sin(a + 2.5) * 5);
    mctx.lineTo(px + Math.cos(a - 2.5) * 5, py + Math.sin(a - 2.5) * 5);
    mctx.closePath();
    mctx.fill();
  }

  function update() {
    // Toggles that live on key presses.
    if (input.pressed('Escape') && S.started) {
      S.paused = !S.paused;
      if (pauseEl) pauseEl.style.display = S.paused ? 'flex' : 'none';
    }
    if (input.pressed('KeyP') && S.started) {
      S.photo = !S.photo;
    }
    if (input.pressed('KeyM')) {
      const muted = audio.toggleMute();
      if (!S.photo) {
        // Show the mute state briefly as a hint.
        S.hint = muted ? 'Sound muted' : 'Sound on';
        S.hintUntil = S.time + 1.2;
      }
    }

    if (hud) hud.style.display = S.photo || !S.started ? 'none' : 'block';
    if (speedEl) speedEl.textContent = `${S.speedKmh} km/h`;
    if (cashEl) cashEl.textContent = `$${S.cash}`;
    if (starsEl) starsEl.textContent = '★'.repeat(S.wanted) + '☆'.repeat(4 - S.wanted);
    if (objectiveEl) objectiveEl.textContent = S.objective;
    if (damageEl) damageEl.textContent = `DAMAGE ${S.damage}%`;
    if (hullEl) {
      hullEl.style.display = S.mission === 'm2' ? 'block' : 'none';
      hullEl.textContent = `TANKER HULL ${Math.round(S.hull)}%`;
    }
    if (hintEl) {
      if (S.time < S.hintUntil && S.hint) {
        hintEl.style.display = 'block';
        hintEl.textContent = S.hint;
      } else {
        hintEl.style.display = 'none';
      }
    }
    drawMinimap();
  }

  return { update, forceStart };
}
