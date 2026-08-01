// palette.js — curated theme list + algorithmic palette generator.
//
// A theme owns the *terrain* ramp and nothing else. Sky gradient, mist tint,
// sun/moon and stars all belong to lighting.js, because CONTEXT.md section 5
// gives Time of day those outputs explicitly — so the curated themes here are
// time-of-day-agnostic colour moods that sit under whatever sky the hour
// produces. (The Phase 2 theme shape also carried `sky` and `mist` keys; those
// were superseded by the lighting keyframes in Phase 4 and have been dropped
// rather than left as dead fields.)
//
// Each theme is three ramp stops, farthest ridge to nearest foreground. The
// middle stop is what makes a mood: interpolating straight from a pale distance
// to a near-black foreground desaturates through grey, so a theme that should
// read as pine or sandstone needs the ramp bent through its own hue.

import chroma from 'chroma-js';

import { clamp01, lerp } from './utils.js';

export const themes = [
  {
    id: 'alpine-dusk',
    name: 'Alpine dusk',
    // The Phase 2 palette. Endpoints unchanged so the default scene is the one
    // the lighting keyframes were tuned against; only the mid stop is new.
    terrain: ['#9aa8c0', '#4a5670', '#141c28'],
  },
  {
    id: 'glacier',
    name: 'Glacier',
    // Pale cyan distance falling to a deep meltwater teal — the coldest and
    // highest-key of the set.
    terrain: ['#d6e7ee', '#6a9cb2', '#10242f'],
  },
  {
    id: 'cascade-pine',
    name: 'Cascade pine',
    terrain: ['#a9c2b1', '#3d6b55', '#0d1f17'],
  },
  {
    id: 'sandstone-mesa',
    name: 'Sandstone mesa',
    // Warm ochre through burnt sienna. The counterweight to Alpine dusk.
    terrain: ['#e3c3a0', '#a96b48', '#3a1f18'],
  },
  {
    id: 'volcanic-ash',
    name: 'Volcanic ash',
    // Near-neutral, but warm-shifted rather than grey so it doesn't collide
    // with Ink wash.
    terrain: ['#b8ada4', '#6b5a50', '#191311'],
  },
  {
    id: 'heather-moor',
    name: 'Heather moor',
    terrain: ['#c6b4c8', '#7a5f80', '#231a2b'],
  },
  {
    id: 'ink-wash',
    name: 'Ink wash',
    // Deliberately zero-chroma. Also the honest test of the Color depth
    // control: with no hue to lean on, only the value spread is doing work.
    terrain: ['#d0d0d0', '#787878', '#131313'],
  },
];

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
  };
}

// --- resolved palette --------------------------------------------------------

// Builds the palette render.js draws from. Accepts a curated theme id or a
// generated theme object, so state.js doesn't need to branch.
export function createPalette(theme, options = {}) {
  const resolved = typeof theme === 'string' || theme == null ? getTheme(theme) : theme;
  const { colorDepth = 0.5 } = options;

  // The ramp itself is the theme exactly as authored. Color depth never
  // recolours it — it only moves where each layer *lands* on it.
  const ramp = chroma.scale(resolved.terrain).mode('lab');

  return {
    id: resolved.id,
    name: resolved.name,
    terrainAt(depth) {
      return ramp(rampPosition(clamp01(depth), colorDepth)).hex();
    },
  };
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
