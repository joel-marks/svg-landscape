// theme.js — UI light/dark theme, prefers-color-scheme, persistence.
// Chrome-only: independent of the in-scene time-of-day lighting system
// (CONTEXT.md section 5).
//
// Three modes per section 5: 'light' | 'dark' | 'system'. 'system' is the
// default and follows prefers-color-scheme live. All three resolve down to a
// single `dark` class on <html>, which is what style.css keys off.

const STORAGE_KEY = 'svg-landscape:theme';
const MODES = ['system', 'light', 'dark'];

const query = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

let mode = readStoredMode();

export function initTheme() {
  apply();
  // Keep 'system' honest if the OS theme changes while the page is open.
  query.addEventListener('change', () => {
    if (mode === 'system') apply();
  });
  return mode;
}

export function getThemeMode() {
  return mode;
}

export function getResolvedTheme() {
  return mode === 'system' ? (query.matches ? 'dark' : 'light') : mode;
}

export function setThemeMode(next) {
  mode = MODES.includes(next) ? next : 'system';
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private-mode or blocked storage: theme still works for this session.
  }
  apply();
  return mode;
}

// System -> Light -> Dark -> System.
export function cycleThemeMode() {
  return setThemeMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
}

export function onThemeChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function apply() {
  const resolved = getResolvedTheme();
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  for (const listener of listeners) listener({ mode, resolved });
}

function readStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}
