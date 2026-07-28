// Archetype: V valley.
//
// Alternating left/right spurs nesting toward a convergence point. Merges the
// former "V valley" and "rising" variants into one generator driven by
// `elevation` (CONTEXT.md section 4), and is the archetype where the section 6a
// elevation model is implemented first.
//
// Elevation moves four things at once, all continuously — there is no threshold
// and no second code path:
//   low  -> convergence sits low in frame, spurs are few, broad and tall
//   high -> convergence and horizon rise, spurs multiply and nest tighter,
//           reading as looking down into a narrowing funnel.

import { createNoise } from '../noise.js';
import {
  clamp01,
  lerp,
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
  const e = clamp01(elevation);
  const noise2D = createNoise(seed);
  const octaves = octaveCount(complexity);
  const samples = sampleCount(complexity, width);

  // Horizon and convergence rise together as the viewer climbs.
  const convergeY = lerp(height * 0.72, height * 0.3, e);
  const horizonY = convergeY - height * 0.03;
  const axis = 0.5 + noise2D(3.3, 8.1) * 0.06;

  // Spur count grows with elevation (tighter nesting), complexity, and width.
  const spurCount = scaleCount(
    4 + Math.round(e * 6) + Math.round(complexity * 2),
    width,
  );

  // How far each tip reaches past the axis, and how tall the spurs stand.
  const spread = lerp(1.35, 0.6, e);
  const riseScale = lerp(1, 0.72, e);

  const layers = [];

  // Distant ridges across the head of the valley.
  for (let k = 0; k < 2; k += 1) {
    const amplitude = height * (0.1 - k * 0.03);
    const base = convergeY + height * 0.02 * k;
    layers.push(
      ridgeLayer({
        index: layers.length,
        depth: k * 0.08,
        samples,
        width,
        height,
        crest: (t) =>
          base -
          amplitude *
            ridgeNoise(noise2D, t, 5.5 + k * 9.1, {
              octaves,
              frequency: scaleFrequency(4.5 - k, width),
              ridgeWeight: 0.85,
            }),
      }),
    );
  }

  for (let j = 0; j < spurCount; j += 1) {
    const d = spurCount === 1 ? 1 : j / (spurCount - 1);
    const side = j % 2 === 0 ? 'left' : 'right';

    const tipY = convergeY + Math.pow(d, 1.2) * (height - convergeY) * 1.1;
    const reach = (0.05 + 0.14 * d) * spread;
    const tipT = side === 'left' ? axis + reach : axis - reach;
    // Generous vertical separation between successive spurs, or the
    // alternation blurs into one soft funnel.
    const outerY = tipY - height * (0.16 + 0.46 * d) * riseScale;

    const amplitude = height * (0.03 + 0.05 * d);
    const row = 60 + j * 13.7;

    layers.push(
      ridgeLayer({
        index: layers.length,
        depth: 0.18 + 0.82 * d,
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
            plunge: height * 0.55,
            // Near-linear: a straight diagonal shoulder is what makes the
            // spurs read as interlocking wedges rather than one soft funnel.
            ease: 1.1,
            // A quicker fall past the tip exposes the next spur behind it.
            fall: 0.5,
          });
          const h = ridgeNoise(noise2D, t, row, {
            octaves,
            frequency: scaleFrequency(2.2 + (1 - d) * 1.8, width),
            ridgeWeight: 0.45,
          });
          return base - amplitude * h;
        },
      }),
    );
  }

  return {
    archetype: 'v-valley',
    width,
    height,
    horizonY,
    mistAfter: 1,
    layers,
  };
}
