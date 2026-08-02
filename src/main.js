// main.js — entry point: wires state, controls, render.

import './style.css';

import { exportSettings, loadState, regenerate, setRenderer, state } from './state.js';
import { getArchetype } from './archetypes/index.js';
import { render } from './render.js';
import { initControls } from './controls.js';
import { downloadSettings, downloadSVG } from './download.js';
import { initHelp } from './help.js';
import { initTheme } from './theme.js';
import { slugify } from './utils.js';

const svg = document.querySelector('#landscape');
const frame = document.querySelector('#canvas-frame');

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

const help = initHelp();

// Before the panel is built and before the first render (CONTEXT.md section 7),
// so the controls come up showing the restored values and the scene that draws
// is the one the visitor left — same seed included. A first visit restores
// nothing and the factory defaults in state.js are what render.
loadState();

initControls({
  presetsContainer: document.querySelector('#panel-presets'),
  leftContainer: document.querySelector('#panel-left'),
  centreContainer: document.querySelector('#panel-centre'),
  actionsContainer: document.querySelector('#panel-actions'),
  preferencesContainer: document.querySelector('#panel-preferences'),
  onDownloadSVG: () => downloadSVG(svg, `${exportName()}.svg`),
  onDownloadSettings: () =>
    downloadSettings(exportSettings(), `${settingsName()}.json`),
  onHelp: help.openHelp,
  onReadme: help.openReadme,
  onAbout: help.openAbout,
});

initTheme();
regenerate();
