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
import { createPalette, CUSTOM_THEME_ID, generatePalette, themes } from './palette.js';
import { CUSTOM_PRESET_ID, presetId, presets } from './presets.js';
import { normalizeAngle, responseCurve } from './utils.js';

// Non-linear slider response (CONTEXT.md section 6b). The shared utility, given
// the two curve shapes its callers need — the sliders themselves stay linear
// 0–1 and these map position to the rendered value.
//
// Shadow intensity: the visually useful range was bunched into roughly the
// first quarter of the old linear travel, so a mild exponent spreads that
// quarter across about half the slider (position 0.5 now renders ~0.22).
// Valley mist: deliberately much steeper, so the effect stays near-invisible
// until the last third (position 0.5 renders ~0.09, 0.8 renders ~0.44).
const SHADOW_INTENSITY_RESPONSE = responseCurve(2.2);
const VALLEY_MIST_RESPONSE = responseCurve(3.2);

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
  // On by default (Phase 5.12): tweaking Scene/Canvas controls is nearly always
  // an attempt to refine the layout in front of you, so incidental reseeding is
  // the surprising behaviour, not the useful one. New View is unaffected — it
  // reseeds explicitly and the lock never applies to it.
  seedLocked: true,
  elevation: 0.5,
  // Detail resolution only — octaves and sampling density (CONTEXT.md s5).
  complexity: 0.5,
  // Feature count. Each archetype maps it to its own integer range.
  peakCount: 0.5,
  // Terrain profile: 0 rounded hills, 1 sharp ridgelines.
  sharpness: 0.5,
  aspect: 'cine',
  width: aspectWidth('cine'),
  height: CANVAS_HEIGHT,

  // Color (CONTEXT.md section 5). `palette` is a curated theme id, or
  // CUSTOM_THEME_ID when the user has randomized — in which case the generated
  // triple lives in `customPalette`. Keeping it on state rather than
  // regenerating per paint is what stops a randomized palette from being lost
  // the moment some other control triggers a repaint.
  palette: 'alpine-dusk',
  customPalette: null,
  // 0.5 is the theme exactly as authored; 0 flattens every layer onto its
  // midpoint, 1 spreads them toward the ramp's extremes (see palette.js).
  colorDepth: 0.5,
  haze: 0.5,
  // Slider position, not the rendered strength — VALLEY_MIST_RESPONSE maps it.
  // 0 by default so no existing scene changes appearance.
  valleyMist: 0,
  // How hard Valley mist grades with distance (CONTEXT.md section 5). Linear,
  // deliberately not on a response curve: 0 mists every eligible layer equally,
  // 1 grades them fully from near to far. Inert while valleyMist is 0.
  mistDistance: 0.5,

  // Lighting (CONTEXT.md section 5). The default hour is the dusk the palette
  // was built around, so this phase doesn't change the scene you already had.
  hour: 18.5,
  // Visibility of the drawn bodies and the star field only. Time of day still
  // drives sky, mist and star *opacity* underneath either switch.
  showBodies: true,
  showStars: true,
  shadow: false,
  // Seeded from the default hour once, then independently user-controlled —
  // it is not a live binding to time of day unless the tidelock below is on
  // (CONTEXT.md section 6).
  lightAngle: suggestedAngle(18.5),
  // "Lock angle to time of day". `angleOffset` is the phase captured when the
  // lock is engaged; while locked the angle is recomputed from it rather than
  // stored independently.
  lockAngle: false,
  angleOffset: 0,
  // Slider position — SHADOW_INTENSITY_RESPONSE maps it to the rendered value.
  shadowIntensity: 0.5,

  // Presets (CONTEXT.md section 5). Neither of these is a scene parameter:
  // `preset` is derived — currentPresetId() recomputes it after every change —
  // and `presetName` is a label the user types for an export.
  preset: CUSTOM_PRESET_ID,
  presetName: '',
};

// The control values a settings object carries — audited against CONTEXT.md
// section 5 control by control in Phase 5.12, after the list had twice drifted
// behind the panel. One list drives the export, the preset loader and the
// preset match test, so the three cannot disagree; exportSettings() below is
// generated from it rather than hand-written, which is how the last drift got
// in. Adding a control to the panel means adding its key here.
//
// Absent by design, not by omission:
// - `width`, and the lighting values computed per paint — derived, not controls.
//   Width follows from `aspect`; applySettings recomputes it.
// - `seedLocked` — a guard on how the seed changes, not a property of the scene
//   it produces. A preset carries the seed itself, so the lock is irrelevant to
//   reproducing it.
// - `angleOffset` — the tidelock's captured phase. Recoverable from `lightAngle`
//   and `hour` on load (see applySettings), so it stays out of the file.
// - `preset` / `presetName` — the dropdown's derived position and an export
//   label; neither is a scene parameter.
const SETTINGS_KEYS = [
  // Scene
  'archetype',
  'seed',
  'complexity',
  'peakCount',
  'sharpness',
  'elevation',
  // Canvas
  'aspect',
  // Lighting — added Phase 5.12; every one of these was missing before it.
  'hour',
  'showBodies',
  'showStars',
  'shadow',
  // The current *derived* angle: under the tidelock this is the tracked value
  // actually driving the render, not the last one the slider was dragged to.
  'lightAngle',
  'lockAngle',
  'shadowIntensity',
  // Color
  'palette',
  'customPalette',
  'colorDepth',
  'haze',
  'valleyMist',
  'mistDistance',
];

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
// `reseed: 'explicit'` — the user asked for a new seed (New View, the only
// action that does). The lock does not apply: a control whose whole purpose is
// to change the seed shouldn't be silently disabled by it (CONTEXT.md s5).
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
      palette: createPalette(activeTheme(), { colorDepth: state.colorDepth }),
      lighting,
      haze: state.haze,
      valleyMist: VALLEY_MIST_RESPONSE(state.valleyMist),
      mistDistance: state.mistDistance,
      showBodies: state.showBodies,
      showStars: state.showStars,
      shadow: {
        enabled: state.shadow,
        angle: state.lightAngle,
        intensity: SHADOW_INTENSITY_RESPONSE(state.shadowIntensity),
      },
    },
    archetype,
  );
}

// Draws a fresh algorithmic palette and switches the scene onto it
// (CONTEXT.md section 5's "Randomize palette"). Independent of the scene seed:
// the palette is a colour choice, not part of the geometry that seed reproduces.
export function randomizePalette() {
  state.customPalette = generatePalette();
  state.palette = CUSTOM_THEME_ID;
  repaint();
  return state.customPalette;
}

// Steps through the *curated* list only — "Randomized" is not part of the
// cycle (CONTEXT.md section 5). Starting from a randomized palette there is no
// current index to step from, so the cycle is entered at whichever end the
// direction implies: forward lands on the first theme, back on the last.
export function stepTheme(direction) {
  const current = themes.findIndex((theme) => theme.id === state.palette);
  const next =
    current === -1
      ? (direction > 0 ? 0 : themes.length - 1)
      : (current + direction + themes.length) % themes.length;

  state.palette = themes[next].id;
  repaint();
  return themes[next];
}

// --- light-angle tidelock (CONTEXT.md section 6) -----------------------------

// Engaging the lock captures the *offset* between where the light currently is
// and where time of day says the sun or moon is. That phase is what stays
// fixed afterwards, so locking never jumps the scene at the moment it is
// switched on — it only constrains what happens next.
export function captureAngleOffset() {
  state.angleOffset = normalizeAngle(state.lightAngle - suggestedAngle(state.hour));
}

// Called whenever the hour moves. Returns whether it changed the angle, so the
// caller knows if the panel needs refreshing to show the new value.
export function syncLockedAngle() {
  if (!state.lockAngle) return false;
  state.lightAngle = normalizeAngle(suggestedAngle(state.hour) + state.angleOffset);
  return true;
}

// The custom slot is filled lazily, so selecting "Randomized" from the dropdown
// works as a first action rather than silently falling back to a curated theme.
function activeTheme() {
  if (state.palette !== CUSTOM_THEME_ID) return state.palette;
  state.customPalette ??= generatePalette();
  return state.customPalette;
}

// The control values worth exporting (CONTEXT.md section 8), in the shape a
// curated preset's `settings` also takes.
export function exportSettings() {
  const name = state.presetName.trim();

  const settings = {
    app: 'svg-landscape',
    // Optional and free text. Omitted entirely when blank rather than written
    // as an empty string, so an unnamed export is byte-for-byte what it was
    // before the field existed.
    ...(name ? { presetName: name } : {}),
  };

  // Copied wholesale off SETTINGS_KEYS rather than listed again here. The one
  // conditional key is customPalette: a generated palette isn't recoverable
  // from its id so the triple has to travel with the export, but writing it
  // alongside a curated theme id would put a value in the file that nothing
  // reads and that the preset matcher would then have to ignore.
  for (const key of SETTINGS_KEYS) {
    if (key === 'customPalette' && !exportsCustomPalette()) continue;
    settings[key] = state[key];
  }

  return settings;
}

function exportsCustomPalette() {
  return state.palette === CUSTOM_THEME_ID && Boolean(state.customPalette);
}

// --- presets (CONTEXT.md section 5) -----------------------------------------

// Loads a settings object — a curated preset's, shaped like an export — into
// state and redraws. `reseed` is left at 'none': the settings carry their own
// seed, and drawing a new one would mean a preset never reproduced its scene.
export function applySettings(settings) {
  for (const key of SETTINGS_KEYS) {
    if (settings[key] === undefined) continue;
    state[key] = settings[key];
  }

  // Width is derived, so it has to be recomputed rather than restored.
  setAspect(state.aspect);

  // The tidelock's phase offset is likewise derived: the file carries the
  // angle that was actually driving the render plus the boolean, and the offset
  // that reconciles them with the restored hour falls out of the two. Capturing
  // it here is what makes tracking resume from the loaded position instead of
  // whatever phase the previous scene happened to be locked at.
  if (state.lockAngle) captureAngleOffset();

  return regenerate();
}

// Which preset, if any, the live scene currently is. Called after every change,
// which is what makes the dropdown fall back to Custom the moment a control
// moves after a preset was loaded — no separate "dirty" flag to keep honest.
//
// `presetName` is deliberately not part of the comparison: it labels an export,
// it isn't a parameter of the scene.
export function currentPresetId() {
  const current = exportSettings();
  const match = presets.find((preset) => sameSettings(current, preset.settings));
  return match ? presetId(match) : CUSTOM_PRESET_ID;
}

function sameSettings(a, b) {
  return SETTINGS_KEYS.every((key) => sameValue(a[key], b[key]));
}

// customPalette is the one array-valued setting, so equality has to reach one
// level in rather than comparing references.
function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => value === b[index])
    );
  }
  return a === b;
}

export function loadState() {
  // Phase 6 — restore last-used control values from localStorage.
}

export function saveState() {
  // Phase 6 — persist last-used control values to localStorage.
}
