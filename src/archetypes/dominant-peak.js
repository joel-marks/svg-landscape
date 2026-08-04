// Archetype: Dominant peak.
//
// One tall central peak clearly outranks one or two smaller flanking peaks,
// above a mid-ground ridge and a rolling foreground. The hierarchy is the
// point: the main peak is roughly twice the height of its neighbours, unlike
// twin-peaks' even pairing.

import { createNoise } from '../noise.js';
import {
  featureCount,
  horizonFor,
  nestingFor,
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

// Layers mode's region boundaries (CONTEXT.md section 5, Phase 7). Four layers,
// at depths 0, 0.45, 0.75 and 1 — the peak line, the mid-ground ridge, and two
// rolling foreground bands. With so few layers the values only have to fall in
// the gaps, so what is being chosen here is really which *layer* goes where.
//
// 0.3 isolates the peak line as background. 0.7 puts both rolling layers in the
// foreground band, which is the half of this that took looking at rather than
// reasoning about: 0.9 also falls in a gap and reads more precisely ("the
// nearest hill, and nothing else"), but the nearest hill's crest sits at 1.06 ×
// canvas height, so almost all of it is below the frame and it renders as a
// sliver of foreground colour along the bottom edge. Taking both gives three
// bands of roughly comparable area. Layer counts and frame area are different
// measures and this archetype is where they disagree most.
export const LAYER_BOUNDARIES = {
  backgroundUntil: 0.3,
  foregroundFrom: 0.7,
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
  const octaves = octaveCount(complexity);
  const samples = sampleCount(complexity, width);

  // Height lifts the horizon and gathers the flanking peaks in around the
  // summit; ground level lets them spread out along the ridge.
  const horizonY = horizonFor(elevation, height, 0.58, 0.3);
  const nesting = nestingFor(elevation, 1.35, 0.55);
  // The lower ridges compress more gently, or the foreground vanishes.
  const groundNesting = nestingFor(elevation, 1.15, 0.75);
  const scale = widthScale(width);

  const summitT = 0.5 + noise2D(1.7, 6.2) * 0.06;

  const peaks = [
    {
      t: summitT,
      height: 1,
      width: 0.22 / scale,
      sharpness: peakExponent(sharpness),
    },
  ];

  // Flanking peaks. Peak count sets how many, and the canvas width adds more,
  // but they stay well below the summit so the hierarchy survives.
  const flankCount = featureCount(peakCount, 1, 6, width);
  for (let n = 0; n < flankCount; n += 1) {
    const side = n % 2 === 0 ? -1 : 1;
    const rank = Math.floor(n / 2) + 1;
    peaks.push({
      t: summitT + (side * (0.17 + rank * 0.13) * nesting) / scale,
      height: 0.42 + 0.12 * Math.abs(noise2D(n * 5.5, 3.3)),
      width: (0.14 - Math.min(rank, 4) * 0.02) / scale,
      sharpness: peakExponent(sharpness, 0.15),
    });
  }

  const layers = [];

  // The peak line itself.
  layers.push(
    ridgeLayer({
      index: 0,
      depth: 0,
      samples,
      width,
      height,
      crest: (t) =>
        horizonY +
        height * 0.02 -
        height *
          0.42 *
          (0.82 * peakField(peaks, t) +
            0.18 *
              ridgeNoise(noise2D, t, 33.7, {
                octaves,
                frequency: scaleFrequency(4.5, width),
                ridgeWeight: ridgeWeightFor(0.85, sharpness),
              })),
    }),
  );

  // Mid-ground ridge and rolling foreground.
  const lower = [
    { base: 0.68, amplitude: 0.1, frequency: 2.6, ridgeWeight: 0.5, depth: 0.45 },
    { base: 0.9, amplitude: 0.13, frequency: 1.4, ridgeWeight: 0.15, depth: 0.75 },
    { base: 1.06, amplitude: 0.14, frequency: 1, ridgeWeight: 0.05, depth: 1 },
  ];

  for (const [k, spec] of lower.entries()) {
    layers.push(
      ridgeLayer({
        index: layers.length,
        depth: spec.depth,
        samples,
        width,
        height,
        crest: (t) =>
          horizonY + height * (spec.base - 0.46) * groundNesting -
          height *
            spec.amplitude *
            ridgeNoise(noise2D, t, 50 + k * 11.7, {
              octaves,
              frequency: scaleFrequency(spec.frequency, width),
              ridgeWeight: ridgeWeightFor(spec.ridgeWeight, sharpness),
            }),
      }),
    );
  }

  return {
    archetype: 'dominant-peak',
    width,
    height,
    horizonY,
    mistAfter: 0,
    layers,
  };
}
