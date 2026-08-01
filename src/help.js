// help.js — help modal content + open/close.
// Single in-app modal, no separate route, to keep this a true one-pager.
// Covers control explanations, the seed/reproducibility caveat, and where the
// tips toggle lives (CONTEXT.md section 10).
//
// Built as a native <dialog> opened with showModal(), rather than a hand-rolled
// overlay: Escape-to-close, focus moving into the dialog and returning to
// whatever opened it, and the rest of the page going inert are all behaviours
// the element already has correctly. A custom div would mean reimplementing
// each of them, which is where keyboard traps come from. There is an explicit
// Close control at both ends of the dialog as well — click-outside on its own
// is unreachable from the keyboard (CONTEXT.md section 11).
//
// The copy here is written for someone using the app, not for someone building
// it: it is a condensed pass over CONTEXT.md section 5, not a dump of it.

// Grouped in the panel's own reading order — Canvas first, because Aspect ratio
// is the first control on the page — so a reader can follow the modal down the
// panel without hunting.
const SECTIONS = [
  {
    title: 'Presets',
    lead: 'Above the canvas. Loads a whole saved scene in one step.',
    items: [
      [
        'Preset',
        'Pick a saved look to load every control at once. The dropdown falls back to “Custom” as soon as you change anything, which just means the scene on screen is now yours rather than one of the saved ones.',
      ],
    ],
  },
  {
    title: 'Canvas',
    lead: 'The shape of the image you will download.',
    items: [
      [
        'Aspect ratio',
        'Sets the proportions of the output, from 4:3 through to a 4:1 banner. Wider canvases automatically get proportionally more ridges and spurs, so a panorama does not end up looking stretched.',
      ],
    ],
  },
  {
    title: 'Scene',
    lead: 'What the landscape is, and how its terrain is built.',
    items: [
      ['Landscape type', 'The composition — a valley, a gorge, a summit view, twin peaks, and so on. Each one is drawn by its own generator rather than being the same shape with different settings.'],
      ['Complexity', 'Detail resolution: how fine or coarse the terrain outline is. It does not add or remove peaks.'],
      ['Peak count', 'How many peaks, spurs or ridges there are. Some landscape types have a fixed count as their defining trait — Twin peaks always has two — so this does nothing on those.'],
      ['Peak sharpness', 'Blends the profile between rounded hills at 0 and sharp ridgelines at 1.'],
      ['Point of view height', 'How high up you are standing. Low reads as ground level; high raises the horizon and nests the features tighter, as if looking down into the landscape. Not available on In gorge, where it is greyed out.'],
      ['Seed / Lock seed', 'The number the terrain is generated from. The lock is on by default so that adjusting the sliders refines the view in front of you instead of redrawing a different one.'],
      ['New View', 'Draws a fresh seed and regenerates. This is the only control that changes the seed, and the lock never blocks it.'],
    ],
  },
  {
    title: 'Lighting',
    lead: 'Time of day, and the shadows that give the scene depth.',
    items: [
      ['Time of day', 'A continuous 24-hour slider driving the sky gradient, the mist tint, the sun and moon, and how strongly the stars show. Dawn and dusk are tuned separately — they are not mirror images.'],
      ['Show sun/moon', 'Hides the disc and its glow only. The sky stays lit as the hour says it should be.'],
      ['Show stars', 'Hides the night star field, independently of the control above.'],
      ['Shadow / pseudo-3D', 'Splits each landform into a lit side and a shadowed side. The three controls below it only do anything while this is on.'],
      ['Light source angle', 'Which direction the light comes from. Independent of time of day by default, so the shadow direction and the sky mood do not have to agree.'],
      ['Lock angle to time of day', 'Ties the light angle to the sun and moon arc, keeping the offset it had when you switched the lock on. While locked the angle slider becomes a read-out of the value being tracked.'],
      ['Shadow intensity', 'How dark the shadowed side goes. The useful range is spread across the lower half of the slider on purpose.'],
    ],
  },
  {
    title: 'Color',
    lead: 'The terrain palette and the atmosphere between the layers.',
    items: [
      ['Theme preset', 'The curated palette colouring the terrain. Previous and Next step through the list; Randomise generates a new palette algorithmically, which then shows as “Randomized”.'],
      ['Color depth', 'Contrast between near and far layers. 0.5 is the palette exactly as authored — below that the layers flatten toward one another, above it they spread apart.'],
      ['Distance haze', 'The band of atmospheric mist sitting at the horizon. Its colour comes from the time of day, not the palette.'],
      ['Valley mist', 'Mist settling into the valleys, clear at each ridge crest and thickest at its base. The nearest layer never gets it, so the foreground stays sharp. Deliberately subtle until the top of the slider.'],
      ['Distance', 'How much the valley mist builds up with distance — even across every layer at 0, much heavier on the far ones at 1. Inactive while Valley mist is at 0.'],
    ],
  },
  {
    title: 'Actions',
    lead: 'Getting the image, and the scene that made it, out of the app.',
    items: [
      ['Download SVG', 'Saves the artwork as a vector file, exactly as shown.'],
      ['Reset to defaults', 'Puts every control back to its original value and draws a new seed. Your interface theme and this Tips setting are left alone.'],
      ['Preset name', 'Optional label. Fill it in and it goes into the JSON file and its filename.'],
      ['Download JSON', 'Saves every control value, including the seed, as a settings file. The panel beneath the button previews exactly what will be written.'],
    ],
  },
];

// The caveat CONTEXT.md sections 8 and 10 both require kept in the help copy.
const NOTES = [
  {
    title: 'About seeds and reproducibility',
    body:
      'The seed plus the settings are what reproduce a scene, which is why the settings file carries both. Reloading them gets you a close — usually indistinguishable — version of the same landscape, but not a guaranteed pixel-for-pixel match: some of the incidental detail is still drawn unseeded.',
  },
  {
    title: 'Turning these tips off',
    body:
      'The one-line captions under each panel heading are controlled by the Tips switch, in the Preferences folder in the right-hand column — the same folder this Help button is in. Switching it off removes the captions entirely.',
  },
];

let dialog = null;

export function initHelp() {
  dialog ??= build();
  return { open: openHelp, close: closeHelp, element: dialog };
}

export function openHelp() {
  dialog ??= build();
  if (!dialog.open) dialog.showModal();
}

export function closeHelp() {
  dialog?.close();
}

function build() {
  const element = document.createElement('dialog');
  element.id = 'help-dialog';
  element.setAttribute('aria-labelledby', 'help-title');
  element.className = 'rounded-lg border border-border-token bg-surface-raised p-0 text-text shadow-lg';

  element.innerHTML = `
    <div class="flex items-center gap-4 border-b border-border-token px-5 py-3">
      <h2 id="help-title" class="m-0 text-base font-semibold tracking-tight">
        Using the landscape generator
      </h2>
      <button
        type="button"
        data-help-close
        class="ml-auto rounded-md border border-border-token bg-surface px-2 py-1 text-sm text-muted transition-colors hover:text-text"
        aria-label="Close help"
      >&#10005;</button>
    </div>

    <div class="max-h-[70dvh] overflow-y-auto px-5 py-4 text-sm leading-relaxed">
      <p class="mt-0 text-muted">
        Everything is generated in your browser — nothing is uploaded, and no
        two views are alike unless you keep the seed. The panel below the canvas
        is grouped the same way this page is.
      </p>
      ${SECTIONS.map(section).join('')}
      ${NOTES.map(note).join('')}
    </div>

    <div class="border-t border-border-token px-5 py-3 text-right">
      <button
        type="button"
        data-help-close
        class="rounded-md border border-border-token bg-surface px-3 py-1.5 text-sm transition-colors hover:text-text"
      >Close</button>
    </div>
  `;

  for (const button of element.querySelectorAll('[data-help-close]')) {
    button.addEventListener('click', closeHelp);
  }

  // Click-outside as well, not instead: the backdrop is the dialog's own
  // element in the hit test, so a click landing on it and not on the content
  // means the user clicked past the dialog.
  element.addEventListener('click', (event) => {
    if (event.target === element) closeHelp();
  });

  document.body.append(element);
  return element;
}

// The group heading is set apart from the control names beneath it — same
// weight for both would make "Presets" the group and "Preset" the control read
// as the same kind of thing.
function section({ title, lead, items }) {
  return `
    <section class="mt-6 border-t border-border-token pt-4">
      <h3 class="m-0 text-xs font-semibold uppercase tracking-widest text-accent">${title}</h3>
      <p class="mt-1 mb-3 text-muted">${lead}</p>
      <dl class="m-0 grid gap-2.5">
        ${items
          .map(
            ([term, description]) => `
          <div>
            <dt class="font-semibold">${term}</dt>
            <dd class="m-0 text-muted">${description}</dd>
          </div>`,
          )
          .join('')}
      </dl>
    </section>`;
}

function note({ title, body }) {
  return `
    <section class="mt-5 rounded-md border border-border-token bg-surface p-3">
      <h3 class="m-0 text-sm font-semibold">${title}</h3>
      <p class="mt-1 mb-0 text-muted">${body}</p>
    </section>`;
}
