// Sizzle Station entry point: wires the kitchen simulation to the canvas,
// runs the frame loop, and stages screenshot scenes from ?shot=.
//
// A staged scene paints synchronously once and sets window.__shotReady, so
// a screenshot rig can capture the exact frame. The live game runs on
// requestAnimationFrame with a clamped step.

import { VIEW } from './config.js';
import { createInput } from './input.js';
import {
  PHASE_OVER, PHASE_PLAY, PHASE_TITLE, createKitchen, debugState,
  nearestStation, resetKitchen, startShift, stepKitchen,
} from './kitchen.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { ensureAudio, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const state = createKitchen(20261125);
const input = createInput(canvas);

// Playtest and screenshot surface: a plain snapshot of the live state.
window.__sizzle = { get state() { return debugState(state); } };

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

let camera = null;
let last = performance.now();

function drawFrame() {
  const highlight = state.phase === PHASE_PLAY ? nearestStation(state) : null;
  render(ctx, state, highlight, camera);
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (input.wasPressed('Enter')) {
    ensureAudio();
    if (state.phase === PHASE_TITLE) startShift(state);
  }
  if (input.wasPressed('KeyR') && state.phase === PHASE_OVER) {
    resetKitchen(state);
    startShift(state);
  }
  if (input.wasPressed('KeyM')) {
    state.muted = toggleMute();
  }
  // Clicking the title screen starts the shift.
  if (state.phase === PHASE_TITLE && input.takeClick()) {
    ensureAudio();
    startShift(state);
  }
  if (state.phase === PHASE_PLAY) {
    stepKitchen(state, dt, input);
  } else {
    // Title and game-over screens still tick the clock for animations.
    state.time += dt;
    input.takeClick();
  }
  drawFrame();
  input.endFrame();
  requestAnimationFrame(frame);
}

if (shotName) {
  // Staged screenshot: set the scene, paint once, signal readiness.
  camera = stageShot(shotName, state).camera;
  drawFrame();
  window.__shotReady = true;
} else {
  window.__shotReady = false;
  requestAnimationFrame(frame);
}
