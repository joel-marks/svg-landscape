// Archetype: Gorge.
//
// Shares v-valley's alternating-spur skeleton, but each spur is a steep walled
// shape rather than a rolling hill: the crest holds a plateau most of the way
// in, then breaks sharply to the tip and drops away. Narrower nesting and
// taller walls read as a steep-sided canyon rather than an open valley.

import { createNoise } from '../core/noise.js';
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
  spurCrest,
} from '../core/utils.js';

// Layers mode's region boundaries (CONTEXT.md section 5, Phase 7). Depths are
// the distant sliver at 0 and then spurs from 0.12 to 1.
//
// The background band is wider than v-valley's, which shares this archetype's
// skeleton, and the reason is the terracing: a gorge spur holds a plateau most
// of the way in before breaking at the tip (see `ease: 13` below), so its walls
// stack into visible terraces rather than interlocking wedges. Terraces group
// into bands without losing anything; the wedges did not.
//
// The foreground band is *narrower* than it first looked like it should be, and
// that came out of rendering rather than reasoning. The nearest wall alone
// covers most of the lower frame here — every layer behind it shows only as a
// sliver above its neighbour — so widening the foreground band does not enlarge
// the foreground, it just eats the terraced strip that is the only place the
// middle band is visible at all. 0.9 keeps that strip.
//
// Worth naming rather than treating as a fault: the background band is a sliver
// in this archetype whatever these values are, because the distant ridge down
// the throat of the gorge *is* a sliver by design (`mistAfter: 0`).
export const LAYER_BOUNDARIES = {
  backgroundUntil: 0.25,
  foregroundFrom: 0.9,
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

  // Shares v-valley's elevation model: the head of the gorge rises and the
  // walls close in, reading as looking down into the canyon from higher up.
  const convergeY = horizonFor(elevation, height, 0.64, 0.26);
  const horizonY = convergeY - height * 0.03;
  const nesting = nestingFor(elevation, 1.45, 0.55);
  const axis = 0.5 + noise2D(11.7, 2.9) * 0.05;

  const spurCount =
    featureCount(peakCount, 4, 12, width) + Math.round(clamp01(elevation) * 4);

  const layers = [];

  // A sliver of distant ridge visible down the throat of the gorge.
  layers.push(
    ridgeLayer({
      index: 0,
      depth: 0,
      samples,
      width,
      height,
      crest: (t) =>
        convergeY -
        height *
          0.09 *
          ridgeNoise(noise2D, t, 4.2, {
            octaves,
            frequency: scaleFrequency(5, width),
            ridgeWeight: ridgeWeightFor(0.9, sharpness),
          }),
    }),
  );

  for (let j = 0; j < spurCount; j += 1) {
    const d = spurCount === 1 ? 1 : j / (spurCount - 1);
    const side = j % 2 === 0 ? 'left' : 'right';

    const tipY = convergeY + Math.pow(d, 1.3) * (height - convergeY);
    // Tighter reach than v-valley — the walls close in on the axis.
    const reach = (0.015 + 0.05 * d) * nesting;
    const tipT = side === 'left' ? axis + reach : axis - reach;
    // Rise climbs steeply with proximity while the tips fall away, so the
    // plateau tops stay bunched in a narrow band and stack into visible
    // terraces instead of the nearest wall swallowing everything behind it.
    const outerY = tipY - height * (0.06 + 0.42 * d);

    // Rock faces carry less relief than hillsides.
    const amplitude = height * (0.015 + 0.03 * d);
    const row = 80 + j * 15.3;

    layers.push(
      ridgeLayer({
        index: layers.length,
        depth: 0.12 + 0.88 * d,
        samples,
        width,
        height,
        crest(t) {
          const base = spurCrest({
            t,
            side,
            tipT,
            tipY,
            outerY,
            plunge: height * 0.4,
            // High ease holds a near-flat plateau most of the way in, then
            // breaks almost vertically at the tip — the defining gorge profile.
            // The break belongs on the approach, not on the far side: a sub-1
            // fall bulges the spur's back into a convex dome that swallows the
            // whole quadrant and hides every terrace behind it.
            ease: 13,
            fall: 1,
          });
          const h = ridgeNoise(noise2D, t, row, {
            octaves,
            frequency: scaleFrequency(3.4, width),
            ridgeWeight: ridgeWeightFor(0.25, sharpness),
          });
          return base - amplitude * h;
        },
      }),
    );
  }

  return {
    archetype: 'gorge',
    width,
    height,
    horizonY,
    mistAfter: 0,
    layers,
  };
}
