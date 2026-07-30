// state.js — central state object + localStorage load/save.
// Owns all control values (scene, lighting, color, canvas) plus the numeric
// seed, and persists UI theme, tips toggle, and last-used control values
// (CONTEXT.md section 7). localStorage is the only persistence mechanism.
//
// Phase 3 scope: scene and canvas values, plus the single regenerate() entry
// point every control binding calls. load/save are still stubs — full
// persistence is Phase 6. (theme.js persists the UI theme on its own.)

import { getArchetype } from './archetypes/index.js';
import { computeLighting, suggestedAngle } from './lighting.js';
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
  // Detail resolution only — octaves and sampling density (CONTEXT.md s5).
  complexity: 0.5,
  // Feature count. Each archetype maps it to its own integer range.
  peakCount: 0.5,
  // Terrain profile: 0 rounded hills, 1 sharp ridgelines.
  sharpness: 0.5,
  aspect: '16:9',
  width: aspectWidth('16:9'),
  height: CANVAS_HEIGHT,
  palette: 'alpine-dusk',

  // Lighting (CONTEXT.md section 5). The default hour is the dusk the palette
  // was built around, so this phase doesn't change the scene you already had.
  hour: 18.5,
  shadow: false,
  // Seeded from the default hour once, then independently user-controlled —
  // it is not a live binding to time of day (CONTEXT.md section 6).
  lightAngle: suggestedAngle(18.5),
  shadowIntensity: 0.5,
};

let renderer = null;
let lastGeometry = null;

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

// The single entry point every control binding calls.
//
// `reseed: 'incidental'` — a side effect of changing some other control. The
// lock exists precisely to suppress this.
// `reseed: 'explicit'` — the user asked for a new seed (Randomize, New View).
// The lock does not apply: a control whose whole purpose is to change the seed
// shouldn't be silently disabled by it (CONTEXT.md section 5).
export function regenerate({ reseed = 'none' } = {}) {
  if (reseed === 'explicit' || (reseed === 'incidental' && !state.seedLocked)) {
    state.seed = randomSeed();
  }

  const archetype = getArchetype(state.archetype);
  lastGeometry = archetype.module.generate({
    seed: state.seed,
    elevation: state.elevation,
    complexity: state.complexity,
    peakCount: state.peakCount,
    sharpness: state.sharpness,
    width: state.width,
    height: state.height,
  });

  paint(archetype);
  return lastGeometry;
}

// Lighting changes never touch geometry, and are not in the list of controls
// the seed lock guards against (CONTEXT.md section 5) — so they repaint the
// existing scene rather than regenerating it.
export function repaint() {
  if (!lastGeometry) return regenerate();
  paint(getArchetype(state.archetype));
  return lastGeometry;
}

function paint(archetype) {
  const lighting = computeLighting({
    hour: state.hour,
    seed: state.seed,
    width: lastGeometry.width,
    height: lastGeometry.height,
    horizonY: lastGeometry.horizonY,
  });

  renderer?.(
    lastGeometry,
    {
      palette: createPalette(state.palette),
      lighting,
      shadow: {
        enabled: state.shadow,
        angle: state.lightAngle,
        intensity: state.shadowIntensity,
      },
    },
    archetype,
  );
}

// The control values worth exporting (CONTEXT.md section 8). Derived fields
// such as width are omitted — they follow from `aspect`.
export function exportSettings() {
  return {
    app: 'svg-landscape',
    archetype: state.archetype,
    seed: state.seed,
    complexity: state.complexity,
    peakCount: state.peakCount,
    sharpness: state.sharpness,
    elevation: state.elevation,
    aspect: state.aspect,
  };
}

export function loadState() {
  // Phase 6 — restore last-used control values from localStorage.
}

export function saveState() {
  // Phase 6 — persist last-used control values to localStorage.
}
