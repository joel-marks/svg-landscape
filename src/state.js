// state.js — central state object + localStorage load/save.
// Owns all control values (scene, lighting, color, canvas) plus the numeric
// seed, and persists the tips toggle and last-used control values (CONTEXT.md
// section 7). localStorage is the only persistence mechanism. The UI theme is
// the one preference persisted elsewhere — theme.js has owned its own key
// since Phase 2 and keeps it.

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

  // Preferences (CONTEXT.md section 5). One-line captions under the folder
  // headings; on by default so a first-time visitor gets the explanation
  // without having to find the switch that turns it on.
  tips: true,
};

// The factory defaults Reset to defaults restores (CONTEXT.md section 5,
// Actions). Snapshotted from the literal above at module load, before anything
// — a restored localStorage blob included — has had a chance to write to it, so
// "default" here means the spec's value and not the last-used one.
//
// The seed is the deliberate exception: its factory value is a *fresh draw*
// (that is what a first-ever visitor gets), not whichever number this page load
// happened to start with, so resetToDefaults() redraws it rather than restoring
// the snapshot's.
const FACTORY_DEFAULTS = Object.freeze(structuredClone(state));

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

// The Scene sliders the two randomizing buttons redraw (CONTEXT.md section 5).
// Landscape type is deliberately not among them: rerolling that too would make
// them "surprise me" for the whole panel, and the archetype is the one Scene
// choice a user has usually already made on purpose.
const RANDOM_SCENE_KEYS = ['complexity', 'peakCount', 'sharpness', 'elevation'];

function rollSceneParams() {
  for (const key of RANDOM_SCENE_KEYS) {
    // Quantized to the sliders' own 0.01 step, so the value the panel shows is
    // exactly the value the render used.
    state[key] = Math.round(Math.random() * 100) / 100;
  }
}

// Random scene (CONTEXT.md section 5). The mirror image of New View, which keeps
// every parameter and changes only the seed — this is new parameters over the
// same seed.
//
// `reseed: 'none'`, so the seed lock has nothing to suppress here. The lock
// guards against *incidental* reseeding, and this never reseeds at all — leaving
// it out of the lock's remit rather than special-casing it.
export function randomizeScene() {
  rollSceneParams();
  return regenerate();
}

// Random all (Phase 6.7) — the third cell of Scene's button row, and literally
// the other two combined: the same parameter roll Random scene does, through the
// same explicit reseed New View asks for. One press, both effects; no third
// implementation of either half.
//
// `reseed: 'explicit'`, so the lock does not block it — same as New View, and
// for the same reason (CONTEXT.md section 5): a control whose stated purpose
// includes drawing a new seed shouldn't be silently disabled by the guard
// against *incidental* reseeding.
export function randomizeAll() {
  rollSceneParams();
  return regenerate({ reseed: 'explicit' });
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
  assignSettings(settings);
  return regenerate();
}

// The write half of applySettings, without the redraw. Split out for
// loadState(), which runs before the first render — there is no scene to
// regenerate at that point, and the render main.js triggers afterwards is the
// first one either way.
function assignSettings(settings) {
  for (const key of SETTINGS_KEYS) {
    if (settings[key] === undefined) continue;
    if (!plausible(key, settings[key])) continue;
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
}

// A coarse type guard, not a schema. localStorage and the preset files are both
// hand-editable, and a string where a number belongs would otherwise reach the
// generators as NaN geometry. Unknown *values* of the right type are already
// safe — getArchetype, getTheme and aspectWidth each fall back on their own —
// so matching the factory default's type is all this needs to catch.
function plausible(key, value) {
  const expected = FACTORY_DEFAULTS[key];
  // customPalette: null when curated, an array of colours when generated.
  if (expected === null) return value === null || Array.isArray(value);
  return typeof value === typeof expected;
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

// Numbers compare to a tolerance rather than exactly (Phase 6.5). Tweakpane's
// step constraint is `origin % step + round((value - origin) / step) * step`
// with origin fixed at the value the pane was *constructed* with, so a value
// written back through a slider that has since moved can land an ulp off what
// the preset file holds — 0.5 arriving as 0.49999999999999994. Under `===` that
// reads as a different scene and drops the dropdown to "Custom" immediately
// after loading the preset that set it.
//
// 1e-9 is far below the resolution of every control it guards (the finest step
// in the panel is 0.01) and far above the ulp being absorbed (~1e-16), so it
// can't merge two values a user could actually distinguish. It is safe for the
// seed too: seeds are integers, so the nearest distinct pair differs by 1.
const EPSILON = 1e-9;

// customPalette is the one array-valued setting, so equality has to reach one
// level in rather than comparing references.
function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => sameValue(value, b[index]))
    );
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= EPSILON;
  }
  return a === b;
}

// --- persistence (CONTEXT.md section 7) --------------------------------------

const STORAGE_KEY = 'svg-landscape:state';

// Panel values a returning visitor expects to find as they left them, but which
// are deliberately not scene parameters and so are not in SETTINGS_KEYS: the
// seed lock is a guard on how the seed changes, `presetName` labels an export,
// and `tips` is a preference. The saved blob is therefore a *superset* of a
// settings export, not a second format — everything in it that a preset file
// also carries sits under the same key, in the same shape.
const EXTRA_PERSISTED_KEYS = ['seedLocked', 'presetName', 'tips'];

// Called on every control change, from the same refresh() the panel already
// runs after one (see controls.js) — so "saved" and "what the panel is showing"
// can't come apart. Storage being unavailable (private mode, blocked) costs the
// restore, not the session, so it fails quietly.
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState()));
  } catch {
    // Nothing to do — the app runs unpersisted for this session.
  }
}

// Restores the last-used state, seed included, before the first render. Returns
// whether anything was restored; false is a first-ever visit, where the factory
// defaults the state literal already holds are exactly what should render.
export function loadState() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    // Unreadable or corrupt: fall through to factory defaults rather than
    // leaving the app on a blank canvas.
    saved = null;
  }

  if (!saved || typeof saved !== 'object') return false;

  assignSettings(saved);

  for (const key of EXTRA_PERSISTED_KEYS) {
    if (saved[key] === undefined) continue;
    if (!plausible(key, saved[key])) continue;
    state[key] = saved[key];
  }

  return true;
}

function persistedState() {
  const saved = exportSettings();
  for (const key of EXTRA_PERSISTED_KEYS) saved[key] = state[key];
  return saved;
}

// Preferences are about the interface, not the artwork, so Reset — a button on
// the Actions tab — leaves them where the user put them. The UI theme is
// excluded by construction (theme.js owns it, not this object); `tips` has to
// be excluded explicitly, because resetting one Preference and not the other
// would be the incoherent outcome. Reset means "reset the scene and the panel
// that builds it", not "undo my interface settings".
const RESET_EXEMPT = new Set(['tips']);

// Reset to defaults (CONTEXT.md section 5, Actions tab 1). Restores the spec's
// values, *not* the last-used ones — which is the whole point of the control,
// and why it reads from the FACTORY_DEFAULTS snapshot rather than from storage.
//
// It does not save: the caller refreshes the panel afterwards like any other
// change, and that is what persists it, through the one save path rather than a
// second one that could drift.
export function resetToDefaults() {
  for (const [key, value] of Object.entries(FACTORY_DEFAULTS)) {
    if (RESET_EXEMPT.has(key)) continue;
    state[key] = Array.isArray(value) ? [...value] : value;
  }

  // See FACTORY_DEFAULTS: the seed's default is a new draw, not the one this
  // page load opened with.
  state.seed = randomSeed();
  setAspect(state.aspect);

  return regenerate();
}
