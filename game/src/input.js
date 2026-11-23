// OPAL COAST — keyboard and mouse input.
// A single shared key map; gameplay code asks isDown('KeyW') and the like.
// Also exposes a tiny edge detector (pressed) for one-shot actions.

const keys = new Set();
const pressedKeys = new Set();

export const Input = {
  // True while the key is held.
  isDown(code) {
    return keys.has(code);
  },
  // True only on the frame the key went down.
  pressed(code) {
    return pressedKeys.has(code);
  },
  // Driving helpers, so gameplay reads intent, not raw codes.
  get throttle() {
    return (this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0)
      - (this.isDown('KeyS') || this.isDown('ArrowDown') ? 1 : 0);
  },
  get steer() {
    return (this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0)
      - (this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0);
  },
  get handbrake() {
    return this.isDown('Space');
  },
  // Clear the edge set at the end of each frame.
  endFrame() {
    pressedKeys.clear();
  },
};

export function bindInput() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (!e.repeat) pressedKeys.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    pressedKeys.clear();
  });
  // Clicking anywhere counts as the "start" gesture for the start screen.
  window.addEventListener('mousedown', () => {
    pressedKeys.add('MouseClick');
  });
}
