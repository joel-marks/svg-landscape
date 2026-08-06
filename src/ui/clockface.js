// clockface.js — a 24-hour clock face for Time of day (CONTEXT.md section 5).
//
// A literal clock: a circle, hour ticks around it, and a hand joining the centre
// to the edge. One full revolution is 24 hours, not 12.
//
// Why this exists rather than a plugin. Tweakpane ships no rotary view, and
// neither do the two plugins already installed — @tweakpane/plugin-camerakit's
// `cameraring` (the Phase 6.13 trial) is a lens focus ring seen *edge-on*: a
// horizontal scale that scrolls past a fixed marker, not a face seen head-on.
// Writing a real input plugin would mean adding @tweakpane/core, which is not
// installed and which the two existing plugins each bundle their own copy of.
// This is ~200 lines of vanilla SVG instead, which is the same call this project
// already made for markdown.js (CONTEXT.md section 2).
//
// It mounts as an ordinary `.tp-lblv` row so it inherits the panel's label/value
// layout and spacing, and it colours itself entirely from the `--tp-*` theme
// tokens, so Light/Dark/System keep working through the one code path they
// already use. Depending on Tweakpane's class names is a deliberate, already
// established pattern here — the Phase 6.12 input borders do exactly the same
// against a pinned 4.0.5 (CONTEXT.md section 5).

const SVG_NS = 'http://www.w3.org/2000/svg';

// The face is drawn in a -50..50 user space and scaled by CSS, so every radius
// below reads as a percentage of the circle.
const R_FACE = 47;
const R_TICK_MINOR = 43;
const R_TICK_MAJOR = 39;
const R_NUMERAL = 32;
const R_HAND = 28;

// Hours per revolution. The whole point of the control: 24, not 12.
const HOURS = 24;
const DEG_PER_HOUR = 360 / HOURS;

// Which hours get a long tick and a numeral. Every hour gets a short one.
const NUMERAL_EVERY = 6;

// Keyboard steps. 0.1h matches the Time of day slider's own step exactly, so
// arrowing the clock and arrowing the slider move the value by the same amount.
const KEY_STEP = 0.1;
const KEY_STEP_COARSE = 1;

// Noon at the top, midnight at the bottom, clockwise (CONTEXT.md section 5).
// This is deliberately *not* how a clock reads — 00:00 at the top would be —
// because the control drives a sun: 06:00 lands at the left where the sun rises
// in the frame, 12:00 at the top where it is overhead, 18:00 at the right where
// it sets. The hand is a picture of the sky rather than a picture of a clock.
function angleOf(hour) {
  return (hour - 12) * DEG_PER_HOUR;
}

// Screen-space point at `deg` clockwise from straight up, `r` from the centre.
function pointAt(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
}

function wrapHour(hour) {
  return ((hour % HOURS) + HOURS) % HOURS;
}

function el(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/**
 * Builds the row. Returns its element plus a `set(hour)` for the panel to keep
 * it in step with the rest of the app — the clock never reads app state itself.
 *
 * `format` is passed in rather than imported so this module owns no opinion
 * about how an hour is written; controls.js hands it the same formatter the
 * rest of the panel uses.
 */
export function createClockFace({ label, format, onChange }) {
  const row = document.createElement('div');
  row.className = 'tp-lblv clockface';

  const labelCell = document.createElement('div');
  labelCell.className = 'tp-lblv_l';
  labelCell.textContent = label;

  const valueCell = document.createElement('div');
  valueCell.className = 'tp-lblv_v';

  const svg = el('svg', {
    class: 'clockface_g',
    viewBox: '-50 -50 100 100',
    // Announced as what it is — a slider over a 0-24 range. `aria-valuetext`
    // carries the clock reading, so a screen reader says "18:30" rather than
    // "18.5" (CONTEXT.md section 11).
    role: 'slider',
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': HOURS,
    tabindex: 0,
  });

  svg.append(el('circle', { class: 'clockface_face', cx: 0, cy: 0, r: R_FACE }));

  for (let i = 0; i < HOURS; i += 1) {
    const major = i % NUMERAL_EVERY === 0;
    const deg = angleOf(i);
    const [x1, y1] = pointAt(deg, R_FACE);
    const [x2, y2] = pointAt(deg, major ? R_TICK_MAJOR : R_TICK_MINOR);
    svg.append(
      el('line', {
        class: major ? 'clockface_t clockface_t-maj' : 'clockface_t',
        x1, y1, x2, y2,
      }),
    );

    if (!major) continue;

    // Only every sixth hour is numbered: 24 numerals do not stay legible at the
    // size this sits in the panel, and 00/06/12/18 is enough to orient by.
    const [nx, ny] = pointAt(deg, R_NUMERAL);
    const numeral = el('text', {
      class: 'clockface_n',
      x: nx,
      // SVG has no vertical centring for text; the nudge is the usual
      // half-cap-height correction so the numeral sits on the radius.
      y: ny + 3.2,
      'text-anchor': 'middle',
    });
    numeral.textContent = String(i).padStart(2, '0');
    svg.append(numeral);
  }

  const hand = el('line', { class: 'clockface_hand', x1: 0, y1: 0, x2: 0, y2: -R_HAND });
  svg.append(hand, el('circle', { class: 'clockface_hub', cx: 0, cy: 0, r: 3 }));

  valueCell.append(svg);
  row.append(labelCell, valueCell);

  let current = 0;

  const set = (hour) => {
    current = wrapHour(hour);
    const [x2, y2] = pointAt(angleOf(current), R_HAND);
    hand.setAttribute('x2', String(x2));
    hand.setAttribute('y2', String(y2));
    svg.setAttribute('aria-valuenow', String(current));
    svg.setAttribute('aria-valuetext', format(current));
  };

  // Rounded to the nearest minute, which is the unit a clock actually has. It
  // also sidesteps the step-constraint ulp that made the slider render 03:00 as
  // 02:60 (CONTEXT.md section 18) — nothing here can produce 2.999999999999999.
  const commit = (hour) => {
    const rounded = wrapHour(Math.round(wrapHour(hour) * 60) / 60);
    if (rounded === current) return;
    set(rounded);
    onChange(rounded);
  };

  // Absolute, not relative: the hand goes where you point, which is the whole
  // reason a face beats a scrolling scale here. It also makes midnight a place
  // you turn through rather than an end stop, with no wrapping logic at all —
  // atan2 cannot return a value outside one revolution.
  const hourAtPointer = (event) => {
    const box = svg.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    // Straight up is 0 and clockwise is positive, matching angleOf(). Dead
    // centre is the one undefined point; atan2(0, 0) returns 0, which reads as
    // noon — harmless, and unreachable in practice under the hub.
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    return 12 + deg / DEG_PER_HOUR;
  };

  svg.addEventListener('pointerdown', (event) => {
    // Capture so a drag that leaves the small circle keeps steering it, rather
    // than stopping the moment the pointer crosses the edge.
    svg.setPointerCapture(event.pointerId);
    svg.focus();
    event.preventDefault();
    commit(hourAtPointer(event));
  });

  svg.addEventListener('pointermove', (event) => {
    if (!svg.hasPointerCapture(event.pointerId)) return;
    commit(hourAtPointer(event));
  });

  const release = (event) => {
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  // Full keyboard operability is a project requirement, not a nicety
  // (CONTEXT.md section 11) — and an SVG gets none of it for free the way an
  // <input type=range> would.
  svg.addEventListener('keydown', (event) => {
    const coarse = event.shiftKey;
    const step = coarse ? KEY_STEP_COARSE : KEY_STEP;
    let delta = 0;

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = step;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -step;
    else if (event.key === 'PageUp') delta = KEY_STEP_COARSE;
    else if (event.key === 'PageDown') delta = -KEY_STEP_COARSE;
    else if (event.key === 'Home') return commit(0);
    else if (event.key === 'End') return commit(12);
    else return;

    event.preventDefault();
    return commit(current + delta);
  });

  return { element: row, set };
}
