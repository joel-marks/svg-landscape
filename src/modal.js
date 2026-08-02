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

  const header = document.createElement('div');
  header.className =
    'flex items-center gap-4 border-b border-border-token px-5 py-3';
  header.innerHTML = `
    <h2 id="${titleId}" class="m-0 text-base font-semibold tracking-tight">${title}</h2>
    <button
      type="button"
      data-modal-close
      class="ml-auto rounded-md border border-border-token bg-surface px-2 py-1 text-sm text-muted transition-colors hover:text-text"
      aria-label="Close ${title.toLowerCase()}"
    >&#10005;</button>
  `;

  const footer = document.createElement('div');
  footer.className = 'border-t border-border-token px-5 py-3 text-right';
  footer.innerHTML = `
    <button
      type="button"
      data-modal-close
      class="rounded-md border border-border-token bg-surface px-3 py-1.5 text-sm transition-colors hover:text-text"
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
export function modalBody(className = '') {
  const element = document.createElement('div');
  element.className =
    `max-h-[70dvh] overflow-y-auto px-5 py-4 text-sm leading-relaxed ${className}`.trim();
  return element;
}
