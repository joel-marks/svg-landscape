// uitint.js — tints the interface's tokens from the current scene's theme
// (CONTEXT.md section 5, Phases 7 and 10).
//
// **Opt-in since Phase 10, and off by default.** The Preferences checkbox
// "Tint UX to scene" owns it: unchecked, state.js passes null here, every
// inline override is removed and the interface is exactly what its `-base`
// tokens declare. So the question this module answers is no longer "how much
// tint can the interface carry without anyone objecting" — nobody who has not
// asked for it sees any — but "when someone asks, is the answer unmistakable".
//
// That is what changed the token list. Phase 7 tinted accents and lines only,
// on the reasoning that a tinted page behind a tinted artwork is two colour
// fields fighting for the same attention and the artwork has to win. Phase 8
// confirmed the mechanism worked and that nobody could see it, which is the
// same finding read twice: two of the three tokens draw 1px lines. An opt-in
// mode is not bound by the always-on argument — the always-on design is now
// simply the off state — so the surfaces are in, and they are what makes the
// effect readable at arm's length.
//
// Three things about the mechanism, each of which is the reason the obvious
// version doesn't work:
//
// **Base tokens are read, never assumed.** style.css owns two values for every
// token here — one on :root and one on .dark — and this module has no business
// holding a third copy. It reads the resolved `--*-base` token off the document
// element and writes the tinted result to the token the rest of the stylesheet
// actually consumes. An inline custom property on <html> outranks both theme
// blocks, and because the base is read from a *different* property the write
// can't feed back into its own input.
//
// **Lightness is taken from the token, not from the mix.** Contrast is very
// nearly a function of lightness alone, so holding L fixed means eight themes
// (plus whatever Randomise produces) can't each move the interface to a
// different point on the contrast scale — Phase 8's audit checks one lightness
// per token per theme mode, as it always did, plus the small luminance shift
// that added chroma carries. Tinting that changed lightness would have made the
// audit "worst case across every theme", which is a much worse shape.
//
// **The mix is a chroma-vector mix, not an LCH hue interpolation.** chroma.mix
// in 'lch' takes the shorter way round the hue circle, so mixing a warm yellow
// into a cold blue token lands on a hue that is in neither colour — visibly
// wrong, and worst exactly where the tint should read most clearly. Mixing in
// Lab moves a and b toward the tint instead, which is what "a little of that
// colour in this one" actually means. The result is read back as LCH only to
// re-impose the token's own lightness.

import chroma from 'chroma-js';

// The tokens that take the tint: the `-base` style.css defines per UI theme,
// the token everything else consumes, and how much of the tint reaches it.
//
// The ratios differ, and the reason is what a Lab mix actually does to a colour
// that already has a hue of its own. Mixing a warm tint into a cold token moves
// it *through neutral* first — which is perceptually the correct path, and is
// why a partial hue rotation was rejected (see the header) — so the first thing
// a tint costs a chromatic token is its own saturation. A near-neutral token
// has none to lose and reads the tint as hue almost immediately; a saturated
// one reads it as washing out until the ratio is high enough to cross over.
//
// So the more neutral the token, the more tint it can carry. The surfaces and
// both borders are near-neutral by design; the accent is a saturated blue in
// both UI themes and is the one token held back, because an accent that has
// stopped being a colour has stopped being an accent — it is the page's focus
// ring. 0.4 is where every theme moves it unmistakably and Ink wash, the
// neutral control case, still leaves a blue rather than a grey; 0.5 puts
// Volcanic ash and Ink wash within a couple of steps of each other.
//
// **Punch comes from ratio and coverage, never from lightness.** Every mix
// holds the token's own L (see mixTint), which is what keeps the contrast audit
// one lightness per token per UI theme instead of a worst-case sweep across
// eight scene themes. Where a ratio had to come down it came down; lightness
// was never the knob.
//
// Tuned by eye in **light mode** across all eight themes plus a randomised
// palette (Phase 10's stated target), then checked in dark for breakage rather
// than retuned for it. Same numbers in both: the tokens differ but their
// relative chroma does not, so one set holds for both.
const TINTED_TOKENS = [
  // --- surfaces (Phase 10) ---------------------------------------------------
  // The raised surface — panel cards, modals, the tips popover — and the
  // letterbox bars inside the canvas frame. Area is the whole reason these are
  // here: 0.25 across a panel reads harder than 0.5 on a 1px line.
  //
  // **`--surface` and the header are deliberately absent.** The page field the
  // app sits on and the bar across the top of it stay neutral, so what frames
  // the artwork does not follow it while what you operate does. The header is
  // the one that had to be arranged rather than merely left out: it is
  // `bg-surface-raised` in index.html and would have tinted with the panels, so
  // style.css gives it `--surface-header`, the same value read off the untinted
  // side.
  ['--surface-raised-base', '--surface-raised', 0.25],
  ['--surface-sunken-base', '--surface-sunken', 0.25],

  // --- Tweakpane's own background scale (Phase 10) ---------------------------
  // The panel chrome. `--tp-base-background-color` is not listed because it is
  // --surface-raised and tints with it. Every other step is here, interaction
  // states included — a row that reverts to neutral grey under the pointer
  // reads as a bug, not as restraint.
  ['--panel-button-base', '--panel-button', 0.25],
  ['--panel-button-hover-base', '--panel-button-hover', 0.25],
  ['--panel-button-focus-base', '--panel-button-focus', 0.25],
  ['--panel-button-active-base', '--panel-button-active', 0.25],
  ['--panel-container-base', '--panel-container', 0.25],
  ['--panel-container-hover-base', '--panel-container-hover', 0.25],
  ['--panel-container-focus-base', '--panel-container-focus', 0.25],
  ['--panel-container-active-base', '--panel-container-active', 0.25],
  ['--panel-groove-base', '--panel-groove', 0.25],
  ['--panel-input-base', '--panel-input', 0.25],
  ['--panel-input-hover-base', '--panel-input-hover', 0.25],
  ['--panel-input-focus-base', '--panel-input-focus', 0.25],
  ['--panel-input-active-base', '--panel-input-active', 0.25],
  ['--panel-monitor-base', '--panel-monitor', 0.25],

  // --- lines and accents (Phase 7, ratios raised in Phase 10) ----------------
  // Links, the Help modal's group headings, and the page focus ring.
  ['--accent-base', '--accent', 0.4],
  // Every line the page draws: the canvas frame's inset ring, the tips popover,
  // modal rules and table borders.
  ['--border-base', '--border', 0.5],
  // The 1px outline on Tweakpane's inputs, sliders and checkboxes (Phase 6.12).
  // .tweakpane-scope maps --tp-input-border-color onto it.
  ['--input-ring-base', '--input-ring', 0.5],
];

// The scene theme's declared tint, or null for none. Held here because the two
// things that invalidate it — the scene's theme and the UI's light/dark mode —
// change independently and neither knows about the other.
//
// null is now two situations rather than one: no tint declared, and the
// Preferences toggle being off (Phase 10). They want identical treatment — the
// untinted interface — so state.js collapses them into this one value rather
// than this module learning about the preference.
let tint = null;

// Called from state.js on every paint, so a theme change, a randomised palette,
// a preset load, a restored session and the Preferences toggle all arrive
// through one path.
export function setUITint(next) {
  if (next === tint) return;
  tint = next;
  applyUITint();
}

// Called from theme.js whenever Light/Dark/System resolves to a new mode: the
// base tokens underneath have changed, so the tinted values have to be
// recomputed from them.
export function applyUITint() {
  const root = document.documentElement;

  // No tint: remove every override outright rather than writing the base value
  // back over itself. The computed values are the same either way, but "off"
  // should leave nothing of this module on the element — which is what makes
  // the default state checkable by looking at <html> rather than by diffing
  // colours (Phase 10).
  if (!tint) {
    for (const [, target] of TINTED_TOKENS) root.style.removeProperty(target);
    return;
  }

  const styles = getComputedStyle(root);

  for (const [source, target, ratio] of TINTED_TOKENS) {
    const base = styles.getPropertyValue(source).trim();
    // A missing base means the stylesheet and this list have come apart. Clear
    // the override rather than writing a colour derived from nothing — the
    // untinted token is a working interface, which is the right failure.
    if (!base) {
      root.style.removeProperty(target);
      continue;
    }

    root.style.setProperty(target, mixTint(base, tint, ratio));
  }
}

function mixTint(base, hex, ratio) {
  try {
    const [lightness] = chroma(base).lch();
    const [, c, h] = chroma.mix(base, hex, ratio, 'lab').lch();
    // Hue is undefined for a neutral result, which is what Ink wash produces on
    // purpose — chroma.lch() would emit NaN into the stylesheet.
    return chroma.lch(lightness, c, Number.isNaN(h) ? 0 : h).hex();
  } catch {
    // A hand-edited themes.json can carry anything. An unparseable tint costs
    // the tint, not the interface.
    return base;
  }
}
