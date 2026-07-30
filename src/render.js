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

import { shade } from './palette.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function render(svg, geometry, paint) {
  const { width, height, horizonY, layers, mistAfter = 1 } = geometry;
  const { palette, lighting, shadow } = paint;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // `meet`, not `slice`: once the frame is height-capped its box is wider than
  // the scene, and cropping would show the user something other than the file
  // they are about to download.
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.replaceChildren();

  const defs = el('defs');
  defs.append(
    skyGradient(lighting),
    mistGradient(lighting),
    bodyGlow('sun-glow', '#fff3d4'),
    bodyGlow('moon-glow', '#dfe8f5'),
  );
  svg.append(defs);

  svg.append(el('rect', { x: 0, y: 0, width, height, fill: 'url(#sky-gradient)' }));

  if (lighting.starOpacity > 0.01) svg.append(stars(lighting));
  svg.append(...celestialBodies(lighting));

  // The haze is painted over the farthest layers and under the nearer ones, so
  // distance reads as atmosphere rather than as a band floating in the sky gap.
  // Each archetype says where that break falls, since "how far back the
  // distance begins" differs between a wide valley and a narrow gorge.
  layers.forEach((layer, i) => {
    if (i === mistAfter + 1) svg.append(mistBand(horizonY, width, height, lighting));

    const base = palette.terrainAt(layer.depth);
    svg.append(el('path', { d: polygonPath(layer.points), fill: base }));

    if (!shadow?.enabled) return;

    const dark = shade(base, shadow.intensity);
    for (const band of shadowBands(layer, shadow.angle, width, height)) {
      svg.append(el('path', { d: polygonPath(band), fill: dark }));
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
  for (const [body, glow, fill] of [
    [lighting.moon, 'moon-glow', '#eef3fb'],
    [lighting.sun, 'sun-glow', '#fff6de'],
  ]) {
    if (body.opacity <= 0.01) continue;

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

function mistBand(horizonY, width, height, lighting) {
  const top = horizonY - height * 0.17;
  return el('rect', {
    x: 0,
    y: top,
    width,
    height: height - top,
    fill: 'url(#mist-gradient)',
  });
}

// Archetypes emit closed polygons in absolute coordinates — crest lines closed
// to the bottom edge, or vertical wall silhouettes closed to a side.
function polygonPath(points) {
  const [first, ...rest] = points;
  const head = `M ${round(first[0])} ${round(first[1])}`;
  const body = rest.map(([x, y]) => `L ${round(x)} ${round(y)}`).join(' ');
  return `${head} ${body} Z`;
}

function skyGradient(lighting) {
  const gradient = el('linearGradient', {
    id: 'sky-gradient',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
  });

  for (const stop of lighting.sky) {
    gradient.append(el('stop', { offset: stop.offset, 'stop-color': stop.color }));
  }

  return gradient;
}

function mistGradient(lighting) {
  const gradient = el('linearGradient', {
    id: 'mist-gradient',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
  });

  gradient.append(
    el('stop', { offset: 0, 'stop-color': lighting.mist, 'stop-opacity': 0 }),
    el('stop', { offset: 0.45, 'stop-color': lighting.mist, 'stop-opacity': 0.7 }),
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

function round(value) {
  return Math.round(value * 100) / 100;
}
