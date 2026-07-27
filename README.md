# Landscape SVG Generator

A one-page web app that generates procedural 2D landscape SVGs. Pick a
landscape archetype, tweak parameters — complexity, viewpoint height, time of
day, palette, aspect ratio — and download the result as an SVG, plus a JSON
file of the settings that produced it.

No backend, no accounts, no server. Everything runs in the browser and is
served as a static site.

**Live demo:** _PLACEHOLDER — link added once GitHub Pages is confirmed
deployed (expected: https://joel-marks.github.io/svg-landscape/)._

> **Status:** Phase 1 scaffold. The project shell, build, and deploy pipeline
> are in place; generation, render, and control logic land in later phases.

## Stack

- [Vite](https://vite.dev/) — dev server and production build
- Vanilla JS (ES modules) — no UI framework
- [simplex-noise](https://github.com/jwagner/simplex-noise.js) — noise base
- [chroma-js](https://gka.github.io/chroma.js/) — palette generation and interpolation
- [Tweakpane](https://tweakpane.github.io/docs/) — control panel UI

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
  archetypes/        one module per landscape type, each exporting generate()
    index.js         registry mapping name -> generator module
public/              favicon, static assets
index.html           single page, semantic landmarks, meta tags
```

`CONTEXT.md` at the repo root is the authoritative project spec.

## License

MIT — see [LICENSE](LICENSE).
