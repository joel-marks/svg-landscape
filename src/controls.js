// controls.js — Tweakpane panel, grouped folders.
// Folder structure is fixed by CONTEXT.md section 5: Scene, Lighting, Color,
// Canvas, Actions, Preferences. All new controls belong in one of these groups.
//
// Phase 3 scope: Scene, Canvas, and Actions. Lighting (Phase 4), Color
// (Phase 5), and Preferences (Phase 6) arrive with the features behind them —
// empty folders would read as broken rather than forthcoming.

import { Pane } from 'tweakpane';

import { archetypeOptions } from './archetypes/index.js';
import { ASPECTS, regenerate, setAspect, state } from './state.js';

export function initControls({ container, onDownload }) {
  const pane = new Pane({ container, title: 'Controls' });

  // Any scene or canvas change draws a new view unless the seed is locked.
  const redraw = () => {
    regenerate({ reseed: true });
    pane.refresh();
  };

  const scene = pane.addFolder({ title: 'Scene' });

  scene
    .addBinding(state, 'archetype', {
      label: 'Landscape type',
      options: archetypeOptions(),
    })
    .on('change', redraw);

  scene
    .addBinding(state, 'complexity', {
      label: 'Complexity',
      min: 0,
      max: 1,
      step: 0.01,
    })
    .on('change', redraw);

  scene
    .addBinding(state, 'elevation', {
      label: 'Point of view height',
      min: 0,
      max: 1,
      step: 0.01,
    })
    .on('change', redraw);

  scene.addBinding(state, 'seed', {
    label: 'Seed',
    readonly: true,
    format: (value) => value.toFixed(0),
  });

  scene.addBinding(state, 'seedLocked', { label: 'Lock seed' });

  scene.addButton({ title: 'Randomize seed' }).on('click', redraw);
  scene.addButton({ title: 'New View' }).on('click', redraw);

  const canvas = pane.addFolder({ title: 'Canvas' });

  canvas
    .addBinding(state, 'aspect', {
      label: 'Aspect ratio',
      options: Object.fromEntries(ASPECTS.map((a) => [a.label, a.key])),
    })
    .on('change', (event) => {
      setAspect(event.value);
      redraw();
    });

  const actions = pane.addFolder({ title: 'Actions' });
  actions.addButton({ title: 'Download SVG' }).on('click', onDownload);

  return pane;
}
