// controls.js — Tweakpane panel, grouped folders.
// Folder structure is fixed by CONTEXT.md section 5: Scene, Lighting, Color,
// Canvas, Actions, Preferences. All new controls belong in one of these groups.
//
// Actions is deliberately not here — an export action shouldn't sit among
// tunable sliders (section 5), so main.js renders it as its own panel.
// Lighting (Phase 4), Color (Phase 5) and Preferences (Phase 6) arrive with
// the features behind them; empty folders would read as broken.

import { Pane } from 'tweakpane';

import { archetypeOptions } from './archetypes/index.js';
import { ASPECTS, regenerate, setAspect, state } from './state.js';

// Elevation is only implemented in V valley so far (CONTEXT.md section 6a).
// Everywhere else the control is inert, and the UI has to say so rather than
// leaving the user to wonder whether it is broken.
const ELEVATION_ARCHETYPES = new Set(['v-valley']);
const POV_LABEL = 'Point of view height';
const POV_LABEL_INERT = 'POV height (V valley only)';

export function initControls({ container }) {
  const pane = new Pane({ container, title: 'Controls' });

  // Changing a parameter reseeds only incidentally, so the lock suppresses it.
  const onParamChange = () => {
    regenerate({ reseed: 'incidental' });
    pane.refresh();
  };

  // Randomize and New View exist to change the seed, so the lock never applies.
  const onNewSeed = () => {
    regenerate({ reseed: 'explicit' });
    pane.refresh();
  };

  const scene = pane.addFolder({ title: 'Scene' });

  const archetypeBinding = scene.addBinding(state, 'archetype', {
    label: 'Landscape type',
    options: archetypeOptions(),
  });
  archetypeBinding.on('change', () => {
    syncElevationAffordance();
    onParamChange();
  });

  scene
    .addBinding(state, 'complexity', {
      label: 'Complexity',
      min: 0,
      max: 1,
      step: 0.01,
    })
    .on('change', onParamChange);

  scene
    .addBinding(state, 'peakCount', {
      label: 'Peak count',
      min: 0,
      max: 1,
      step: 0.01,
    })
    .on('change', onParamChange);

  scene
    .addBinding(state, 'sharpness', {
      label: 'Peak sharpness',
      min: 0,
      max: 1,
      step: 0.01,
    })
    .on('change', onParamChange);

  const elevationBinding = scene.addBinding(state, 'elevation', {
    label: POV_LABEL,
    min: 0,
    max: 1,
    step: 0.01,
  });
  elevationBinding.on('change', onParamChange);

  scene.addBinding(state, 'seed', {
    label: 'Seed',
    readonly: true,
    format: (value) => value.toFixed(0),
  });

  scene.addBinding(state, 'seedLocked', { label: 'Lock seed' });

  scene.addButton({ title: 'Randomize seed' }).on('click', onNewSeed);
  scene.addButton({ title: 'New View' }).on('click', onNewSeed);

  const canvas = pane.addFolder({ title: 'Canvas' });

  canvas
    .addBinding(state, 'aspect', {
      label: 'Aspect ratio',
      options: Object.fromEntries(ASPECTS.map((a) => [a.label, a.key])),
    })
    .on('change', (event) => {
      setAspect(event.value);
      onParamChange();
    });

  function syncElevationAffordance() {
    const active = ELEVATION_ARCHETYPES.has(state.archetype);
    elevationBinding.disabled = !active;
    elevationBinding.label = active ? POV_LABEL : POV_LABEL_INERT;
  }

  syncElevationAffordance();

  return pane;
}
