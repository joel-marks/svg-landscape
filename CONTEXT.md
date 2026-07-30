# Landscape SVG Generator — Project Context

## 1. Overview
One-page web app generating procedural 2D landscape SVGs (noise/algorithmic-based). User tweaks parameters via a control panel, downloads the resulting SVG and/or a settings file. No backend, no accounts, no server. Deployed via GitHub Pages. Rebuilt from scratch — no code ported from prior "Mountain Valley" prototype, though its concepts (aspect scaling, archetype-per-generator, palette engine, mist/sky layering) carry forward as reference.

## 2. Stack
- **Vite** — dev server (local Firefox preview, hot reload) + production build.
- **Vanilla JS (ES modules)** — no UI framework. Matches prior prototype's approach and keeps the Pages deploy simple.
- **simplex-noise** (npm) — noise base.
- **chroma-js** (npm) — palette generation/interpolation.
- **Tweakpane** — control panel UI.
- **Tailwind CSS v4** (via `@tailwindcss/vite`, no PostCSS config needed) — page shell styling: layout, light/dark theme, responsive breakpoints. Tweakpane's own panel keeps its native styling; Tailwind covers everything outside it (header/main/footer, canvas frame, buttons, help modal).
- **Lucide** (static SVG icons, imported per-icon) — icon set for UI buttons (download, help, theme toggle, etc.). Chosen over an icon font: no font-loading step, and inline SVG is consistent with an app whose whole output is SVG.
- No routing, no state-management library — a single plain state object is sufficient.

*Assumption: no framework. Flag now if you want React/Vue instead — changes the build slightly.*

## 3. Architecture

```
/src
  main.js            entry point — wires state, controls, render
  state.js            central state object + localStorage load/save
  noise.js             fbm / ridged-fbm wrappers over simplex-noise
  palette.js           curated theme list + algorithmic palette generator
  lighting.js           time-of-day -> sun/moon position, sky color blend, shadow angle
  render.js             SVG paint: sky, mist/haze, polygons, light/dark shadow split, stars/moon
  controls.js            Tweakpane panel, grouped folders
  download.js            SVG export + settings JSON export
  help.js                 help modal content + open/close
  theme.js                 UI light/dark theme, prefers-color-scheme, persistence
  utils.js                 shared geometry helpers: feature-density/aspect width scaling, common spur/wall primitives used across archetypes
  /archetypes
    open-valley.js, valley-floor.js, v-valley.js,
    gorge.js, in-gorge.js, mountain-top.js, stacked-ridges.js,
    dominant-peak.js, twin-peaks.js
    index.js            registry mapping name -> generator module
/public                favicon, static assets
index.html               single page, semantic landmarks, meta tags
```

Each archetype module owns its own generation logic (not shared parameters over one generator) and exports `generate(params) -> geometryItems`. Every `generate()` signature accepts `elevation`, `peakCount`, and `sharpness` (see sections 5, 6a) even where a given archetype treats one as a no-op (e.g. Twin Peaks ignores `peakCount`) — keeps the schema stable as effects are extended to more archetypes later.

## 4. Landscape types (seed list — carried from prior prototype naming)
Open valley · Valley floor · V valley · Gorge · In gorge · Mountain top · Stacked ridges · Dominant peak · Twin peaks

"V valley" and its former "rising" variant are merged into one generator driven by the elevation parameter (section 6a) rather than two separate archetypes.

## 5. Control panel — grouped logically

Entirely Tweakpane — one title-less Pane instance per column; folder titles are the only headings, no separate HTML/Tailwind panel chrome. Renders below the canvas, not beside it (still required — X-Pan 2.71:1 and LinkedIn 4:1 rule out a side panel). Three columns:
- **Left** — Canvas (Aspect ratio is the first control on the page), Scene
- **Centre** — Lighting, Color
- **Right** — Actions

Folders are collapsible (accordion) — this was tried flat in one revision and deliberately reverted back to accordion for a tighter footprint, given window-size constraints on a desktop-first layout. Color's centre-column folder is a readonly Tweakpane note ("Arrives in Phase 5") until Phase 5 lands — not stubbed sliders, which would wrongly imply they work. Actions is a Tweakpane folder like the others, not a separate visual panel. Tweakpane buttons are text-only — Lucide icons are no longer used inside the panel, only in page chrome outside it (header, etc.).

Header/nav side margins align with the canvas and panel-grid side margins.

**Canvas fit/sizing model** (previously underspecified — this caused a regression once, don't let it happen again): the canvas container is full available width within the shell's gutters, height derived via CSS `aspect-ratio` matching the current viewBox ratio, capped by the max-height limit. Letterbox/pillarbox bars should appear **only** when the max-height cap is the actual binding constraint (a tall-relative aspect at large viewport widths) — every other aspect, including 16:9 and the wide presets, fills its container edge-to-edge with no bars. If bars appear on an aspect that isn't hitting the height cap, that's a bug, not expected behavior.

**Canvas**
- Aspect ratio (dropdown: 4:3, 16:9, Cine 2.39:1, X-Pan 2.71:1, LinkedIn 4:1)
- Feature density auto-scales with canvas width (wider aspect → proportionally more ridge/spur features, never fewer)

**Scene**
- Landscape type (dropdown)
- Complexity (slider — noise octave count / point sampling density only. Controls detail resolution — how fine or coarse the terrain silhouette is — not feature count. See Peak count below for that.)
- Peak count (slider — number of peaks/spurs/ridges, independent of Complexity. Normalized 0–1 like Complexity/Elevation; each archetype maps it to its own sensible integer range. No-op on archetypes where a fixed count is the defining trait (Twin Peaks' 2, Stacked Ridges' band count) or where the concept doesn't apply.)
- Peak sharpness (slider — blends the terrain profile between smooth/rolling and jagged/ridged. 0 = rounded hills, 1 = sharp ridgelines.)
- Point of view height (slider, global — see section 6a. Active on all archetypes except In Gorge, which is a deferred edge case; disabled/labelled accordingly there. Known bug open — see section 18.)
- Seed value (display + randomize + lock). Lock only guards against *incidental* reseeding from other Scene/Canvas control changes (landscape type, complexity, peak count, sharpness, elevation, aspect ratio). Randomize and New View always draw a new seed regardless of lock state — a control whose entire purpose is to change the seed shouldn't be silently disabled by it.
- Regenerate ("New View")

**Lighting**
- Time of day (continuous slider, 0–24) — drives sky gradient, mist tint, sun/moon crossfade, star field opacity
- Shadow / pseudo-3D toggle
- Light source angle (slider, active when shadow on — independent of time-of-day, see section 6)
- Shadow intensity (slider, active when shadow on)

**Color**
- Theme preset (dropdown, curated palettes)
- Randomize palette (algorithmic — complementary/analogous/split-hue strategies)
- Color depth (slider — controls contrast between near and far layers. Low = layers compressed toward the palette midpoint (flat, low depth cue). High = near/far pushed toward the ramp's extremes, exaggerating separation. Not a literal band/posterize count.)
- Distance haze (slider — mist opacity/spread)

**Actions**
- Download SVG
- Download settings (JSON)
- Reset to defaults (still Phase 6)

**Preferences**
- UI theme: Light / Dark / System
- Tips: on/off
- Help (opens modal)

Pseudo-3D and lighting are UX-independent of the UI chrome theme: in-scene Day/Dawn/Night lighting and light/dark interface skin are separate systems. Tweakpane's own panel chrome must follow the UI theme too, via its `--tp-*` CSS custom properties — this is a documented Tweakpane capability, not a limitation to design around.

## 6. Pseudo-3D / shadow model
Each hill/peak polygon is split into a light-side and dark-side sub-path along an internal ridge boundary — distinct from the silhouette boundary against the sky. Boundary position and shadow-side is derived from the light source angle. This is treated as its own build task, not a simple style toggle.

Light source angle is directly user-controlled, not slaved to the time-of-day slider — the two are independent so shadow direction and sky mood don't fight each other. A sensible default angle may be derived from time-of-day on load, but the slider doesn't auto-follow it afterward.

## 6a. Point of view / elevation model
A global `elevation` (0–1) parameter simulates viewer height, interpolating horizon position and how tightly nested features converge toward the viewer — low elevation reads as ground-level (features fan out, horizon low), high elevation reads as looking down into a landscape (horizon rises, features nest tighter, e.g. converging valley spurs). Meaningfully implemented across all nine archetypes except In Gorge, which is treated as a deferred edge case — its foreground-wall composition doesn't have an obvious viewer-height analog yet and needs separate design thought.

## 7. Persistence (localStorage)
Used generally for user preferences, not just theme:
- UI theme
- Tips enabled/disabled
- Last-used control values (restored on load)

## 8. Settings export
Downloadable JSON of all control values including the numeric seed. Noted caveat to retain in help copy: seeded noise + identical settings gets a close/near-identical result, not always pixel-identical, depending on which draws remain unseeded.

## 9. Loading bar
Triggered on initial app/library load only (bundle + fonts + noise/chroma/Tweakpane), not per-generation — generation is near-instant.

## 10. Help
Single in-app modal (no separate route/page) — keeps this a true one-pager. Contains: control explanations, seed/reproducibility caveat, tips toggle location.

## 11. Accessibility / SEO
- Semantic landmarks (header/main/footer), ARIA labeling on custom controls
- Full keyboard operability
- Contrast-checked in both UI themes
- `prefers-reduced-motion` respected for load bar / transitions
- Meta title, description, OG tags on the single page
- Desktop-first layout, responsive breakpoints for narrower viewports

## 12. Deployment
GitHub repo → Vite build → GitHub Actions workflow (build on push to main, deploy to GitHub Pages via Pages deployment action). No manual dist commits.

## 13. Out of scope
No backend, no accounts/login, no analytics, no server-rendered content, no security surface beyond standard static-site hosting.

## 14. License
MIT. `LICENSE` file at repo root, created in the scaffold prompt.

## 15. README
Required, root-level. Covers: what the app does, live demo link (once Pages is deployed), local dev setup (`npm install`, `npm run dev`), build/deploy notes, license. Written in the scaffold prompt and updated as features land.

## 16. Claude Code operating scope
CC runs from repo root with standing permission to execute bash, git, and stack-related install/setup commands (npm, vite) without per-command confirmation. This is configured via project-level Claude Code permission settings (`.claude/settings.json`), not re-confirmed per prompt.

## 17. Next step — phased CC prompt breakdown
1. Scaffold: Vite project, folder structure, GH Actions deploy pipeline, empty index.html shell
2. Noise + render pipeline for one archetype (Open valley) end-to-end, confirming SVG output and download
3. Remaining eight archetypes + landscape type control + Canvas group (aspect ratio, feature-density scaling) — grouped here because per-archetype feature density scaling is naturally built alongside each archetype's geometry
3.5. Fixes/follow-ups from Phase 3 review: seed lock semantics, elevation fix/verification, Peak count + Peak sharpness sliders, Actions panel separated from parameter panel, layout moved below canvas, nav/canvas margin alignment
3.6. Elevation extended to all archetypes except In Gorge (deferred edge case); 3-column below-canvas layout replacing the accordion panel; Download settings (JSON) brought forward; canvas max-height cap
4. Lighting system: time-of-day slider, sky/mist gradients, shadow/pseudo-3D split
4.5. UX reworked to entirely Tweakpane (deliberate reversal from the brief flat/Tailwind-panel experiment): accordion restored, columns regrouped to Canvas+Scene (left) / Lighting+Color (centre) / Actions (right), Aspect ratio moved to first control
4.6. Bug-fix round: canvas fit/sizing (bars appearing where they shouldn't), Tweakpane panel following UI light/dark theme via `--tp-*` variables
5. Palette system: curated themes + algorithmic generator, color depth/haze controls
6. Persistence, settings export, help modal, tips toggle
7. Accessibility, SEO, responsive pass, final polish

## 18. Known issues (open)
- Point of view height has a reported bug/unexpected behavior (nature not yet diagnosed). Deliberately deferred — not being worked in Phase 4.6.
- Canvas fit/sizing bug (bars appearing on aspects that shouldn't have any) — being addressed in Phase 4.6, remove this line once confirmed fixed.
- Tweakpane panel doesn't follow UI light/dark theme — being addressed in Phase 4.6, remove this line once confirmed fixed.