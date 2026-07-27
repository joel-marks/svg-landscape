// palette.js — curated theme list + algorithmic palette generator.
// Curated presets feed the Theme preset dropdown; the generator implements the
// complementary / analogous / split-hue strategies behind "Randomize palette",
// with chroma-js handling interpolation for the Color depth bands.
//
// Phase 2 scope: one curated theme, enough shape for render.js to consume.
// The full curated list and the algorithmic generator are Phase 5.

import chroma from 'chroma-js';

export const themes = [
  {
    id: 'alpine-dusk',
    name: 'Alpine dusk',
    // Sky gradient, top of canvas to horizon.
    sky: ['#1e2f57', '#4a5f8c', '#9d7f9e', '#e5a978'],
    // Terrain ramp endpoints: farthest ridge to nearest foreground.
    terrainFar: '#9aa8c0',
    terrainNear: '#141c28',
    // Atmospheric haze sitting on the horizon.
    mist: '#e8cbae',
  },
];

export function getTheme(id) {
  return themes.find((theme) => theme.id === id) ?? themes[0];
}

// Builds the resolved palette render.js draws from. `depth` is 0 at the
// farthest ridge and 1 at the nearest foreground; the ramp between the two
// terrain endpoints is what will later be driven by the Color depth control.
export function createPalette(themeId, options = {}) {
  const theme = getTheme(themeId);
  const { colorDepth = 1 } = options;

  const far = chroma(theme.terrainFar);
  const near = chroma(theme.terrainNear);

  // colorDepth < 1 compresses the ramp toward its midpoint, flattening the
  // near/far contrast without changing the theme's endpoints.
  const mid = chroma.mix(far, near, 0.5, 'lab');
  const rampFar = chroma.mix(mid, far, colorDepth, 'lab');
  const rampNear = chroma.mix(mid, near, colorDepth, 'lab');
  const ramp = chroma.scale([rampFar, rampNear]).mode('lab');

  return {
    id: theme.id,
    name: theme.name,
    skyStops: theme.sky.map((color, index) => ({
      offset: index / (theme.sky.length - 1),
      color,
    })),
    mist: theme.mist,
    terrainAt(depth) {
      return ramp(clamp01(depth)).hex();
    },
  };
}

export function generatePalette() {
  // Phase 5 — algorithmic complementary / analogous / split-hue strategies.
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
