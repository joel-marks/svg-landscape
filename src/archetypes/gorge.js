// Archetype: Gorge.
//
// Shares v-valley's alternating-spur skeleton, but each spur is a steep walled
// shape rather than a rolling hill: the crest holds a plateau most of the way
// in, then breaks sharply to the tip and drops away. Narrower nesting and
// taller walls read as a steep-sided canyon rather than an open valley.

import { createNoise } from '../noise.js';
import {
  octaveCount,
  ridgeLayer,
  ridgeNoise,
  sampleCount,
  scaleCount,
  scaleFrequency,
  spurCrest,
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

  const convergeY = height * 0.46;
  const horizonY = convergeY - height * 0.03;
  const axis = 0.5 + noise2D(11.7, 2.9) * 0.05;

  const spurCount = scaleCount(6 + Math.round(complexity * 3), width);

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
            ridgeWeight: 0.9,
          }),
    }),
  );

  for (let j = 0; j < spurCount; j += 1) {
    const d = spurCount === 1 ? 1 : j / (spurCount - 1);
    const side = j % 2 === 0 ? 'left' : 'right';

    const tipY = convergeY + Math.pow(d, 1.3) * (height - convergeY);
    // Tighter reach than v-valley — the walls close in on the axis.
    const reach = 0.015 + 0.05 * d;
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
            plunge: height * 0.5,
            // High ease holds a near-flat plateau most of the way in, then
            // breaks almost vertically at the tip — the defining gorge profile.
            ease: 4.5,
            fall: 0.28,
          });
          const h = ridgeNoise(noise2D, t, row, {
            octaves,
            frequency: scaleFrequency(3.4, width),
            ridgeWeight: 0.25,
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
