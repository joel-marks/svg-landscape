// Archetype: Stacked ridges.
//
// Six to eight thin, evenly spaced ridge layers marching from a high horizon to
// the bottom of frame — a rhythmic repeating silhouette, like a distant range
// shot on a long lens. The even spacing and shallow relief are the point; the
// layer count stays in its 6–8 band on every canvas, and width adds undulations
// within each ridge rather than more ridges.

import { createNoise } from '../noise.js';
import {
  octaveCount,
  ridgeLayer,
  ridgeNoise,
  sampleCount,
  scaleFrequency,
} from '../utils.js';

export function generate({
  seed = 0,
  elevation = 0.5,
  complexity = 0.5,
  width = 1600,
  height = 900,
} = {}) {
  // Accepted but unused — see CONTEXT.md section 6a.
  void elevation;

  const noise2D = createNoise(seed);
  const octaves = octaveCount(complexity);
  const samples = sampleCount(complexity, width);
  const horizonY = height * 0.22;

  // Complexity picks the count within the archetype's defining 6–8 band.
  const ridgeCount = 6 + Math.round(complexity * 2);

  const layers = [];

  for (let k = 0; k < ridgeCount; k += 1) {
    const p = k / (ridgeCount - 1);

    // Even spacing is what creates the rhythm — no easing on the baseline.
    const base = horizonY + p * (height * 1.02 - horizonY);
    // Each ridge slightly larger than the one behind it.
    const amplitude = height * (0.055 + p * 0.045);

    layers.push(
      ridgeLayer({
        index: k,
        depth: p,
        samples,
        width,
        height,
        crest: (t) =>
          base -
          amplitude *
            ridgeNoise(noise2D, t, 25.5 + k * 14.9, {
              octaves,
              frequency: scaleFrequency(3.6 - p * 1.4, width),
              ridgeWeight: 0.7 - p * 0.35,
            }),
      }),
    );
  }

  return {
    archetype: 'stacked-ridges',
    width,
    height,
    horizonY,
    mistAfter: 1,
    layers,
  };
}
