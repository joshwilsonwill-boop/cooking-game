// Sizzle Station rendering: every pixel the game shows is drawn here with
// canvas paths. No images, no fonts loaded from anywhere, only system fonts.
// The world (kitchen floor and stations) draws under a camera transform so a
// screenshot can zoom in; the HUD and order board always draw in screen space.

import {
  BOARD, BURN_SECONDS, CHOP_SECONDS, FLOOR, GRILL_SECONDS, GRILL_SLOTS, HUD, INGREDIENTS, MENU, PLATE_SLOTS, STATIONS,
  VIEW,
} from './config.js';
import { PHASE_OVER, PHASE_TITLE } from './kitchen.js';

const FONT = 'Arial, Helvetica, sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function text(ctx, s, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// --- food, drawn procedurally --------------------------------------------

export function drawIngredient(ctx, id, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (id === 'bun') {
    ctx.fillStyle = '#b97f3e';
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b06a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 13, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff2cf';
    for (const [sx, sy] of [[-9, -6], [0, -10], [9, -6], [-4, -3], [5, -3]]) {
      ctx.beginPath();
      ctx.ellipse(sx, sy, 2.2, 1.4, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'tomato') {
    ctx.fillStyle = '#a92c22';
    circle(ctx, 0, 0, 17);
    ctx.fill();
    ctx.fillStyle = '#e2483d';
    circle(ctx, 0, 0, 14);
    ctx.fill();
    ctx.strokeStyle = '#ff8a7a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd9d4';
    circle(ctx, -3, -3, 3);
    ctx.fill();
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#4d8a2a';
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.bezierCurveTo(-14, -14, -4, -16, 0, -6);
    ctx.bezierCurveTo(4, -16, 14, -14, 18, 4);
    ctx.bezierCurveTo(10, 12, -10, 12, -18, 4);
    ctx.fill();
    ctx.strokeStyle = '#8fd45e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 8);
    ctx.stroke();
  } else if (id === 'cheese') {
    ctx.fillStyle = '#d9a41f';
    ctx.beginPath();
    ctx.moveTo(-18, 12);
    ctx.lineTo(18, 12);
    ctx.lineTo(0, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.beginPath();
    ctx.moveTo(-15, 10);
    ctx.lineTo(15, 10);
    ctx.lineTo(0, -11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9a41f';
    for (const [hx, hy] of [[-6, 4], [4, 2], [0, 7]]) {
      circle(ctx, hx, hy, 2.4);
      ctx.fill();
    }
  } else if (id === 'onion') {
    ctx.strokeStyle = '#b9a3c4';
    ctx.lineWidth = 4;
    for (const r of [15, 10, 5]) {
      circle(ctx, 0, 0, r);
      ctx.stroke();
    }
    ctx.strokeStyle = '#efe6f2';
    ctx.lineWidth = 2.5;
    for (const r of [12.5, 7.5]) {
      circle(ctx, 0, 0, r);
      ctx.stroke();
    }
  } else if (id === 'patty') {
    ctx.fillStyle = '#7a4a28';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a5663a';
    ctx.beginPath();
    ctx.ellipse(0, -2, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5d3418';
    ctx.lineWidth = 2.5;
    for (const gx of [-9, 0, 9]) {
      ctx.beginPath();
      ctx.moveTo(gx - 4, -8);
      ctx.lineTo(gx + 4, 6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBurntPatty(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(6, 5);
  ctx.moveTo(8, -6);
  ctx.lineTo(-4, 6);
  ctx.stroke();
  ctx.restore();
}

function drawPlate(ctx, x, y, items, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#d8d8d8';
  ctx.beginPath();
  ctx.ellipse(0, 2, 46, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9c9c9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Stack the dish so the top ingredient reads at a glance.
  const n = items.length;
  items.forEach((id, i) => {
    const oy = -6 - (n - 1 - i) * 5;
    drawIngredient(ctx, id, 0, oy, 0.85);
  });
  ctx.restore();
}

// --- stations --------------------------------------------------------------

function drawCrates(ctx, state, highlight) {
  for (const crate of STATIONS.crates) {
    const ing = INGREDIENTS[crate.id];
    const hot = highlight && highlight.station === crate;
    ctx.fillStyle = hot ? '#8a5a2e' : '#6b4423';
    rr(ctx, crate.x, crate.y, crate.w, crate.h, 8);
    ctx.fill();
    ctx.fillStyle = '#8a5a2e';
    rr(ctx, crate.x + 4, crate.y + 4, crate.w - 8, crate.h - 8, 6);
    ctx.fill();
    drawIngredient(ctx, crate.id, crate.x + 34, crate.y + crate.h / 2, 0.95);
    text(ctx, ing.name, crate.x + 62, crate.y + 26, 17, '#fff');
    text(ctx, ing.prep === 'chop' ? 'chop first' : ing.prep === 'grill' ? 'grill first' : 'ready', crate.x + 62, crate.y + 50, 11, '#ffd9a0', 'normal');
    if (hot) {
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 3;
      rr(ctx, crate.x - 2, crate.y - 2, crate.w + 4, crate.h + 4, 10);
      ctx.stroke();
    }
  }
}

function drawGrill(ctx, state, highlight) {
  const g = STATIONS.grill;
  const hot = highlight && highlight.station === g;
  ctx.fillStyle = '#3a3f46';
  rr(ctx, g.x, g.y, g.w, g.h, 8);
  ctx.fill();
  ctx.fillStyle = '#23262b';
  rr(ctx, g.x + 6, g.y + 6, g.w - 12, g.h - 12, 6);
  ctx.fill();
  ctx.strokeStyle = '#565d66';
  ctx.lineWidth = 3;
  for (let i = 1; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(g.x + 8 + i * 24, g.y + 10);
    ctx.lineTo(g.x + 8 + i * 24, g.y + g.h - 10);
    ctx.stroke();
  }
  text(ctx, 'GRILL', g.x + g.w / 2, g.y + g.h - 12, 12, '#ffb37a', 'bold', 'center');
  state.grill.forEach((slot, i) => {
    const s = GRILL_SLOTS[i];
    if (!slot) return;
    if (slot.state === 'burnt') {
      drawBurntPatty(ctx, s.x + s.w / 2, s.y + 30, 0.9);
    } else {
      // Flame glow while cooking, golden when done.
      if (slot.state === 'cooking') {
        ctx.fillStyle = 'rgba(255, 120, 40, 0.35)';
        circle(ctx, s.x + s.w / 2, s.y + 34, 24 + Math.sin(state.time * 9 + i) * 3);
        ctx.fill();
      }
      drawIngredient(ctx, 'patty', s.x + s.w / 2, s.y + 32, 0.9);
      if (slot.state === 'cooked') {
        ctx.fillStyle = '#8dff6e';
        circle(ctx, s.x + s.w - 6, s.y + 8, 9);
        ctx.fill();
        text(ctx, '✓', s.x + s.w - 6, s.y + 9, 12, '#12330a', 'bold', 'center');
      }
    }
    // Progress ring for cooking, countdown for the burn window.
    const frac = slot.state === 'cooking'
      ? Math.min(1, slot.t / GRILL_SECONDS)
      : slot.state === 'cooked' ? 1 - Math.min(1, slot.t / BURN_SECONDS) : 1;
    ctx.strokeStyle = slot.state === 'burnt' ? '#666' : slot.state === 'cooked' ? '#ff5a3c' : '#ffd94d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(s.x + s.w / 2, s.y + 32, 26, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  });
  if (hot) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    rr(ctx, g.x - 2, g.y - 2, g.w + 4, g.h + 4, 10);
    ctx.stroke();
  }
}

function drawChopBoard(ctx, state, highlight) {
  const c = STATIONS.chop;
  const hot = highlight && highlight.station === c;
  ctx.fillStyle = '#a8763e';
  rr(ctx, c.x, c.y, c.w, c.h, 8);
  ctx.fill();
  ctx.fillStyle = '#d9a860';
  rr(ctx, c.x + 8, c.y + 8, c.w - 16, c.h - 28, 6);
  ctx.fill();
  text(ctx, 'CHOP BOARD', c.x + c.w / 2, c.y + c.h - 10, 12, '#5d3418', 'bold', 'center');
  if (state.chop.item) {
    const done = state.chop.t <= 0;
    drawIngredient(ctx, state.chop.item.id, c.x + c.w / 2 - 14, c.y + 38, 0.9);
    if (!done) {
      // Knife mid-chop and a progress bar.
      ctx.save();
      ctx.translate(c.x + c.w / 2 + 22, c.y + 30);
      ctx.rotate(-0.5 + Math.sin(state.time * 14) * 0.18);
      ctx.fillStyle = '#cfd6dd';
      ctx.fillRect(-2, -22, 5, 26);
      ctx.fillStyle = '#3a3f46';
      ctx.fillRect(-2, 4, 5, 12);
      ctx.restore();
      const frac = 1 - state.chop.t / CHOP_SECONDS;
      ctx.fillStyle = '#5d3418';
      rr(ctx, c.x + 16, c.y + 58, c.w - 32, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#ffd94d';
      rr(ctx, c.x + 16, c.y + 58, (c.w - 32) * frac, 8, 4);
      ctx.fill();
    } else {
      text(ctx, 'READY', c.x + c.w / 2 + 26, c.y + 38, 12, '#2f6b1a', 'bold', 'center');
    }
  }
  if (hot) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    rr(ctx, c.x - 2, c.y - 2, c.w + 4, c.h + 4, 10);
    ctx.stroke();
  }
}

function drawCounter(ctx, state, highlight) {
  const c = STATIONS.counter;
  const hot = highlight && highlight.station === c;
  ctx.fillStyle = '#7a4a28';
  rr(ctx, c.x, c.y, c.w, c.h, 10);
  ctx.fill();
  ctx.fillStyle = '#a5663a';
  rr(ctx, c.x + 5, c.y + 5, c.w - 10, c.h - 10, 8);
  ctx.fill();
  text(ctx, 'PLATING COUNTER', c.x + c.w / 2, c.y + 14, 12, '#ffe1b8', 'bold', 'center');
  PLATE_SLOTS.forEach((slot, i) => {
    ctx.strokeStyle = 'rgba(255, 225, 184, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.ellipse(slot.x + slot.w / 2, slot.y + slot.h / 2 + 6, 52, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const plate = state.plates[i];
    if (plate) drawPlate(ctx, slot.x + slot.w / 2, slot.y + slot.h / 2 + 4, plate.items, 1);
  });
  if (hot) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    rr(ctx, c.x - 2, c.y - 2, c.w + 4, c.h + 4, 12);
    ctx.stroke();
  }
}

function drawPlatesStack(ctx, state, highlight) {
  const p = STATIONS.plates;
  const hot = highlight && highlight.station === p;
  ctx.fillStyle = '#6b4423';
  rr(ctx, p.x, p.y, p.w, p.h, 8);
  ctx.fill();
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = i === 3 ? '#ffffff' : '#e8e8e8';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + 58 - i * 9, 40, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, 'PLATES', p.x + p.w / 2, p.y + 14, 12, '#ffe1b8', 'bold', 'center');
  if (hot) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    rr(ctx, p.x - 2, p.y - 2, p.w + 4, p.h + 4, 10);
    ctx.stroke();
  }
}

function drawTrash(ctx, state, highlight) {
  const t = STATIONS.trash;
  const hot = highlight && highlight.station === t;
  ctx.fillStyle = '#4a4f55';
  rr(ctx, t.x, t.y, t.w, t.h, 8);
  ctx.fill();
  ctx.fillStyle = '#33373c';
  rr(ctx, t.x + 14, t.y + 14, t.w - 28, t.h - 30, 6);
  ctx.fill();
  text(ctx, 'TRASH', t.x + t.w / 2, t.y + t.h - 10, 12, '#bbb', 'bold', 'center');
  if (hot) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    rr(ctx, t.x - 2, t.y - 2, t.w + 4, t.h + 4, 10);
    ctx.stroke();
  }
}

function drawPass(ctx, state, highlight) {
  const p = STATIONS.pass;
  const hot = highlight && highlight.station === p;
  ctx.fillStyle = '#2b2f36';
  rr(ctx, p.x, p.y, p.w, p.h, 8);
  ctx.fill();
  ctx.fillStyle = '#f7ead0';
  rr(ctx, p.x + 8, p.y + 6, p.w - 16, 20, 4);
  ctx.fill();
  text(ctx, 'SERVE  •  PASS WINDOW', p.x + p.w / 2, p.y + 16, 13, '#7a4a28', 'bold', 'center');
  // Service bell, ringing while a serve lands.
  const ring = state.bellT > 0 ? Math.sin(state.time * 30) * 0.25 : 0;
  ctx.save();
  ctx.translate(p.x + 26, p.y + 36);
  ctx.rotate(ring);
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.arc(0, 0, 9, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-9, 0, 18, 3);
  ctx.restore();
  text(ctx, 'Ring the bell, serve the dish', p.x + 52, p.y + 37, 12, '#ffd9a0', 'normal');
  if (hot) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    rr(ctx, p.x - 2, p.y - 2, p.w + 4, p.h + 4, 10);
    ctx.stroke();
  }
}

// --- chef ------------------------------------------------------------------

function drawChef(ctx, state) {
  const c = state.chef;
  const bob = c.moving ? Math.sin(state.time * 14) * 2 : 0;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body and apron.
  ctx.fillStyle = '#f2f2f2';
  rr(ctx, -15, -6, 30, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#e2574c';
  rr(ctx, -11, 2, 22, 18, 6);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c79b';
  circle(ctx, 0, -18, 12);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-7, -28, 7, 0, Math.PI * 2);
  ctx.arc(0, -31, 8, 0, Math.PI * 2);
  ctx.arc(7, -28, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-11, -30, 22, 6);
  // Eyes look the way the chef faces.
  const ex = c.dir === 'left' ? -3 : c.dir === 'right' ? 3 : 0;
  ctx.fillStyle = '#222';
  circle(ctx, -4 + ex, -18, 1.8);
  ctx.fill();
  circle(ctx, 4 + ex, -18, 1.8);
  ctx.fill();
  // Carried item floats above the hands.
  const carry = state.carrying;
  if (carry) {
    const cy = -52;
    if (carry.type === 'ingredient') {
      if (carry.prep === 'burnt') drawBurntPatty(ctx, 0, cy, 0.9);
      else drawIngredient(ctx, carry.id, 0, cy, 0.9);
      if (carry.prep === 'raw') {
        text(ctx, 'RAW', 0, cy - 26, 11, '#ff9a8a', 'bold', 'center');
      }
    } else {
      drawPlate(ctx, 0, cy, carry.items, 0.9);
    }
  }
  ctx.restore();
}

// --- HUD and order board ---------------------------------------------------

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function drawStar(ctx, x, y, r, filled) {
  ctx.fillStyle = filled ? '#ffd94d' : '#5a5348';
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#26211c';
  ctx.fillRect(0, 0, VIEW.width, HUD.height);
  text(ctx, 'SIZZLE STATION', 20, 26, 26, '#ffd94d');
  text(ctx, 'lunch service', 20, 48, 12, '#cbb89a', 'normal');
  // Shift timer, big in the middle.
  const low = state.timeLeft <= 30;
  const timerColor = low ? (Math.sin(state.time * 8) > 0 ? '#ff6b57' : '#ffffff') : '#ffffff';
  text(ctx, formatTime(state.timeLeft), VIEW.width / 2, 30, 34, timerColor, 'bold', 'center');
  text(ctx, state.rush ? 'DINNER RUSH' : 'SHIFT', VIEW.width / 2, 52, 11, state.rush ? '#ff6b57' : '#cbb89a', 'bold', 'center');
  // Coins, combo and reputation on the right.
  text(ctx, `$${state.coins}`, VIEW.width - 230, 30, 28, '#ffd94d', 'bold', 'right');
  if (state.combo >= 2) {
    text(ctx, `COMBO x${state.combo}`, VIEW.width - 230, 52, 13, '#8dff6e', 'bold', 'right');
  }
  for (let i = 0; i < 3; i += 1) {
    drawStar(ctx, VIEW.width - 190 + i * 30, 30, 12, i < state.stars);
  }
  text(ctx, 'reputation', VIEW.width - 160, 52, 11, '#cbb89a', 'normal', 'center');
}

function dishColor(dishId) {
  const colors = { sunny: '#e2574c', garden: '#7dc24a', cheesy: '#f7c948', crunch: '#5aa9e6', big: '#e2574c' };
  return colors[dishId] || '#e2574c';
}

function drawOrderBoard(ctx, state) {
  ctx.fillStyle = '#3a2f26';
  ctx.fillRect(0, BOARD.top, VIEW.width, BOARD.height);
  text(ctx, 'ORDER BOARD', 20, BOARD.top + 20, 14, '#ffd9a0');
  if (state.orders.length === 0) {
    text(ctx, 'No orders yet. The lunch crowd is coming...', 150, BOARD.top + 46, 16, '#cbb89a', 'normal');
    return;
  }
  state.orders.forEach((order, i) => {
    const dish = MENU.find((d) => d.id === order.dishId);
    const x = 16 + i * 308;
    const y = BOARD.top + 8;
    const w = 296;
    const h = BOARD.height - 16;
    const frac = Math.max(0, order.patience / order.maxPatience);
    const urgent = order.patience <= 10;
    ctx.save();
    if (order.ready) {
      ctx.shadowColor = '#8dff6e';
      ctx.shadowBlur = 18;
    } else if (urgent) {
      ctx.shadowColor = '#ff6b57';
      ctx.shadowBlur = 10 + Math.sin(state.time * 8) * 4;
    }
    ctx.fillStyle = '#fffaf0';
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = dishColor(dish.id);
    rr(ctx, x, y, w, 8, 4);
    ctx.fill();
    text(ctx, dish.name, x + 12, y + 24, 18, '#26211c');
    text(ctx, `$${dish.price}`, x + w - 12, y + 24, 18, '#b97f3e', 'bold', 'right');
    dish.recipe.forEach((id, j) => {
      drawIngredient(ctx, id, x + 26 + j * 42, y + 48, 0.62);
    });
    if (order.ready) {
      ctx.fillStyle = '#2f7a1e';
      rr(ctx, x + w - 86, y + 40, 74, 20, 10);
      ctx.fill();
      text(ctx, 'READY', x + w - 49, y + 51, 12, '#fff', 'bold', 'center');
    }
    // Patience bar.
    ctx.fillStyle = '#e5dcc8';
    rr(ctx, x + 12, y + h - 12, w - 24, 7, 3);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#7dc24a' : frac > 0.25 ? '#f7a948' : '#e2483d';
    rr(ctx, x + 12, y + h - 12, (w - 24) * frac, 7, 3);
    ctx.fill();
    text(ctx, `${Math.ceil(order.patience)}s`, x + w - 12, y + h - 22, 12, urgent ? '#e2483d' : '#7a6a55', 'bold', 'right');
  });
}

function drawToasts(ctx, state) {
  state.toasts.forEach((t, i) => {
    const alpha = Math.min(1, t.t / 0.6);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold 15px ${FONT}`;
    const tw = ctx.measureText(t.text).width + 28;
    ctx.fillStyle = 'rgba(38, 33, 28, 0.9)';
    rr(ctx, VIEW.width / 2 - tw / 2, 168 + i * 34, tw, 28, 14);
    ctx.fill();
    text(ctx, t.text, VIEW.width / 2, 183 + i * 34, 15, t.color, 'bold', 'center');
    ctx.restore();
  });
}

function drawFloats(ctx, state) {
  for (const f of state.floats) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.t / 0.5);
    text(ctx, f.text, f.x, f.y, 20, f.color, 'bold', 'center');
    ctx.restore();
  }
}

function drawActionHint(ctx, state, highlight) {
  if (!highlight || !highlight.action) return;
  const c = state.chef;
  ctx.save();
  ctx.font = `bold 15px ${FONT}`;
  const tw = ctx.measureText(`E  ${highlight.action}`).width + 24;
  const x = Math.max(8, Math.min(VIEW.width - tw - 8, c.x - tw / 2));
  // Above the chef's head, unless the chef is near the top of the kitchen,
  // where the pill would cover the pass window: then it goes below instead.
  const y = c.y < 300 ? c.y + 34 : c.y - 84;
  ctx.fillStyle = 'rgba(38, 33, 28, 0.92)';
  rr(ctx, x, y, tw, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  rr(ctx, x + 6, y + 5, 20, 20, 5);
  ctx.fill();
  text(ctx, 'E', x + 16, y + 16, 14, '#26211c', 'bold', 'center');
  text(ctx, highlight.action, x + 32, y + 16, 15, '#fff');
  ctx.restore();
}

// --- overlays --------------------------------------------------------------

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(20, 14, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'SIZZLE STATION', VIEW.width / 2, 150, 64, '#ffd94d', 'bold', 'center');
  text(ctx, 'A one-chef lunch rush. Take orders, chop, grill, plate, serve.', VIEW.width / 2, 205, 20, '#fff', 'normal', 'center');
  const lines = [
    'WASD or arrows to move  •  E or click a station to use it',
    'Grab ingredients from the crates on the left',
    'Chop tomato and onion on the chopping board, grill patties on the grill',
    'Plate dishes on the counter, then serve them at the pass window',
    'Serve fast for tips and combos. A lost order costs a reputation star.',
  ];
  lines.forEach((line, i) => {
    text(ctx, line, VIEW.width / 2, 268 + i * 32, 17, '#ffe1b8', 'normal', 'center');
  });
  text(ctx, 'ON THE MENU', VIEW.width / 2, 470, 16, '#ffd94d', 'bold', 'center');
  MENU.forEach((dish, i) => {
    const y = 500 + i * 26;
    text(ctx, `${dish.name}  $${dish.price}`, VIEW.width / 2 - 260, y, 16, '#fff', 'bold', 'left');
    dish.recipe.forEach((id, j) => {
      drawIngredient(ctx, id, VIEW.width / 2 + 30 + j * 40, y, 0.55);
    });
  });
  const pulse = 0.7 + Math.sin(state.time * 4) * 0.3;
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'Press ENTER or click to start the shift', VIEW.width / 2, 660, 22, '#8dff6e', 'bold', 'center');
  ctx.restore();
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(20, 14, 10, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#fffaf0';
  rr(ctx, VIEW.width / 2 - 320, 130, 640, 440, 16);
  ctx.fill();
  text(ctx, 'SHIFT OVER', VIEW.width / 2, 180, 40, '#26211c', 'bold', 'center');
  text(ctx, state.overReason, VIEW.width / 2, 222, 17, '#7a6a55', 'normal', 'center');
  text(ctx, `Coins earned   $${state.coins}`, VIEW.width / 2, 280, 24, '#b97f3e', 'bold', 'center');
  text(ctx, `Dishes served   ${state.served}`, VIEW.width / 2, 318, 20, '#26211c', 'normal', 'center');
  text(ctx, `Best combo   x${state.bestCombo}`, VIEW.width / 2, 350, 20, '#26211c', 'normal', 'center');
  text(ctx, `Orders lost   ${state.lost}`, VIEW.width / 2, 382, 20, '#26211c', 'normal', 'center');
  text(ctx, state.coins >= 60 ? `Rating: ${ratingText(state)}` : 'Rating: keep practicing', VIEW.width / 2, 430, 22, '#2f7a1e', 'bold', 'center');
  const pulse = 0.7 + Math.sin(state.time * 4) * 0.3;
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'Press R to cook another shift', VIEW.width / 2, 510, 20, '#e2574c', 'bold', 'center');
  ctx.restore();
}

function ratingText(state) {
  if (state.coins >= 160) return 'THREE STARS';
  if (state.coins >= 110) return 'TWO STARS';
  return 'ONE STAR';
}

// --- main render -----------------------------------------------------------

export function render(ctx, state, highlight, camera = null) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  ctx.save();
  if (camera) {
    ctx.translate(VIEW.width / 2, VIEW.height / 2);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.cx, -camera.cy);
  }
  if (state.shakeT > 0) {
    ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  }
  drawFloor(ctx);
  drawCrates(ctx, state, highlight);
  drawGrill(ctx, state, highlight);
  drawChopBoard(ctx, state, highlight);
  drawPlatesStack(ctx, state, highlight);
  drawCounter(ctx, state, highlight);
  drawTrash(ctx, state, highlight);
  drawPass(ctx, state, highlight);
  drawChef(ctx, state);
  drawFloats(ctx, state);
  ctx.restore();
  // Screen-space layers: HUD, order board, hints, overlays.
  drawHud(ctx, state);
  drawOrderBoard(ctx, state);
  if (state.phase === 'play') {
    drawToasts(ctx, state);
    drawActionHint(ctx, state, highlight);
  }
  if (state.phase === PHASE_TITLE) drawTitle(ctx, state);
  if (state.phase === PHASE_OVER) drawGameOver(ctx, state);
}

function drawFloor(ctx) {
  ctx.fillStyle = '#e8dcc3';
  ctx.fillRect(0, FLOOR.top, VIEW.width, VIEW.height - FLOOR.top);
  ctx.fillStyle = '#dfd2b4';
  for (let y = FLOOR.top; y < VIEW.height; y += 56) {
    for (let x = (Math.floor(y / 56) % 2) * 28; x < VIEW.width; x += 56) {
      ctx.fillRect(x, y, 54, 54);
    }
  }
  // Wall strip above the floor.
  ctx.fillStyle = '#c9b18a';
  ctx.fillRect(0, FLOOR.top - 6, VIEW.width, 6);
}
