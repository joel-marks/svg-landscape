// Archetype: Valley floor.
//
// Standing deep inside a valley, looking down its length. Tall peaked ridges
// crowd the upper frame, the terrain recedes down into an open floor, and two
// low rolling spurs meet near centre-bottom with a soft split between their
// tips.

import { createNoise } from '../core/noise.js';
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
  scaleCount,
  scaleFrequency,
  spurCrest,
  widthScale,
} from '../core/utils.js';

// Layers mode's region boundaries (CONTEXT.md section 5, Phase 7). The one
// archetype whose boundaries are pinned to specific constants further down this
// file rather than chosen as round fractions, because its depths are not evenly
// spaced: the crowding peaked ridge bands occupy 0 to exactly 0.3, the two
// floor layers sit at 0.42 and 0.58, and the two framing spurs at 0.82 and 1.
//
// So 0.32 is "every peaked ridge band and nothing else" with a little room for
// the band count to change, and 0.7 is "both framing spurs". The middle band
// gets the valley floor itself, which is exactly the three-part reading the
// archetype was drawn with — and the clearest case in the set for what Layers
// mode is for.
export const LAYER_BOUNDARIES = {
  backgroundUntil: 0.32,
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

  // Height lifts the horizon and draws the framing spurs in toward their split.
  const horizonY = horizonFor(elevation, height, 0.44, 0.18);
  const nesting = nestingFor(elevation, 1.3, 0.6);
  const scale = widthScale(width);

  const layers = [];

  // Tall peaked ridges, close together near the top of frame. The band count
  // is structural; Peak count drives how many summits crowd each band.
  const bandCount = scaleCount(5, width);
  const peaksPerBand = featureCount(peakCount, 4, 13, width);

  for (let k = 0; k < bandCount; k += 1) {
    const p = k / Math.max(1, bandCount - 1);
    const base = horizonY + height * 0.05 + p * height * 0.24 * nesting;
    const amplitude = height * (0.19 - p * 0.07);

    // Peak cluster riding on the ridge line, seeded per band.
    const peaks = [];
    for (let n = 0; n < peaksPerBand; n += 1) {
      peaks.push({
        t: (n + 0.5) / peaksPerBand + noise2D(n * 3.1, k * 5.7) * 0.06,
        height: 0.45 + 0.55 * Math.abs(noise2D(n * 9.4, k * 2.2)),
        width: 0.1 / scale,
        sharpness: peakExponent(sharpness),
      });
    }

    layers.push(
      ridgeLayer({
        index: layers.length,
        depth: p * 0.3,
        samples,
        width,
        height,
        crest: (t) =>
          base -
          amplitude *
            (0.55 *
              ridgeNoise(noise2D, t, 12.5 + k * 8.3, {
                octaves,
                frequency: scaleFrequency(5, width),
                ridgeWeight: ridgeWeightFor(0.9, sharpness),
              }) +
              0.45 * peakField(peaks, t)),
      }),
    );
  }

  // The floor itself: broad, low-relief ground receding toward the viewer.
  for (let k = 0; k < 2; k += 1) {
    const base = horizonY + height * (0.36 + k * 0.12) * nesting;
    layers.push(
      ridgeLayer({
        index: layers.length,
        depth: 0.42 + k * 0.16,
        samples,
        width,
        height,
        crest: (t) =>
          base -
          height *
            0.05 *
            ridgeNoise(noise2D, t, 40.2 + k * 6.9, {
              octaves,
              frequency: scaleFrequency(1.8, width),
              ridgeWeight: ridgeWeightFor(0.2, sharpness),
            }),
      }),
    );
  }

  // Two low rolling spurs framing a soft split near centre-bottom.
  const split = 0.5 + noise2D(21.3, 4.4) * 0.05;
  // The framing spurs pull in toward the split as the viewer climbs.
  const gap = 0.07 * nesting;

  for (const [k, side] of [[0, 'left'], [1, 'right']]) {
    const tipT = side === 'left' ? split - gap : split + gap;
    const tipY = height * (1.0 + k * 0.02);
    const outerY = height * (0.74 - k * 0.02);

    layers.push(
      ridgeLayer({
        index: layers.length,
        depth: 0.82 + k * 0.18,
        samples,
        width,
        height,
        crest: (t) =>
          spurCrest({
            t,
            side,
            tipT,
            tipY,
            outerY,
            plunge: height * 0.32,
            ease: 1.7,
            // Linear, for the same reason as v-valley: a sub-1 exponent puts a
            // vertical tangent at the tip and the split reads as a cliff.
            fall: 1,
          }) -
          height *
            0.035 *
            ridgeNoise(noise2D, t, 70 + k * 12.1, {
              octaves,
              frequency: scaleFrequency(2.4, width),
              ridgeWeight: ridgeWeightFor(0.2, sharpness),
            }),
      }),
    );
  }

  return {
    archetype: 'valley-floor',
    width,
    height,
    horizonY,
    mistAfter: 1,
    layers,
  };
}
