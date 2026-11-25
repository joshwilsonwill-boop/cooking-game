// Sizzle Station: every constant the kitchen runs on. One place for the
// canvas size, the station layout, the ingredient list and the menu, so the
// rules and the renderer never disagree about where anything sits.

export const VIEW = { width: 1280, height: 720 };

export const HUD = { height: 60 };
export const BOARD = { top: 60, height: 92 };
export const FLOOR = { top: 152, bottom: 720, left: 0, right: 1280 };

export const SHIFT_SECONDS = 150;
export const RUSH_SECONDS = 45;
export const MAX_ORDERS = 4;
export const MAX_STARS = 3;

export const PLAYER = { radius: 20, speed: 265 };
export const INTERACT_RANGE = 82;

// Chopping and grilling times, in seconds.
export const CHOP_SECONDS = 2.5;
export const GRILL_SECONDS = 6;
export const BURN_SECONDS = 5;

// Ingredients. `prep` says what a raw grab needs before it can be plated:
// none (ready from the crate), chop (chopping board) or grill (grill).
export const INGREDIENTS = {
  bun: { id: 'bun', name: 'Bun', prep: 'none', color: '#e8b06a', dark: '#b97f3e' },
  tomato: { id: 'tomato', name: 'Tomato', prep: 'chop', color: '#e2483d', dark: '#a92c22' },
  lettuce: { id: 'lettuce', name: 'Lettuce', prep: 'none', color: '#7dc24a', dark: '#4d8a2a' },
  cheese: { id: 'cheese', name: 'Cheese', prep: 'none', color: '#f7c948', dark: '#d9a41f' },
  onion: { id: 'onion', name: 'Onion', prep: 'chop', color: '#efe6f2', dark: '#b9a3c4' },
  patty: { id: 'patty', name: 'Patty', prep: 'grill', color: '#c98a5e', dark: '#7a4a28' },
};

export const INGREDIENT_ORDER = ['bun', 'tomato', 'lettuce', 'cheese', 'onion', 'patty'];

// The menu. A dish is the exact set of processed ingredients on a plate.
export const MENU = [
  { id: 'sunny', name: 'Sunny Stack', price: 12, recipe: ['bun', 'patty', 'lettuce'] },
  { id: 'garden', name: 'Garden Melt', price: 11, recipe: ['bun', 'tomato', 'cheese', 'lettuce'] },
  { id: 'cheesy', name: 'Cheesy Stack', price: 13, recipe: ['bun', 'patty', 'cheese'] },
  { id: 'crunch', name: 'Crunch Garden', price: 12, recipe: ['bun', 'tomato', 'lettuce', 'onion'] },
  { id: 'big', name: 'Big Sizzle', price: 16, recipe: ['bun', 'patty', 'cheese', 'tomato', 'onion'] },
];

export function dishById(id) {
  return MENU.find((dish) => dish.id === id) || null;
}

// Station rectangles on the floor, in canvas pixels.
export const STATIONS = {
  crates: INGREDIENT_ORDER.map((id, i) => ({
    kind: 'crate',
    id,
    x: 8,
    y: 168 + i * 86,
    w: 132,
    h: 78,
  })),
  grill: { kind: 'grill', id: 'grill', x: 1140, y: 296, w: 132, h: 104 },
  chop: { kind: 'chop', id: 'chop', x: 1140, y: 428, w: 132, h: 92 },
  plates: { kind: 'plates', id: 'plates', x: 150, y: 622, w: 118, h: 78 },
  counter: { kind: 'counter', id: 'counter', x: 300, y: 622, w: 680, h: 78 },
  trash: { kind: 'trash', id: 'trash', x: 1012, y: 622, w: 108, h: 78 },
  pass: { kind: 'pass', id: 'pass', x: 1020, y: 152, w: 252, h: 48 },
};

// Two grill slots and two plate slots, as offsets inside their station rect.
export const GRILL_SLOTS = [
  { x: 1152, y: 312, w: 52, h: 72 },
  { x: 1210, y: 312, w: 52, h: 72 },
];
export const PLATE_SLOTS = [
  { x: 360, y: 636, w: 220, h: 52 },
  { x: 660, y: 636, w: 220, h: 52 },
];

export const SPAWN = { x: 640, y: 420 };
