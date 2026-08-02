// help.js — the app's informational modals: Help, Read Me and About.
// All three are in-page dialogs, no separate route, to keep this a true
// one-pager (CONTEXT.md section 10). They share one <dialog> implementation
// from modal.js rather than each carrying its own.
//
// Help covers control explanations, the seed/reproducibility caveat, and where
// the tips toggle lives. Its copy is written for someone using the app, not for
// someone building it: a condensed pass over CONTEXT.md section 5, not a dump
// of it. Read Me shows the repo's own README verbatim. About's copy is a
// placeholder awaiting the one thing that has to be written by hand.

import readme from '../README.md?raw';

import { ABOUT_HTML } from './about-content.js';
import { createModal, modalBody } from './modal.js';

// Grouped in the panel's own reading order — Canvas first, because Aspect ratio
// is the first control on the page — so a reader can follow the modal down the
// panel without hunting.
const SECTIONS = [
  {
    title: 'Presets',
    lead: 'Top of the left column. Sets the whole panel in one step.',
    items: [
      [
        'Load preset',
        'Pick a saved look to load every control at once. The dropdown falls back to “Custom” as soon as you change anything, which just means the scene on screen is now yours rather than one of the saved ones.',
      ],
      [
        'Reset to defaults',
        'Puts every control back to its original value and draws a new seed. Your interface theme and the Tips setting are left alone.',
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
      ['New View', 'Draws a fresh seed and regenerates, keeping every setting as it is. This is the only control that changes the seed, and the lock never blocks it.'],
      ['Random scene', 'The opposite of New View: keeps the seed and rolls new values for Complexity, Peak count, Peak sharpness and Point of view height. It leaves the landscape type alone, so you stay on the composition you picked.'],
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
      'The small ? beside each panel heading is controlled by the Tips switch, in the Preferences panel in the right-hand column — the same panel this Help button is in. Switching it off removes those markers entirely.',
  },
];

let modals = null;

// All three are built once, on first call, and share modal.js's dialog — Read Me
// and About arriving in Phase 6.6 is what made that shared mechanism worth
// extracting rather than copied twice more.
export function initHelp() {
  modals ??= {
    help: buildHelp(),
    readme: buildReadme(),
    about: buildAbout(),
  };

  return {
    open: modals.help.open,
    openHelp: modals.help.open,
    openReadme: modals.readme.open,
    openAbout: modals.about.open,
  };
}

function buildHelp() {
  const body = modalBody();
  body.innerHTML = `
    <p class="mt-0 text-muted">
      Everything is generated in your browser — nothing is uploaded, and no
      two views are alike unless you keep the seed. The panel below the canvas
      is grouped the same way this page is.
    </p>
    ${SECTIONS.map(section).join('')}
    ${NOTES.map(note).join('')}
  `;

  return createModal({
    id: 'help-dialog',
    title: 'Using the landscape generator',
    body,
  });
}

// The project's own README, imported at build time with Vite's `?raw` suffix —
// the file itself, not a copy of it, so it cannot go stale as the README is
// maintained (CONTEXT.md section 15).
//
// Rendered as readonly scrollable text rather than parsed: a markdown renderer
// is a dependency this project has no other use for, and the raw source is
// perfectly legible. Same treatment as the Downloads tab's JSON preview.
// `tabindex` makes the scroll region reachable — a plain <pre> can be scrolled
// with a wheel but not with a keyboard.
function buildReadme() {
  const body = modalBody('p-0');

  const pre = document.createElement('pre');
  pre.className =
    'm-0 max-h-[70dvh] overflow-auto px-5 py-4 font-mono text-xs leading-relaxed whitespace-pre-wrap';
  pre.tabIndex = 0;
  pre.setAttribute('role', 'document');
  pre.setAttribute('aria-label', 'README file contents');
  pre.textContent = readme;

  body.append(pre);

  return createModal({ id: 'readme-dialog', title: 'Read Me', body });
}

function buildAbout() {
  const body = modalBody();
  body.innerHTML = ABOUT_HTML;
  return createModal({ id: 'about-dialog', title: 'About', body });
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
