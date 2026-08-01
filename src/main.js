// main.js — entry point: wires state, controls, render.
// Phase 3 scope: the Tweakpane panel drives generation for all nine
// archetypes. Lighting, palette controls, and persistence arrive in later
// phases.

import './style.css';

import { createIcons, Monitor, Moon, Sun } from 'lucide';

import { exportSettings, regenerate, setRenderer, state } from './state.js';
import { getArchetype } from './archetypes/index.js';
import { render } from './render.js';
import { initControls } from './controls.js';
import { downloadSettings, downloadSVG } from './download.js';
import { cycleThemeMode, getThemeMode, initTheme, onThemeChange } from './theme.js';
import { slugify } from './utils.js';

const svg = document.querySelector('#landscape');
const frame = document.querySelector('#canvas-frame');
const themeToggle = document.querySelector('#theme-toggle');
const themeLabel = document.querySelector('#theme-label');

const THEME_LABELS = { system: 'System', light: 'Light', dark: 'Dark' };

setRenderer((geometry, paint, archetype) => {
  render(svg, geometry, paint);

  // Keep the frame's box matching the generated canvas so wider aspects get a
  // shorter frame rather than a letterboxed one.
  frame.style.aspectRatio = `${geometry.width} / ${geometry.height}`;
  svg.setAttribute(
    'aria-label',
    `Procedurally generated ${archetype.label} landscape, seed ${state.seed}`,
  );
});

function syncThemeButton() {
  const mode = getThemeMode();
  for (const icon of themeToggle.querySelectorAll('[data-theme-icon]')) {
    icon.hidden = icon.dataset.themeIcon !== mode;
  }
  themeLabel.textContent = THEME_LABELS[mode];
  themeToggle.setAttribute(
    'aria-label',
    `Theme: ${THEME_LABELS[mode].toLowerCase()}`,
  );
}

themeToggle.addEventListener('click', () => {
  cycleThemeMode();
  syncThemeButton();
});

onThemeChange(syncThemeButton);

function exportName() {
  const { label } = getArchetype(state.archetype);
  return `landscape-${slugify(label)}-${state.seed}`;
}

// A named settings export is easier to find on disk by the name the user gave
// it than by the archetype it happens to use, so the name takes the
// archetype's place when one is set. Blank — or a name that sanitizes away to
// nothing — falls back to the unnamed form.
function settingsName() {
  const named = slugify(state.presetName);
  return named ? `landscape-${named}-${state.seed}` : exportName();
}

createIcons({
  icons: { Monitor, Moon, Sun },
  attrs: { width: 16, height: 16, 'aria-hidden': 'true' },
});

initControls({
  presetsContainer: document.querySelector('#panel-presets'),
  leftContainer: document.querySelector('#panel-left'),
  centreContainer: document.querySelector('#panel-centre'),
  rightContainer: document.querySelector('#panel-right'),
  onDownloadSVG: () => downloadSVG(svg, `${exportName()}.svg`),
  onDownloadSettings: () =>
    downloadSettings(exportSettings(), `${settingsName()}.json`),
});

initTheme();
syncThemeButton();
regenerate();
