// main.js — entry point: wires state, controls, render.
// Phase 3 scope: the Tweakpane panel drives generation for all nine
// archetypes. Lighting, palette controls, and persistence arrive in later
// phases.

import './style.css';

import { createIcons, Download, FileJson, Monitor, Moon, Sun } from 'lucide';

import { exportSettings, regenerate, setRenderer, state } from './state.js';
import { getArchetype } from './archetypes/index.js';
import { render } from './render.js';
import { initControls } from './controls.js';
import { downloadSettings, downloadSVG } from './download.js';
import { cycleThemeMode, getThemeMode, initTheme, onThemeChange } from './theme.js';

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
  return `landscape-${label.toLowerCase().replace(/\s+/g, '-')}-${state.seed}`;
}

document.querySelector('#download-svg').addEventListener('click', () => {
  downloadSVG(svg, `${exportName()}.svg`);
});

document.querySelector('#download-settings').addEventListener('click', () => {
  downloadSettings(exportSettings(), `${exportName()}.json`);
});

createIcons({
  icons: { Download, FileJson, Monitor, Moon, Sun },
  attrs: { width: 16, height: 16, 'aria-hidden': 'true' },
});

initControls({
  sceneContainer: document.querySelector('#panel-scene'),
  canvasContainer: document.querySelector('#panel-canvas'),
  lightingContainer: document.querySelector('#panel-lighting'),
});

initTheme();
syncThemeButton();
regenerate();
