// lighting.js — time-of-day -> sun/moon position, sky color blend, shadow angle.
// Driven by the continuous 0-24 Time of day slider. In-scene lighting is a
// separate system from the UI light/dark chrome theme (CONTEXT.md section 5).
//
// Two models work together. Sky and mist colours come from hand-tuned hourly
// keyframes, because dawn and dusk are not colour mirrors of each other and a
// physical model gets that wrong. Body positions and star opacity come from a
// solar-altitude term, because those genuinely are symmetric and a continuous
// function avoids the seams a keyframe table would introduce.

import chroma from 'chroma-js';

import { createRandom } from './noise.js';
import { clamp01, lerp, smoothstep } from './utils.js';

// Sunrise and sunset in the model's idealised day. The sun arc spans the 12
// hours between them; the moon arc spans the other 12.
const SUNRISE = 6;
const SUNSET = 18;

// hour -> four sky stops (top to horizon) plus the mist tint that belongs with
// them, each tuned by eye rather than generated. The 18.5 entry is the Phase 2
// "Alpine dusk" sky, kept as the anchor so the default scene is unchanged by
// this phase. The 24 entry repeats 0 so the cycle wraps without a seam.
const SKY = [
  { hour: 0, sky: ['#060b16', '#0c1526', '#152239', '#22314c'], mist: '#35496a' },
  { hour: 4.5, sky: ['#0d1730', '#1b2848', '#33355c', '#5c4560'], mist: '#5f5470' },
  { hour: 6, sky: ['#152244', '#31406f', '#6b5479', '#c07a66'], mist: '#c99a86' },
  { hour: 7.5, sky: ['#20407f', '#4a6ba8', '#8fa9c9', '#e8c9a8'], mist: '#e2c6ad' },
  { hour: 10, sky: ['#2a63ad', '#5a92cd', '#9dc2e2', '#d9e8f2'], mist: '#dbe7f0' },
  { hour: 13, sky: ['#2d6bb5', '#5f9ad6', '#a9cbe8', '#dcecf6'], mist: '#dcecf6' },
  { hour: 16, sky: ['#2f5fa8', '#5d88c6', '#a3bfdc', '#e2e0d8'], mist: '#e4e2d6' },
  { hour: 18.5, sky: ['#1e2f57', '#4a5f8c', '#9d7f9e', '#e5a978'], mist: '#e8cbae' },
  { hour: 20, sky: ['#131e3d', '#28365e', '#4d4670', '#a4655f'], mist: '#9c7a76' },
  { hour: 21.5, sky: ['#0a1122', '#141f38', '#22304e', '#3b4260'], mist: '#4b5a72' },
  { hour: 24, sky: ['#060b16', '#0c1526', '#152239', '#22314c'], mist: '#35496a' },
];

export function computeLighting({
  hour = 18.5,
  seed = 0,
  width = 1600,
  height = 900,
  horizonY = 450,
} = {}) {
  const h = ((hour % 24) + 24) % 24;

  // +1 at noon, 0 at sunrise and sunset, -1 at midnight.
  const sunAltitude = Math.sin((Math.PI * (h - SUNRISE)) / 12);
  const moonAltitude = -sunAltitude;

  const { sky, mist } = blendSky(h);

  // Bodies fade in as they clear the horizon rather than popping at it, which
  // is what makes the sun/moon handover a crossfade instead of a swap.
  const sunOpacity = smoothstep((sunAltitude + 0.1) / 0.28);
  const moonOpacity = smoothstep((moonAltitude + 0.1) / 0.28);

  const arc = horizonY * 0.82;
  const bodyRadius = Math.min(width, height) * 0.032;

  return {
    hour: h,
    sunAltitude,
    sky,
    mist,
    starOpacity: smoothstep((-sunAltitude - 0.02) / 0.3),
    stars: starField(seed, width, horizonY),
    sun: {
      ...bodyPosition((h - SUNRISE) / 12, sunAltitude, width, horizonY, arc),
      r: bodyRadius,
      opacity: sunOpacity,
    },
    moon: {
      // The wrap matters: the moon's arc starts at sunset and runs into the
      // next day, so hours after 18:00 have to fold back through midnight or
      // the moon pins to the right edge all evening.
      ...bodyPosition(((h - SUNSET + 24) % 24) / 12, moonAltitude, width, horizonY, arc),
      r: bodyRadius * 0.78,
      opacity: moonOpacity,
    },
    suggestedAngle: suggestedAngle(h),
  };
}

// Seeds the Light source angle slider once at startup. Not a live binding —
// the angle is independently user-controlled (CONTEXT.md section 6).
export function suggestedAngle(hour) {
  const h = ((hour % 24) + 24) % 24;
  const sunAltitude = Math.sin((Math.PI * (h - SUNRISE)) / 12);
  // Whichever body is up supplies the direction. Screen-space degrees: 0 is
  // light from the right, 90 from directly above, 180 from the left.
  const u =
    sunAltitude >= 0 ? (h - SUNRISE) / 12 : ((h - SUNSET + 24) % 24) / 12;
  return Math.round(lerp(180, 0, clamp01(u)));
}

function bodyPosition(u, altitude, width, horizonY, arc) {
  const t = clamp01(u);
  return {
    x: t * width,
    // Sits on the horizon at rise and set, peaks at the top of its arc.
    y: horizonY - Math.max(0, altitude) * arc,
  };
}

function blendSky(hour) {
  let lower = SKY[0];
  let upper = SKY[SKY.length - 1];

  for (let i = 0; i < SKY.length - 1; i += 1) {
    if (hour >= SKY[i].hour && hour <= SKY[i + 1].hour) {
      lower = SKY[i];
      upper = SKY[i + 1];
      break;
    }
  }

  const span = upper.hour - lower.hour;
  const t = span === 0 ? 0 : (hour - lower.hour) / span;

  const sky = lower.sky.map((color, i) => ({
    offset: i / (lower.sky.length - 1),
    color: chroma.mix(color, upper.sky[i], t, 'lab').hex(),
  }));

  return { sky, mist: chroma.mix(lower.mist, upper.mist, t, 'lab').hex() };
}

// Stable for a given scene seed, so stars don't wander when other controls
// change. Confined to the sky above the horizon.
function starField(seed, width, horizonY) {
  const random = createRandom(seed ^ 0x5f3a1c);
  const count = Math.round(110 * Math.max(1, width / 1600));
  const stars = [];

  for (let i = 0; i < count; i += 1) {
    const y = random() * horizonY * 0.94;
    stars.push({
      x: random() * width,
      y,
      r: 0.7 + random() * 1.5,
      // Thinner near the horizon, as haze would leave them.
      opacity: 0.35 + 0.65 * random() * (1 - (y / horizonY) * 0.45),
    });
  }

  return stars;
}
