// render.js — SVG paint: sky, mist/haze, polygons, light/dark shadow split,
// stars/moon. Consumes the geometryItems returned by an archetype generator
// plus the lighting and palette output.
//
// The pseudo-3D split (CONTEXT.md section 6) divides each layer along an
// internal boundary, distinct from its silhouette against the sky: the band
// immediately below the crest is darkened wherever that facet faces away from
// the light. That band is the only part of a layer most scenes actually show —
// everything deeper is occluded by the next layer forward — so shading it is
// what reads as relief.

import { mistTone, shade } from './palette.js';
import { clamp01, EDGE_BLEED, lerp } from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// A full-canvas fill, carried past the viewBox on every side. See EDGE_BLEED in
// utils.js for why: the frame's edge can land between device pixels, and a shape
// that stops exactly on the viewBox edge leaves that column half-covered.
function bledRect(width, height, attributes) {
  return el('rect', {
    x: -EDGE_BLEED,
    y: -EDGE_BLEED,
    width: width + EDGE_BLEED * 2,
    height: height + EDGE_BLEED * 2,
    ...attributes,
  });
}

export function render(svg, geometry, paint) {
  const { width, height, horizonY, layers, mistAfter = 1 } = geometry;
  const {
    palette,
    lighting,
    shadow,
    haze = 0.5,
    valleyMist = 0,
    mistDistance = 0.5,
    // CONTEXT.md section 5: these hide the drawn bodies and the star field
    // only. Everything else time of day drives — sky gradient, mist tint, the
    // shadow angle it can seed — is untouched by them.
    showBodies = true,
    showStars = true,
  } = paint;
  const mist = hazeBand(haze);
  // The haze band's own top edge, needed before the defs pass now that its
  // gradient is anchored in user space rather than to the rect's bounding box.
  const hazeTop = horizonY - height * mist.spread;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // `meet`, not `slice`: once the frame is height-capped its box is wider than
  // the scene, and cropping would show the user something other than the file
  // they are about to download.
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.replaceChildren();

  const defs = el('defs');
  defs.append(
    skyGradient(lighting, height),
    mistGradient(lighting, mist.opacity, hazeTop, height),
  );
  // Only defined when something references them, so hiding the bodies leaves no
  // orphan gradients in the downloaded file.
  if (showBodies) {
    // Both glow tones come from lighting.js now (Phase 6.13) rather than being
    // fixed here. The sun's tracks its hour-indexed ramp and is the same value
    // its disc is filled with, so the halo can never disagree with the body
    // inside it; the moon's is the constant it always was.
    defs.append(
      bodyGlow('sun-glow', lighting.sun.glow),
      bodyGlow('moon-glow', lighting.moon.glow),
    );
  }

  // Fills are resolved once, up front: the mist tone for a layer is derived
  // from that layer's own fill, so the defs pass needs them before the paint
  // loop reaches them.
  const bases = layers.map((layer) => palette.terrainAt(layer.depth));
  const mistPlan = valleyMistPlan(layers, bases, valleyMist, mistDistance);

  // One gradient and one clip per misted layer, each spanning that layer's own
  // pair of anchors. Defined up front; the clips forward-reference the base
  // paths, which resolve by id regardless of document order.
  const summits = layers.map(summitY);
  mistPlan.forEach((plan, i) => {
    if (!plan) return;
    const [top, bottom] = mistAnchors(summits, i, height);
    defs.append(
      valleyMistGradient(`valley-mist-${i}`, top, bottom, plan),
      valleyMistClip(`valley-clip-${i}`, `layer-${i}`),
    );
  });

  svg.append(defs);

  svg.append(bledRect(width, height, { fill: 'url(#sky-gradient)' }));

  if (showStars && lighting.starOpacity > 0.01) svg.append(stars(lighting));
  if (showBodies) svg.append(...celestialBodies(lighting));

  // The haze is painted over the farthest layers and under the nearer ones, so
  // distance reads as atmosphere rather than as a band floating in the sky gap.
  // Each archetype says where that break falls, since "how far back the
  // distance begins" differs between a wide valley and a narrow gorge.
  layers.forEach((layer, i) => {
    if (i === mistAfter + 1 && mist.visible) {
      svg.append(mistBand(hazeTop, width, height));
    }

    const base = bases[i];
    const shape = el('path', { d: polygonPath(layer.points), fill: base });
    // Only identified when a clip is going to reference it, so an unmisted
    // layer — and the whole default scene — keeps its markup unchanged.
    if (mistPlan[i]) shape.setAttribute('id', `layer-${i}`);
    svg.append(shape);

    if (shadow?.enabled) {
      const dark = shade(base, shadow.intensity);
      for (const band of shadowBands(layer, shadow.angle, width, height)) {
        svg.append(el('path', { d: polygonPath(band), fill: dark }));
      }
    }

    // Painted last, over the shadow split: mist sits in front of the terrain,
    // so a misted slope lightens whether or not that facet is shaded.
    if (mistPlan[i]) {
      svg.append(
        bledRect(width, height, {
          fill: `url(#valley-mist-${i})`,
          'clip-path': `url(#valley-clip-${i})`,
        }),
      );
    }
  });

  return svg;
}

// --- pseudo-3D shadow split -------------------------------------------------

// Screen-space light direction. 0deg is light from the right, 90 from directly
// above, 180 from the left. Straight overhead genuinely lights every facet, so
// the split vanishes there by design rather than by accident.
function lightVector(angleDegrees) {
  const rad = (angleDegrees * Math.PI) / 180;
  return { x: Math.cos(rad), y: -Math.sin(rad) };
}

// Splits a layer's crest (or wall edge) into runs of facets that face away from
// the light, and returns one closed band per run. Each band is bounded above by
// the silhouette and below by that silhouette offset into the layer's interior
// — the internal boundary. Because the offset is a constant translation of a
// monotone-in-one-axis polyline, the result cannot self-intersect.
function shadowBands(layer, angle, width, height) {
  const line = layer.line;
  if (!line || line.length < 8) return [];

  const light = lightVector(angle);
  const wall = layer.kind === 'wall';

  // Nearer layers carry deeper shadow, which reinforces the depth ordering.
  const reach = wall
    ? width * 0.035 * (0.5 + 0.9 * layer.depth)
    : height * 0.055 * (0.5 + 0.9 * layer.depth);

  const offset = wall
    ? { x: layer.side === 'right' ? reach : -reach, y: 0 }
    : { x: 0, y: reach };

  // The facing test reads the slope across a window rather than between
  // neighbouring samples. Per-sample gradients flip sign on the finest noise
  // octave, which shreds every hillside into dozens of one-sample runs and
  // paints the scene as a picket fence of tick marks instead of shaded slopes.
  const span = Math.max(2, Math.round(line.length / 55));
  const shaded = line.map((_, i) => facesAway(line, i, span, light, wall, layer.side));
  // Depth follows local steepness, so a near-flat stretch takes a sliver of
  // shadow and a cliff face takes the full depth. With a constant depth the
  // gentler archetypes get uniform blobs pasted onto flat ground.
  const relief = line.map((_, i) => reliefAt(line, i, span, wall));

  // Runs below this are noise rather than terrain features.
  const minRun = Math.max(4, Math.round(line.length / 90));

  const bands = [];
  let start = null;

  for (let i = 0; i <= line.length; i += 1) {
    const on = i < line.length && shaded[i];
    if (on && start === null) start = i;
    if (on || start === null) continue;

    const end = i - 1;
    if (end - start + 1 >= minRun) bands.push(band(line, relief, start, end, offset));
    start = null;
  }

  return bands;
}

// Local steepness normalised to 0..1. Beyond a 1:1 slope the face is as shaded
// as it is going to get.
function reliefAt(line, i, span, wall) {
  const a = line[Math.max(0, i - span)];
  const b = line[Math.min(line.length - 1, i + span)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const along = wall ? dy : dx;
  if (along === 0) return 1;
  return Math.min(1, Math.abs((wall ? dx : dy) / along));
}

// One shaded run as a closed band: the silhouette on top, the same line pushed
// into the layer's interior underneath. The offset tapers to nothing at both
// ends so the band reads as a shaded face rather than a slab with cut ends.
function band(line, relief, start, end, offset) {
  const top = line.slice(start, end + 1);
  const last = top.length - 1;

  const bottom = top
    .map(([x, y], j) => {
      // Clamp before the fractional power: rounding can make the sine a hair
      // negative at j === last, and a negative base raised to a fractional
      // exponent is NaN, which silently poisons the whole path.
      const taper = Math.max(0, Math.sin((Math.PI * j) / last)) ** 0.55;
      const depth = taper * relief[start + j];
      return [x + offset.x * depth, y + offset.y * depth];
    })
    .reverse();

  return [...top, ...bottom];
}

// Vertical exaggeration applied to the terrain before the facing test. Without
// it the test gates on absolute steepness, which varies enormously between
// archetypes: Stacked ridges never exceeds a slope of 0.65 and would take no
// shadow at all, while a gorge wall reaches 5.8. Exaggerating relief makes the
// test gate on *aspect* — which way a facet faces — so every archetype shades
// comparably. The light's height still matters: as it rises toward overhead the
// shading recedes to progressively steeper slopes and vanishes at the zenith.
const RELIEF_GAIN = 6;

// Surface normal of the facet at index i, dotted with the light direction.
// The normal points out of the terrain: upward for a crest, sideways for a
// wall, which is why the two cases differ.
function facesAway(line, i, span, light, wall, side) {
  const a = line[Math.max(0, i - span)];
  const b = line[Math.min(line.length - 1, i + span)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return false;

  // Exaggerate the axis the surface varies along: height for a crest, the
  // horizontal offset for a wall.
  const tx = wall ? dx * RELIEF_GAIN : dx;
  const ty = wall ? dy : dy * RELIEF_GAIN;

  const normal = wall && side === 'right' ? { x: -ty, y: tx } : { x: ty, y: -tx };
  return normal.x * light.x + normal.y * light.y <= 0;
}

// --- valley mist -------------------------------------------------------------

// One soft vertical fade per depth layer (CONTEXT.md section 5): fully clear at
// that layer's own highest crest point, building smoothly to a pale wash at its
// own bottom anchor, painted over the layer's base fill and clipped to its
// shape.
//
// Both anchors are per layer. The top one is its own summit, so a background
// ridge and a foreground ridge each start fading from wherever they happen to
// peak. The bottom one is the *next-nearer layer's summit* — not the canvas
// floor, which is what 5.8/5.9 used and what this replaces.
//
// The canvas floor was wrong because almost none of that span is on screen. A
// layer is only ever visible in the sliver above whatever is drawn in front of
// it, so a distant layer's fade had barely left zero before the next layer
// covered it — mist read as absent in the distance — while the nearest misted
// layer, whose nominal span is short and largely visible, completed its fade in
// full view and read as one flat strong band. Same mechanism, opposite
// symptoms, one cause. Anchoring to the occluder's summit fixes both: that
// occluder can never cover this layer *above its own peak*, at any x, so the
// fade is guaranteed to complete within (or just past) the visible sliver
// without anyone having to solve the real per-x occlusion boundary.
//
// This whole effect replaced a per-point crest-topology mechanism that measured
// local dip depth. That version was self-consistent but wrong to look at: three
// nested translucent bands read as steps rather than a fade, and hugging the
// crest put the mist along the ridgelines instead of pooling below them.

// Peak wash at the canvas bottom when the slider is at 1 and the layer takes
// full distance weighting. Past roughly this a layer stops reading as terrain.
const VALLEY_MIST_MAX = 0.5;

// What the nearest *non-excluded* layer keeps at full Distance. Not zero: the
// spec asks for "very little" mist there, not none, so the depth cue reads as
// a gradient across the stack rather than as the front layer switching off.
const VALLEY_MIST_NEAR_FLOOR = 0.08;

// The response curve keeps the bottom of the slider under a perceptible alpha.
// Emitting defs that paint nothing is just file size, so the effect stays off
// until it can actually be seen.
const VALLEY_MIST_MIN_STRENGTH = 0.01;

// Decides, once per render, which layers take mist and how much (CONTEXT.md
// section 5, Phase 5.9). Returns one entry per layer, null where none applies.
//
// Direction matters here and is easy to invert. `layer.depth` is 0 at the
// *farthest* layer and 1 at the nearest — the same axis the palette's near/far
// ramp reads — so distance from the viewer is `1 - depth`, and mist has to grow
// as depth falls. Reading it the other way would put the heaviest mist on the
// foreground, which is the inversion this control exists to avoid.
function valleyMistPlan(layers, bases, strength, distance) {
  if (strength < VALLEY_MIST_MIN_STRENGTH) return layers.map(() => null);

  // The frontmost layer is excluded outright at every slider value. It is what
  // the viewer is standing in; mist on it flattens the whole depth cue that the
  // rest of this is building. Painting order is far-to-near, so it is the last.
  const excluded = layers.length - 1;
  const misted = layers.filter((_, i) => i !== excluded);
  if (!misted.length) return layers.map(() => null);

  const depths = misted.map((layer) => layer.depth);
  const nearest = Math.max(...depths);
  const farthest = Math.min(...depths);
  const span = nearest - farthest;

  return layers.map((layer, i) => {
    if (i === excluded) return null;

    // 0 at the nearest layer still taking mist, 1 at the farthest. A single
    // misted layer has no spread to sit in, so it takes the full weight.
    const remoteness = span > 0 ? (nearest - layer.depth) / span : 1;
    // Distance 0 leaves every misted layer equal; 1 grades them fully. Linear
    // between, per the spec — this one is not on a response curve.
    const weight = lerp(1, lerp(VALLEY_MIST_NEAR_FLOOR, 1, remoteness), clamp01(distance));

    return {
      tone: mistTone(bases[i]),
      maxOpacity: VALLEY_MIST_MAX * strength * weight,
    };
  });
}

// The layer's own summit: the smallest y anywhere on its silhouette. `line` is
// the open crest where an archetype provides one; walls fall back to the closed
// polygon, whose topmost point is the top of the wall.
function summitY(layer) {
  let top = Infinity;
  for (const [, y] of layer.line ?? layer.points) {
    if (y < top) top = y;
  }
  return top;
}

// Shortest fade a layer is allowed. Under this the three stops sit close enough
// together to read as a hard tint edge rather than a gradient.
const VALLEY_MIST_MIN_SPAN = 24;

// This layer's fade anchors: its own summit down to its occluder's summit.
// `summits[i + 1]` is the next-nearer layer because layers are ordered and
// painted far-to-near; for the last misted layer that is the excluded
// true-foreground layer, which is exactly the intent.
//
// Three degenerate cases, and they do not all want the same fallback.
//
// Inverted — the nearer layer peaks *above* this one, so there is no downward
// span to fade across. Common, not exotic: any archetype whose near layers
// sweep up the frame edges (Open valley, Gorge) has a foreground summit at the
// very top of the canvas.
//
// Off-canvas — both summits sit above y=0, so the whole fade would resolve
// before the first visible row and the layer would paint at full ceiling
// everywhere on screen. A flat opaque wash is worse than a weak one.
//
// Both of those revert to the 5.8/5.9 canvas-floor anchor: too long, but never
// broken. The third case is different in kind —
//
// Too tight — the span is positive and on-canvas but shorter than a gradient
// can express. Clamping to the minimum keeps this continuous with the ordinary
// case; sending it to the canvas floor instead would let a 1px difference in
// summit height flip a layer between a fast fade and a nearly invisible one.
function mistAnchors(summits, i, height) {
  const top = summits[i];
  const occluder = summits[i + 1];
  const usable = occluder != null && occluder > top && occluder >= VALLEY_MIST_MIN_SPAN;
  const bottom = usable ? occluder : height;
  return [top, Math.max(bottom, top + VALLEY_MIST_MIN_SPAN)];
}

// userSpaceOnUse, not objectBoundingBox: the fade has to start at an absolute
// scene coordinate (this layer's summit) and end at another (its occluder's).
// Against a bounding box those anchors would drift with each shape's extent,
// scaling the fade to each polygon rather than to the scene's depth structure.
function valleyMistGradient(id, top, bottom, { tone, maxOpacity }) {
  const gradient = el('linearGradient', {
    id,
    gradientUnits: 'userSpaceOnUse',
    x1: 0,
    y1: round(top),
    x2: 0,
    y2: round(bottom),
  });

  // Three stops. The middle one sits below a straight line between the ends,
  // which eases the onset so the mist creeps in under the summit instead of
  // starting at a visible rate the moment the crest drops.
  gradient.append(
    el('stop', { offset: 0, 'stop-color': tone, 'stop-opacity': 0 }),
    el('stop', { offset: 0.55, 'stop-color': tone, 'stop-opacity': round(maxOpacity * 0.28, 3) }),
    el('stop', { offset: 1, 'stop-color': tone, 'stop-opacity': round(maxOpacity, 3) }),
  );

  return gradient;
}

// The wash is a full-canvas rect clipped to the layer, and the clip reuses the
// base path by reference rather than repeating its `d`. A layer's polygon runs
// to a few thousand points; copying it per layer would roughly double the
// downloaded file for geometry that is already in it.
function valleyMistClip(id, layerId) {
  const clip = el('clipPath', { id });
  clip.append(el('use', { href: `#${layerId}` }));
  return clip;
}

// --- sky, atmosphere and celestial bodies -----------------------------------

function stars(lighting) {
  const group = el('g', { opacity: round(lighting.starOpacity) });
  for (const star of lighting.stars) {
    group.append(
      el('circle', {
        cx: round(star.x),
        cy: round(star.y),
        r: round(star.r),
        fill: '#ffffff',
        opacity: round(star.opacity),
      }),
    );
  }
  return group;
}

function celestialBodies(lighting) {
  const nodes = [];

  // Both are drawn whenever they carry any opacity, which is what makes the
  // handover at dawn and dusk a crossfade rather than a swap.
  for (const [body, glow] of [
    [lighting.moon, 'moon-glow'],
    [lighting.sun, 'sun-glow'],
  ]) {
    if (body.opacity <= 0.01) continue;
    // Phase 6.13: the fill is the body's own colour, not a constant per body.
    const fill = body.color;

    nodes.push(
      el('circle', {
        cx: round(body.x),
        cy: round(body.y),
        r: round(body.r * 4.5),
        fill: `url(#${glow})`,
        opacity: round(body.opacity * 0.75),
      }),
      el('circle', {
        cx: round(body.x),
        cy: round(body.y),
        r: round(body.r),
        fill,
        opacity: round(body.opacity),
      }),
    );
  }

  return nodes;
}

// Distance haze (CONTEXT.md section 5) — the Color group owns the mist's
// opacity and spread; lighting.js still owns its tint, since Time of day is
// what the spec makes responsible for that. The band's foot is always the
// canvas bottom, so `spread` is how far up into the sky the haze reaches.
//
// The slider re-centres what used to be a pair of fixed constants (0.17 spread
// / 0.7 peak opacity), so the midpoint is close to, but not identical with, the
// Phase 4 default scene.
//
// `spread` is consumed by the caller, which derives the band's top edge once and
// passes it to both the gradient and the rect — the two have to agree on it now
// that the gradient is anchored in user space (see mistGradient).
function hazeBand(haze) {
  const t = Math.min(1, Math.max(0, haze));
  return {
    // Below this the band is invisible anyway, and leaving it out keeps the
    // exported SVG free of a no-op rect.
    visible: t > 0.01,
    opacity: 0.96 * t,
    spread: 0.05 + 0.31 * t,
  };
}

// Bled sideways and downward but not upward: the band's top edge is a zero-
// opacity gradient stop well inside the canvas, so it is not an edge that can
// leave a seam. The two edges that reach the frame are.
function mistBand(top, width, height) {
  return el('rect', {
    x: -EDGE_BLEED,
    y: top,
    width: width + EDGE_BLEED * 2,
    height: height + EDGE_BLEED - top,
    fill: 'url(#mist-gradient)',
  });
}

// Archetypes emit closed polygons in absolute coordinates — crest lines closed
// to the bottom edge, or vertical wall silhouettes closed to a side.
function polygonPath(points, decimals = 2) {
  const at = (value) => round(value, decimals);
  const [first, ...rest] = points;
  const head = `M ${at(first[0])} ${at(first[1])}`;
  const body = rest.map(([x, y]) => `L ${at(x)} ${at(y)}`).join(' ');
  return `${head} ${body} Z`;
}

// userSpaceOnUse, like the valley-mist gradients: the rect this paints is bled
// past the viewBox, and against a bounding box the stops would stretch with it,
// shifting every sky colour by the bleed. Anchored to the canvas instead, the
// ramp is identical whether the rect is bled or not.
function skyGradient(lighting, height) {
  const gradient = el('linearGradient', {
    id: 'sky-gradient',
    gradientUnits: 'userSpaceOnUse',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: height,
  });

  for (const stop of lighting.sky) {
    gradient.append(el('stop', { offset: stop.offset, 'stop-color': stop.color }));
  }

  return gradient;
}

// Same reasoning as skyGradient: anchored to the band's own unbled extent, so
// bleeding the rect moves no stop.
function mistGradient(lighting, peakOpacity, top, height) {
  const gradient = el('linearGradient', {
    id: 'mist-gradient',
    gradientUnits: 'userSpaceOnUse',
    x1: 0,
    y1: round(top),
    x2: 0,
    y2: height,
  });

  gradient.append(
    el('stop', { offset: 0, 'stop-color': lighting.mist, 'stop-opacity': 0 }),
    el('stop', {
      offset: 0.45,
      'stop-color': lighting.mist,
      'stop-opacity': round(peakOpacity),
    }),
    el('stop', { offset: 1, 'stop-color': lighting.mist, 'stop-opacity': 0 }),
  );

  return gradient;
}

function bodyGlow(id, color) {
  const gradient = el('radialGradient', { id });
  gradient.append(
    el('stop', { offset: 0, 'stop-color': color, 'stop-opacity': 0.55 }),
    el('stop', { offset: 0.45, 'stop-color': color, 'stop-opacity': 0.16 }),
    el('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }),
  );
  return gradient;
}

function el(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function round(value, decimals = 2) {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}
