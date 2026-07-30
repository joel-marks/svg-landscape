// controls.js — Tweakpane panel, grouped folders.
// Folder structure per CONTEXT.md section 5: Scene, Lighting, Color, Canvas,
// Actions, Preferences.
//
// One Pane per column, each holding collapsible folders. The panes themselves
// are title-less so the only accordion headings are the folder titles.
//
//   left    Canvas, Scene
//   centre  Lighting, Color (reserved for Phase 5)
//   right   Actions
//
// Everything the user touches is a Tweakpane control, including the export
// buttons — hence Actions living here rather than as separate markup.

import { Pane } from 'tweakpane';

import { archetypeOptions } from './archetypes/index.js';
import { ASPECTS, regenerate, repaint, setAspect, state } from './state.js';

// Elevation is implemented everywhere except In gorge, which is a deferred edge
// case rather than an oversight (CONTEXT.md section 6a). The control has to say
// so, or an inert slider reads as broken.
const ELEVATION_DEFERRED = new Set(['in-gorge']);
const POV_LABEL = 'Point of view height';
const POV_LABEL_DEFERRED = 'POV height (n/a for In gorge)';

export function initControls({
  leftContainer,
  centreContainer,
  rightContainer,
  onDownloadSVG,
  onDownloadSettings,
}) {
  const left = new Pane({ container: leftContainer });
  const centre = new Pane({ container: centreContainer });
  const right = new Pane({ container: rightContainer });
  const panes = [left, centre, right];

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

  // Lighting only ever repaints — geometry is untouched, and the seed lock does
  // not cover this group (CONTEXT.md section 5).
  const onLightingChange = () => repaint();

  // --- left column ---------------------------------------------------------

  const canvas = left.addFolder({ title: 'Canvas' });

  canvas
    .addBinding(state, 'aspect', {
      label: 'Aspect ratio',
      options: Object.fromEntries(ASPECTS.map((a) => [a.label, a.key])),
    })
    .on('change', (event) => {
      setAspect(event.value);
      onParamChange();
    });

  const scene = left.addFolder({ title: 'Scene' });

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

  // --- centre column -------------------------------------------------------

  const lighting = centre.addFolder({ title: 'Lighting' });

  lighting
    .addBinding(state, 'hour', {
      label: 'Time of day',
      min: 0,
      max: 24,
      step: 0.1,
      format: (v) =>
        `${String(Math.floor(v)).padStart(2, '0')}:${String(
          Math.round((v % 1) * 60),
        ).padStart(2, '0')}`,
    })
    .on('change', onLightingChange);

  const shadowBinding = lighting.addBinding(state, 'shadow', {
    label: 'Shadow / pseudo-3D',
  });

  const angleBinding = lighting.addBinding(state, 'lightAngle', {
    label: 'Light source angle',
    min: 0,
    max: 360,
    step: 1,
  });
  angleBinding.on('change', onLightingChange);

  const intensityBinding = lighting.addBinding(state, 'shadowIntensity', {
    label: 'Shadow intensity',
    min: 0,
    max: 1,
    step: 0.01,
  });
  intensityBinding.on('change', onLightingChange);

  shadowBinding.on('change', () => {
    syncShadowAffordance();
    onLightingChange();
  });

  const colour = centre.addFolder({ title: 'Color' });
  // A readonly note rather than disabled controls: stubbing the real ones would
  // imply they work. Theme preset, palette randomizer, colour depth and
  // distance haze all arrive in Phase 5.
  colour.addBinding({ status: 'Arrives in Phase 5' }, 'status', {
    label: 'Status',
    readonly: true,
  });

  // --- right column --------------------------------------------------------

  const actions = right.addFolder({ title: 'Actions' });
  actions.addButton({ title: 'Download SVG' }).on('click', onDownloadSVG);
  actions.addButton({ title: 'Download settings' }).on('click', onDownloadSettings);

  function syncShadowAffordance() {
    angleBinding.disabled = !state.shadow;
    intensityBinding.disabled = !state.shadow;
  }

  function syncElevationAffordance() {
    const deferred = ELEVATION_DEFERRED.has(state.archetype);
    elevationBinding.disabled = deferred;
    elevationBinding.label = deferred ? POV_LABEL_DEFERRED : POV_LABEL;
  }

  syncElevationAffordance();
  syncShadowAffordance();

  return { panes, refresh };
}
