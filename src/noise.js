// noise.js — fbm / ridged-fbm wrappers over simplex-noise.
// Provides the seeded noise primitives every archetype generator builds on;
// octave count is driven by the Complexity control (CONTEXT.md section 5).

import { createNoise2D } from 'simplex-noise';

const DEFAULTS = {
  octaves: 4,
  frequency: 1,
  amplitude: 1,
  lacunarity: 2,
  gain: 0.5,
};

// simplex-noise v4 dropped its bundled PRNG and takes any () -> [0,1) function.
// mulberry32 keeps seeding self-contained rather than adding a dependency, and
// is what makes a saved seed reproduce a scene (CONTEXT.md section 8).
export function createRandom(seed = 0) {
  let a = Math.trunc(seed) >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A seeded 2D simplex source. Pass the result to fbm / ridgedFbm.
export function createNoise(seed = 0) {
  return createNoise2D(createRandom(seed));
}

// Fractal Brownian motion: octaves of simplex summed at decreasing amplitude
// and increasing frequency. Normalised by total amplitude, so the result stays
// in roughly [-1, 1] regardless of octave count.
export function fbm(noise2D, x, y = 0, options = {}) {
  const { octaves, frequency, amplitude, lacunarity, gain } = {
    ...DEFAULTS,
    ...options,
  };

  let freq = frequency;
  let amp = amplitude;
  let sum = 0;
  let totalAmp = 0;

  for (let i = 0; i < octaves; i += 1) {
    sum += noise2D(x * freq, y * freq) * amp;
    totalAmp += amp;
    freq *= lacunarity;
    amp *= gain;
  }

  return totalAmp === 0 ? 0 : sum / totalAmp;
}

// Ridged fbm: folding each octave through 1 - |n| turns smooth troughs into
// sharp crests, which is what gives mountain silhouettes their ridge lines.
// Returns roughly [0, 1].
export function ridgedFbm(noise2D, x, y = 0, options = {}) {
  const { octaves, frequency, amplitude, lacunarity, gain } = {
    ...DEFAULTS,
    ...options,
  };

  let freq = frequency;
  let amp = amplitude;
  let sum = 0;
  let totalAmp = 0;

  for (let i = 0; i < octaves; i += 1) {
    const ridge = 1 - Math.abs(noise2D(x * freq, y * freq));
    sum += ridge * ridge * amp;
    totalAmp += amp;
    freq *= lacunarity;
    amp *= gain;
  }

  return totalAmp === 0 ? 0 : sum / totalAmp;
}
