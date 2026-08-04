// Archetype: Open valley.
//
// Layered ridges receding to a horizon. Each layer is a crest interpolated
// between an edge anchor and a centre anchor; nearer layers climb higher at the
// edges and fall below the frame at the centre, which opens the valley instead
// of stacking ridges.

import { createNoise, fbm } from '../noise.js';
import {
  clamp01,
  featureCount,
  horizonFor,
  nestingFor,
  octaveCount,
  ridgeLayer,
  ridgeNoise,
  ridgeWeightFor,
  sampleCount,
  scaleFrequency,
} from '../utils.js';

// Layers mode's region boundaries (CONTEXT.md section 5, Phase 7). Depth here
// is `i / (layerCount - 1)` — evenly spaced across 5 to 11 layers — so the two
// values are read as fractions of the whole stack rather than as layer counts.
//
// 0.3 puts the two or three ridges nearest the horizon in the background band:
// those are the ones whose crests stay above the horizon line and read as
// distance. 0.72 takes the two nearest, which are the layers that sweep up the
// frame edges and drop below the bottom of frame at the centre — the valley
// walls the viewer is standing between, and genuinely foreground.
export const LAYER_BOUNDARIES = {
  backgroundUntil: 0.3,
  foregroundFrom: 0.72,
};

export function generate({
  seed = 0,
  elevation = 0.5,
  complexity = 0.5,
  peakCount = 0.5,
  sharpness = 0.5,
  width = 1600,
  height = 900,
} = {}) {
  const noise2D = createNoise(seed);

  // Ground level sits the horizon low and lets the layers spread apart; height
  // lifts it and pulls the layers into a tighter stack (CONTEXT.md section 6a).
  const horizonY = horizonFor(elevation, height, 0.68, 0.3);
  const nesting = nestingFor(elevation, 1.25, 0.62);

  const octaves = octaveCount(complexity);
  const samples = sampleCount(complexity, width);

  // The receding ridges are this archetype's countable feature. Width adds
  // bands too, so a wide canvas keeps the rhythm rather than stretching a
  // handful of layers across it.
  const layerCount = featureCount(peakCount, 5, 11, width);

  const layers = [];

  for (let i = 0; i < layerCount; i += 1) {
    const depth = i / (layerCount - 1);

    const edgeY = horizonY - Math.pow(depth, 1.15) * height * 0.34 * nesting;
    const centreY =
      horizonY + Math.pow(depth, 1.3) * (height - horizonY) * 1.15 * nesting;

    // Noise has to stay legible against the structural sweep, or the steep
    // flanks of the near walls flatten into straight diagonal wedges.
    const amplitude = height * (0.085 + 0.14 * depth);
    const frequency = scaleFrequency(1.6 + (1 - depth) * 2.4, width);
    // Far ridges are the sharper ones; sharpness scales the whole set.
    const ridgeWeight = ridgeWeightFor(1 - depth, sharpness);
    const row = i * 17.3;

    // Offset each layer's valley axis so the walls are not mirror-symmetric.
    const axis = 0.5 + noise2D(i * 7.1, 99.3) * 0.12;
    const reach = Math.max(axis, 1 - axis);

    layers.push(
      ridgeLayer({
        index: i,
        depth,
        samples,
        width,
        height,
        crest(t) {
          const h = ridgeNoise(noise2D, t, row, {
            octaves,
            frequency,
            ridgeWeight,
          });

          // 0 on the valley axis, 1 at the outermost edge. Warping it before
          // the curve keeps the wall lines from reading as a smooth parabola.
          const fromAxis = Math.min(1, Math.abs(t - axis) / reach);
          const warp = fbm(noise2D, t, row + 41.7, {
            octaves: 2,
            frequency: scaleFrequency(1.4, width),
          });
          const envelope = Math.pow(clamp01(fromAxis + warp * 0.18), 1.45);

          return centreY + (edgeY - centreY) * envelope - amplitude * h;
        },
      }),
    );
  }

  return {
    archetype: 'open-valley',
    width,
    height,
    horizonY,
    mistAfter: 1,
    layers,
  };
}
