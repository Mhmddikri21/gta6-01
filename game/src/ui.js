// OPAL COAST — HUD: speed, cash, wanted stars, mission objective, live minimap.

import { CFG } from './config.js';
import { S } from './state.js';

let els = {};
let mapCtx = null;

export function initUI() {
  els = {
    speed: document.getElementById('hud-speed'),
    cash: document.getElementById('hud-cash'),
    stars: document.getElementById('hud-stars'),
    mission: document.getElementById('hud-mission'),
    hull: document.getElementById('hud-hull'),
    hint: document.getElementById('hud-hint'),
    damage: document.getElementById('hud-damage'),
    minimap: document.getElementById('minimap'),
  };
  if (els.minimap) mapCtx = els.minimap.getContext('2d');
}

function starText() {
  let s = '';
  for (let i = 0; i < CFG.maxStars; i++) s += i < S.stars ? '★' : '☆';
  return s;
}

export function updateUI() {
  if (!els.speed) return;
  const kmh = Math.round(Math.abs(S.speed) * 3.6);
  els.speed.textContent = S.onFoot ? 'ON FOOT' : kmh + ' km/h';
  els.cash.textContent = '$' + S.cash;
  els.stars.textContent = starText();
  els.stars.style.color = S.stars >= 3 ? '#ff4040' : '#ffd23e';
  els.mission.textContent = 'MISSION: ' + S.missionText;
  els.hull.textContent = S.mission === 'm2' ? 'TANKER HULL ' + S.hull + '%' : '';
  els.hull.style.color = S.hull < CFG.tankerHullWarnAt ? '#ff4040' : '#7fe7ff';
  els.damage.textContent = 'DAMAGE ' + Math.round(S.damage) + '%';
  els.hint.textContent = S.time < S.hintUntil ? S.hint : '';
  drawMinimap();
}

function drawMinimap() {
  if (!mapCtx) return;
  const c = els.minimap;
  const w = c.width;
  const h = c.height;
  mapCtx.fillStyle = 'rgba(10, 30, 40, 0.8)';
  mapCtx.fillRect(0, 0, w, h);
  const scale = w / CFG.mapRange;
  const toMap = (x, z) => [w / 2 + (x - 20) * scale, h / 2 + z * scale];
  // Sea.
  mapCtx.fillStyle = '#1e6a8a';
  mapCtx.fillRect(w / 2 + (CFG.beachX - 20) * scale, 0, w, h);
  // Roads.
  mapCtx.strokeStyle = '#888888';
  mapCtx.lineWidth = 2;
  const half = (CFG.grid * CFG.blockSize) / 2;
  for (let i = 0; i <= CFG.grid; i++) {
    const v = -half + i * CFG.blockSize;
    const [x1, y1] = toMap(v, -half);
    const [x2, y2] = toMap(v, half);
    mapCtx.beginPath();
    mapCtx.moveTo(x1, y1);
    mapCtx.lineTo(x2, y2);
    mapCtx.stroke();
    const [x3, y3] = toMap(-half, v);
    const [x4, y4] = toMap(half, v);
    mapCtx.beginPath();
    mapCtx.moveTo(x3, y3);
    mapCtx.lineTo(x4, y4);
    mapCtx.stroke();
  }
  // Player triangle, rotated to the heading.
  const px = S.onFoot ? S.player.x : S.car.x;
  const pz = S.onFoot ? S.player.z : S.car.z;
  const [mx, my] = toMap(px, pz);
  const hdg = S.onFoot ? S.player.heading : S.car.heading;
  mapCtx.save();
  mapCtx.translate(mx, my);
  mapCtx.rotate(Math.atan2(Math.sin(hdg), Math.cos(hdg)));
  mapCtx.fillStyle = '#2ec4b6';
  mapCtx.beginPath();
  mapCtx.moveTo(0, -6);
  mapCtx.lineTo(4, 5);
  mapCtx.lineTo(-4, 5);
  mapCtx.closePath();
  mapCtx.fill();
  mapCtx.restore();
}
