// controls.js — Tweakpane panel, grouped folders.
// Folder structure per CONTEXT.md section 5: Scene, Lighting, Color, Canvas,
// Actions, Preferences.
//
// One Pane per column, each holding collapsible folders. The panes themselves
// are title-less so the only accordion headings are the folder titles.
//
//   left    Presets (its own pane), then Canvas, Scene
//   centre  Lighting, Color
//   right   Actions
//
// Presets is a separate Pane instance stacked at the top of the left column,
// not a control inside the Canvas/Scene pane: it loads a whole parameter set
// rather than adjusting one, so it reads as its own panel.
//
// Everything the user touches is a Tweakpane control, including the export
// buttons — hence Actions living here rather than as separate markup.

import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

import { archetypeOptions } from './archetypes/index.js';
import { CUSTOM_THEME_ID, themeOptions } from './palette.js';
import { findPreset, presetOptions } from './presets.js';
import {
  applySettings,
  ASPECTS,
  captureAngleOffset,
  currentPresetId,
  exportSettings,
  randomizePalette,
  regenerate,
  repaint,
  setAspect,
  state,
  stepTheme,
  syncLockedAngle,
} from './state.js';

// Elevation is implemented everywhere except In gorge, which is a deferred edge
// case rather than an oversight (CONTEXT.md section 6a). The control has to say
// so, or an inert slider reads as broken.
const ELEVATION_DEFERRED = new Set(['in-gorge']);
const POV_LABEL = 'Point of view height';
const POV_LABEL_DEFERRED = 'POV height (n/a for In gorge)';

// While the tidelock is engaged the angle slider is a readout, not an input
// (CONTEXT.md section 6). Relabelling it says so — a greyed-out slider whose
// value keeps moving on its own otherwise just reads as broken.
const ANGLE_LABEL = 'Light source angle';
const ANGLE_LABEL_LOCKED = 'Light angle (tracking)';

// The theme row, left to right (CONTEXT.md section 5).
const THEME_ACTIONS = ['Previous', 'Randomise', 'Next'];

export function initControls({
  presetsContainer,
  leftContainer,
  centreContainer,
  rightContainer,
  onDownloadSVG,
  onDownloadSettings,
}) {
  const presetsPane = new Pane({ container: presetsContainer });
  const left = new Pane({ container: leftContainer });
  const centre = new Pane({ container: centreContainer });
  const right = new Pane({ container: rightContainer });
  const panes = [presetsPane, left, centre, right];

  // Registered before any blade is added. Only Color's theme row needs it, so
  // only the pane hosting that row carries the plugin.
  centre.registerPlugin(EssentialsPlugin);

  // The Download JSON preview is a monitor over this. It is refreshed with the
  // panes rather than polled on a timer — the JSON only changes when a control
  // does, and building it from exportSettings() is what guarantees the preview
  // and the downloaded file can't disagree.
  const exportPreview = { json: previewJSON() };

  // Set while the panel is being written to programmatically.
  let syncing = false;

  // Refreshing a pane re-emits `change` on every binding whose value moved,
  // which at the handler is indistinguishable from the user moving it — and a
  // parameter handler firing there would draw a fresh seed and undo the very
  // preset load that moved the value. So every user-facing change handler is
  // registered through this and goes quiet while the panel is being written to.
  const onUserChange = (handler) => (event) => {
    if (syncing) return;
    handler(event);
  };

  const refresh = () => {
    if (syncing) return;
    syncing = true;

    // Both are derived from the live state, so they are recomputed here rather
    // than maintained by each individual control handler.
    exportPreview.json = previewJSON();
    state.preset = currentPresetId();

    panes.forEach((pane) => pane.refresh());

    // The affordances the suppressed handlers would have maintained. Applied
    // unconditionally rather than off a change event, so loading a preset that
    // switches archetype still greys out the controls that archetype defers.
    syncElevationAffordance();
    syncShadowAffordance();
    syncMistAffordance();

    syncing = false;
  };

  // Changing a parameter reseeds only incidentally, so the lock suppresses it.
  const onParamChange = () => {
    regenerate({ reseed: 'incidental' });
    refresh();
  };

  // New View exists to change the seed, so the lock never applies to it.
  const onNewSeed = () => {
    regenerate({ reseed: 'explicit' });
    refresh();
  };

  // Lighting and Color only ever repaint — geometry is untouched, and the seed
  // lock does not cover either group (CONTEXT.md section 5). They still refresh
  // the panel: Color's values are part of the exported JSON the preview shows.
  const onPaintChange = () => {
    repaint();
    refresh();
  };

  // --- left column, presets pane --------------------------------------------

  const presetBinding = presetsPane.addBinding(state, 'preset', {
    label: 'Preset',
    options: presetOptions(),
  });

  presetBinding.on(
    'change',
    onUserChange((event) => {
      // "Custom" is a state the dropdown reports, not a preset to load.
      const preset = findPreset(event.value);
      if (!preset) return;

      applySettings(preset.settings);
      refresh();
    }),
  );

  // --- left column, canvas and scene pane -----------------------------------

  const canvas = left.addFolder({ title: 'Canvas' });

  canvas
    .addBinding(state, 'aspect', {
      label: 'Aspect ratio',
      options: Object.fromEntries(ASPECTS.map((a) => [a.label, a.key])),
    })
    .on(
      'change',
      onUserChange((event) => {
        setAspect(event.value);
        onParamChange();
      }),
    );

  const scene = left.addFolder({ title: 'Scene' });

  const archetypeBinding = scene.addBinding(state, 'archetype', {
    label: 'Landscape type',
    options: archetypeOptions(),
  });
  archetypeBinding.on(
    'change',
    onUserChange(() => {
      syncElevationAffordance();
      onParamChange();
    }),
  );

  for (const [key, label] of [
    ['complexity', 'Complexity'],
    ['peakCount', 'Peak count'],
    ['sharpness', 'Peak sharpness'],
  ]) {
    scene
      .addBinding(state, key, { label, min: 0, max: 1, step: 0.01 })
      .on('change', onUserChange(onParamChange));
  }

  const elevationBinding = scene.addBinding(state, 'elevation', {
    label: POV_LABEL,
    min: 0,
    max: 1,
    step: 0.01,
  });
  elevationBinding.on('change', onUserChange(onParamChange));

  scene.addBinding(state, 'seed', {
    label: 'Seed',
    readonly: true,
    format: (value) => value.toFixed(0),
  });

  scene.addBinding(state, 'seedLocked', { label: 'Lock seed' });

  // The sole reseed action (CONTEXT.md section 5). "Randomize seed" sat
  // directly above this until Phase 5.12 and did exactly the same thing —
  // same handler, same disregard for the lock — so it went rather than staying
  // as a second button for one behaviour.
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
    .on(
      'change',
      onUserChange(() => {
        // Under the tidelock the hour drags the light angle with it, so the
        // panel has to be refreshed for the angle readout to follow.
        if (syncLockedAngle()) refresh();
        onPaintChange();
      }),
    );

  lighting.addBinding(state, 'showBodies', { label: 'Show sun/moon' })
    .on('change', onUserChange(onPaintChange));
  lighting.addBinding(state, 'showStars', { label: 'Show stars' })
    .on('change', onUserChange(onPaintChange));

  const shadowBinding = lighting.addBinding(state, 'shadow', {
    label: 'Shadow / pseudo-3D',
  });

  const angleBinding = lighting.addBinding(state, 'lightAngle', {
    label: ANGLE_LABEL,
    min: 0,
    max: 360,
    step: 1,
  });
  angleBinding.on('change', onUserChange(onPaintChange));

  const lockBinding = lighting.addBinding(state, 'lockAngle', {
    label: 'Lock angle to time of day',
  });
  lockBinding.on(
    'change',
    onUserChange((event) => {
      // Capture on engage only. Disengaging leaves the angle wherever the lock
      // last put it and hands it back to the slider (CONTEXT.md section 6).
      if (event.value) captureAngleOffset();
      syncShadowAffordance();
    }),
  );

  const intensityBinding = lighting.addBinding(state, 'shadowIntensity', {
    label: 'Shadow intensity',
    min: 0,
    max: 1,
    step: 0.01,
  });
  intensityBinding.on('change', onUserChange(onPaintChange));

  shadowBinding.on(
    'change',
    onUserChange(() => {
      syncShadowAffordance();
      onPaintChange();
    }),
  );

  const colour = centre.addFolder({ title: 'Color' });

  // "Randomized" is a real entry in the dropdown rather than a mode the button
  // silently drops the panel into: once a generated palette is showing, the
  // preset control has to be able to say so, and selecting it back is how the
  // user returns to their generated palette after trying a curated one.
  const themeBinding = colour.addBinding(state, 'palette', {
    label: 'Theme preset',
    options: { ...themeOptions(), Randomized: CUSTOM_THEME_ID },
  });
  themeBinding.on('change', onUserChange(onPaintChange));

  // One row of three, directly beneath the dropdown they drive (CONTEXT.md
  // section 5). A pane lays its own controls out vertically, so the row is a
  // buttongrid blade from the essentials plugin — which is what the Phase 5.5
  // arrangement, with a stepper above the dropdown and another below it, was
  // working around. Behaviour is unchanged; only the layout is.
  const themeRow = colour.addBlade({
    view: 'buttongrid',
    size: [THEME_ACTIONS.length, 1],
    cells: (x) => ({ title: THEME_ACTIONS[x] }),
  });

  themeRow.on('click', ({ index: [x] }) => {
    if (x === 1) randomizePalette();
    else stepTheme(x === 0 ? -1 : 1);

    // Both repaint on their own; the dropdown still has to be told the value
    // moved — stepping changes it, and randomizing moves it to Randomized.
    refresh();
  });

  colour
    .addBinding(state, 'colorDepth', {
      label: 'Color depth',
      min: 0,
      max: 1,
      step: 0.01,
    })
    .on('change', onUserChange(onPaintChange));

  colour
    .addBinding(state, 'haze', {
      label: 'Distance haze',
      min: 0,
      max: 1,
      step: 0.01,
    })
    .on('change', onUserChange(onPaintChange));

  // Linear 0–1 here; state.js runs it through the section 6b response curve so
  // the effect stays near-invisible until the top of the travel.
  const mistBinding = colour.addBinding(state, 'valleyMist', {
    label: 'Valley mist',
    min: 0,
    max: 1,
    step: 0.01,
  });
  mistBinding.on(
    'change',
    onUserChange(() => {
      syncMistAffordance();
      onPaintChange();
    }),
  );

  // Distance grades the mist across the layer stack and does nothing at all
  // while there is no mist to grade, so it follows the same greyed-out
  // convention as the shadow controls rather than sitting live but inert.
  const mistDistanceBinding = colour.addBinding(state, 'mistDistance', {
    label: 'Distance',
    min: 0,
    max: 1,
    step: 0.01,
  });
  mistDistanceBinding.on('change', onUserChange(onPaintChange));

  // --- right column --------------------------------------------------------

  // Two tabs, one per export (CONTEXT.md section 5). Split because the JSON
  // side has grown a name field and a preview and would otherwise bury the SVG
  // button — which is the one most sessions actually end on. Reset to defaults
  // is Phase 6 and lands as its own tab or below the strip; neither needs this
  // structure changed.
  const actions = right.addFolder({ title: 'Actions' });
  const [svgTab, jsonTab] = actions.addTab({
    pages: [{ title: 'SVG' }, { title: 'JSON' }],
  }).pages;

  svgTab.addButton({ title: 'Download SVG' }).on('click', onDownloadSVG);

  // Optional, free text. Tweakpane text fields commit on blur or Enter, which
  // is when the preview and the filename below pick the name up.
  jsonTab
    .addBinding(state, 'presetName', { label: 'Preset name' })
    .on('change', refresh);

  jsonTab.addButton({ title: 'Download JSON' }).on('click', onDownloadSettings);

  // Readonly preview of exactly what that button writes. `label: undefined`
  // (as opposed to no `label` key at all, which would fall back to the property
  // name) drops Tweakpane's label column so the textarea gets the pane's full
  // width; `interval: 0` makes it a manually-refreshed monitor rather than one
  // polling on a timer.
  jsonTab.addBinding(exportPreview, 'json', {
    label: undefined,
    readonly: true,
    multiline: true,
    rows: 5,
    interval: 0,
  });

  function syncShadowAffordance() {
    const locked = state.shadow && state.lockAngle;
    // Disabled twice over while locked: the whole group is inert without
    // Shadow, and the angle additionally becomes a readout under the tidelock.
    angleBinding.disabled = !state.shadow || locked;
    angleBinding.label = locked ? ANGLE_LABEL_LOCKED : ANGLE_LABEL;
    lockBinding.disabled = !state.shadow;
    intensityBinding.disabled = !state.shadow;
  }

  function syncElevationAffordance() {
    const deferred = ELEVATION_DEFERRED.has(state.archetype);
    elevationBinding.disabled = deferred;
    elevationBinding.label = deferred ? POV_LABEL_DEFERRED : POV_LABEL;
  }

  function syncMistAffordance() {
    mistDistanceBinding.disabled = state.valleyMist === 0;
  }

  // Seeds the preview, the preset dropdown and both affordances in one pass —
  // refresh() applies all four.
  refresh();

  return { panes, refresh };
}

// The exact text Download JSON writes, minus its trailing newline — same
// source, same formatting, so the preview can't drift from the file.
function previewJSON() {
  return JSON.stringify(exportSettings(), null, 2);
}
