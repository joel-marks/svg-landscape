// about-content.js — the About modal's copy.
//
// ============================== PLACEHOLDER ==============================
// This text is a stand-in and is meant to be replaced by Joel.
//
// It was deliberately NOT written for you: an "about this project" page is a
// first-person account of why the thing exists and how it was made, and
// plausible-sounding prose generated on your behalf would read as yours while
// being invented. Nothing here should ship as-is.
//
// To replace it: overwrite ABOUT_HTML below with your own copy and delete this
// banner. Markup is plain HTML (the modal renders it directly, same as the Help
// modal's content) — headings, paragraphs and links all work; there is no
// markdown step. Tailwind utility classes are available on any element.
// =========================================================================

export const ABOUT_IS_PLACEHOLDER = true;

export const ABOUT_HTML = `
  <p class="mt-0 rounded-md border border-border-token bg-surface p-3 text-muted">
    <strong class="text-text">Placeholder — not final copy.</strong>
    This modal is wired up and working, but its text has not been written yet.
    It lives in <code>src/about-content.js</code> and is waiting to be replaced
    with the real thing.
  </p>

  <p class="text-muted">
    What belongs here is the part no one else can write: what this project is,
    why it was built, and how it was put together.
  </p>
`;
