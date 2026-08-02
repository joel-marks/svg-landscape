// tips.js — the "?" tooltip trigger beside each folder heading.
// The Tips preference (CONTEXT.md section 5) started in Phase 6 as a permanent
// one-line caption under each heading and became this in Phase 6.5: the same
// text, shown on demand, so the panel keeps its compact footprint.
//
// Three triggers, not one (CONTEXT.md section 11): hover for a desktop mouse,
// click/tap for touch, and focus for keyboard Tab navigation. A hover-only
// tooltip is invisible to the latter two, and this is a cheap accessibility
// floor to hold rather than a hard one.
//
// The popover is a single element on <body>, positioned fixed against the
// trigger's rect, rather than one per folder inside the pane: only one can be
// open at a time, and a fixed element on the body can't be clipped by a
// collapsing folder or stacked under the pane's own chrome.

const POPOVER_ID = 'tips-tooltip';

// Show/hide is driven by three independent sources — pointer, pointer-pinned
// (click), and focus. Tracking them separately is what makes "hover away from a
// tooltip you clicked open" leave it open, and "Tab away" close it.
export function createTips(entries) {
  const popover = buildPopover();
  const triggers = new Map();

  let active = null;
  let hovered = false;
  let pinned = false;

  function show(entry, { pin = false } = {}) {
    const same = active?.trigger === entry.trigger;

    // Re-triggering the one that's already pinned open is a dismissal.
    if (pin && same && pinned) return hide();
    // Moving to a different heading drops the previous one's pin with it.
    if (!same) pinned = false;
    if (pin) pinned = true;

    active = entry;
    popover.textContent = entry.text;
    popover.hidden = false;
    position(popover, entry.trigger);

    entry.trigger.setAttribute('aria-expanded', 'true');
    entry.trigger.setAttribute('aria-describedby', POPOVER_ID);
  }

  function hide() {
    if (active) {
      active.trigger.setAttribute('aria-expanded', 'false');
      active.trigger.removeAttribute('aria-describedby');
    }
    active = null;
    pinned = false;
    hovered = false;
    popover.hidden = true;
  }

  // Escape and click-outside are the two dismissals a pinned tooltip needs;
  // re-clicking the trigger is handled by the toggle in show().
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && active) hide();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!active) return;
    if (event.target.closest?.('.tips-trigger') || event.target === popover) return;
    hide();
  });

  // Fixed positioning is relative to the viewport, so anything that moves the
  // trigger under it invalidates the placement. Cheaper to close than to track.
  window.addEventListener('scroll', () => active && hide(), true);
  window.addEventListener('resize', () => active && hide());

  function attach(entry) {
    if (triggers.has(entry.folder)) return;

    const bar = entry.folder.element.querySelector(':scope > .tp-fldv_b');
    if (!bar) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tips-trigger';
    trigger.textContent = '?';
    // The visible glyph is a bare "?", so the accessible name has to carry the
    // whole meaning for anyone who can't see which heading it sits beside.
    trigger.setAttribute('aria-label', `What the ${entry.folder.title} controls do`);
    trigger.setAttribute('aria-expanded', 'false');

    const bound = { ...entry, trigger };

    trigger.addEventListener('pointerenter', () => {
      hovered = true;
      show(bound);
    });

    trigger.addEventListener('pointerleave', () => {
      hovered = false;
      // A tooltip that was clicked or tabbed to outlives the pointer leaving.
      if (!pinned && document.activeElement !== trigger) hide();
    });

    trigger.addEventListener('click', (event) => {
      // The trigger sits over the folder's title bar; letting the click through
      // would collapse the folder underneath it.
      event.stopPropagation();
      show(bound, { pin: true });
    });

    trigger.addEventListener('focus', () => show(bound));

    trigger.addEventListener('blur', () => {
      if (!hovered) hide();
    });

    // After the title bar, so Tab reaches the trigger immediately after the
    // heading it belongs to rather than at the end of the folder's contents.
    bar.after(trigger);
    triggers.set(entry.folder, trigger);
  }

  function detach(folder) {
    const trigger = triggers.get(folder);
    if (!trigger) return;
    if (active?.trigger === trigger) hide();
    trigger.remove();
    triggers.delete(folder);
  }

  // Off removes the trigger itself, not just the popover it opens — the same
  // "hidden entirely, not greyed" rule the captions followed (CONTEXT.md s5).
  return {
    sync(enabled) {
      for (const entry of entries) {
        if (enabled && entry.text) attach(entry);
        else detach(entry.folder);
      }
      if (!enabled) hide();
    },
  };
}

function buildPopover() {
  const existing = document.getElementById(POPOVER_ID);
  if (existing) return existing;

  const popover = document.createElement('div');
  popover.id = POPOVER_ID;
  popover.setAttribute('role', 'tooltip');
  popover.hidden = true;
  document.body.append(popover);
  return popover;
}

// Below the trigger and right-aligned to it, clamped so a folder near the
// window edge doesn't push the popover off-screen.
function position(popover, trigger) {
  const margin = 8;
  const rect = trigger.getBoundingClientRect();

  // Measured after the content is set and while visible, so the clamp works off
  // the real box rather than a stale one.
  const { width, height } = popover.getBoundingClientRect();

  const left = clamp(
    rect.right - width,
    margin,
    Math.max(margin, window.innerWidth - width - margin),
  );

  // Flips above the trigger when there isn't room below it.
  const below = rect.bottom + 6;
  const top = below + height + margin > window.innerHeight
    ? Math.max(margin, rect.top - height - 6)
    : below;

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
