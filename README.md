# Landscape SVG Generator

A one-page web app that generates procedural 2D landscape SVGs. Pick a
landscape archetype, tweak parameters — complexity, viewpoint height, time of
day, palette, aspect ratio — and download the result as an SVG, plus a JSON
file of the settings that produced it.

No backend, no accounts, no server. Everything runs in the browser and is
served as a static site.

**Live demo:** _PLACEHOLDER — link added once GitHub Pages is confirmed
deployed (expected: https://joel-marks.github.io/svg-landscape/)._

> **Status:** Phase 3. All nine landscape archetypes generate and are selectable
> from a Tweakpane control panel, with complexity, viewpoint height, seed
> lock/randomize, and aspect-ratio controls. Lighting and the pseudo-3D shadow
> split (Phase 4), the curated palette list and colour controls (Phase 5), and
> persistence, settings export and help (Phase 6) are still to come.

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

**Scene** — landscape type, complexity, point-of-view height, seed
(display / randomize / lock), New View.
**Canvas** — aspect ratio: 4:3, 16:9, Cine 2.39:1, X-Pan 2.71:1, LinkedIn 4:1.
**Actions** — Download SVG.

Canvas height is fixed at 900 and the aspect ratio sets the width. Feature
density scales with width so wider canvases get proportionally more ridges and
spurs — and never fewer than the 16:9 baseline.

Point-of-view height drives `elevation` (0–1). Only V valley responds to it so
far: raising it lifts the horizon and convergence point while the spurs
multiply and nest tighter. Every other archetype accepts the parameter and
ignores it, and will adopt it incrementally.

The seed lock is authoritative — while it is on, nothing draws a new seed, so
changing complexity or aspect re-renders the same layout. With it off, any
Scene or Canvas change draws a fresh view.

## Stack

- [Vite](https://vite.dev/) — dev server and production build
- Vanilla JS (ES modules) — no UI framework
- [simplex-noise](https://github.com/jwagner/simplex-noise.js) — noise base
- [chroma-js](https://gka.github.io/chroma.js/) — palette generation and interpolation
- [Tweakpane](https://tweakpane.github.io/docs/) — control panel UI (Phase 3)
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

## Theming

The interface has three modes — Light, Dark, and System — cycled from the
header button and remembered in localStorage. System follows
`prefers-color-scheme` live. All three resolve to a single `dark` class on
`<html>`, which the tokens in `src/style.css` key off.

This is interface chrome only. The in-scene time-of-day lighting that tints the
sky and drives shadows is a separate system, arriving in Phase 4.

Every archetype exports
`generate({ seed, elevation, complexity, width, height })` and returns
`{ archetype, width, height, horizonY, mistAfter, layers }`, where each layer is
`{ index, depth, points }` and `points` is a closed polygon in absolute
coordinates. `depth` runs 0 (farthest) to 1 (nearest) and picks the palette ramp
position.

`CONTEXT.md` at the repo root is the authoritative project spec.

## License

MIT — see [LICENSE](LICENSE).
