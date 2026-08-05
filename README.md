# SVG Landscape Generator

One-page web app that generates procedural 2D landscape SVGs, right in the browser. Pick an archetype, tune the terrain, lighting and colour, then export the result as a vector file — or as a settings JSON that reproduces it.

No backend, no accounts, no server. Runs entirely client-side, deployed as a static site.

**Live demo:** [joel-marks.github.io/svg-landscape](https://joel-marks.github.io/svg-landscape/)

**Status:** feature-complete for its planned scope. Generation, lighting, colour, presets and persistence, plus an accessibility, contrast and responsive pass across both UI themes. See [About](src/about/about.md) for more on how this was built.

## Features

- Ten landscape archetypes, each its own procedural generator
- Continuous time-of-day lighting with sun/moon and star fields
- Optional pseudo-3D shadow split, independently controllable or locked to time of day
- Eight curated colour themes plus an algorithmic randomiser, with depth and atmospheric haze/mist controls
- Two colouring modes: a continuous depth ramp, or flat colour bands per depth region ("Banded colors")
- Themes live in `src/themes.json` — three ramp colours and a UI tint each, so adding one is a data change
- Presets: drop a settings JSON into `src/presets/` and it appears in the dropdown — no code changes
- Full state persisted between visits; every setting exports to SVG and JSON
- Keyboard-operable throughout, WCAG AA contrast in both themes, and `prefers-reduced-motion` respected
- Desktop-first layout that reflows to two columns and then one below 1024px and 640px

Full control-by-control detail is in the app's own **Help** panel — this README stays a quick orientation, not a manual.

## Landscape types

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
| Desert mesa | Flat-topped rock, a dune field, then open sand |

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run dev
```

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

## Stack

- [Vite](https://vite.dev/) — dev server and build
- Vanilla JS (ES modules), no framework
- [simplex-noise](https://github.com/jwagner/simplex-noise.js) — noise base
- [chroma-js](https://gka.github.io/chroma.js/) — palette generation
- [Tweakpane](https://tweakpane.github.io/docs/) + [plugin-essentials](https://github.com/tweakpane/plugin-essentials) — control panel
- [Tailwind CSS v4](https://tailwindcss.com/) — page chrome

## Project structure

```
src/
  main.js            entry point
  state.js           app state + localStorage persistence
  noise.js            fbm / ridged-fbm over simplex-noise
  palette.js           theme loading, algorithmic generator, ramp + band modes
  themes.json           the curated themes themselves — data, not code
  uitint.js              tints interface accents from the current theme
  presets.js            preset discovery (globs presets/*.json)
  presets/               preset files
  lighting.js             time-of-day model
  render.js                SVG paint
  controls.js               Tweakpane panel
  panel-a11y.js              accessible names/roles for the panel's controls
  archetypes/                one module per landscape type
  help/help.md                in-app Help content
  about/about.md                in-app About content
  markdown.js                    hand-rolled markdown renderer (no dependency)
  modal.js                        shared dialog shell
  download.js                      SVG + JSON export
  theme.js                          light/dark UI theme
  utils.js                           shared geometry + response-curve helpers
public/                             static assets
index.html                          single page
```

Every archetype exports `generate({ seed, elevation, complexity, peakCount, sharpness, width, height })` and returns a set of closed-polygon layers, ordered farthest to nearest, plus a `LAYER_BOUNDARIES` declaration saying where its own stack divides into background, middle and foreground for Layers mode.

## Deployment

Pushing to `main` builds with Vite and deploys `dist/` to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — no manual `dist` commits.

## Documentation

- **Using the app** — the in-app Help panel (bottom-right, Preferences)
- **Full technical spec** — [`CONTEXT.md`](CONTEXT.md), the project's authoritative architecture and decision record
- **Archive** — [`HISTORY.md`](HISTORY.md), the append-only record of closed issues, per-phase history and superseded measurements

## License

MIT — see [LICENSE](LICENSE).