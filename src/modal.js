// modal.js — the shared <dialog> the app's informational modals are built on.
// Extracted from help.js in Phase 6.6, when Read Me and About joined Help and a
// second and third copy of this would otherwise have been written.
//
// Native <dialog> opened with showModal(), for the reasons Phase 6 settled on
// (CONTEXT.md section 10): Escape-to-close, focus moving into the dialog and
// returning to whatever opened it, and the rest of the page going inert are all
// behaviours the element already has correctly. There is an explicit Close
// control at both ends as well — click-outside on its own is unreachable from
// the keyboard (section 11).

export function createModal({ id, title, body, className = '' }) {
  const dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className =
    `app-modal rounded-lg border border-border-token bg-surface-raised p-0 text-text shadow-lg ${className}`.trim();

  const titleId = `${id}-title`;
  dialog.setAttribute('aria-labelledby', titleId);

  // `shrink-0` on both bands: without it a flex column hands them out as
  // shrinkable space too, and a long body squeezes the title and Close button.
  const header = document.createElement('div');
  header.className =
    'flex shrink-0 items-center gap-4 border-b border-border-token px-5 py-3';
  // Both Close controls were `border-border-token bg-surface text-muted`
  // through Phase 7.5, and Phase 8's contrast audit failed them three ways at
  // once (CONTEXT.md section 11). The fill was doing no work — 2.13:1 against
  // the dialog in light and 1.19:1 in dark, so what identified the button was
  // always its outline — and that outline was `--border`, which is the page's
  // *decorative* rule token and sits at 1.3:1 in dark. `text-muted` on the fill
  // came to 3.49:1 in light, under the 4.5:1 a label needs.
  //
  // So the fill goes (the dialog's own surface shows through, and now arrives
  // on hover instead, where it reads as the affordance it always should have
  // been), the outline moves to `--input-ring` — the token that exists for
  // interactive boundaries, 3.7:1 and 3.6:1 against the dialog in the two
  // themes — and the label takes the full text colour: 10.3:1 at rest, 4.9:1
  // over the hover fill.
  header.innerHTML = `
    <h2 id="${titleId}" class="m-0 text-base font-semibold tracking-tight">${title}</h2>
    <button
      type="button"
      data-modal-close
      class="ml-auto rounded-md border border-input-ring px-2 py-1 text-sm transition-colors hover:bg-surface"
      aria-label="Close ${title.toLowerCase()}"
    >&#10005;</button>
  `;

  const footer = document.createElement('div');
  footer.className = 'shrink-0 border-t border-border-token px-5 py-3 text-right';
  footer.innerHTML = `
    <button
      type="button"
      data-modal-close
      class="rounded-md border border-input-ring px-3 py-1.5 text-sm transition-colors hover:bg-surface"
    >Close</button>
  `;

  dialog.append(header, body, footer);

  for (const button of dialog.querySelectorAll('[data-modal-close]')) {
    button.addEventListener('click', () => dialog.close());
  }

  // Click-outside as well, not instead: the backdrop is the dialog's own element
  // in the hit test, so a click landing on it and not on the content means the
  // user clicked past the dialog.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.body.append(dialog);

  return {
    element: dialog,
    open() {
      if (!dialog.open) dialog.showModal();
    },
    close() {
      dialog.close();
    },
  };
}

// The scrolling middle section every modal shares. Kept here rather than left to
// each caller so the three cannot drift apart in padding or scroll behaviour.
//
// `flex-1 min-h-0` rather than a fixed `max-h-[70dvh]` (Phase 6.9). The old cap
// was set independently of the dialog's own `90dvh`, so on a short viewport the
// header, a 70dvh body and the footer added up to more than the shell allowed —
// and because a <dialog> defaults to `overflow: auto`, the shell scrolled too.
// That is the double scrollbar: two tracks, on all three modals, below roughly
// 560px of viewport height. Sizing the body as "whatever is left" instead means
// it cannot overflow its parent, so the shell never has anything to scroll.
// `min-h-0` is the part that makes it work — a flex item defaults to
// `min-height: auto` and would otherwise refuse to shrink below its content.
export function modalBody(className = '') {
  const element = document.createElement('div');
  element.className =
    `min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed ${className}`.trim();
  return element;
}
