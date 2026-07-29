// Archetype: Mountain top.
//
// The viewer stands near a summit: the horizon sits high in frame, layered
// ridgelines with peak clusters descend below it, and a single rolling
// foreground hill closes the very bottom.

import { createNoise } from '../noise.js';
import {
  featureCount,
  octaveCount,
  peakExponent,
  peakField,
  ridgeLayer,
  ridgeNoise,
  ridgeWeightFor,
  sampleCount,
  scaleFrequency,
  widthScale,
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
  // Accepted but unused — see CONTEXT.md section 6a.
  void elevation;

  const noise2D = createNoise(seed);
  const octaves = octaveCount(complexity);
  const samples = sampleCount(complexity, width);
  const horizonY = height * 0.32;
  const scale = widthScale(width);

  const layers = [];

  // Fewer bands than stacked-ridges, and spaced by an accelerating curve rather
  // than evenly — even spacing is what makes a range read as a repeating
  // silhouette, which is the other archetype's job, not this one's.
  const ridgeCount = featureCount(peakCount, 3, 7, width);
  const clusterSize = featureCount(peakCount, 3, 9, width);

  for (let k = 0; k < ridgeCount; k += 1) {
    const p = k / (ridgeCount - 1);
    const base = horizonY + Math.pow(p, 1.55) * (height * 0.52);
    // Big relief on the summit-line bands so the peak clusters actually read as
    // peaks; a small amplitude turns them into the wavy bands that make this
    // archetype indistinguishable from stacked-ridges.
    const amplitude = height * (0.3 - p * 0.2);
    // Peaks dominate the far bands and hand over to rolling terrain up close.
    const peakWeight = Math.max(0.15, 0.85 - p * 0.85);

    const peaks = [];
    for (let n = 0; n < clusterSize; n += 1) {
      peaks.push({
        t: (n + 0.5) / clusterSize + noise2D(n * 4.7, k * 6.3) * 0.09,
        height: 0.55 + 0.45 * Math.abs(noise2D(n * 2.9, k * 8.1)),
        width: (0.12 - p * 0.02) / scale,
        sharpness: peakExponent(sharpness, p * 0.5),
      });
    }

    layers.push(
      ridgeLayer({
        index: layers.length,
        depth: p * 0.82,
        samples,
        width,
        height,
        // Peak clusters dominate the far bands and fade out as the terrain
        // rolls toward the viewer.
        crest: (t) =>
          base -
          amplitude *
            ((1 - peakWeight) *
              ridgeNoise(noise2D, t, 15.1 + k * 9.7, {
                octaves,
                frequency: scaleFrequency(4.2 - p * 1.6, width),
                ridgeWeight: ridgeWeightFor(0.85 - p * 0.4, sharpness),
              }) +
              peakWeight * peakField(peaks, t)),
      }),
    );
  }

  // One rolling foreground hill at the very bottom of frame.
  layers.push(
    ridgeLayer({
      index: layers.length,
      depth: 1,
      samples,
      width,
      height,
      crest: (t) =>
        height * 1.06 -
        height *
          0.26 *
          ridgeNoise(noise2D, t, 90.4, {
            octaves,
            frequency: scaleFrequency(1.3, width),
            ridgeWeight: ridgeWeightFor(0.1, sharpness),
          }),
    }),
  );

  return {
    archetype: 'mountain-top',
    width,
    height,
    horizonY,
    mistAfter: 1,
    layers,
  };
}
