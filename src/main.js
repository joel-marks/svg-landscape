// main.js — entry point: wires state, controls, render.
// Phase 2 scope: noise -> archetype generation -> SVG render on load, plus
// New View (reseed) and Download SVG. The grouped Tweakpane panel is Phase 3,
// so controls.js is not initialised yet.

import './style.css';

import { createIcons, Download, Monitor, Moon, RefreshCw, Sun } from 'lucide';

import { state, newSeed } from './state.js';
import { createPalette } from './palette.js';
import { getArchetype } from './archetypes/index.js';
import { render } from './render.js';
import { downloadSVG } from './download.js';
import { cycleThemeMode, getThemeMode, initTheme, onThemeChange } from './theme.js';

const svg = document.querySelector('#landscape');
const seedReadout = document.querySelector('#seed-readout');
const themeToggle = document.querySelector('#theme-toggle');
const themeLabel = document.querySelector('#theme-label');

const THEME_LABELS = { system: 'System', light: 'Light', dark: 'Dark' };

function draw() {
  const archetype = getArchetype(state.archetype);
  const geometry = archetype.module.generate({
    width: state.width,
    height: state.height,
    seed: state.seed,
    complexity: state.complexity,
    elevation: state.elevation,
  });

  render(svg, geometry, createPalette(state.palette));

  seedReadout.textContent = state.seed;
  svg.setAttribute('aria-label', `Procedurally generated ${archetype.label} landscape, seed ${state.seed}`);
}

function syncThemeButton() {
  const mode = getThemeMode();
  for (const icon of themeToggle.querySelectorAll('[data-theme-icon]')) {
    icon.hidden = icon.dataset.themeIcon !== mode;
  }
  themeLabel.textContent = THEME_LABELS[mode];
  themeToggle.setAttribute('aria-label', `Theme: ${THEME_LABELS[mode].toLowerCase()}`);
}

document.querySelector('#new-view').addEventListener('click', () => {
  newSeed();
  draw();
});

document.querySelector('#download-svg').addEventListener('click', () => {
  downloadSVG(svg, `landscape-${state.archetype}-${state.seed}.svg`);
});

themeToggle.addEventListener('click', () => {
  cycleThemeMode();
  syncThemeButton();
});

onThemeChange(syncThemeButton);

createIcons({
  icons: { Download, Monitor, Moon, RefreshCw, Sun },
  attrs: { width: 16, height: 16, 'aria-hidden': 'true' },
});

initTheme();
syncThemeButton();
draw();
