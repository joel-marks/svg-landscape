// utils.js — geometry helpers shared across archetype modules.
//
// Everything here was extracted because three or more archetypes needed it, not
// in anticipation. The width-scaling helpers implement CONTEXT.md section 5's
// Canvas rule: feature density rises with canvas width and never falls below
// the 16:9 baseline.

import { fbm, ridgedFbm } from './noise.js';

// The 16:9 canvas is the unscaled reference. Narrower aspects keep base
// density rather than dropping below it.
export const BASE_WIDTH = 1600;

export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

// Never below 1 — a 4:3 canvas keeps 16:9 density rather than losing features.
export function widthScale(width) {
  return Math.max(1, width / BASE_WIDTH);
}

// Discrete feature counts: spurs, peaks, wall layers.
export function scaleCount(base, width) {
  return Math.max(base, Math.round(base * widthScale(width)));
}

// Continuous feature density: noise frequency across a crest line. Scaling
// frequency with width keeps features the same apparent size and puts
// proportionally more of them on a wider canvas.
export function scaleFrequency(frequency, width) {
  return frequency * widthScale(width);
}

// Crest resolution. Complexity drives detail resolution only — octave count and
// point sampling density — never feature count (CONTEXT.md section 5).
export function sampleCount(complexity, width) {
  return Math.round((160 + complexity * 260) * widthScale(width));
}

export function octaveCount(complexity) {
  return 2 + Math.round(complexity * 5);
}

// Horizon position for a given viewer height. Higher elevation lifts the
// horizon toward the top of frame, so `highFrac` is the smaller y
// (CONTEXT.md section 6a). Fractions are of canvas height.
export function horizonFor(elevation, height, lowFrac, highFrac) {
  return height * lerp(lowFrac, highFrac, clamp01(elevation));
}

// How tightly an archetype's features nest as the viewer climbs. Returns a
// multiplier applied to whatever spacing the archetype uses — spur reach, layer
// separation, peak spread — so ground level fans features out and height pulls
// them together. Above 1 spreads, below 1 tightens.
export function nestingFor(elevation, loose = 1.35, tight = 0.6) {
  return lerp(loose, tight, clamp01(elevation));
}

// Map the normalized Peak count control onto an archetype's own integer range,
// then apply canvas-width scaling so wider canvases still gain features.
export function featureCount(peakCount, min, max, width) {
  return scaleCount(Math.round(lerp(min, max, clamp01(peakCount))), width);
}

// Blend a layer's ridged/rolling character by the global Peak sharpness
// control. `character` is the archetype's own 0..1 sense of how ridged this
// layer should be relative to its siblings; sharpness scales the whole set
// without flattening the differences between them.
export function ridgeWeightFor(character, sharpness) {
  const s = clamp01(sharpness);
  const c = clamp01(character);
  // The low end has to reach near-zero ridging or "rounded hills" doesn't read;
  // a narrow range around the midpoint makes the control look broken.
  return clamp01(lerp(c * 0.15, 0.4 + c * 0.6, s));
}

// Peak profile exponent for peakField: higher is a narrower, pointier summit.
// The range is wide because peak-led archetypes take most of their silhouette
// from peakField, so this is the only lever sharpness has on them.
export function peakExponent(sharpness, bias = 0) {
  return lerp(0.7, 3.4, clamp01(sharpness)) + bias;
}

// Blended terrain height in roughly 0..1. ridgeWeight 0 is rolling hills, 1 is
// sharp ridge crests.
export function ridgeNoise(noise2D, t, row, options = {}) {
  const { octaves = 4, frequency = 2, ridgeWeight = 0.5 } = options;
  const rolling = fbm(noise2D, t, row, { octaves, frequency }) * 0.5 + 0.5;
  const ridged = ridgedFbm(noise2D, t, row, { octaves, frequency });
  return rolling * (1 - ridgeWeight) + ridged * ridgeWeight;
}

// Sample a crest function y = f(t) across the canvas width.
export function crestPoints(samples, width, crest) {
  const points = [];
  for (let s = 0; s < samples; s += 1) {
    const t = s / (samples - 1);
    points.push([t * width, crest(t)]);
  }
  return points;
}

// Sample a wall function x = f(t) down the canvas height, for vertical
// silhouettes such as in-gorge's canyon walls.
export function wallPoints(samples, height, wall) {
  const points = [];
  for (let s = 0; s < samples; s += 1) {
    const t = s / (samples - 1);
    points.push([wall(t), t * height]);
  }
  return points;
}

// Close a crest line into a filled polygon against the bottom edge.
export function closeToBottom(points, width, height) {
  return [...points, [width, height], [0, height]];
}

// Close a wall line into a filled polygon against the left or right edge.
export function closeToSide(points, side, width, height) {
  const x = side === 'right' ? width : 0;
  return [...points, [x, height], [x, 0]];
}

// Standard terrain layer: crest sampled across the width, closed to the bottom.
export function ridgeLayer({ index, depth, samples, width, height, crest }) {
  return {
    index,
    depth,
    points: closeToBottom(crestPoints(samples, width, crest), width, height),
  };
}

// Additive field of smooth bumps. Used by every peak-led archetype
// (dominant-peak, twin-peaks, mountain-top, valley-floor).
// Each peak is { t, height, width, sharpness }, with t and width in 0..1.
export function peakField(peaks, t) {
  let total = 0;
  for (const peak of peaks) {
    const u = Math.abs(t - peak.t) / peak.width;
    if (u < 1) total += peak.height * Math.pow(1 - u, peak.sharpness ?? 1.6);
  }
  return total;
}

// One side spur of an alternating nested valley, as a crest line in t.
//
// From the frame edge the crest runs inward to a tip, then plunges away so the
// spur disappears behind whatever is drawn in front of it. `ease` controls the
// approach: ~1.4 gives a rolling shoulder (v-valley), high values hold a
// plateau then break sharply (gorge). Shared by v-valley, gorge, valley-floor.
export function spurCrest({
  t,
  side,
  tipT,
  tipY,
  outerY,
  plunge,
  ease = 1.4,
  fall = 0.65,
}) {
  // Mirror right-hand spurs so one code path serves both sides.
  const tt = side === 'right' ? 1 - t : t;
  const tip = side === 'right' ? 1 - tipT : tipT;

  if (tt <= tip) {
    const u = tip <= 0 ? 1 : tt / tip;
    return outerY + (tipY - outerY) * Math.pow(u, ease);
  }

  const v = (tt - tip) / Math.max(1e-6, 1 - tip);
  return tipY + plunge * Math.pow(v, fall);
}
