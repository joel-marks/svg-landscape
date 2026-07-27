// render.js — SVG paint: sky, mist/haze, polygons, light/dark shadow split,
// stars/moon. Consumes the geometryItems returned by an archetype generator
// plus the lighting and palette output; the pseudo-3D light/dark sub-path split
// is its own build task, not a style toggle (CONTEXT.md section 6).
//
// Phase 2 scope: sky gradient, flat-filled ridge polygons, horizon haze band.
// Shadow split, stars/moon, and time-of-day tinting arrive in Phase 4.

const SVG_NS = 'http://www.w3.org/2000/svg';

// How many of the farthest layers sit behind the haze band.
const MIST_AFTER_LAYER = 1;

export function render(svg, geometry, palette) {
  const { width, height, horizonY, layers } = geometry;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.replaceChildren();

  const defs = el('defs');
  defs.append(skyGradient(palette), mistGradient(palette));
  svg.append(defs);

  svg.append(
    el('rect', {
      x: 0,
      y: 0,
      width,
      height,
      fill: 'url(#sky-gradient)',
    }),
  );

  // The haze is painted over the farthest layers and under the nearer ones, so
  // distance actually reads as atmosphere rather than as a band floating in
  // the sky gap.
  for (const layer of layers) {
    if (layer.index === MIST_AFTER_LAYER + 1) svg.append(mistBand(horizonY, width, height));

    svg.append(
      el('path', {
        d: layerPath(layer, width, height),
        fill: palette.terrainAt(layer.depth),
      }),
    );
  }

  return svg;
}

function mistBand(horizonY, width, height) {
  const top = horizonY - height * 0.17;
  return el('rect', {
    x: 0,
    y: top,
    width,
    height: height - top,
    fill: 'url(#mist-gradient)',
  });
}

// Silhouette across the top, then closed down the sides to the bottom edge.
function layerPath(layer, width, height) {
  const [first, ...rest] = layer.points;
  const head = `M ${round(first[0])} ${round(first[1])}`;
  const body = rest.map(([x, y]) => `L ${round(x)} ${round(y)}`).join(' ');
  return `${head} ${body} L ${round(width)} ${height} L 0 ${height} Z`;
}

function skyGradient(palette) {
  const gradient = el('linearGradient', {
    id: 'sky-gradient',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
  });

  for (const stop of palette.skyStops) {
    gradient.append(
      el('stop', { offset: stop.offset, 'stop-color': stop.color }),
    );
  }

  return gradient;
}

function mistGradient(palette) {
  const gradient = el('linearGradient', {
    id: 'mist-gradient',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
  });

  gradient.append(
    el('stop', { offset: 0, 'stop-color': palette.mist, 'stop-opacity': 0 }),
    el('stop', { offset: 0.45, 'stop-color': palette.mist, 'stop-opacity': 0.7 }),
    el('stop', { offset: 1, 'stop-color': palette.mist, 'stop-opacity': 0 }),
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
