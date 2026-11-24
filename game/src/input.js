// OPAL COAST — keyboard input with edge detection (pressed-this-frame).

export const keys = {};
const pressed = new Set();

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  });
}

// True only on the frame the key went down.
export function wasPressed(code) {
  return pressed.has(code);
}

// Call once per frame after the game reads input.
export function endFrame() {
  pressed.clear();
}

export const down = (code) => !!keys[code];
