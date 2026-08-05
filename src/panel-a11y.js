// panel-a11y.js — the accessible names and roles Tweakpane's rendered DOM does
// not carry (CONTEXT.md section 11, Phase 8).
//
// This is a post-pass over the markup a Pane has already produced, not a
// modification of Tweakpane. It exists because of one structural decision in
// the library: a control's label is a plain `<div class="tp-lblv_l">` sitting
// beside the control rather than a `<label for>` wrapping or pointing at it. It
// reads correctly to anyone looking at the panel and is invisible to anything
// reading the accessibility tree — the Phase 8 audit found every slider,
// checkbox, dropdown and number field reaching the tab order with no accessible
// name at all. Two folders' worth of "edit text, blank" is not a panel anyone
// can operate by ear.
//
// So: for each labelled row, the label's own text is copied onto whatever in
// that row can take focus. Nothing is invented — the name a screen reader gets
// is the name printed next to the control.
//
// The one place this goes further than copying is the slider track. Tweakpane
// gives it `tabindex="0"` and nothing else: no role, no value, no name. A
// focusable div with none of those is the clearest WCAG 4.1.2 failure in the
// panel, and it is also entirely fixable from out here, because Tweakpane
// already publishes the value in two forms this can read — the knob's own width
// percentage, and the formatted number in the text field beside it. Those
// become `aria-valuenow` (a 0–100 position) and `aria-valuetext` (what the panel
// actually shows). A slider's spoken value is `aria-valuetext` whenever it is
// present, so what gets announced is the panel's own number, not the percentage.
//
// Kept generic — driven by Tweakpane's class names, the same ones style.css
// already depends on, with no list of this project's own controls to maintain.
// A control added to controls.js is covered by having been added.
//
// **Deliberately not done here**: the Actions tab strip. Its two buttons are
// labelled, reachable and operable, but they are plain buttons rather than a
// `tablist`/`tab`/`tabpanel` set. Adding those roles without also adding the
// arrow-key navigation the pattern requires would make the widget announce a
// contract it does not honour, and adding the navigation means reaching inside
// Tweakpane's own tab controller. Flagged in the Phase 8 report instead.

const LABEL = '.tp-lblv_l';
const VALUE = '.tp-lblv_v';

// Everything Tweakpane can put in a value cell that takes focus. `[tabindex]`
// is what catches the slider track, which is a div.
const FOCUSABLE = 'input, select, button, textarea, [tabindex]';

export function applyPanelA11y(root) {
  if (!root) return;

  for (const row of root.querySelectorAll('.tp-lblv')) {
    const text = row.querySelector(`:scope > ${LABEL}`)?.textContent.trim();
    if (!text) continue;

    const cell = row.querySelector(`:scope > ${VALUE}`);
    if (!cell) continue;

    for (const el of cell.querySelectorAll(FOCUSABLE)) {
      // A button carries its own name in its own text; anything else takes the
      // row's. Written every pass rather than only when absent, because two
      // labels in this panel are affordances that change with state — the POV
      // slider says so when the archetype defers it, and the light angle says
      // so while the tidelock has it (controls.js) — and a name that was copied
      // once would go on announcing the wrong one.
      if (el.tagName === 'BUTTON') continue;
      el.setAttribute('aria-label', text);
    }
  }

  for (const slider of root.querySelectorAll('.tp-sldtxtv, .tp-sldv')) {
    labelSlider(slider);
  }
}

function labelSlider(slider) {
  const track = slider.querySelector('.tp-sldv_t');
  const knob = slider.querySelector('.tp-sldv_k');
  if (!track || !knob || track.dataset.a11y) return;
  track.dataset.a11y = 'on';

  // The number field beside the track, where there is one. A slider added
  // without its text half still gets a role and a position, just no valuetext.
  const field = slider.querySelector('.tp-txtv_i');

  track.setAttribute('role', 'slider');
  track.setAttribute('aria-orientation', 'horizontal');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');

  const sync = () => {
    // Tweakpane writes the knob's position as a percentage width, so the
    // rendered position is the value — no second source to keep in step with.
    const percent = Math.round(Number.parseFloat(knob.style.width) || 0);
    track.setAttribute('aria-valuenow', String(percent));
    if (field?.value) track.setAttribute('aria-valuetext', field.value);
  };

  sync();

  // One observer per slider, on the one attribute that moves. Every route to a
  // new value — drag, arrow key, a typed number, a preset load, Reset to
  // defaults — ends with Tweakpane repositioning this knob, so watching it
  // covers all of them without controls.js having to call anything.
  new MutationObserver(sync).observe(knob, {
    attributes: true,
    attributeFilter: ['style'],
  });
}
