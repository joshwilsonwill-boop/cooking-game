// Keyboard and mouse input, kept apart from the rules: it only reports
// what the player is doing this frame (held keys, fresh presses, clicks).

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const state = {
    click: null, // { x, y } in canvas pixels, consumed by the game loop
    mouse: { x: 0, y: 0 },
    anyKey: false,
  };

  const MOVE_KEYS = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      pressed.add(event.code);
      state.anyKey = true;
    }
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function onMouseDown(event) {
    const p = canvasPoint(event);
    state.click = p;
    state.mouse = p;
  }

  function onMouseMove(event) {
    state.mouse = canvasPoint(event);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);

  return {
    // Held movement direction, normalized.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.sqrt(2);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    interactPressed() {
      return pressed.has('KeyE') || pressed.has('Space');
    },
    takeClick() {
      const c = state.click;
      state.click = null;
      return c;
    },
    mouse() {
      return state.mouse;
    },
    // Fresh presses are cleared at the end of each frame.
    endFrame() {
      pressed.clear();
      state.anyKey = false;
    },
  };
}
