// The kitchen: all game state and rules. No drawing here, no DOM, just the
// simulation: orders, stations, the chef, plates, coins, combo and stars.
// main.js steps it, render.js draws it, shots.js stages it.

import {
  BOARD, BURN_SECONDS, CHOP_SECONDS, FLOOR, GRILL_SECONDS, GRILL_SLOTS,
  INGREDIENTS, INGREDIENT_ORDER, INTERACT_RANGE, MAX_ORDERS, MAX_STARS, MENU,
  PLAYER, PLATE_SLOTS, RUSH_SECONDS, SHIFT_SECONDS, SPAWN, STATIONS,
} from './config.js';
import { makeRng, pick } from './random.js';
import { sfx } from './audio.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_OVER = 'over';

let orderId = 0;

export function createKitchen(seed = 20261125) {
  const rng = makeRng(seed);
  const state = {
    phase: PHASE_TITLE,
    rng,
    time: 0,
    timeLeft: SHIFT_SECONDS,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    lost: 0,
    stars: MAX_STARS,
    rush: false,
    spawnTimer: 2,
    orders: [], // { id, dishId, patience, maxPatience, ready }
    chef: { x: SPAWN.x, y: SPAWN.y, dir: 'down', moving: false, target: null, pendingStation: null },
    carrying: null, // { type: 'ingredient', id, prep } or { type: 'plate', items: [] }
    chop: { item: null, t: 0 }, // item: { id } while chopping
    grill: [null, null], // each: { state: 'cooking'|'cooked'|'burnt', t: 0 }
    plates: [null, null], // each: { items: [ingredientId] } on the counter
    toasts: [], // { text, t, color }
    floats: [], // { text, x, y, t, color }
    bellT: 0,
    shakeT: 0,
    overReason: '',
    muted: false,
  };
  return state;
}

export function resetKitchen(state) {
  const fresh = createKitchen(20261125);
  Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
}

export function startShift(state) {
  state.phase = PHASE_PLAY;
  state.time = 0;
  state.timeLeft = SHIFT_SECONDS;
  state.coins = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.served = 0;
  state.lost = 0;
  state.stars = MAX_STARS;
  state.rush = false;
  state.spawnTimer = 2;
  state.orders = [];
  state.carrying = null;
  state.chop = { item: null, t: 0 };
  state.grill = [null, null];
  state.plates = [null, null];
  state.toasts = [];
  state.floats = [];
  state.overReason = '';
  sfx.start();
}

function toast(state, text, color = '#fff') {
  state.toasts.push({ text, t: 2.4, color });
  if (state.toasts.length > 3) state.toasts.shift();
}

function floatText(state, text, x, y, color = '#ffd94d') {
  state.floats.push({ text, x, y, t: 1.4, color });
}

// --- orders ---------------------------------------------------------------

function orderPatience(state) {
  // Orders get less patient as the shift wears on.
  const progress = 1 - state.timeLeft / SHIFT_SECONDS;
  return Math.max(30, 52 - progress * 20);
}

function spawnInterval(state) {
  const progress = 1 - state.timeLeft / SHIFT_SECONDS;
  return Math.max(8, 16 - progress * 8);
}

export function spawnOrder(state, dishId = null) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const dish = dishId ? MENU.find((d) => d.id === dishId) : pick(state.rng, MENU);
  const patience = orderPatience(state);
  const order = { id: orderId += 1, dishId: dish.id, patience, maxPatience: patience, ready: false };
  state.orders.push(order);
  return order;
}

function dishMatchesPlate(dish, items) {
  if (items.length !== dish.recipe.length) return false;
  const have = items.slice().sort();
  const want = dish.recipe.slice().sort();
  return have.every((id, i) => id === want[i]);
}

function refreshReadyFlags(state) {
  for (const order of state.orders) {
    order.ready = state.plates.some(
      (plate) => plate && dishMatchesPlate(MENU.find((d) => d.id === order.dishId), plate.items),
    );
  }
}

// --- stations -------------------------------------------------------------

function rectDistance(px, py, r) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

// Every station the chef can reach, with its label and what E does.
export function nearestStation(state) {
  const { x, y } = state.chef;
  const candidates = [];
  for (const crate of STATIONS.crates) candidates.push(crate);
  candidates.push(STATIONS.grill, STATIONS.chop, STATIONS.counter, STATIONS.trash, STATIONS.pass);
  let best = null;
  let bestD = Infinity;
  for (const s of candidates) {
    const d = rectDistance(x, y, s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  if (!best || bestD > INTERACT_RANGE) return null;
  return { station: best, action: stationAction(state, best) };
}

function stationAction(state, station) {
  const carry = state.carrying;
  switch (station.kind) {
    case 'crate': {
      const ing = INGREDIENTS[station.id];
      if (carry) return null;
      return `Grab ${ing.name}`;
    }
    case 'chop': {
      if (state.chop.item) {
        if (state.chop.t > 0) return 'Chopping...';
        return carry ? null : `Take chopped ${INGREDIENTS[state.chop.item.id].name}`;
      }
      if (carry && carry.type === 'ingredient' && INGREDIENTS[carry.id].prep === 'chop' && carry.prep === 'raw') {
        return `Chop ${INGREDIENTS[carry.id].name}`;
      }
      return null;
    }
    case 'grill': {
      const cooked = state.grill.findIndex((slot) => slot && slot.state !== 'cooking');
      const free = state.grill.findIndex((slot) => !slot);
      if (!carry && cooked !== -1) {
        const slot = state.grill[cooked];
        return slot.state === 'burnt' ? 'Take burnt patty' : 'Take cooked patty';
      }
      if (carry && carry.type === 'ingredient' && carry.id === 'patty' && carry.prep === 'raw' && free !== -1) {
        return 'Grill patty';
      }
      return null;
    }
    case 'counter': {
      if (carry && carry.type === 'plate') {
        return state.plates.some((p) => !p) ? 'Set plate down' : null;
      }
      if (carry && carry.type === 'ingredient') {
        if (carry.prep !== 'ready') return carry.prep === 'raw' && INGREDIENTS[carry.id].prep === 'chop' ? 'Needs chopping' : 'Needs grilling';
        return state.plates.some((p) => p) ? `Add ${INGREDIENTS[carry.id].name} to plate` : 'Need a plate first';
      }
      if (!carry) {
        const filled = state.plates.findIndex((p) => p && p.items.length > 0);
        if (filled !== -1) return 'Pick up plate';
        return 'Take a plate';
      }
      return null;
    }
    case 'trash': {
      return carry ? 'Throw away' : null;
    }
    case 'pass': {
      if (carry && carry.type === 'plate') {
        const match = state.orders.find((o) => dishMatchesPlate(MENU.find((d) => d.id === o.dishId), carry.items));
        return match ? `Serve ${MENU.find((d) => d.id === match.dishId).name}` : 'Serve (no matching order)';
      }
      return null;
    }
    default:
      return null;
  }
}

// --- interaction ----------------------------------------------------------

function useStation(state, station) {
  const carry = state.carrying;
  switch (station.kind) {
    case 'crate': {
      if (carry) return;
      const ing = INGREDIENTS[station.id];
      state.carrying = { type: 'ingredient', id: ing.id, prep: ing.prep === 'none' ? 'ready' : 'raw' };
      sfx.pickup();
      break;
    }
    case 'chop': {
      if (state.chop.item) {
        if (state.chop.t <= 0 && !carry) {
          state.carrying = { type: 'ingredient', id: state.chop.item.id, prep: 'ready' };
          state.chop.item = null;
          sfx.pickup();
        }
        return;
      }
      if (carry && carry.type === 'ingredient' && INGREDIENTS[carry.id].prep === 'chop' && carry.prep === 'raw') {
        state.chop = { item: { id: carry.id }, t: CHOP_SECONDS };
        state.carrying = null;
        sfx.chop();
      }
      break;
    }
    case 'grill': {
      const cooked = state.grill.findIndex((slot) => slot && slot.state !== 'cooking');
      const free = state.grill.findIndex((slot) => !slot);
      if (!carry && cooked !== -1) {
        const slot = state.grill[cooked];
        state.carrying = { type: 'ingredient', id: 'patty', prep: slot.state === 'burnt' ? 'burnt' : 'ready' };
        state.grill[cooked] = null;
        sfx.pickup();
        return;
      }
      if (carry && carry.type === 'ingredient' && carry.id === 'patty' && carry.prep === 'raw' && free !== -1) {
        state.grill[free] = { state: 'cooking', t: 0 };
        state.carrying = null;
        sfx.sizzle();
      }
      break;
    }
    case 'counter': {
      if (carry && carry.type === 'plate') {
        const free = state.plates.findIndex((p) => !p);
        if (free !== -1) {
          state.plates[free] = { items: carry.items.slice() };
          state.carrying = null;
          sfx.place();
          refreshReadyFlags(state);
        }
        return;
      }
      if (carry && carry.type === 'ingredient') {
        if (carry.prep !== 'ready') {
          toast(state, carry.prep === 'burnt' ? 'Burnt! Trash it.' : 'Not ready yet', '#ff9a8a');
          sfx.reject();
          return;
        }
        const slot = state.plates.findIndex((p) => p && p.items.length < 5);
        if (slot !== -1) {
          state.plates[slot].items.push(carry.id);
          state.carrying = null;
          sfx.place();
          refreshReadyFlags(state);
        } else {
          toast(state, 'Put a plate on the counter first', '#ffd94d');
        }
        return;
      }
      if (!carry) {
        const filled = state.plates.findIndex((p) => p && p.items.length > 0);
        if (filled !== -1) {
          state.carrying = { type: 'plate', items: state.plates[filled].items.slice() };
          state.plates[filled] = null;
          sfx.pickup();
          refreshReadyFlags(state);
        } else {
          // No plated dish waiting: take a fresh plate from the stack.
          state.carrying = { type: 'plate', items: [] };
          sfx.pickup();
        }
      }
      break;
    }
    case 'trash': {
      if (carry) {
        state.carrying = null;
        sfx.place();
        toast(state, 'Tossed', '#ccc');
      }
      break;
    }
    case 'pass': {
      if (carry && carry.type === 'plate') {
        servePlate(state, carry.items);
      }
      break;
    }
    default:
      break;
  }
}

function servePlate(state, items) {
  const idx = state.orders.findIndex((o) => dishMatchesPlate(MENU.find((d) => d.id === o.dishId), items));
  if (idx === -1) {
    toast(state, 'No order wants this dish', '#ff9a8a');
    sfx.reject();
    state.shakeT = 0.25;
    return;
  }
  const order = state.orders[idx];
  const dish = MENU.find((d) => d.id === order.dishId);
  state.orders.splice(idx, 1);
  const timeBonus = Math.round((order.patience / order.maxPatience) * 5);
  const comboMult = 1 + Math.min(state.combo, 10) * 0.1;
  const earned = Math.round((dish.price + timeBonus) * comboMult);
  state.coins += earned;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.served += 1;
  state.carrying = null;
  state.bellT = 0.6;
  floatText(state, `+$${earned}`, state.chef.x, state.chef.y - 40, '#ffd94d');
  if (state.combo >= 3) floatText(state, `COMBO x${state.combo}`, state.chef.x, state.chef.y - 66, '#8dff6e');
  sfx.serve();
  sfx.bell();
  refreshReadyFlags(state);
}

function expireOrder(state, order) {
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.lost += 1;
  state.combo = 0;
  state.stars -= 1;
  toast(state, `Lost order: ${MENU.find((d) => d.id === order.dishId).name}`, '#ff9a8a');
  sfx.expire();
  if (state.stars <= 0) endShift(state, 'The diners walked out. Reputation gone.');
}

// --- movement -------------------------------------------------------------

const SOLIDS = [];
function solids() {
  if (SOLIDS.length) return SOLIDS;
  for (const crate of STATIONS.crates) SOLIDS.push(crate);
  SOLIDS.push(STATIONS.grill, STATIONS.chop, STATIONS.plates, STATIONS.counter, STATIONS.trash, STATIONS.pass);
  return SOLIDS;
}

function collide(state) {
  const c = state.chef;
  const r = PLAYER.radius;
  c.x = Math.max(FLOOR.left + r, Math.min(FLOOR.right - r, c.x));
  c.y = Math.max(BOARD.top + BOARD.height + r + 4, Math.min(FLOOR.bottom - r - 4, c.y));
  for (const s of solids()) {
    const nx = Math.max(s.x, Math.min(c.x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(c.y, s.y + s.h));
    const dx = c.x - nx;
    const dy = c.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      c.x = nx + (dx / d) * r;
      c.y = ny + (dy / d) * r;
    } else if (d2 <= 0.0001) {
      // Centre inside the rect: push out along the smallest penetration.
      const left = c.x - s.x;
      const right = s.x + s.w - c.x;
      const top = c.y - s.y;
      const bottom = s.y + s.h - c.y;
      const min = Math.min(left, right, top, bottom);
      if (min === left) c.x = s.x - r;
      else if (min === right) c.x = s.x + s.w + r;
      else if (min === top) c.y = s.y - r;
      else c.y = s.y + s.h + r;
    }
  }
}

function moveChef(state, dt, input) {
  const c = state.chef;
  let vx = 0;
  let vy = 0;
  const mv = input.moveVector();
  if (mv.x !== 0 || mv.y !== 0) {
    vx = mv.x;
    vy = mv.y;
    c.target = null;
    c.pendingStation = null;
  } else if (c.target) {
    const dx = c.target.x - c.x;
    const dy = c.target.y - c.y;
    const d = Math.hypot(dx, dy);
    // Walking to a station: arrived once it is in interact range.
    const arrived = c.pendingStation
      ? (() => { const near = nearestStation(state); return near && near.station === c.pendingStation; })()
      : d < 6;
    if (arrived) {
      c.target = null;
      if (c.pendingStation) {
        useStation(state, c.pendingStation);
        c.pendingStation = null;
      }
    } else {
      vx = dx / d;
      vy = dy / d;
    }
  }
  c.moving = vx !== 0 || vy !== 0;
  if (c.moving) {
    c.x += vx * PLAYER.speed * dt;
    c.y += vy * PLAYER.speed * dt;
    c.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
  }
  collide(state);
}

// --- main step ------------------------------------------------------------

export function stepKitchen(state, dt, input) {
  if (state.phase !== PHASE_PLAY) return;
  state.time += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.time);
  if (state.bellT > 0) state.bellT -= dt;
  if (state.shakeT > 0) state.shakeT -= dt;
  for (const t of state.toasts) t.t -= dt;
  state.toasts = state.toasts.filter((t) => t.t > 0);
  for (const f of state.floats) {
    f.t -= dt;
    f.y -= 28 * dt;
  }
  state.floats = state.floats.filter((f) => f.t > 0);

  // Rush: the last stretch of the shift.
  state.rush = state.timeLeft <= RUSH_SECONDS;

  // Chopping finishes on its own.
  if (state.chop.item && state.chop.t > 0) {
    state.chop.t -= dt;
    if (state.chop.t <= 0) {
      state.chop.t = 0;
      sfx.chopped();
    }
  }

  // Grilling: raw to cooked, then a grace window, then burnt.
  for (let i = 0; i < state.grill.length; i += 1) {
    const slot = state.grill[i];
    if (!slot) continue;
    slot.t += dt;
    if (slot.state === 'cooking' && slot.t >= GRILL_SECONDS) {
      slot.state = 'cooked';
      slot.t = 0;
      sfx.grilled();
    } else if (slot.state === 'cooked' && slot.t >= BURN_SECONDS) {
      slot.state = 'burnt';
      slot.t = 0;
      toast(state, 'Patty burnt on the grill!', '#ff9a8a');
      sfx.reject();
    }
  }

  // Orders tick down; a spent order costs a star.
  for (const order of state.orders.slice()) {
    order.patience -= dt;
    if (order.patience <= 0) expireOrder(state, order);
  }
  if (state.phase !== PHASE_PLAY) return;

  // New orders arrive on a timer.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnOrder(state);
    state.spawnTimer = spawnInterval(state);
  }

  // Click to walk, click a station to walk there and use it.
  const click = input.takeClick();
  if (click) {
    const hit = stationAt(click.x, click.y);
    if (hit) {
      state.chef.target = { x: hit.x + hit.w / 2, y: hit.y + hit.h / 2 };
      state.chef.pendingStation = hit;
    } else {
      state.chef.target = { x: click.x, y: click.y };
      state.chef.pendingStation = null;
    }
  }

  // Keyboard interact.
  if (input.interactPressed()) {
    const near = nearestStation(state);
    if (near && near.action) useStation(state, near.station);
  }

  moveChef(state, dt, input);

  if (state.timeLeft <= 0) endShift(state, 'Shift complete. The kitchen closes.');
}

function stationAt(x, y) {
  const all = [...STATIONS.crates, STATIONS.grill, STATIONS.chop, STATIONS.counter, STATIONS.trash, STATIONS.pass];
  return all.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) || null;
}

function endShift(state, reason) {
  state.phase = PHASE_OVER;
  state.overReason = reason;
  state.timeLeft = 0;
}

export function ratingFor(state) {
  if (state.coins >= 160) return 'THREE STARS';
  if (state.coins >= 110) return 'TWO STARS';
  if (state.coins >= 60) return 'ONE STAR';
  return 'KEEP PRACTICING';
}

// Debug / playtest surface: a plain snapshot of the live state.
export function debugState(state) {
  return {
    phase: state.phase,
    timeLeft: Math.round(state.timeLeft),
    coins: state.coins,
    combo: state.combo,
    served: state.served,
    lost: state.lost,
    stars: state.stars,
    orders: state.orders.map((o) => ({ dish: o.dishId, patience: Math.round(o.patience), ready: o.ready })),
    carrying: state.carrying,
    chef: { x: Math.round(state.chef.x), y: Math.round(state.chef.y) },
    grill: state.grill.map((s) => (s ? s.state : null)),
    chop: state.chop.item ? state.chop.item.id : null,
    plates: state.plates.map((p) => (p ? p.items : null)),
  };
}
