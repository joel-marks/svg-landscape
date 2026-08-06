// controls.js — Tweakpane panel, grouped folders.
// Folder structure per CONTEXT.md section 5: Scene, Lighting, Color, Canvas,
// Actions, Preferences.
//
// One Pane per column, each holding collapsible folders. The panes themselves
// are title-less so the only accordion headings are the folder titles.
//
//   left    Presets (its own pane), then Canvas, Scene
//   centre  Lighting, then Color — one pane each
//   right   Actions, then Preferences — one pane each
//
// Presets is a separate Pane instance stacked at the top of the left column,
// not a control inside the Canvas/Scene pane: it sets a whole parameter set
// rather than adjusting one, so it reads as its own panel. Phase 6.6 followed
// that precedent in the right column, splitting Actions and Preferences into a
// pane each. (Section 5 described this panel as sitting between the header and
// the canvas frame until Phase 6.7, which is where 5.7 specified it and not
// where it was ever built; the spec was corrected to match the working UI
// rather than the panel moved.)
//
// Everything the user touches is a Tweakpane control, including the export
// buttons — hence Actions living here rather than as separate markup.

import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

import { archetypeOptions } from '../archetypes/index.js';
import { createClockFace } from './clockface.js';
import { CUSTOM_THEME_ID, themeOptions } from '../core/palette.js';
import { findPreset, presetOptions } from '../core/presets.js';
import {
  applySettings,
  ASPECTS,
  captureAngleOffset,
  currentPresetId,
  exportSettings,
  randomizeAll,
  randomizePalette,
  randomizeScene,
  regenerate,
  repaint,
  resetToDefaults,
  saveState,
  setAspect,
  state,
  stepTheme,
  syncLockedAngle,
} from '../core/state.js';
import { getThemeMode, setThemeMode, THEME_MODES } from './theme.js';
import { applyPanelA11y } from './panel-a11y.js';
import { createTips } from './tips.js';

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

// Preferences' information row, left to right (CONTEXT.md section 5). Help
// first: it is the one that explains the controls you are standing in front of.
// The middle cell was "Read Me" through Phase 6.11; relabelled to the filename
// in 6.12 so a technically literate visitor can see it is the repo's own
// README rather than a second, app-specific document, and capitalised to
// "Readme.md" afterwards so it sits with Help and About as a title rather than
// reading as a lowercase stray. Label only — the handler and the modal behind
// it are untouched.
const INFO_ACTIONS = ['Help', 'Readme.md', 'About'];

// Scene's regenerate row, left to right (CONTEXT.md section 5). Ordered by what
// each one changes — seed only, both, parameters only — so the combination sits
// between the two halves it is made of.
const SCENE_ACTIONS = ['New View', 'Random all', 'Random scene'];

// Tips (CONTEXT.md section 5, Preferences). One line per folder heading saying
// what the group is for — still folder-level, not per-control: the Phase 6.5
// change was to how the line is shown ("?" trigger rather than a permanent
// caption), not to what it covers. Presets joined the list in Phase 6.8, having
// been left out when it became a titled folder with real controls in 6.6.
//
// Preferences is the one deliberate omission, and stays that way: it is the
// folder the Tips switch itself lives in, so explaining "this folder explains
// things" through the mechanism doing the explaining adds nothing.
const TIP_TEXT = {
  Presets: 'Loads a whole saved scene at once, or puts every control back to its default.',
  Canvas: 'Sets the shape and proportions of the image you download.',
  Scene: 'Picks the landform and shapes its terrain — and draws new views of it.',
  Lighting: 'Time of day, sun and stars, and the shadows that give the scene depth.',
  Color: 'The terrain palette, its near-to-far contrast, and the mist between layers.',
  // No longer mentions starting over: Reset to defaults moved to Presets in
  // Phase 6.6 and this line kept describing it until 6.8.
  Actions: 'Downloads the finished artwork, or the settings that produced it.',
};

// UI theme, relocated from the header button (CONTEXT.md section 5). theme.js
// still owns the mode and its own storage key; this is a view onto it.
const THEME_LABELS = { system: 'System', light: 'Light', dark: 'Dark' };

// Time of day, wherever it is written out (CONTEXT.md section 5). One
// definition, shared by the clock face's readout and its screen-reader value.
//
// Rounded to whole minutes *first*, rather than taking the hour and the minute
// off the value independently. Doing it the other way rendered 03:00 as
// "02:60": Tweakpane's step constraint can land a typed 3 on 2.999999999999999
// (the ulp described in CONTEXT.md section 18), and `Math.floor` then took the
// hour down to 2 while `Math.round` took the minutes up to 60. Pre-dates this
// phase, found in 6.13 while checking two Time of day controls against each
// other, and fixed in the formatter they shared. The stored value
// keeps its ulp, exactly as the Phase 6.5 preset-matching fix left it — this
// corrects what is shown, not what is held.
const formatHour = (v) => {
  const minutes = Math.round(v * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60,
  ).padStart(2, '0')}`;
};

export function initControls({
  presetsContainer,
  leftContainer,
  lightingContainer,
  colourContainer,
  actionsContainer,
  preferencesContainer,
  onDownloadSVG,
  onDownloadSettings,
  onHelp,
  onReadme,
  onAbout,
}) {
  const presetsPane = new Pane({ container: presetsContainer });
  const left = new Pane({ container: leftContainer });
  // Lighting and Color are a pane each, by the same precedent as Presets in the
  // left column and Actions/Preferences in the right: two separate things the
  // scene is described by, so two panels rather than two folders in one.
  const lightingPane = new Pane({ container: lightingContainer });
  const colourPane = new Pane({ container: colourContainer });
  // Two instances, not two folders in one (Phase 6.6). Actions is what you do
  // to the scene and Preferences is how the app behaves — separate panels say
  // that, the way the Presets panel already stands apart from the main grid.
  const actionsPane = new Pane({ container: actionsContainer });
  const preferencesPane = new Pane({ container: preferencesContainer });
  const panes = [
    presetsPane,
    left,
    lightingPane,
    colourPane,
    actionsPane,
    preferencesPane,
  ];

  // Registered before any blade is added, on each pane that hosts a blade from
  // it: Scene's regenerate row, Color's theme row, and Preferences'
  // Help/Read Me/About row.
  left.registerPlugin(EssentialsPlugin);
  colourPane.registerPlugin(EssentialsPlugin);
  preferencesPane.registerPlugin(EssentialsPlugin);

  // The Download JSON preview is a monitor over this. It is refreshed with the
  // panes rather than polled on a timer — the JSON only changes when a control
  // does, and building it from exportSettings() is what guarantees the preview
  // and the downloaded file can't disagree.
  const exportPreview = { json: previewJSON() };

  // The UI theme's binding target. theme.js is the authority — this object is
  // the panel's copy of its mode, written straight back on change.
  const prefs = { theme: getThemeMode() };

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

    // The clock face is not a Tweakpane binding, so `pane.refresh()` below does
    // not reach it and it is written from here instead. This is the one place
    // every source of a change — the face itself, a preset, Reset to defaults,
    // the restored localStorage blob — already writes the panel from state, so
    // hooking it anywhere else would mean tracking some of those and not
    // others. It needs no mid-drag guard: pointer position on the face is
    // absolute, so a write landing mid-drag is simply the value the next
    // pointer event recomputes anyway.
    clock.set(state.hour);

    panes.forEach((pane) => pane.refresh());

    // The affordances the suppressed handlers would have maintained. Applied
    // unconditionally rather than off a change event, so loading a preset that
    // switches archetype still greys out the controls that archetype defers.
    syncElevationAffordance();
    syncShadowAffordance();
    syncMistAffordance();
    syncTips();

    // After the affordances, not before: two of them rewrite a control's label,
    // and the accessible name is copied from the label that is now showing
    // (panel-a11y.js, Phase 8). Hooked here for the same reason saveState() is
    // — this is the one place every change already passes through.
    syncPanelA11y();

    syncing = false;

    // Every change routes through here, so this is the one place persistence
    // has to be hooked up for "saves on every control change" (CONTEXT.md
    // section 7) to be true by construction rather than by remembering to add a
    // call to each handler. Deliberately after `syncing` is cleared: what gets
    // written is the state the panel has finished settling on.
    saveState();
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

  // --- presets pane ---------------------------------------------------------

  // Titled from Phase 6.6. It had been the one unnamed panel on the page since
  // Phase 5.7 — a heading here is a folder, like every other heading in the
  // panel, rather than a Pane title, so it collapses the same way they do.
  const presetsFolder = presetsPane.addFolder({ title: 'Presets' });

  // "Load preset", not "Preset": the Downloads tab has a "Preset name" field
  // that labels a scene on its way out, and two controls a few inches apart
  // reading "Preset" and "Preset name" invite exactly the wrong guess about
  // which one does what. Label only — the binding is unchanged.
  const presetBinding = presetsFolder.addBinding(state, 'preset', {
    label: 'Load preset',
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

  // Tweakpane's own separator blade, not a CSS margin dressed up as one: the
  // gap belongs to the panel's own vocabulary, and a margin would sit outside
  // everything the pane knows about its own layout. The two controls belong in
  // one panel but are not the same gesture — one loads a saved scene, the other
  // discards the current one — and the rule says so.
  presetsFolder.addBlade({ view: 'separator' });

  // Relocated here from the Actions panel in Phase 6.6, directly beneath Load
  // preset: both answer "what should the whole panel be set to", so they belong
  // together. Behaviour is untouched — factory defaults, a fresh seed draw, and
  // the two Preferences left alone (CONTEXT.md section 5).
  presetsFolder.addButton({ title: 'Reset to defaults' }).on('click', () => {
    resetToDefaults();
    refresh();
  });

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

  // One row of three (Phase 6.7), by the same buttongrid blade the Color theme
  // row uses. They were separate stacked buttons through 6.6; as a set of three
  // variations on "draw me something new" they read better as one row, and the
  // middle cell is the combination of the two either side of it.
  //
  // Left to right: seed only, both, parameters only. New View and Random all
  // reseed explicitly, so the lock does not apply to either; Random scene never
  // reseeds, so there is nothing for the lock to suppress there (section 5).
  const sceneRow = scene.addBlade({
    view: 'buttongrid',
    size: [SCENE_ACTIONS.length, 1],
    cells: (x) => ({ title: SCENE_ACTIONS[x] }),
  });

  const sceneHandlers = [
    onNewSeed,
    () => {
      randomizeAll();
      refresh();
    },
    () => {
      randomizeScene();
      refresh();
    },
  ];

  sceneRow.on('click', ({ index: [x] }) => sceneHandlers[x]?.());

  // --- centre column -------------------------------------------------------

  const lighting = lightingPane.addFolder({ title: 'Lighting' });

  const onHourChange = () => {
    // Under the tidelock the hour drags the light angle with it, so the
    // panel has to be refreshed for the angle readout to follow.
    if (syncLockedAngle()) refresh();
    onPaintChange();
  };

  // Time of day, and the only control for it as of Phase 6.14 (CONTEXT.md
  // section 5). Not a Tweakpane binding: it is a hand-built row, because
  // Tweakpane has no rotary view and adding one properly would mean a new
  // dependency — see clockface.js for the full reasoning.
  //
  // It binds straight to `state.hour` with none of the machinery the Phase 6.13
  // cameraring needed — no proxy value, no wrap on drag-end, no mid-drag flag.
  // A face is cyclic by construction, so the angle it reports is always already
  // inside one revolution and there is nothing to wrap.
  const clock = createClockFace({
    label: 'Time of day',
    format: formatHour,
    onChange: (hour) => {
      // The clock is outside Tweakpane's binding system, so it does not get
      // onUserChange()'s guard for free and has to check the same flag itself.
      if (syncing) return;
      state.hour = hour;
      onHourChange();
    },
  });
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

  // Mounted **after** every Tweakpane control in this folder, and that ordering
  // is load-bearing rather than tidiness. Tweakpane inserts each new blade at
  // its own index into the container's child list, counting only the blades it
  // knows about — so a foreign element sitting at index 0 gets stepped over by
  // every subsequent insert and ends up last. Prepending once the folder is
  // otherwise complete is what actually puts the clock first.
  //
  // Safe this late for the same reason it would have been safe early: Tweakpane
  // measures and caches a folder's expanded height on the first collapse, which
  // cannot have happened during construction, so the cached measurement
  // includes this row.
  const lightingContent = lighting.element.querySelector('.tp-fldv_c');
  const displacedFirst = lightingContent?.firstElementChild;
  lightingContent?.prepend(clock.element);
  // Tweakpane marks its own first and last rows for edge spacing. Taking over
  // the first position means taking over the marker, or the folder opens with
  // the clock flush against its heading.
  displacedFirst?.classList.remove('tp-v-fst', 'tp-v-vfst');
  clock.element.classList.add('tp-v-fst', 'tp-v-vfst');

  const colour = colourPane.addFolder({ title: 'Color' });

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

  // Between Color depth and Distance haze (CONTEXT.md section 5, Phase 7), and
  // that position is the explanation: it changes what Color depth means — from
  // a ramp-position control to a contrast-between-bands one — and everything
  // below it is atmosphere, which both modes share untouched.
  //
  // A plain repaint like every other Color control. Geometry does not move: the
  // toggle picks between two ways of colouring the layers an archetype has
  // already produced, so the seed lock has nothing to suppress here.
  //
  // Labelled "Banded colors" since Phase 8, in its own folder's spelling. It
  // read as "Layers" through Phase 7.5 and that named the wrong thing: every
  // scene has layers in both modes, so a checkbox called Layers invites the
  // guess that it turns them up rather than that it switches how they are
  // coloured. Label only — the state key stays `layersMode`, so exports,
  // presets and the localStorage blob are byte-identical either side of this.
  colour
    .addBinding(state, 'layersMode', { label: 'Banded colors' })
    .on('change', onUserChange(onPaintChange));

  colour
    .addBinding(state, 'haze', {
      label: 'Horizon haze',
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

  // --- right column, actions panel -----------------------------------------

  // Two tabs, one per export (CONTEXT.md section 5). Split because the JSON
  // side has grown a name field and a preview and would otherwise bury the SVG
  // button — which is the one most sessions actually end on. Actions is now
  // purely "get this scene out of the app": Reset to defaults sat on the SVG
  // tab through Phase 6 and moved to the Presets panel in 6.6, next to the
  // other control that sets the whole panel at once.
  const actions = actionsPane.addFolder({ title: 'Actions' });
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
  const jsonPreview = jsonTab.addBinding(exportPreview, 'json', {
    label: undefined,
    readonly: true,
    multiline: true,
    rows: 5,
    interval: 0,
  });

  // The one focusable control in the panel with no label to take a name from —
  // dropping the label column is what gave it the full width, and panel-a11y.js
  // copies names from labels that exist (Phase 8). Named here instead.
  jsonPreview.element
    .querySelector('.tp-mllv_i')
    ?.setAttribute('aria-label', 'Settings JSON preview');

  // --- right column, preferences panel --------------------------------------

  // Its own Pane below Actions since Phase 6.6 — a folder in the same pane
  // through Phase 6, which read as one panel with two sections rather than the
  // two separate things they are (CONTEXT.md section 5).
  const preferences = preferencesPane.addFolder({ title: 'Preferences' });

  preferences
    .addBinding(prefs, 'theme', {
      label: 'UI theme',
      options: Object.fromEntries(
        THEME_MODES.map((mode) => [THEME_LABELS[mode], mode]),
      ),
    })
    .on(
      'change',
      onUserChange((event) => {
        // theme.js applies the class and persists under its own key; nothing
        // here has to be saved or re-rendered, and the scene is untouched — the
        // interface skin and the in-scene lighting are separate systems.
        setThemeMode(event.value);
      }),
    );

  // Directly below UI theme and above Tips (CONTEXT.md section 5, Phase 10):
  // the two above it are both "what should the interface look like", and Tips
  // is about what it tells you.
  //
  // A repaint, not a regenerate. The tint is applied from paint() — the one
  // place every route to a new scene theme already passes through — so
  // repainting the existing geometry is the whole of what this needs, and the
  // scene on screen is untouched.
  preferences
    .addBinding(state, 'uiTintEnabled', { label: 'Tint UX to scene' })
    .on('change', onUserChange(onPaintChange));

  preferences
    .addBinding(state, 'tips', { label: 'Tips' })
    .on('change', onUserChange(refresh));

  // One row of three (Phase 6.6), by the same buttongrid blade the Color theme
  // row uses — a pane stacks its own controls vertically, so three separate
  // buttons would be three stacked rows for what is one group of "tell me
  // about this app" entries.
  const infoRow = preferences.addBlade({
    view: 'buttongrid',
    size: [INFO_ACTIONS.length, 1],
    cells: (x) => ({ title: INFO_ACTIONS[x] }),
  });

  const infoHandlers = [() => onHelp?.(), () => onReadme?.(), () => onAbout?.()];
  infoRow.on('click', ({ index: [x] }) => infoHandlers[x]?.());

  // All three open a modal rather than acting on the scene, and say so (Phase 8,
  // CONTEXT.md section 11). The buttons are already named by their own text —
  // this adds only the fact that pressing one opens a dialog, which is the
  // difference between them and every other button in the panel.
  for (const cell of infoRow.element.querySelectorAll('.tp-btnv_b')) {
    cell.setAttribute('aria-haspopup', 'dialog');
  }

  // Every folder heading is an accordion control, and Tweakpane renders each as
  // a plain <button>: named by its own title text and operable from the
  // keyboard, but saying nothing about whether the section it controls is open
  // (Phase 8, CONTEXT.md section 11). `aria-expanded` is the whole of what was
  // missing. Seeded from the folder's current state — folders can come up
  // collapsed — and kept in step through Tweakpane's own `fold` event, so a
  // click, a keypress and a programmatic change all route through one line.
  for (const folder of [
    presetsFolder,
    canvas,
    scene,
    lighting,
    colour,
    actions,
    preferences,
  ]) {
    const bar = folder.element.querySelector(':scope > .tp-fldv_b');
    if (!bar) continue;
    bar.setAttribute('aria-expanded', String(folder.expanded));
    folder.on('fold', (event) =>
      bar.setAttribute('aria-expanded', String(event.expanded)),
    );
  }

  // Tooltips are DOM, not blades: Tweakpane has no label-only or trigger view,
  // and a readonly binding would render as a field — which reads as a control
  // you can't use rather than as a note. tips.js owns the trigger, the popover
  // and the three ways of opening it; this only says which folders get one.
  const tips = createTips(
    [presetsFolder, canvas, scene, lighting, colour, actions].map((folder) => ({
      folder,
      text: TIP_TEXT[folder.title],
    })),
  );

  function syncTips() {
    tips.sync(state.tips);
  }

  // Named and roled from the labels Tweakpane renders beside its controls
  // (panel-a11y.js). Run over each pane's own container rather than the page,
  // so nothing outside the panel — the header, the canvas, the modals, all of
  // which carry their own ARIA — is walked at all.
  function syncPanelA11y() {
    for (const pane of panes) applyPanelA11y(pane.element);
  }

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
