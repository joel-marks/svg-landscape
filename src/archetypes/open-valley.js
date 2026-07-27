// Archetype: Open valley.
// Owns its own generation logic. Signature per CONTEXT.md section 3:
// generate(params) -> geometryItems. `params` carries the global `elevation`
// (section 6a) even though this archetype does not use it meaningfully yet.
//
// Shape: layered ridges receding to a horizon, with a valley envelope that
// flattens each layer toward the centre and lifts it at the edges. The
// envelope strengthens with proximity, so the near layers read as valley walls
// framing an open middle, and the far layers read as ridges across the head of
// the valley.

import { createNoise, fbm, ridgedFbm } from '../noise.js';

const LAYER_COUNT = 7;

export function generate(params = {}) {
  const {
    width = 1600,
    height = 900,
    seed = 0,
    complexity = 0.5,
    // Accepted and deliberately unused this phase — see CONTEXT.md section 6a.
    // V valley implements it first; other archetypes adopt it incrementally.
    elevation = 0.5,
  } = params;
  void elevation;

  const noise2D = createNoise(seed);
  const horizonY = height * 0.52;
  const octaves = 3 + Math.round(complexity * 3);
  const samples = 200 + Math.round(complexity * 160);

  const layers = [];

  for (let i = 0; i < LAYER_COUNT; i += 1) {
    // depth: 0 = farthest ridge, 1 = nearest foreground.
    const depth = i / (LAYER_COUNT - 1);

    // The valley is built from a crest line interpolated between two anchors:
    // where the layer sits at the valley edge, and where it sits at the centre.
    // Nearer layers climb higher at the edge and drop further at the centre,
    // so they only appear as walls at the sides and fall away below the frame
    // in the middle. That opening is what makes the valley read as open rather
    // than as a stack of ridges.
    const edgeY = horizonY - Math.pow(depth, 1.15) * height * 0.34;
    const centreY =
      horizonY + Math.pow(depth, 1.3) * (height - horizonY) * 1.15;

    // Noise has to stay legible against the structural sweep, or the steep
    // flanks of the near walls flatten into straight diagonal wedges.
    const amplitude = height * (0.085 + 0.14 * depth);

    // Far ridges are finer and more peaked; near walls are broader and rounder.
    const frequency = 1.6 + (1 - depth) * 2.4;
    const ridgeWeight = 1 - depth;

    // Offset each layer's valley axis so the walls are not mirror-symmetric.
    const axis = 0.5 + noise2D(i * 7.1, 99.3) * 0.12;
    const reach = Math.max(axis, 1 - axis);

    // Decorrelate layers by walking a separate row of the noise field.
    const row = i * 17.3;

    const points = [];

    for (let s = 0; s < samples; s += 1) {
      const t = s / (samples - 1);
      const x = t * width;

      const rolling = fbm(noise2D, t, row, { octaves, frequency }) * 0.5 + 0.5;
      const ridged = ridgedFbm(noise2D, t, row, { octaves, frequency });
      const h = rolling * (1 - ridgeWeight) + ridged * ridgeWeight;

      // 0 on the valley axis, 1 at the outermost edge. Warping it before the
      // curve keeps the wall lines from reading as a smooth parabola.
      const fromAxis = Math.min(1, Math.abs(t - axis) / reach);
      const warp = fbm(noise2D, t, row + 41.7, { octaves: 2, frequency: 1.4 });
      const envelope = Math.pow(clamp01(fromAxis + warp * 0.18), 1.45);
      const crestY = centreY + (edgeY - centreY) * envelope;

      points.push([x, crestY - amplitude * h]);
    }

    layers.push({ index: i, depth, edgeY, centreY, points });
  }

  return { archetype: 'open-valley', width, height, horizonY, layers };
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
