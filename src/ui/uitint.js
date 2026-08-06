// uitint.js — tints a small set of interface tokens from the current scene's
// theme (CONTEXT.md section 5, Phase 7).
//
// The idea is that the panel should feel like it belongs to the picture beside
// it without competing with it. So this touches accents and lines only — the
// accent token, the page's border token, and the ring Tweakpane's inputs are
// outlined with. **Not surface backgrounds**: a tinted page behind a tinted
// artwork is two colour fields fighting for the same attention, and the artwork
// has to win.
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
// So the more neutral the token, the more tint it can carry. Both borders are
// near-neutral by design and take about a third; the accent is a saturated blue
// in both UI themes and stays at 0.18, where every theme moves it visibly
// without any theme flattening it to grey. An accent that has stopped being a
// colour has stopped being an accent — it is the page's focus ring.
//
// Tuned by eye across all eight themes and both UI themes, not to a chroma
// target. Same numbers in light and dark: the tokens differ but their *relative*
// chroma does not, so one set held for both, which is one less thing to keep
// straight when Phase 8's contrast audit comes round.
const TINTED_TOKENS = [
  // Links, the Help modal's group headings, and the page focus ring.
  ['--accent-base', '--accent', 0.18],
  // Every line the page draws: the canvas frame's inset ring, the tips popover,
  // modal rules and table borders.
  ['--border-base', '--border', 0.32],
  // The 1px outline on Tweakpane's inputs, sliders and checkboxes (Phase 6.12).
  // .tweakpane-scope maps --tp-input-border-color onto it.
  ['--input-ring-base', '--input-ring', 0.3],
];

// The scene theme's declared tint, or null for none. Held here because the two
// things that invalidate it — the scene's theme and the UI's light/dark mode —
// change independently and neither knows about the other.
let tint = null;

// Called from state.js on every paint, so a theme change, a randomised palette,
// a preset load and a restored session all arrive through one path.
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

    root.style.setProperty(target, tint ? mixTint(base, tint, ratio) : base);
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
