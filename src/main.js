// main.js — entry point: wires state, controls, render.

import './style.css';

import {
  exportSettings,
  loadState,
  regenerate,
  setRenderer,
  setViewportClass,
  state,
} from './core/state.js';
import { getArchetype } from './archetypes/index.js';
import { render } from './core/render.js';
import { initControls } from './ui/controls.js';
import { downloadSettings, downloadSVG } from './ui/download.js';
import { initHelp } from './ui/help.js';
import { initScenePin } from './ui/scenepin.js';
import { initTheme } from './ui/theme.js';
import { slugify } from './core/utils.js';

const svg = document.querySelector('#landscape');
const frame = document.querySelector('#canvas-frame');

// The header's build readout (CONTEXT.md section 3). `__COMMIT_HASH__` is a
// constant Vite substitutes at build time from `git rev-parse --short HEAD`
// (vite.config.js) — nothing here runs git, and there is no runtime lookup.
// Written from JS rather than into the markup because Vite's `define` reaches
// modules, not index.html.
document.querySelector('#build-hash').textContent = __COMMIT_HASH__;

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

// The viewport class the default aspect is resolved from (CONTEXT.md section 5,
// Phase 13.5). Measured here rather than in state.js because `/core` computes
// the picture and does not read the DOM (section 3) — the same inversion
// setRenderer uses, and what keeps the module importable in plain Node.
//
// Read once, before loadState(), and never again: a returning visitor's stored
// aspect overwrites this a line later, and resizing across the breakpoint
// mid-session deliberately changes nothing. `min-width: 1024px` is the same
// boundary style.css's `width < 1024px` draws, from the other side.
setViewportClass(
  window.matchMedia('(min-width: 1024px)').matches ? 'wide' : 'narrow',
);

// Before the panel is built and before the first render (CONTEXT.md section 7),
// so the controls come up showing the restored values and the scene that draws
// is the one the visitor left — same seed included. A first visit restores
// nothing and the factory defaults in state.js are what render.
loadState();

initControls({
  presetsContainer: document.querySelector('#panel-presets'),
  canvasContainer: document.querySelector('#panel-canvas'),
  sceneContainer: document.querySelector('#panel-scene'),
  lightingContainer: document.querySelector('#panel-lighting'),
  colourContainer: document.querySelector('#panel-colour'),
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

// Cosmetic, and deliberately not guarded by anything (CONTEXT.md section 5,
// Phase 13): the sticky scene is CSS, and this only draws the hairline that
// appears once content is passing beneath it.
initScenePin();

regenerate();

// The other half of the initial-load fade (CONTEXT.md section 9; the critical
// style that starts it is inlined in index.html's <head>, because it has to
// work before style.css exists). Clearing this class is the whole signal: it
// drops the starting opacity, cancels the failsafe animation, and releases the
// `a { color: inherit }` fallback that keeps the header icon off the UA's link
// colour while there is no stylesheet.
//
// Last statement in the module, and after regenerate() rather than before it,
// so what fades in is the finished scene rather than an empty canvas frame. On
// the failure path the class is never added and the failsafe animation in the
// head reveals the page anyway — which is why nothing here is wrapped in a
// try/finally pretending to guard it.
document.documentElement.classList.add('app-ready');
