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

// hour -> the sun's own colour (Phase 6.13). Prior to this the disc was a fixed
// #fff6de and its glow a fixed #fff3d4 at every hour, which is what made a
// sunset sun look like a noon sun that had merely moved.
//
// Hand-tuned keyframes, same as SKY and for the same reason: dawn and dusk are
// not colour mirrors of each other, so a physical model gets this wrong. The
// asymmetry is the point — sunrise warms **subtly** to a gold, sunset warms
// **much further**, all the way to a red-orange, matching the stance the sky
// table already takes about the two ends of the day.
//
// The sun is only on screen for roughly 5.6-18.4 (its opacity is a smoothstep
// over the same altitude term that positions it, so it fades in and out before
// the idealised 06:00/18:00 rise and set). Keyframes outside that window exist
// only to make the curve wrap without a seam; nothing renders them. Hours 0 and
// 24 hold the same value for the same reason SKY's do.
//
// The keyframe hours were pulled inward after a first pass put the strongest
// tones where nothing could see them: the disc's own opacity is under 0.3 by
// 18:00 and gone by 18.4, so a red-orange keyframed at 18.3 only ever rendered
// on a sun that had almost finished fading. Both warm ends now land while the
// body is still at better than 0.9 opacity.
const SUN = [
  { hour: 0, color: '#f05a28' },
  { hour: 5.4, color: '#ffb257' },
  // First light. Warm, but a gold rather than an orange — deliberately the
  // gentler of the two ends.
  { hour: 6.6, color: '#ffcc85' },
  { hour: 7.6, color: '#ffe3b4' },
  // The bulk of the day: pale, barely-warm near-white.
  { hour: 9, color: '#fff2d6' },
  { hour: 13, color: '#fffbf1' },
  { hour: 16, color: '#fff2d0' },
  // Dusk, and the asymmetry: this side keeps going well past where the morning
  // stopped, through amber into a genuine red-orange.
  { hour: 16.8, color: '#ffd68f' },
  { hour: 17.3, color: '#ffa855' },
  { hour: 17.7, color: '#f4702f' },
  { hour: 18.3, color: '#e04a22' },
  { hour: 24, color: '#f05a28' },
];

// The moon is unchanged by Phase 6.13 — sun only. Held here rather than in
// render.js so both bodies hand their colours over the same way.
const MOON_COLOR = '#eef3fb';
const MOON_GLOW = '#dfe8f5';

// How much larger the moon draws as it nears the horizon (Phase 6.13) — an
// approximation of the moon illusion, not a physical effect. Rides the same
// altitude term that already places the body, so rise and set both get it for
// free and nothing new tracks time.
const MOON_HORIZON_GROWTH = 0.28;

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

  // Resolved once and handed to both the disc and the glow below, so there is
  // no route by which the two could end up on different steps of the ramp.
  const sun = sunColor(h);

  return {
    hour: h,
    sunAltitude,
    sky,
    mist,
    starOpacity: smoothstep((-sunAltitude - 0.02) / 0.3),
    // Deliberately not given horizonY: the field is a fixed backdrop and the
    // terrain, drawn over it, is what decides how much of it shows.
    stars: starField(seed, width, height),
    sun: {
      ...bodyPosition((h - SUNRISE) / 12, sunAltitude, width, horizonY, arc),
      r: bodyRadius,
      opacity: sunOpacity,
      // Disc and glow are the *same* value, so the two cannot drift apart into
      // a red disc inside a yellow halo (CONTEXT.md 6c).
      color: sun,
      glow: sun,
    },
    moon: {
      // The wrap matters: the moon's arc starts at sunset and runs into the
      // next day, so hours after 18:00 have to fold back through midnight or
      // the moon pins to the right edge all evening.
      ...bodyPosition(((h - SUNSET + 24) % 24) / 12, moonAltitude, width, horizonY, arc),
      // Largest on the horizon at both rise and set, smallest at the top of its
      // arc. `moonAltitude` is already 0 at the horizon and 1 at its peak, so
      // this is the same term the position above uses, read a second way.
      r: bodyRadius * 0.78 * (1 + MOON_HORIZON_GROWTH * (1 - clamp01(moonAltitude))),
      opacity: moonOpacity,
      color: MOON_COLOR,
      glow: MOON_GLOW,
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

// Locates an hour between two keyframes of an hour-sorted table. Shared by SKY
// and SUN (Phase 6.13) rather than duplicated: the sun ramp is the same kind of
// object as the sky one, so it wants the same lookup, and one implementation
// means the two tables cannot interpolate differently.
function keyframesAt(table, hour) {
  let lower = table[0];
  let upper = table[table.length - 1];

  for (let i = 0; i < table.length - 1; i += 1) {
    if (hour >= table[i].hour && hour <= table[i + 1].hour) {
      lower = table[i];
      upper = table[i + 1];
      break;
    }
  }

  const span = upper.hour - lower.hour;
  return { lower, upper, t: span === 0 ? 0 : (hour - lower.hour) / span };
}

function blendSky(hour) {
  const { lower, upper, t } = keyframesAt(SKY, hour);

  const sky = lower.sky.map((color, i) => ({
    offset: i / (lower.sky.length - 1),
    color: chroma.mix(color, upper.sky[i], t, 'lab').hex(),
  }));

  return { sky, mist: chroma.mix(lower.mist, upper.mist, t, 'lab').hex() };
}

// Phase 6.13. Lab-mixed like the sky, so a warm keyframe and a pale one blend
// through the intermediate warms rather than desaturating through grey.
function sunColor(hour) {
  const { lower, upper, t } = keyframesAt(SUN, hour);
  return chroma.mix(lower.color, upper.color, t, 'lab').hex();
}

// A fixed backdrop for a given scene seed (CONTEXT.md section 5, Lighting).
// Generated
// once against a reference frame that no control can move, then clipped to the
// canvas — so the pattern itself never rescales, and changing the scene only
// changes how much of it you can see.
//
// This replaces a version that placed every star as a *fraction* of two moving
// references: `y = random() * horizonY * 0.94` and `x = random() * width`. Both
// were pattern redistribution, not per-star distortion — the stars stayed
// circles throughout — but the effect was a field that squashed vertically as
// Point of view height raised the horizon (measured: star #0 at y=438.8 with
// elevation 0, y=193.6 at elevation 1) and stretched horizontally as a wider
// aspect widened the canvas (the same star pinned to 92.93% of the width at
// every aspect). See section 18.
const FIELD_ASPECT = 4;
// Density is calibrated to keep the default scene looking as it did before the
// fix: 110 stars filled a 1600-wide canvas down to a horizon around y=440, and
// the field now covers the full frame height instead of stopping at the
// horizon, so the same *visible* density needs proportionally more of them.
const STARS_PER_REFERENCE_FRAME = 239;

function starField(seed, width, height) {
  const random = createRandom(seed ^ 0x5f3a1c);

  // The widest canvas any aspect can ask for. Generating the field at that size
  // and clipping is what makes star positions absolute: a star at x=1115 is at
  // x=1115 on every aspect, and a wider canvas reveals further into the same
  // field rather than spreading the existing stars across more room.
  const fieldWidth = height * FIELD_ASPECT;
  const count = Math.round(STARS_PER_REFERENCE_FRAME * FIELD_ASPECT / (16 / 9));

  const stars = [];

  for (let i = 0; i < count; i += 1) {
    // All four values are drawn for every star, kept or not, so that clipping
    // to a narrower canvas doesn't shift the random stream and move the stars
    // that remain.
    const x = random() * fieldWidth;
    const y = random() * height;
    const r = 0.7 + random() * 1.5;
    // Thinner toward the bottom of the frame, as haze would leave them. Keyed
    // to the frame rather than to the horizon, which is the coupling this
    // function exists to be rid of.
    const opacity = 0.35 + 0.65 * random() * (1 - (y / height) * 0.45);

    if (x <= width) stars.push({ x, y, r, opacity });
  }

  return stars;
}
