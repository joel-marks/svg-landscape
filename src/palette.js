// palette.js — theme loading + algorithmic palette generator + resolved palette.
//
// A theme owns the *terrain* ramp and its UI tint, and nothing else. Sky
// gradient, mist tint, sun/moon and stars all belong to lighting.js, because
// CONTEXT.md section 5 gives Time of day those outputs explicitly — so the
// curated themes are time-of-day-agnostic colour moods that sit under whatever
// sky the hour produces. (The Phase 2 theme shape also carried `sky` and `mist`
// keys; those were superseded by the lighting keyframes in Phase 4 and have
// been dropped rather than left as dead fields.)
//
// Each theme is three ramp stops, farthest ridge to nearest foreground. The
// middle stop is what makes a mood: interpolating straight from a pale distance
// to a near-black foreground desaturates through grey, so a theme that should
// read as pine or sandstone needs the ramp bent through its own hue.
//
// Phase 7 moved the list itself out to `themes.json` — data, editable without
// touching this file, and one file rather than one per theme because eight
// themes fit on a screen and cohesion is easier to judge at a glance. A plain
// `import` rather than `import.meta.glob`: there is exactly one file and naming
// it is clearer than matching a pattern that can only ever match it. Authorial
// notes travel in `_note` keys, since JSON has no comments; nothing reads them.

import chroma from 'chroma-js';

// The import attribute is not required by Vite, which resolves `.json` on the
// extension alone, but it is required by Node — and being able to import this
// module in plain Node is what let Phase 7's migration be verified by diffing
// every theme's rendered output against the pre-migration build.
import themeData from './themes.json' with { type: 'json' };
import { clamp01, lerp } from './utils.js';

export const themes = themeData;

// Where a theme carries no `uiTint` — a hand-edited themes.json, or a generated
// palette from before Phase 7 restored out of localStorage. Not a colour: the
// tint is declared, never derived (CONTEXT.md section 6d), so the honest
// fallback is "no tint" and the interface keeps its neutral tokens.
const NO_TINT = null;

// The tint the interface takes from the scene's theme (CONTEXT.md section 6d).
// Accepts the same two shapes createPalette does — a curated id or a generated
// theme object — so callers don't branch.
export function themeTint(theme) {
  const resolved = typeof theme === 'string' || theme == null ? getTheme(theme) : theme;
  return resolved?.uiTint ?? NO_TINT;
}

// The id the Theme preset dropdown uses for a generated palette. It is not in
// `themes` — the generated triple lives on state, not in the curated list.
export const CUSTOM_THEME_ID = 'custom';

export function getTheme(id) {
  return themes.find((theme) => theme.id === id) ?? themes[0];
}

export function themeOptions() {
  return Object.fromEntries(themes.map((theme) => [theme.name, theme.id]));
}

// --- algorithmic generator ---------------------------------------------------

// "Randomize palette" (CONTEXT.md section 5). Hue relationships rather than
// three independent random colours: unrelated hues produce mud once the ramp
// interpolates between them, whereas a fixed relationship between the far and
// near hues stays coherent whatever the base hue turns out to be.
//
// Lightness and chroma follow aerial perspective in every strategy — distance
// is pale and washed out, foreground is dark and denser — so only the hue
// relationship varies. That keeps generated palettes usable as terrain instead
// of merely colourful.
const STRATEGIES = [
  // Far and near sit opposite each other; the ramp passes through neutral,
  // which reads as the strongest depth separation of the three.
  { id: 'complementary', nearOffset: 180, midBias: 0.5 },
  // A narrow hue window. Quiet and naturalistic — most real landscapes are
  // analogous.
  { id: 'analogous', nearOffset: 32, midBias: 0.5 },
  // Split-complementary: near lands beside the complement rather than on it,
  // and the mid stop is pulled toward the near hue so the ramp bows through a
  // saturated middle instead of crossing straight over grey.
  { id: 'split-hue', nearOffset: 150, midBias: 0.68 },
];

export function generatePalette(random = Math.random) {
  const strategy = STRATEGIES[Math.floor(random() * STRATEGIES.length)];
  // Split-hue is symmetric about the complement — flipping the sign is a
  // genuinely different palette, not the same one relabelled.
  const direction = random() < 0.5 ? 1 : -1;

  const farHue = random() * 360;
  const nearHue = farHue + direction * strategy.nearOffset;
  const midHue = farHue + direction * strategy.nearOffset * strategy.midBias;

  // Distance: high lightness, low chroma — haze washes colour out.
  const far = chroma.hcl(farHue, lerp(8, 24, random()), lerp(76, 88, random()));
  // Mid: the chroma peak. This is the stop that gives the palette its identity.
  const mid = chroma.hcl(midHue, lerp(26, 46, random()), lerp(44, 56, random()));
  // Foreground: dark and only moderately saturated, so it still reads as mass.
  const near = chroma.hcl(nearHue, lerp(10, 26, random()), lerp(10, 19, random()));

  return {
    id: CUSTOM_THEME_ID,
    name: `Randomized (${strategy.id})`,
    strategy: strategy.id,
    terrain: [far.hex(), mid.hex(), near.hex()],
    // One of the three stops it already chose, not a fourth computed colour —
    // the same declared-not-derived stance the curated themes take (CONTEXT.md
    // section 6d). `mid` because it is the chroma peak in every strategy: the
    // far stop is washed out by construction and the near one is dark and only
    // moderately saturated, so mid is the only stop that reliably carries the
    // generated palette's identity into a UI accent.
    uiTint: mid.hex(),
  };
}

// --- resolved palette --------------------------------------------------------

// Builds the palette render.js draws from. Accepts a curated theme id or a
// generated theme object, so state.js doesn't need to branch.
//
// `layersMode` selects between the two ways the theme's three stops reach a
// layer (CONTEXT.md section 5, the Color folder's Layers toggle):
//
//   false — continuous ramp. Unchanged from Phase 6.14: one lab scale through
//           all three stops, sampled at each layer's own depth.
//   true  — banded. Each layer takes one of the three stops flat, chosen by
//           which region of the stack its depth falls in.
//
// The branch lives here rather than in render.js, which is where the Phase 7
// prompt located it. Same single decision point, one level upstream: render.js
// calls `palette.terrainAt(layer.depth)` exactly as it always has and needed no
// change at all, and the mode never has to be threaded through the paint object
// or the archetype registry re-imported to reach the boundaries. Depth is all
// either mode needs, so the method's signature is the whole interface.
export function createPalette(theme, options = {}) {
  const resolved = typeof theme === 'string' || theme == null ? getTheme(theme) : theme;
  const { colorDepth = 0.5, layersMode = false, boundaries } = options;

  // Resolved once per palette, not per layer: both are pure functions of the
  // theme and the slider, and a scene asks for a fill per layer.
  const bands = layersMode ? bandStops(resolved.terrain, colorDepth) : null;
  const region = layersMode ? regionFor(boundaries) : null;

  // The ramp itself is the theme exactly as authored. Color depth never
  // recolours it — it only moves where each layer *lands* on it.
  const ramp = chroma.scale(resolved.terrain).mode('lab');

  return {
    id: resolved.id,
    name: resolved.name,
    layersMode,
    terrainAt(depth) {
      const t = clamp01(depth);
      if (bands) return bands[region(t)];
      return ramp(rampPosition(t, colorDepth)).hex();
    },
  };
}

// --- banded mode -------------------------------------------------------------

// Where an archetype declares no boundaries of its own. Every one of the nine
// does (Phase 7), so this only covers a hand-added module — and putting the
// break points at a quarter and seven tenths is a defensible generic stack
// rather than a value that would look deliberately wrong.
const DEFAULT_BOUNDARIES = { backgroundUntil: 0.25, foregroundFrom: 0.7 };

// Which of the three stops a layer at this depth takes. Fractional boundaries
// compared against `depth` directly, not resolved to integer layer indices:
// layer counts run from 4 to 20+ across the archetypes and move with Peak
// count, elevation and canvas width, and depth is the axis that stays
// comparable across all of that (CONTEXT.md section 3, layer ordering).
//
// A degenerate declaration can't produce a gap or an overlap: `foregroundFrom`
// is tested first, so if an archetype declares the two crossed the near band
// simply wins. An archetype wanting everything in one band declares
// `{ backgroundUntil: 0, foregroundFrom: 1.01 }` — above 1 rather than at it,
// because the nearest layer's depth is exactly 1 in most archetypes and `>=`
// would hand it `near`.
function regionFor(boundaries) {
  const { backgroundUntil, foregroundFrom } = { ...DEFAULT_BOUNDARIES, ...(boundaries ?? {}) };
  return (depth) => {
    if (depth >= foregroundFrom) return 2;
    if (depth < backgroundUntil) return 0;
    return 1;
  };
}

// How much further than authored the outer bands are pushed at Color depth 1.
// 0.4 is enough that the spread is unmistakable on Ink wash — the theme with no
// hue to carry it — without any theme's far band arriving at flat white.
const BAND_SPREAD = 0.4;

// Colour depth in banded mode (CONTEXT.md section 5). The ramp-position maths
// the continuous mode uses has nothing to reshape here: there is no ramp, and
// every layer in a band resolves to the same colour whatever its depth. So the
// same slider drives the same *idea* through the only mechanism banded mode
// offers — contrast between the bands themselves.
//
//   0.5 — the three stops exactly as authored.
//   <   — mixed toward `mid`, reaching one flat silhouette mass at 0. The same
//         end state continuous mode reaches at 0, by a different route.
//   >   — `far` and `near` pushed further from `mid`.
//
// The push is deliberately not an extrapolation of the full LCH vector. Hue is
// held at the authored stop's own value, because extrapolating hue past an
// endpoint invents a hue that is in neither colour, and chroma is clamped to
// the authored range — so a saturated mid can't throw fluorescent bands at the
// top of the slider. Lightness is what actually spreads, which is also what
// aerial perspective is made of.
function bandStops(terrain, colorDepth) {
  const [far, mid, near] = terrain;
  const c = clamp01(colorDepth);

  if (c <= 0.5) {
    const t = c / 0.5;
    return [chroma.mix(mid, far, t, 'lab').hex(), mid, chroma.mix(mid, near, t, 'lab').hex()];
  }

  const k = (c - 0.5) / 0.5;
  return [pushFrom(mid, far, k), mid, pushFrom(mid, near, k)];
}

function pushFrom(mid, stop, k) {
  const [midL, midC] = chroma(mid).lch();
  const [stopL, stopC, stopH] = chroma(stop).lch();
  const f = 1 + k * BAND_SPREAD;

  const l = Math.min(96, Math.max(4, midL + (stopL - midL) * f));
  // Toward the authored stop's chroma and no further past it than the stops
  // themselves already span. In every curated theme mid *is* the chroma peak,
  // so this reads as the outer bands washing out — which is the right direction.
  const chromaSpan = Math.abs(stopC - midC);
  const pushed = midC + (stopC - midC) * f;
  const c = Math.max(0, Math.min(pushed, Math.max(midC, stopC) + chromaSpan * 0.25));

  return chroma.lch(l, c, Number.isNaN(stopH) ? 0 : stopH).hex();
}

// Color depth, per CONTEXT.md section 5: "Low = layers compressed toward the
// palette midpoint (flat, low depth cue). High = near/far pushed toward the
// ramp's extremes, exaggerating separation."
//
// Read literally, that is a statement about where the *layers* sit on the ramp,
// not about recolouring the ramp's endpoints — so this reshapes the depth
// coordinate and leaves the colours alone. Two consequences worth stating,
// because the obvious implementations get both wrong:
//
//   * The neutral point is the middle of the slider, not the top. 0.5 is the
//     theme as authored; 1 is genuinely more separated than the default, which
//     is the direction Phase 3.5 flagged as previously inverted.
//   * There is no dead zone at the top. Pushing the ramp's endpoint colours
//     further apart saturates almost immediately — the far stop of a high-key
//     theme is already near white — whereas redistributing layers along the
//     ramp keeps changing the image right up to 1.
function rampPosition(t, colorDepth) {
  const c = clamp01(colorDepth);

  if (c <= 0.5) {
    // Compress toward the palette's midpoint. At 0 every layer resolves to the
    // same mid colour: one flat silhouette mass, no aerial-perspective cue at
    // all, which is what "flat, low depth cue" asks for.
    return 0.5 + (t - 0.5) * (c / 0.5);
  }

  // Expand. The S-curve carries the far layers up toward the pale end of the
  // ramp and the near ones down toward the dark end, so the gap between the
  // distance and the foreground widens while the middle of the ramp is crossed
  // faster. Blended in rather than switched on, so the slider stays continuous
  // through the neutral point.
  return lerp(t, smootherstep(t), (c - 0.5) / 0.5);
}

// Ken Perlin's second-order smoothstep. Zero first *and* second derivative at
// both ends, which is what keeps the two outermost layers from visibly
// snapping onto the ramp endpoints as the slider approaches 1.
function smootherstep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// --- shadow ------------------------------------------------------------------

// The dark-side fill for the pseudo-3D split (CONTEXT.md section 6). Mixing
// toward a cold near-black rather than pure black keeps shaded slopes reading
// as terrain in shadow instead of as holes punched in the scene.
const SHADOW_BASE = '#070a10';

export function shade(color, amount) {
  return chroma.mix(color, SHADOW_BASE, clamp01(amount) * 0.62, 'lab').hex();
}

// The tone Valley mist washes a layer toward (CONTEXT.md section 5). Derived
// from that layer's *own* fill rather than from a fixed pale or from the
// theme's light endpoint: a dark blue ridge should mist pale blue and a warm
// ridge pale warm, which only holds if the hue comes from the layer itself.
//
// Worked in LCH so "paler" means what it should perceptually — lightness up,
// chroma down, hue untouched. Lightness moves most of the way toward a near-
// white rather than to a fixed value, so a layer that is already pale is not
// dragged darker by its own mist.
export function mistTone(color) {
  const [l, c, h] = chroma(color).lch();
  return chroma.lch(l + (96 - l) * 0.82, Math.min(c * 0.4, 16), h || 0).hex();
}
