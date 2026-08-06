// Archetype: Desert mesa.
//
// Three explicitly different silhouettes stacked back to front — flat-topped
// rock formations, rolling dunes, then a near-flat sand plain. Every other
// archetype in the project varies one terrain idea across its stack; this one
// changes the idea per region, which is what gives it a three-part read whether
// or not the Layers toggle is on.
//
// The mesas are the part the existing noise pipeline could not produce. Ridged
// fbm makes peaks: it folds noise through 1 - |n| so every local maximum is a
// point. A mesa is the opposite shape — a level caprock with the relief all in
// its sides — so the silhouette here is built from explicit trapezoids and the
// noise is demoted to roughening on top of them. Combining formations with
// `Math.max` rather than a sum is what keeps that flat: summed bumps round each
// other's tops off and reintroduce the peak this archetype exists not to have.

import { createNoise } from '../core/noise.js';
import {
  clamp01,
  featureCount,
  horizonFor,
  lerp,
  octaveCount,
  ridgeLayer,
  ridgeNoise,
  sampleCount,
  scaleFrequency,
  smoothstep,
} from '../core/utils.js';

// How many layers each region gets. Fixed rather than derived, and that is the
// decision the boundaries below depend on: with the counts pinned, every
// layer's depth is a known constant and the two boundary values can be placed
// in the *gaps* between regions instead of near a region's own members.
//
// Two per region is the floor for banded mode reading as grouping rather than
// as three layers in three colours; the mesas and dunes take three because both
// carry real depth structure — mesas recede in size and height, dunes in
// wavelength — and two layers show that as a single step.
const MESA_LAYERS = 3;
const DUNE_LAYERS = 3;
const SAND_LAYERS = 2;
const TOTAL_LAYERS = MESA_LAYERS + DUNE_LAYERS + SAND_LAYERS;

// Layers mode's region boundaries (CONTEXT.md section 5, Phase 7). This is the
// archetype Phase 7's Desert theme was authored for, so these two numbers are
// the ones the banded mode is demonstrated with.
//
// Depths are k/7 across eight layers: mesas at 0, 0.143, 0.286; dunes at 0.429,
// 0.571, 0.714; sand at 0.857 and 1. The two boundaries sit at the midpoints of
// the gaps between those runs — 0.36 and 0.79 — which is the one case in the
// project where the arithmetic answer is also the rendered one, because here
// the regions are *built* as regions rather than being read out of a continuum
// after the fact. Placing them mid-gap rather than hard against a member is
// what keeps a later change of ±1 layer in a region from silently regrouping
// the scene.
//
// Phase 7's lesson — layer count and frame area are different measures — still
// applies, but it lands somewhere else here. These two numbers never had to
// move during tuning; everything the renders did change was amplitude and
// spacing (see `groundAt`, and the dune and sand amplitudes below), because in
// this archetype the boundaries decide only which stop a layer takes, while how
// much *frame* each band covers is set entirely by the baseline schedule.
// Moving `foregroundFrom` down would have relabelled dunes as sand and left the
// picture looking the same.
export const LAYER_BOUNDARIES = {
  backgroundUntil: 0.36,
  foregroundFrom: 0.79,
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
  const e = clamp01(elevation);

  // A deterministic 0..1 draw. Same device gorge and stacked-ridges use for
  // their per-scene constants — the seeded field sampled at fixed coordinates
  // — so a scene's formation layout reproduces from its seed like everything
  // else does.
  const draw = (a, b) => noise2D(a, b) * 0.5 + 0.5;

  // The desert floor at the back of the scene. Standing on the pan the horizon
  // sits near the middle of frame; climbing lifts it and opens up the dune
  // field, which is the whole point of gaining height over flat country
  // (CONTEXT.md section 6a).
  const horizonY = horizonFor(elevation, height, 0.54, 0.22);

  // Where each layer's own ground line falls, as a fraction of the drop from
  // the horizon to just past the bottom of frame.
  //
  // Not the power curve the ridge archetypes use. Theirs bunches layers toward
  // the horizon, which is right for a receding range and wrong here: it starves
  // the two sand layers, and the sand plain is a third of the picture. Instead
  // the schedule is fitted to the three regions directly — the mesa layers
  // share a narrow band just under the horizon (they are far away and their
  // ground lines genuinely are nearly the same line), the dunes take the middle
  // of the drop, and the sand takes the rest. Elevation tilts the split: from
  // higher up more of the frame is ground you are looking across, so the dune
  // field grows and the near sand takes proportionally less.
  const duneStart = lerp(0.2, 0.14, e);
  const sandStart = lerp(0.62, 0.72, e);

  function groundAt(k) {
    let f;
    if (k < MESA_LAYERS) {
      f = (k / MESA_LAYERS) * duneStart;
    } else if (k < MESA_LAYERS + DUNE_LAYERS) {
      const p = (k - MESA_LAYERS) / DUNE_LAYERS;
      f = lerp(duneStart, sandStart, p);
    } else {
      const p = (k - MESA_LAYERS - DUNE_LAYERS) / SAND_LAYERS;
      f = lerp(sandStart, 1, p);
    }
    return horizonY + f * (height * 1.06 - horizonY);
  }

  // Cliff steepness. `edge` is the fraction of a formation's half-width given
  // over to its side; the rest is level caprock. Small is a near-vertical face.
  //
  // The low end does not go below 0.12, and that floor is about the shadow
  // model rather than about the geometry. render.js drops shaded runs shorter
  // than line.length / 90 as noise, and a cliff's run length is
  // 90 * edge * halfWidth of the sample count regardless of how finely the
  // crest is sampled — so past a certain steepness the faces stop taking any
  // shading at all and the formations read as flat cut-outs. See the note in
  // the report; at high Peak count on the widest canvases the formations get
  // narrow enough for that to bite anyway (CONTEXT.md section 17, Phase 7.5).
  const edge = lerp(0.42, 0.12, clamp01(sharpness));

  // Dune asymmetry (see `duneCrest`). Sharpness drives this rather than ridge
  // weight: dunes are the softest silhouettes in the project by design, so the
  // control that makes every other archetype pointier has to do something else
  // here, and the honest something is the windward/leeward asymmetry that makes
  // a dune look like a dune.
  const duneWarp = lerp(0.012, 0.075, clamp01(sharpness));

  const layers = [];

  for (let k = 0; k < TOTAL_LAYERS; k += 1) {
    const base = groundAt(k);
    const depth = k / (TOTAL_LAYERS - 1);
    let crest;

    if (k < MESA_LAYERS) {
      const p = MESA_LAYERS === 1 ? 1 : k / (MESA_LAYERS - 1);
      // Nearer formations are taller and their group is more spread out —
      // aerial perspective applied to the rock rather than to the colour. The
      // elevation term is not perspective, it is framing: climbing lifts the
      // horizon by a third of the canvas, and formations that keep their full
      // height off a horizon that high run out of sky and crowd the top edge.
      const amplitude = height * lerp(0.11, 0.19, p) * lerp(1, 0.72, e);
      // Fewer and larger as they come forward, which is what perspective does
      // to a field of objects of similar real size — and it keeps the three
      // layers from stacking into one continuous wall of rock.
      const count = Math.max(2, featureCount(peakCount, 3, 7, width) - k * 2);
      const formations = layOutMesas(draw, count, k, p);
      const row = 30 + k * 21.7;

      crest = (t) => {
        const rock = mesaProfile(formations, t, edge, sharpness);
        // Roughening, weighted away from the caprock. The pan between the
        // formations carries rubble and low relief; a mesa top is level to
        // within a fraction of its own height, and letting the same noise run
        // across it at full strength is what turns the whole thing back into a
        // hill. 0.05 of the amplitude on top is about a metre of caprock.
        const roughness = lerp(0.16, 0.05, rock);
        const n = ridgeNoise(noise2D, t, row, {
          octaves,
          frequency: scaleFrequency(6.5, width),
          // Rubble, not ridges: this is texture on a surface, and the archetype
          // already spends its sharpness on the cliff faces.
          ridgeWeight: 0.2,
        });
        return base - amplitude * (rock + roughness * n * 0.5);
      };
    } else if (k < MESA_LAYERS + DUNE_LAYERS) {
      const p = DUNE_LAYERS === 1 ? 1 : (k - MESA_LAYERS) / (DUNE_LAYERS - 1);
      const amplitude = height * lerp(0.09, 0.15, p);
      // Longer wavelengths in front, so the dune field reads as coming toward
      // the viewer rather than as one texture at three sizes.
      const frequency = scaleFrequency(lerp(3.4, 1.9, p), width);
      const row = 140 + k * 17.3;

      crest = (t) => base - amplitude * duneCrest(noise2D, t, row, frequency, duneWarp, octaves);
    } else {
      const p = SAND_LAYERS === 1 ? 1 : (k - MESA_LAYERS - DUNE_LAYERS) / (SAND_LAYERS - 1);
      // Low, but not as low as a sand plain literally is. The first pass used
      // a third of this and the region's upper edge rendered as a ruled
      // horizontal line across the frame — the one place in the scene where
      // near-flat stopped reading as ground and started reading as a mistake.
      const amplitude = height * lerp(0.032, 0.046, p);
      const row = 240 + k * 13.1;

      crest = (t) =>
        base -
        amplitude *
          ridgeNoise(noise2D, t, row, {
            // Two octaves whatever Complexity says. Sand at this distance has
            // no fine structure to resolve, and the extra octaves only put a
            // tremor along a line whose whole job is to be almost straight.
            octaves: Math.min(2, octaves),
            frequency: scaleFrequency(lerp(1.6, 1.1, p), width),
            ridgeWeight: 0,
          });
    }

    layers.push(ridgeLayer({ index: k, depth, samples, width, height, crest }));
  }

  return {
    archetype: 'desert-mesa',
    width,
    height,
    horizonY,
    // Distance haze breaks in front of the mesas and behind the dunes, so it
    // reads as heat shimmer pooling at the foot of the rock rather than as a
    // band laid over the whole scene.
    mistAfter: MESA_LAYERS - 1,
    layers,
  };
}

// --- mesas -------------------------------------------------------------------

// Formation placement. Evenly divided slots with bounded jitter, rather than
// free random positions: the gaps of sky between formations are as much of the
// silhouette as the formations are, and unconstrained placement collides them
// into one continuous wall often enough to matter. Half-widths stay under half
// a slot for the same reason, so adjacent formations can touch at their skirts
// but their caprocks cannot merge.
function layOutMesas(draw, count, layerIndex, distance) {
  const slot = 1 / count;
  const formations = [];

  for (let i = 0; i < count; i += 1) {
    const a = 3.1 + i * 1.87 + layerIndex * 9.4;
    const b = 7.7 + layerIndex * 4.3;

    formations.push({
      t: (i + 0.5) * slot + (draw(a, b) - 0.5) * slot * 0.34,
      halfWidth: slot * lerp(0.2, 0.44, draw(a + 0.5, b + 1.3)),
      // Distant formations vary less in height: a range of buttes seen from far
      // enough away tends toward one skyline, and the variation that is left is
      // what makes the nearer group read as nearer.
      height: lerp(lerp(0.72, 0.55, distance), 1, draw(a + 1.1, b + 2.9)),
    });
  }

  return formations;
}

// The silhouette of a mesa field at t, in 0..1 of the layer's amplitude.
//
// Each formation is a trapezoid — level caprock across the middle, a straight
// face down each side — plus a wider, much lower talus skirt. The skirt is not
// decoration: a table of rock standing directly on a flat pan reads as a
// cardboard cut-out, and the real thing sits on a debris cone spread from its
// own cliffs. It also gives the shadow split a facet to work on at high
// sharpness, where the cliff itself is too narrow a run to shade (see `edge`).
//
// `Math.max` rather than a sum. Two overlapping trapezoids summed produce a
// step up where they cross and a rounded composite top; taken as a maximum they
// produce one wider table with a notch, which is what a butte cluster looks
// like.
function mesaProfile(formations, t, edge, sharpness) {
  let top = 0;

  for (const f of formations) {
    const u = Math.abs(t - f.t) / f.halfWidth;

    if (u < 1) {
      // 1 across the caprock, falling linearly to 0 across the outer `edge`.
      const ramp = u <= 1 - edge ? 1 : (1 - u) / edge;
      // At low sharpness the corners round off and the face becomes a weathered
      // slope; at high sharpness the trapezoid is left with its corners intact,
      // which is the crisp rim the archetype is named for.
      const face = lerp(smoothstep(ramp), ramp, clamp01(sharpness));
      const h = f.height * face;
      if (h > top) top = h;
    }

    const su = Math.abs(t - f.t) / (f.halfWidth * 2.3);
    if (su < 1) {
      const skirt = f.height * 0.16 * smoothstep(1 - su);
      if (skirt > top) top = skirt;
    }
  }

  return top;
}

// --- dunes -------------------------------------------------------------------

// A dune crest at t, in 0..1.
//
// Real dunes are asymmetric: the windward face is a long shallow climb and the
// leeward slip face is short and steep, at the angle of repose. Plain fbm is
// statistically symmetric and cannot produce that on its own, so the sample
// coordinate is displaced by the field's own value before it is read — the
// standard domain-warp, one extra noise evaluation. Where the field is high the
// sample is pulled further along t, which compresses the crest's leading flank
// and stretches the one behind it.
//
// The direction is deliberate rather than arbitrary: a positive warp puts the
// steep face on the right of every crest, so a scene's dunes all face the same
// way, as a field under one prevailing wind does. A signed-per-scene version
// was tried and reads as an error — dunes facing both ways in one frame look
// like noise, which is exactly what they would be.
function duneCrest(noise2D, t, row, frequency, warp, octaves) {
  const options = {
    // Capped well below what Complexity offers. Detail resolution is a global
    // control, but a dune with fine structure on it is a pile of gravel; the
    // cap is this archetype declining the top of a range rather than ignoring
    // the control, which still moves 2 -> 3 octaves across its travel.
    octaves: Math.min(3, octaves),
    frequency,
    // Zero, not ridgeWeightFor(). These are the softest silhouettes in the
    // project by design (see `duneWarp`).
    ridgeWeight: 0,
  };

  const field = ridgeNoise(noise2D, t, row, options);
  return ridgeNoise(noise2D, t + warp * field, row, options);
}
