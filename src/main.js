// main.js — entry point: wires state, controls, render.
// Phase 1 scaffold only. The imports below exist to confirm every module and
// the archetype registry resolve correctly through Vite; no state, generation,
// or render logic runs yet.

import { state, loadState, saveState } from './state.js';
import { fbm, ridgedFbm } from './noise.js';
import { themes, generatePalette } from './palette.js';
import { computeLighting } from './lighting.js';
import { render } from './render.js';
import { initControls } from './controls.js';
import { downloadSVG, downloadSettings } from './download.js';
import { initHelp } from './help.js';
import { initTheme } from './theme.js';
import { archetypes } from './archetypes/index.js';

const modules = {
  state,
  loadState,
  saveState,
  fbm,
  ridgedFbm,
  themes,
  generatePalette,
  computeLighting,
  render,
  initControls,
  downloadSVG,
  downloadSettings,
  initHelp,
  initTheme,
};

const resolved = Object.keys(modules).length;
const archetypeNames = Object.keys(archetypes);

const target = document.querySelector('#app');
target.innerHTML = `
  <p class="scaffold-status">Scaffold ready.</p>
  <p class="scaffold-detail">
    ${resolved} module exports resolved ·
    ${archetypeNames.length} archetypes registered
  </p>
`;

console.info('[svg-landscape] scaffold ready', { archetypes: archetypeNames });
