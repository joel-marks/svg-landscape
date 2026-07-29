# Landscape SVG Generator

A one-page web app that generates procedural 2D landscape SVGs. Pick a
landscape archetype, tweak parameters — complexity, viewpoint height, time of
day, palette, aspect ratio — and download the result as an SVG, plus a JSON
file of the settings that produced it.

No backend, no accounts, no server. Everything runs in the browser and is
served as a static site.

**Live demo:** _PLACEHOLDER — link added once GitHub Pages is confirmed
deployed (expected: https://joel-marks.github.io/svg-landscape/)._

> **Status:** Phase 3.6. All nine landscape archetypes generate and are
> selectable from a flat control panel, with complexity, peak count, peak
> sharpness, viewpoint height, seed lock/randomize, and aspect-ratio controls.
> Both the SVG and its settings JSON export. Lighting and the pseudo-3D shadow
> split (Phase 4), the curated palette list and colour controls (Phase 5), and
> persistence, reset and help (Phase 6) are still to come.

## Landscape types

Nine archetypes, each its own generator module under `src/archetypes/`:

| Type | Reads as |
| --- | --- |
| Open valley | Layered ridges opening outward around a wide valley floor |
| Valley floor | Standing deep in a valley, tall peaks crowding the upper frame |
| V valley | Alternating spurs nesting toward a convergence point |
| Gorge | Terraced plateaus broken by a steep, narrow slot |
| In gorge | Inside the canyon, walls filling both edges |
| Mountain top | High horizon with peak clusters falling away below |
| Stacked ridges | Evenly spaced ridgelines, long-lens compression |
| Dominant peak | One summit outranking its flanking peaks |
| Twin peaks | Exactly two peaks of similar height |

## Controls

The canvas sits at the top of the page and the control panels render below it
in three columns — a side panel is unworkable once the canvas can be an X-Pan
or LinkedIn strip. Controls are flat and always visible; there is no
collapsible accordion anywhere. The canvas frame carries a display-only
max-height cap so a full-width frame doesn't push the panels off a typical
desktop viewport; the logical viewBox is unaffected.

**Left — Scene + Canvas.** Landscape type, complexity, peak count, peak
sharpness, point-of-view height, seed (display / randomize / lock), New View;
then aspect ratio: 4:3, 16:9, Cine 2.39:1, X-Pan 2.71:1, LinkedIn 4:1.
**Centre — Color.** Reserved; populated in Phase 5.
**Right — Actions.** Download SVG, Download settings.

| Slider | What it does |
| --- | --- |
| Complexity | Detail resolution only — noise octaves and point sampling density. Never feature count. |
| Peak count | How many peaks, spurs or ridge bands. Each archetype maps 0–1 to its own integer range. |
| Peak sharpness | Blends the terrain profile between rounded hills (0) and sharp ridgelines (1). |
| Point of view height | Viewer elevation, `elevation` 0–1. |

Peak count is a deliberate no-op on **Twin peaks** (exactly two peaks) and
**Stacked ridges** (its 6–8 band count), where a fixed count is the defining
trait. Peak sharpness applies to all nine.

Canvas height is fixed at 900 and the aspect ratio sets the width. Feature
density scales with width so wider canvases get proportionally more ridges and
spurs — and never fewer than the 16:9 baseline.

Point-of-view height raises the horizon and tightens how features nest, each
archetype interpreting that through its own geometry — spurs converging, ridge
bands compressing, flanking peaks gathering toward the summit. It is active on
eight of the nine. **In gorge** is a deferred edge case: a composition built
from foreground walls filling the frame edges has no obvious viewer-height
analog, so there the slider is greyed out and relabelled rather than left
silently inert.

## Settings export

**Download settings** writes the current scene's control values — archetype,
seed, complexity, peak count, sharpness, elevation and aspect — to JSON. Export
only; there is no import. Reloading the same seed and settings reproduces a
near-identical scene, though not always pixel-identical, since some draws
remain unseeded.

The seed lock guards against *incidental* reseeding only. While it is on,
changing landscape type, complexity, peak count, sharpness, elevation or aspect
re-renders the same layout — but Randomize and New View always draw a new seed,
since changing the seed is their entire purpose.

## Stack

- [Vite](https://vite.dev/) — dev server and production build
- Vanilla JS (ES modules) — no UI framework
- [simplex-noise](https://github.com/jwagner/simplex-noise.js) — noise base
- [chroma-js](https://gka.github.io/chroma.js/) — palette generation and interpolation
- [Tweakpane](https://tweakpane.github.io/docs/) — control panel UI
- [Tailwind CSS v4](https://tailwindcss.com/) — page chrome and design tokens
- [Lucide](https://lucide.dev/) — icons

## Local development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

The dev server prints a local URL (default http://localhost:5173/svg-landscape/).
Hot reload is enabled.

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

`vite.config.js` sets `base: '/svg-landscape/'` so asset URLs resolve under the
GitHub Pages project-site subpath. If the repository is ever renamed, that value
must be updated to match.

## Deployment

Pushing to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml),
which builds with Vite and publishes `dist/` to GitHub Pages using the official
Pages deployment actions. There are no manual `dist` commits.

One-time repository setup: **Settings → Pages → Build and deployment → Source:
GitHub Actions**.

## Project structure

```
src/
  main.js            entry point — wires state, controls, render
  state.js           central state object + localStorage load/save
  noise.js           fbm / ridged-fbm wrappers over simplex-noise
  palette.js         curated theme list + algorithmic palette generator
  lighting.js        time-of-day -> sun/moon position, sky blend, shadow angle
  render.js          SVG paint: sky, mist, polygons, shadow split, stars/moon
  controls.js        Tweakpane panel, grouped folders
  download.js        SVG export + settings JSON export
  help.js            help modal content + open/close
  theme.js           UI light/dark theme, prefers-color-scheme, persistence
  utils.js           shared geometry helpers + width-scaling rules
  style.css          Tailwind entry + light/dark design tokens
  archetypes/        one module per landscape type, each exporting generate()
    index.js         registry mapping name -> generator module
public/              favicon, static assets
index.html           single page, semantic landmarks, meta tags
```

Every archetype exports
`generate({ seed, elevation, complexity, peakCount, sharpness, width, height })`
and returns `{ archetype, width, height, horizonY, mistAfter, layers }`, where
each layer is `{ index, depth, points }` and `points` is a closed polygon in
absolute coordinates. `depth` runs 0 (farthest) to 1 (nearest) and picks the
palette ramp position.

## Theming

The interface has three modes — Light, Dark, and System — cycled from the
header button and remembered in localStorage. System follows
`prefers-color-scheme` live. All three resolve to a single `dark` class on
`<html>`, which the tokens in `src/style.css` key off.

This is interface chrome only. The in-scene time-of-day lighting that tints the
sky and drives shadows is a separate system, arriving in Phase 4.

`CONTEXT.md` at the repo root is the authoritative project spec.

## License

MIT — see [LICENSE](LICENSE).
