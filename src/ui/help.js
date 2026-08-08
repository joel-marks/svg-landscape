// help.js — the app's informational modals: Help, Read Me and About.
// All three are in-page dialogs, no separate route, to keep this a true
// one-pager (CONTEXT.md section 10). They share one <dialog> implementation
// from modal.js rather than each carrying its own.
//
// Help covers control explanations and the seed/reproducibility caveat. Its
// copy is written for someone using the app, not for someone building it: a
// condensed pass over CONTEXT.md section 5, not a dump of it. Read Me shows the
// repo's own README.
//
// All three are markdown and all three come from real .md files — Help joined the
// other two in Phase 6.11, replacing a structured list in this module that
// assembled its markdown at runtime. Editing any of the three is editing one .md
// file, no code change.
//
// **Two of the three render here; About no longer does (Phase 12).** Help and
// Read Me are still `?raw` imports rendered by markdown.js on first open. About
// is rendered into index.html at build time by the hook in vite.config.js — the
// same file through the same renderer, one level down the heading scale — and
// this module *adopts* that node instead of producing a second copy of it. The
// reason is not the modal: prose that only exists once a button is pressed does
// not exist in the HTML a crawler is served, and the About copy is the only real
// writing on the page (CONTEXT.md sections 10, 11).

import readme from '../../README.md?raw';
import help from '../help/help.md?raw';

import { renderMarkdown } from './markdown.js';
import { createModal, modalBody, MODAL_BODY_CLASS } from './modal.js';

let modals = null;

// All three are built once, on first call, and share modal.js's dialog — Read Me
// and About arriving in Phase 6.6 is what made that shared mechanism worth
// extracting rather than copied twice more. Since Phase 6.9 all three also share
// one renderer: their copy is markdown, converted by markdown.js.
export function initHelp() {
  modals ??= {
    help: buildHelp(),
    readme: buildReadme(),
    about: buildAbout(),
  };

  return {
    open: modals.help.open,
    openHelp: modals.help.open,
    openReadme: modals.readme.open,
    openAbout: modals.about.open,
  };
}

// Copy lives in src/help/help.md, sourced exactly like the README and the About
// text (Phase 6.11, replacing a structured list assembled here at runtime) — the
// groups stay in the panel's own order because the file is written that way,
// not because code enforces it (CONTEXT.md section 10).
function buildHelp() {
  return createModal({
    id: 'help-dialog',
    title: 'Using the landscape generator',
    body: markdownBody(help, 'Help contents'),
  });
}

// The project's own README, imported at build time with Vite's `?raw` suffix —
// the file itself, not a copy of it, so it cannot go stale as the README is
// maintained (CONTEXT.md section 15).
function buildReadme() {
  return createModal({
    id: 'readme-dialog',
    title: 'Read Me',
    body: markdownBody(readme, 'README contents'),
  });
}

// Copy lives in src/about/about.md, and since Phase 12 it arrives already
// rendered, in the served HTML — so this builds no body, it takes the one the
// page shipped with (see the note at the head of this file). Moving the node into
// the dialog is what "adopts" means here: it is the same element, so there is
// exactly one copy of the copy in the document at any moment, and it stops being
// hidden the moment it belongs to a dialog that controls its own visibility.
function buildAbout() {
  return createModal({
    id: 'about-dialog',
    title: 'About',
    body: adoptedBody('about-content', 'About this project'),
  });
}

// The container is part of index.html, so a miss means the page was not served by
// its own build. An empty body rather than a fallback render: a second render path
// is the thing this phase removed, and inventing replacement copy here would be
// worse than showing none.
function adoptedBody(id, label) {
  const element = document.getElementById(id);
  if (!element) return modalBody('markdown');

  element.hidden = false;
  element.className = `${MODAL_BODY_CLASS} ${element.className}`.trim();
  element.tabIndex = 0;
  element.setAttribute('role', 'document');
  element.setAttribute('aria-label', label);
  return element;
}

// `tabindex` makes the scroll region reachable: a scrolling div can be moved
// with a wheel but not with a keyboard unless it can take focus.
//
// `headingOffset: 1` for the same reason the About injection uses it, and it was
// a Phase 12 finding rather than part of the plan: these two documents each open
// with `# Title`, and both modals are built at init, so from the app's first
// paint the page carried three <h1>s — the header's and one inside each dialog —
// with only the header's ever visible. Purely an outline fix: markdown.js sizes
// headings by their authored level, so nothing here renders a pixel differently.
function markdownBody(source, label) {
  const body = modalBody('markdown');
  body.innerHTML = renderMarkdown(source, { headingOffset: 1 });
  body.tabIndex = 0;
  body.setAttribute('role', 'document');
  body.setAttribute('aria-label', label);
  return body;
}
