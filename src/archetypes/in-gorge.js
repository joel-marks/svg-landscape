// Archetype: In gorge.
//
// The viewer stands inside the canyon. Near-vertical walls fill the left and
// right edges and are built as vertical silhouettes (x as a function of y)
// rather than crest lines, leaving a narrow gap through which distant peaks are
// visible. The far wall on each side leans in at the top and the near wall
// leans in at the bottom, so both stay visible instead of one hiding the other.

import { createNoise, fbm } from '../noise.js';
import {
  closeToSide,
  featureCount,
  lerp,
  octaveCount,
  ridgeLayer,
  ridgeNoise,
  ridgeWeightFor,
  sampleCount,
  scaleFrequency,
  wallPoints,
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
  // The one archetype where elevation is still a no-op, by decision rather than
  // omission (CONTEXT.md section 6a): a composition built from foreground walls
  // filling the frame edges has no obvious viewer-height analog, and forcing one
  // would mean redesigning the archetype. Deferred, and the UI disables the
  // control here so the inertness reads as intentional.
  void elevation;

  const noise2D = createNoise(seed);
  const octaves = octaveCount(complexity);
  const samples = sampleCount(complexity, width);
  const horizonY = height * 0.62;

  const layers = [];

  // Distant peaks seen through the gap. Drawn full width; the walls cover
  // whatever falls outside the opening.
  for (let k = 0; k < 2; k += 1) {
    layers.push(
      ridgeLayer({
        index: layers.length,
        depth: k * 0.1,
        samples,
        width,
        height,
        crest: (t) =>
          horizonY +
          height * 0.05 * k -
          height *
            (0.17 - k * 0.05) *
            ridgeNoise(noise2D, t, 6.1 + k * 11.3, {
              octaves,
              frequency: scaleFrequency(6 - k, width),
              ridgeWeight: ridgeWeightFor(0.9, sharpness),
            }),
      }),
    );
  }

  // The canyon floor, closing off the ground between the walls. Without it the
  // distant ridges fill the bottom of the gap and the enclosure reads as a
  // window rather than a place the viewer is standing in.
  layers.push(
    ridgeLayer({
      index: layers.length,
      depth: 0.32,
      samples,
      width,
      height,
      crest: (t) =>
        height * 0.94 -
        height *
          0.05 *
          ridgeNoise(noise2D, t, 120.7, {
            octaves,
            frequency: scaleFrequency(2, width),
            ridgeWeight: ridgeWeightFor(0.2, sharpness),
          }),
    }),
  );

  // Wall layers per side, far to near. Far walls lean in at the top of frame
  // and near walls at the bottom, so each stays visible instead of the nearest
  // one hiding everything behind it. Width adds strata rather than stretching
  // two walls across a wide canvas.
  const wallCount = featureCount(peakCount, 2, 5, width);
  const wallSamples = Math.round(120 + complexity * 100);

  for (let m = 0; m < wallCount; m += 1) {
    const q = wallCount === 1 ? 1 : m / (wallCount - 1);
    const topReach = lerp(0.34, 0.1, q);
    const bottomReach = lerp(0.18, 0.46, q);

    for (const side of ['left', 'right']) {
      const row = 200 + m * 31.1 + (side === 'left' ? 0 : 17.9);

      const points = wallPoints(wallSamples, height, (t) => {
        const lean = topReach + (bottomReach - topReach) * t;
        const jitter =
          fbm(noise2D, t, row, { octaves: 3, frequency: 3.2 }) *
          (0.025 + q * 0.015);
        const offset = Math.max(0.005, lean + jitter) * width;
        return side === 'left' ? offset : width - offset;
      });

      // The only non-crest layers in the project: a vertical silhouette, so the
      // shadow boundary has to be offset horizontally rather than downward.
      layers.push({
        index: layers.length,
        depth: 0.45 + 0.55 * q,
        kind: 'wall',
        side,
        line: points,
        points: closeToSide(points, side, width, height),
      });
    }
  }

  return {
    archetype: 'in-gorge',
    width,
    height,
    horizonY,
    mistAfter: 1,
    layers,
  };
}
