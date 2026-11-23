// OPAL COAST — the HUD: cash, wanted stars, speed, objective, minimap,
// hints and toasts, plus the start screen, pause overlay and photo mode.
// The minimap is a live top-down canvas: roads, sea, player, traffic,
// police, the mission beacon and the remaining opal shards.

import { CFG } from './config.js';
import { S } from './state.js';

let els = {};
let minimap = null;
let mctx = null;
let world = null; // { traffic, peds, police, missions, collectibles }

const MAP_SIZE = 168;
const WORLD = CFG.worldHalf * 2;

function toMap(x, z) {
  const s = MAP_SIZE / WORLD;
  return { x: (x + CFG.worldHalf) * s, y: (z + CFG.worldHalf) * s };
}

function drawMinimap() {
  if (!mctx) return;
  const c = mctx;
  c.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
  // City base and sea.
  c.fillStyle = '#5a6b52';
  c.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  const sea = toMap(CFG.coastX, 0);
  c.fillStyle = '#1f7fa8';
  c.fillRect(0, 0, Math.max(0, sea.x), MAP_SIZE);
  // Roads.
  c.strokeStyle = '#3a3f46';
  c.lineWidth = 4;
  for (const v of [-150, -100, -50, 0, 50, 100, 150]) {
    const a = toMap(v, -200);
    const b = toMap(v, 200);
    c.beginPath();
    c.moveTo(a.x, 0);
    c.lineTo(a.x, MAP_SIZE);
    c.stroke();
    c.beginPath();
    c.moveTo(0, a.y);
    c.lineTo(MAP_SIZE, a.y);
    c.stroke();
  }
  // Garage pad.
  const g = toMap(CFG.places.garage.x, CFG.places.garage.z);
  c.fillStyle = '#2fd4c4';
  c.fillRect(g.x - 4, g.y - 4, 8, 8);
  // Opal shards.
  c.fillStyle = '#35e0d0';
  for (const s of world.collectibles.list) {
    if (s.taken) continue;
    const p = toMap(s.x, s.z);
    c.beginPath();
    c.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    c.fill();
  }
  // Traffic (yellow), police (red), tanker (blue square).
  c.fillStyle = '#e8c93a';
  for (const t of world.traffic.list) {
    const p = toMap(t.x, t.z);
    c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  c.fillStyle = '#ff3344';
  for (const it of world.police.list) {
    const p = toMap(it.x, it.z);
    c.beginPath();
    c.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    c.fill();
  }
  const tk = world.missions.tankerPos;
  if (tk.visible) {
    const p = toMap(tk.x, tk.z);
    c.fillStyle = '#3a9bff';
    c.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
  // Mission beacon: a pulsing gold star at the objective.
  if (S.objective) {
    const bp = beaconPos();
    if (bp) {
      const p = toMap(bp.x, bp.z);
      const pulse = 4 + Math.sin(S.time * 5) * 1.5;
      c.fillStyle = '#ffc93a';
      c.beginPath();
      c.arc(p.x, p.y, pulse, 0, Math.PI * 2);
      c.fill();
    }
  }
  // The player: a white arrow pointing where they face.
  const pp = toMap(S.playerX, S.playerZ);
  const hd = S.playerHeading;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(pp.x + Math.sin(hd) * 7, pp.y + Math.cos(hd) * 7);
  c.lineTo(pp.x + Math.sin(hd + 2.5) * 5, pp.y + Math.cos(hd + 2.5) * 5);
  c.lineTo(pp.x + Math.sin(hd - 2.5) * 5, pp.y + Math.cos(hd - 2.5) * 5);
  c.closePath();
  c.fill();
  c.strokeStyle = '#000000';
  c.lineWidth = 1;
  c.stroke();
}

function beaconPos() {
  if (S.mission.id === 'm1') return CFG.places.daliaPickup;
  if (S.mission.id === 'm2') {
    const tk = world.missions.tankerPos;
    return tk.visible ? { x: tk.x, z: tk.z } : null;
  }
  if (S.mission.id === 'm3' && S.mission.checkpointsHit < CFG.raceCheckpoints.length) {
    return CFG.raceCheckpoints[S.mission.checkpointsHit];
  }
  return null;
}

function stars() {
  let out = '';
  for (let i = 0; i < 4; i++) out += i < S.wanted ? '★' : '☆';
  return out;
}

export const UI = {
  init(worldIn) {
    world = worldIn;
    els = {
      hud: document.getElementById('hud'),
      cash: document.getElementById('cash'),
      wanted: document.getElementById('wanted'),
      speed: document.getElementById('speed'),
      damage: document.getElementById('damage'),
      objective: document.getElementById('objective'),
      hint: document.getElementById('hint'),
      toast: document.getElementById('toast'),
      shards: document.getElementById('shards'),
      start: document.getElementById('start-screen'),
      pause: document.getElementById('pause-screen'),
      busted: document.getElementById('busted-screen'),
      fine: document.getElementById('busted-fine'),
    };
    minimap = document.getElementById('minimap');
    if (minimap) {
      minimap.width = MAP_SIZE;
      minimap.height = MAP_SIZE;
      mctx = minimap.getContext('2d');
    }
  },

  // Called every frame: refresh the numbers and the minimap.
  update() {
    if (!els.hud) return;
    els.cash.textContent = `$${S.cash}`;
    els.wanted.textContent = stars();
    els.wanted.className = S.wanted > 0 ? 'wanted hot' : 'wanted';
    const kmh = Math.round(Math.abs(S.playerSpeed) * 3.6);
    els.speed.textContent = S.onFoot ? 'ON FOOT' : `${kmh} km/h`;
    els.damage.textContent = S.onFoot ? '' : `DAMAGE ${Math.round(S.carDamage)}%`;
    els.objective.textContent = S.objective;
    els.shards.textContent = `◆ ${S.shards}/${S.shardsTotal}`;
    els.hint.textContent = S.hint;
    els.hint.style.opacity = S.hint ? '1' : '0';
    els.toast.textContent = S.toast;
    els.toast.style.opacity = S.toast ? '1' : '0';
    drawMinimap();

    // Overlays.
    els.start.style.display = S.started ? 'none' : 'flex';
    els.pause.style.display = S.paused && S.started ? 'flex' : 'none';
    if (S.over) {
      els.busted.style.display = 'flex';
    } else {
      els.busted.style.display = 'none';
    }
    document.body.classList.toggle('photo', S.photo);
  },

  showBusted(fine) {
    if (els.fine) els.fine.textContent = `The OCPD impounded your car and fined you $${fine}.`;
  },
};
