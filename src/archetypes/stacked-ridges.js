// Archetype: Stacked ridges.
//
// Six to eight thin, evenly spaced ridge layers marching from a high horizon to
// the bottom of frame — a rhythmic repeating silhouette, like a distant range
// shot on a long lens. The even spacing and shallow relief are the point; the
// layer count stays in its 6–8 band on every canvas, and width adds undulations
// within each ridge rather than more ridges.

import { createNoise } from '../noise.js';
import {
  horizonFor,
  lerp,
  octaveCount,
  ridgeLayer,
  ridgeNoise,
  ridgeWeightFor,
  sampleCount,
  scaleFrequency,
} from '../utils.js';

export function generate({
  seed = 0,
  elevation = 0.5,
  complexity = 0.5,
  peakCount = 0.5,
  sharpness = 0.5,
  width = 1600,
  height = 900,
} = {}) {
  // Peak count is a deliberate no-op here: the 6–8 band count is the
  // archetype's defining trait (CONTEXT.md section 5), the same exemption Twin
  // peaks has. Elevation moves the bands' position and spacing, never how many.
  void peakCount;

  const noise2D = createNoise(seed);
  const octaves = octaveCount(complexity);
  const samples = sampleCount(complexity, width);
  const horizonY = horizonFor(elevation, height, 0.36, 0.1);

  // Spacing bias. Above 1 bunches the bands toward the horizon, which is how a
  // receding range compresses when seen from height; below 1 spreads them.
  const spacingBias = lerp(0.85, 1.7, Math.min(1, Math.max(0, elevation)));

  // The seed picks within the defining 6–8 band, so scenes still vary without
  // handing the count to a control.
  const ridgeCount = 6 + Math.round(Math.abs(noise2D(0.37, 0.91)) * 2);

  const layers = [];

  for (let k = 0; k < ridgeCount; k += 1) {
    const p = k / (ridgeCount - 1);

    // Spacing stays regular at ground level; elevation biases it so the bands
    // bunch toward the horizon rather than marching evenly down the frame.
    const base = horizonY + Math.pow(p, spacingBias) * (height * 1.05 - horizonY);
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
              ridgeWeight: ridgeWeightFor(0.7 - p * 0.35, sharpness),
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
