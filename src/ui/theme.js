// theme.js — UI light/dark theme, prefers-color-scheme, persistence.
// Chrome-only: independent of the in-scene time-of-day lighting system
// (CONTEXT.md section 5).
//
// Three modes per section 5: 'light' | 'dark' | 'system'. 'system' is the
// default and follows prefers-color-scheme live. All three resolve down to a
// single `dark` class on <html>, which is what style.css keys off.
//
// The mode is chosen from the Preferences folder in the control panel (Phase 6,
// CONTEXT.md section 5); the header button that used to cycle it is gone. This
// module keeps its own storage key rather than joining the settings blob in
// state.js — the theme is an interface preference, not part of the scene, and
// it has to be readable before any of that is loaded.

import { applyUITint } from './uitint.js';

const STORAGE_KEY = 'svg-landscape:theme';

// Dropdown order in the panel, and the list setThemeMode validates against.
export const THEME_MODES = ['system', 'light', 'dark'];

const query = window.matchMedia('(prefers-color-scheme: dark)');

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
  mode = THEME_MODES.includes(next) ? next : 'system';
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private-mode or blocked storage: theme still works for this session.
  }
  apply();
  return mode;
}

// Went with the header button in Phase 6, along with the change-listener
// registration that only existed to keep that button's icon and label in sync:
// cycling was the button's affordance — one control standing in for three
// states — and the Preferences dropdown that replaced it both selects a mode
// outright and shows the current one without being told.

function apply() {
  document.documentElement.classList.toggle('dark', getResolvedTheme() === 'dark');
  // The scene theme's UI tint is mixed into whichever set of base tokens is now
  // in force (CONTEXT.md section 5, Phase 7), so switching Light/Dark has to
  // recompute it — the tint itself is unchanged, the neutral it sits on is not.
  // Called after the class, since that is what decides which base values
  // uitint.js will read back.
  applyUITint();
}

function readStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEME_MODES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}
