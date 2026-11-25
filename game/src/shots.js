// The screenshot scenes behind ?shot=wide|assembly|serve. Each one sets the
// real game state to a fixed mid-game moment, so the frame is what a real
// game looks like and the same shot always gives the same frame. No
// randomness is involved: every order, plate and timer is fixed here.

import { PHASE_PLAY } from './kitchen.js';

function baseScene(state) {
  state.phase = PHASE_PLAY;
  state.time = 62;
  state.timeLeft = 88;
  state.coins = 47;
  state.combo = 2;
  state.bestCombo = 3;
  state.served = 4;
  state.lost = 0;
  state.stars = 3;
  state.rush = false;
  state.spawnTimer = 9;
  state.orders = [];
  state.carrying = null;
  state.chop = { item: null, t: 0 };
  state.grill = [null, null];
  state.plates = [null, null];
  state.toasts = [];
  state.floats = [];
  state.bellT = 0;
  state.shakeT = 0;
}

function order(state, dishId, patience, maxPatience) {
  state.orders.push({ id: state.orders.length + 1, dishId, patience, maxPatience, ready: false });
}

// Wide shot: the whole kitchen at a glance. Three orders on the board, a
// patty on the grill, an onion mid-chop, a plate mid-assembly on the
// counter, crates stocked, the chef carrying a chopped tomato.
export function stageWide(state) {
  baseScene(state);
  order(state, 'sunny', 34, 52);
  order(state, 'garden', 22, 48);
  order(state, 'cheesy', 41, 50);
  state.grill[0] = { state: 'cooking', t: 3.2 };
  state.chop = { item: { id: 'onion' }, t: 1.1 };
  state.plates[0] = { items: ['bun', 'patty'] };
  state.plates[1] = { items: ['bun'] };
  state.carrying = { type: 'ingredient', id: 'tomato', prep: 'ready' };
  state.chef.x = 560;
  state.chef.y = 470;
  state.chef.dir = 'right';
  state.chef.moving = false;
  state.orders[0].ready = false;
  return { camera: null };
}

// Assembly shot: zoomed on the plating counter. The plate holds bun, cooked
// patty and lettuce, one ingredient short of a Sunny Stack, and the chef is
// adding the chopped tomato. The order board and timer still draw on top.
export function stageAssembly(state) {
  baseScene(state);
  order(state, 'sunny', 28, 52);
  order(state, 'garden', 18, 48);
  order(state, 'big', 44, 50);
  state.grill[1] = { state: 'cooked', t: 1.5 };
  state.chop = { item: { id: 'tomato' }, t: 0 };
  state.plates[0] = { items: ['bun', 'patty', 'lettuce'] };
  state.carrying = { type: 'ingredient', id: 'tomato', prep: 'ready' };
  state.chef.x = 470;
  state.chef.y = 580;
  state.chef.dir = 'down';
  state.chef.moving = false;
  state.toasts = [{ text: 'One more ingredient for the Sunny Stack', t: 2.4, color: '#ffd94d' }];
  return { camera: { cx: 560, cy: 600, scale: 1.55 } };
}

// Serve shot: the chef at the pass window carrying a finished Sunny Stack,
// its ticket lit READY, the bell ringing and the tip floating up.
export function stageServe(state) {
  baseScene(state);
  state.coins = 65;
  state.combo = 3;
  order(state, 'sunny', 26, 52);
  order(state, 'garden', 20, 48);
  order(state, 'crunch', 38, 50);
  state.orders[0].ready = true;
  state.plates[0] = { items: ['bun', 'tomato', 'cheese'] };
  state.carrying = { type: 'plate', items: ['bun', 'patty', 'lettuce'] };
  state.chef.x = 1000;
  state.chef.y = 260;
  state.chef.dir = 'up';
  state.chef.moving = false;
  state.bellT = 0.6;
  state.floats = [{ text: '+$18', x: 1000, y: 368, t: 1.4, color: '#ffd94d' }];
  return { camera: null };
}

export function stageShot(name, state) {
  if (name === 'assembly') return stageAssembly(state);
  if (name === 'serve') return stageServe(state);
  return stageWide(state);
}
