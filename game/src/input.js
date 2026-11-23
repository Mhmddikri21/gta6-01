// OPAL COAST — keyboard input with held keys and per-frame edge triggers.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  down(...codes) {
    for (const code of codes) if (this.keys.has(code)) return true;
    return false;
  }

  hit(...codes) {
    for (const code of codes) if (this.pressed.has(code)) return true;
    return false;
  }

  endFrame() {
    this.pressed.clear();
  }
}
