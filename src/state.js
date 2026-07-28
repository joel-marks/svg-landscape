// state.js — central state object + localStorage load/save.
// Owns all control values (scene, lighting, color, canvas) plus the numeric
// seed, and persists UI theme, tips toggle, and last-used control values
// (CONTEXT.md section 7). localStorage is the only persistence mechanism.
//
// Phase 3 scope: scene and canvas values, plus the single regenerate() entry
// point every control binding calls. load/save are still stubs — full
// persistence is Phase 6. (theme.js persists the UI theme on its own.)

import { getArchetype } from './archetypes/index.js';
import { createPalette } from './palette.js';

// Height is fixed; the aspect ratio drives width (CONTEXT.md section 5).
export const CANVAS_HEIGHT = 900;

export const ASPECTS = [
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
  { key: 'cine', label: 'Cine 2.39:1', ratio: 2.39 },
  { key: 'xpan', label: 'X-Pan 2.71:1', ratio: 2.71 },
  { key: 'linkedin', label: 'LinkedIn 4:1', ratio: 4 },
];

export function aspectWidth(key) {
  const aspect = ASPECTS.find((a) => a.key === key) ?? ASPECTS[1];
  return Math.round(CANVAS_HEIGHT * aspect.ratio);
}

export const state = {
  archetype: 'open-valley',
  seed: randomSeed(),
  // While locked, no control change and no action draws a new seed.
  seedLocked: false,
  elevation: 0.5,
  complexity: 0.5,
  aspect: '16:9',
  width: aspectWidth('16:9'),
  height: CANVAS_HEIGHT,
  palette: 'alpine-dusk',
};

let renderer = null;

// main.js registers the paint step, keeping state.js free of DOM concerns.
export function setRenderer(fn) {
  renderer = fn;
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

export function setAspect(key) {
  state.aspect = key;
  state.width = aspectWidth(key);
  return state.width;
}

// The single entry point every Tweakpane binding calls. `reseed` asks for a new
// view; the seed lock overrides it.
export function regenerate({ reseed = false } = {}) {
  if (reseed && !state.seedLocked) state.seed = randomSeed();

  const archetype = getArchetype(state.archetype);
  const geometry = archetype.module.generate({
    seed: state.seed,
    elevation: state.elevation,
    complexity: state.complexity,
    width: state.width,
    height: state.height,
  });

  renderer?.(geometry, createPalette(state.palette), archetype);
  return geometry;
}

export function loadState() {
  // Phase 6 — restore last-used control values from localStorage.
}

export function saveState() {
  // Phase 6 — persist last-used control values to localStorage.
}
