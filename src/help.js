// help.js — the app's informational modals: Help, Read Me and About.
// All three are in-page dialogs, no separate route, to keep this a true
// one-pager (CONTEXT.md section 10). They share one <dialog> implementation
// from modal.js rather than each carrying its own.
//
// Help covers control explanations, the seed/reproducibility caveat, and where
// the tips toggle lives. Its copy is written for someone using the app, not for
// someone building it: a condensed pass over CONTEXT.md section 5, not a dump
// of it. Read Me shows the repo's own README. About's copy is a placeholder
// awaiting the one thing that has to be written by hand.
//
// All three are markdown, rendered by markdown.js (Phase 6.9). Read Me and
// About are `?raw` imports of real files; Help's copy is generated from the
// structured list below, which is what keeps its groups in the panel's order.

import readme from '../README.md?raw';
import about from './about/about.md?raw';

import { renderMarkdown } from './markdown.js';
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
      ['New View | Random all | Random scene', 'Three ways to draw something new, left to right by how much they change. New View draws a fresh seed and keeps every setting. Random scene is the opposite: it keeps the seed and rolls new values for Complexity, Peak count, Peak sharpness and Point of view height. Random all does both in one press. None of them touches the landscape type, so you stay on the composition you picked, and the seed lock does not block any of them.'],
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
// extracting rather than copied twice more. Since Phase 6.9 all three also share
// one renderer: their copy is markdown, converted by markdown.js.
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
  return createModal({
    id: 'help-dialog',
    title: 'Using the landscape generator',
    body: markdownBody(helpMarkdown(), 'Help contents'),
  });
}

// The project's own README, imported at build time with Vite's `?raw` suffix —
// the file itself, not a copy of it, so it cannot go stale as the README is
// maintained (CONTEXT.md section 15).
function buildReadme() {
  return createModal({
    id: 'readme-dialog',
    title: 'Read Me',
    body: markdownBody(readme, 'README contents'),
  });
}

// Copy lives in src/about/about.md and is sourced exactly like the README
// (Phase 6.9, replacing a JS string constant) — so replacing the placeholder is
// editing one markdown file, with no code change (CONTEXT.md section 10).
function buildAbout() {
  return createModal({
    id: 'about-dialog',
    title: 'About',
    body: markdownBody(about, 'About this project'),
  });
}

// `tabindex` makes the scroll region reachable: a scrolling div can be moved
// with a wheel but not with a keyboard unless it can take focus.
function markdownBody(source, label) {
  const body = modalBody('markdown');
  body.innerHTML = renderMarkdown(source);
  body.tabIndex = 0;
  body.setAttribute('role', 'document');
  body.setAttribute('aria-label', label);
  return body;
}

// Help's copy as markdown source (Phase 6.9), rendered by the same converter as
// the other two rather than assembled as HTML here. Built from the same
// structured list it always was — the structure is what keeps the groups in the
// panel's own order — but each entry now emits markdown.
function helpMarkdown() {
  const parts = [
    'Everything is generated in your browser — nothing is uploaded, and no two',
    'views are alike unless you keep the seed. The panel below the canvas is',
    'grouped the same way this page is.',
    '',
  ];

  for (const { title, lead, items } of SECTIONS) {
    parts.push(`### ${title}`, '', lead, '');
    for (const [term, description] of items) {
      parts.push(`- **${term}** — ${description}`);
    }
    parts.push('');
  }

  for (const { title, body } of NOTES) {
    parts.push(`#### ${title}`, '', body, '');
  }

  return parts.join('\n');
}
