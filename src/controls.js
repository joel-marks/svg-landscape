// controls.js — Tweakpane parameter controls, grouped per CONTEXT.md section 5.
//
// No folders anywhere: Tweakpane's Folder is an accordion, and section 5 calls
// for flat, always-visible controls. Grouping instead comes from two title-less
// Pane instances mounted under plain HTML headings — a Pane given a `title`
// grows a collapsible root, so the panes deliberately have none.
//
// Actions lives outside this module entirely (an export action shouldn't sit
// among tunable sliders), as does Color, which is reserved for Phase 5.

import { Pane } from 'tweakpane';

import { archetypeOptions } from './archetypes/index.js';
import { ASPECTS, regenerate, setAspect, state } from './state.js';

// Elevation is implemented everywhere except In gorge, which is a deferred edge
// case rather than an oversight (CONTEXT.md section 6a). The control has to say
// so, or an inert slider reads as broken.
const ELEVATION_DEFERRED = new Set(['in-gorge']);
const POV_LABEL = 'Point of view height';
const POV_LABEL_DEFERRED = 'POV height (n/a for In gorge)';

export function initControls({ sceneContainer, canvasContainer }) {
  const scene = new Pane({ container: sceneContainer });
  const canvas = new Pane({ container: canvasContainer });
  const panes = [scene, canvas];

  const refresh = () => panes.forEach((pane) => pane.refresh());

  // Changing a parameter reseeds only incidentally, so the lock suppresses it.
  const onParamChange = () => {
    regenerate({ reseed: 'incidental' });
    refresh();
  };

  // Randomize and New View exist to change the seed, so the lock never applies.
  const onNewSeed = () => {
    regenerate({ reseed: 'explicit' });
    refresh();
  };

  const archetypeBinding = scene.addBinding(state, 'archetype', {
    label: 'Landscape type',
    options: archetypeOptions(),
  });
  archetypeBinding.on('change', () => {
    syncElevationAffordance();
    onParamChange();
  });

  for (const [key, label] of [
    ['complexity', 'Complexity'],
    ['peakCount', 'Peak count'],
    ['sharpness', 'Peak sharpness'],
  ]) {
    scene
      .addBinding(state, key, { label, min: 0, max: 1, step: 0.01 })
      .on('change', onParamChange);
  }

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
    const deferred = ELEVATION_DEFERRED.has(state.archetype);
    elevationBinding.disabled = deferred;
    elevationBinding.label = deferred ? POV_LABEL_DEFERRED : POV_LABEL;
  }

  syncElevationAffordance();

  return { panes, refresh };
}
