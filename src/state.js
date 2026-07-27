// state.js — central state object + localStorage load/save.
// Owns all control values (scene, lighting, color, canvas) plus the numeric
// seed, and persists UI theme, tips toggle, and last-used control values
// (CONTEXT.md section 7). localStorage is the only persistence mechanism.
//
// Phase 2 scope: the handful of values the Open Valley pipeline needs.
// load/save are stubs — full persistence is Phase 6. (theme.js persists the UI
// theme on its own already, since the toggle has to survive a reload to be
// testable.)

export const state = {
  // Hardcoded this phase; the Landscape type dropdown lands in Phase 3.
  archetype: 'open-valley',
  seed: randomSeed(),
  palette: 'alpine-dusk',
  complexity: 0.5,
  // Global, per CONTEXT.md section 6a. Open Valley accepts but ignores it.
  elevation: 0.5,
  // Fixed 16:9 this phase; the Aspect ratio dropdown lands in Phase 3/4.
  width: 1600,
  height: 900,
};

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

export function newSeed() {
  state.seed = randomSeed();
  return state.seed;
}

export function loadState() {
  // Phase 6 — restore last-used control values from localStorage.
}

export function saveState() {
  // Phase 6 — persist last-used control values to localStorage.
}
