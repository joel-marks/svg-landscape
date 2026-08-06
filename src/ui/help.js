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
// All three are markdown, rendered by markdown.js (Phase 6.9), and all three are
// `?raw` imports of real files — Help joined the other two in Phase 6.11,
// replacing a structured list in this module that assembled its markdown at
// runtime. Editing any of the three is now editing one .md file, no code change.

import readme from '../../README.md?raw';
import about from '../about/about.md?raw';
import help from '../help/help.md?raw';

import { renderMarkdown } from './markdown.js';
import { createModal, modalBody } from './modal.js';

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

// Copy lives in src/about/about.md and is sourced exactly like the README
// (Phase 6.9, replacing a JS string constant) — so rewriting the copy is
// editing one markdown file, with no code change (CONTEXT.md section 10).
function buildAbout() {
  return createModal({
    id: 'about-dialog',
    title: 'About',
    body: markdownBody(about, 'About this project'),
  });
}

// `tabindex` makes the scroll region reachable: a scrolling div can be moved
// with a wheel but not with a keyboard unless it can take focus.
function markdownBody(source, label) {
  const body = modalBody('markdown');
  body.innerHTML = renderMarkdown(source);
  body.tabIndex = 0;
  body.setAttribute('role', 'document');
  body.setAttribute('aria-label', label);
  return body;
}
