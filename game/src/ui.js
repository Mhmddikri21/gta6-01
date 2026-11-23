// OPAL COAST — HUD: speed, cash, hull, wanted stars, objective, minimap, toasts.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
export class UI {
  constructor(state) {
    this.state = state;
    this.speedEl = document.getElementById('speed');
    this.cashEl = document.getElementById('cash');
    this.hullEl = document.getElementById('hull');
    this.shardsEl = document.getElementById('shards');
    this.starsEl = document.getElementById('stars');
    this.objectiveEl = document.getElementById('objective');
    this.toastEl = document.getElementById('toast');
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map ? this.map.getContext('2d') : null;
    this.toastTimer = null;
  }

  toast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 2600);
  }

  update(player, missions, police, traffic, collectibles, world) {
    if (this.speedEl) this.speedEl.textContent = `${Math.round(Math.abs(player.speed) * 3.6)} km/h`;
    if (this.cashEl) this.cashEl.textContent = `$${this.state.cash}`;
    if (this.hullEl) {
      this.hullEl.textContent = `HULL ${Math.round(player.hull)}%`;
      this.hullEl.style.color = player.hull < 30 ? '#ff5555' : '#e8f0e8';
    }
    if (this.shardsEl) this.shardsEl.textContent = `OPALS ${this.state.shardsCollected}/10`;
    if (this.starsEl) {
      this.starsEl.textContent = '★'.repeat(this.state.stars) + '☆'.repeat(4 - this.state.stars);
      this.starsEl.style.color = this.state.stars > 0 ? '#ffd23a' : '#c8ccd0';
    }
    if (this.objectiveEl) this.objectiveEl.textContent = this.state.objective;
    this.drawMinimap(player, police, missions, traffic, collectibles, world);
  }

  drawMinimap(player, police, missions, traffic, collectibles, world) {
    const ctx = this.mapCtx;
    if (!ctx) return;
    const S = 160;
    const scale = S / 220;
    const toX = (x) => (x + 110) * scale;
    const toY = (z) => (z + 110) * scale;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#24361f';
    ctx.fillRect(0, 0, S, S);
    // Water on the east edge.
    ctx.fillStyle = '#2f6f8f';
    ctx.fillRect(toX(86), 0, S - toX(86), S);
    // Streets.
    ctx.strokeStyle = '#5a5f68';
    ctx.lineWidth = 5;
    for (const s of [-60, -30, 0, 30, 60]) {
      ctx.beginPath();
      ctx.moveTo(toX(-80), toY(s));
      ctx.lineTo(toX(80), toY(s));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toX(s), toY(-80));
      ctx.lineTo(toX(s), toY(80));
      ctx.stroke();
    }
    // Garage pad.
    ctx.fillStyle = '#33ff99';
    ctx.beginPath();
    ctx.arc(toX(world.garage.x), toY(world.garage.z), 4, 0, Math.PI * 2);
    ctx.fill();
    // Shards.
    ctx.fillStyle = '#66e0ff';
    for (const s of collectibles.shards) {
      if (s.taken) continue;
      ctx.beginPath();
      ctx.arc(toX(s.x), toY(s.z), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Traffic.
    ctx.fillStyle = '#d8d2c2';
    for (const car of traffic.cars) {
      ctx.fillRect(toX(car.pos.x) - 1.5, toY(car.pos.z) - 1.5, 3, 3);
    }
    // Mission marker.
    if (missions.marker.visible) {
      ctx.strokeStyle = '#ffd23a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(toX(missions.marker.position.x), toY(missions.marker.position.z), 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Police.
    ctx.fillStyle = '#ff3333';
    for (const u of police.interceptors) {
      ctx.beginPath();
      ctx.arc(toX(u.pos.x), toY(u.pos.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow.
    ctx.save();
    ctx.translate(toX(player.pos.x), toY(player.pos.z));
    ctx.rotate(Math.atan2(Math.sin(player.heading), -Math.cos(player.heading)) + Math.PI);
    ctx.fillStyle = '#2fa3a3';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
