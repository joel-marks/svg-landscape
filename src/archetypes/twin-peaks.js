// Archetype: Twin peaks.
//
// Exactly two prominent peaks of similar height, side by side, above a
// mid-ground ridge and a rolling foreground. The fixed count of two is the
// defining trait, so neither complexity nor canvas width may add a third —
// width scales the ridge detail beneath them instead.

import { createNoise } from '../noise.js';
import {
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

const PEAK_COUNT = 2;

export function generate({
  seed = 0,
  elevation = 0.5,
  complexity = 0.5,
  peakCount = 0.5,
  sharpness = 0.5,
  width = 1600,
  height = 900,
} = {}) {
  // Peak count is a deliberate no-op because exactly two peaks is the defining
  // trait (CONTEXT.md section 5) — neither a control nor canvas width may add a
  // third. Elevation moves the pair's spacing and the horizon, never the count.
  void peakCount;

  const noise2D = createNoise(seed);
  const octaves = octaveCount(complexity);
  const samples = sampleCount(complexity, width);

  const horizonY = horizonFor(elevation, height, 0.6, 0.32);
  const nesting = nestingFor(elevation, 1.4, 0.6);
  // The lower ridges compress more gently, or the foreground vanishes.
  const groundNesting = nestingFor(elevation, 1.15, 0.75);
  const scale = widthScale(width);

  const centre = 0.5 + noise2D(8.8, 1.4) * 0.04;
  const separation =
    ((0.15 + Math.abs(noise2D(2.6, 7.7)) * 0.05) * nesting) / scale;

  // Similar, not identical — a slight height difference reads as natural
  // without breaking the even pairing.
  const peaks = [];
  for (let n = 0; n < PEAK_COUNT; n += 1) {
    const side = n === 0 ? -1 : 1;
    peaks.push({
      t: centre + side * separation,
      height: 0.92 + 0.08 * Math.abs(noise2D(n * 6.1, 4.9)),
      width: 0.19 / scale,
      sharpness: peakExponent(sharpness),
    });
  }

  const layers = [];

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
          0.38 *
          (0.85 * peakField(peaks, t) +
            0.15 *
              ridgeNoise(noise2D, t, 27.3, {
                octaves,
                frequency: scaleFrequency(4.8, width),
                ridgeWeight: ridgeWeightFor(0.85, sharpness),
              })),
    }),
  );

  const lower = [
    { base: 0.72, amplitude: 0.09, frequency: 2.8, ridgeWeight: 0.5, depth: 0.45 },
    { base: 0.92, amplitude: 0.12, frequency: 1.5, ridgeWeight: 0.15, depth: 0.75 },
    { base: 1.07, amplitude: 0.13, frequency: 1, ridgeWeight: 0.05, depth: 1 },
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
          horizonY + height * (spec.base - 0.48) * groundNesting -
          height *
            spec.amplitude *
            ridgeNoise(noise2D, t, 55 + k * 13.3, {
              octaves,
              frequency: scaleFrequency(spec.frequency, width),
              ridgeWeight: ridgeWeightFor(spec.ridgeWeight, sharpness),
            }),
      }),
    );
  }

  return {
    archetype: 'twin-peaks',
    width,
    height,
    horizonY,
    mistAfter: 0,
    layers,
  };
}
