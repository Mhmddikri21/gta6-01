// OPAL COAST — keyboard input with per-frame edge detection.
// WASD / arrows drive, Space handbrake, E enter-exit / interact,
// P photo mode, Esc pause, M mute, R repair at the garage.

export class Input {
  constructor() {
    this.keys = new Set();
    this.edge = new Set();
    this.attached = false;
  }

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.edge.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  down(code) {
    return this.keys.has(code);
  }

  pressed(code) {
    return this.edge.has(code);
  }

  endFrame() {
    this.edge.clear();
  }

  // -1 reverse .. +1 forward.
  get throttle() {
    const f = this.down('KeyW') || this.down('ArrowUp') ? 1 : 0;
    const r = this.down('KeyS') || this.down('ArrowDown') ? 1 : 0;
    return f - r;
  }

  // +1 is left (heading grows), -1 is right.
  get steer() {
    const l = this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0;
    const r = this.down('KeyD') || this.down('ArrowRight') ? 1 : 0;
    return l - r;
  }

  get handbrake() {
    return this.down('Space');
  }
}
