# SVG Landscape Generator — Project Context

## 1. Overview
One-page web app generating procedural 2D landscape SVGs (noise/algorithmic-based). User tweaks parameters via a control panel, downloads the resulting SVG and/or a settings file. No backend, no accounts, no server. Deployed via GitHub Pages. Rebuilt from scratch — no code ported from prior "Mountain Valley" prototype, though its concepts (aspect scaling, archetype-per-generator, palette engine, mist/sky layering) carry forward as reference.

## 2. Stack
Versions confirmed against the installed tree (`package.json` + lockfile) as of Phase 5.7. Format: declared range → installed version. Re-verify rather than assume if the lockfile moves.
- **Vite** `^8.1.1` → **8.1.5** (devDependency) — dev server (local Firefox preview, hot reload) + production build.
- **Vanilla JS (ES modules)** — no UI framework. Matches prior prototype's approach and keeps the Pages deploy simple. Toolchain runs on **Node 25.9.0 / npm 11.12.1**; nothing in the app code requires that specific major.
- **simplex-noise** `^4.0.3` → **4.0.3** (npm) — noise base.
- **chroma-js** `^3.2.0` → **3.2.0** (npm) — palette generation/interpolation.
- **Tweakpane** `^4.0.5` → **4.0.5** — control panel UI.
- **@tweakpane/plugin-essentials** `^0.2.1` → **0.2.1** (added Phase 5.7) — button-grid blade (theme prev/randomize/next row) and tabbed layout (Downloads). This is the confirmed plugin package; note its 0.2.x line is the one paired with Tweakpane 4.x.
- **Tailwind CSS** `^4.3.3` → **4.3.3**, via **@tailwindcss/vite** `^4.3.3` → **4.3.3** (no PostCSS config needed) — page shell styling: layout, light/dark theme, responsive breakpoints. Tweakpane's own panel keeps its native styling; Tailwind covers everything outside it (header/main/footer, canvas frame, buttons, help modal).
- **Lucide** `^1.27.0` → **1.27.0** (static SVG icons, imported per-icon) — icon set for UI buttons (download, help, theme toggle, etc.). Chosen over an icon font: no font-loading step, and inline SVG is consistent with an app whose whole output is SVG.
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

**Presets panel** (above the canvas, Phase 5.7, preset-loading mechanism finalized Phase 5.12) — a separate Tweakpane instance from the below-canvas control panel, positioned between the header and the canvas frame. Same gutter-alignment discipline as everything else (nav/canvas/panel margins match). Contains a dropdown defaulting to "Custom," followed by the curated preset list. Preset source: a `src/presets/*.json` folder, auto-discovered at build time via Vite's `import.meta.glob('./presets/*.json', { eager: true })` — no manifest file, no code change needed to add one, just drop a `.json` file in the folder and commit. Each preset file is the exact same shape as a "Download JSON" export (section 8), including the Preset name field — so authoring a preset is: configure a scene, name it in the Downloads tab, Download JSON, move that file into `src/presets/`. Dropdown label uses the file's embedded name field; falls back to a filename-derived label if that's missing, rather than breaking the list. Selecting a preset loads its full parameter set and regenerates; the dropdown returns to "Custom" whenever the live state doesn't match a saved preset (including on any manual control change after a preset was loaded). No in-app "save current as preset" capability yet (folder-drop is the authoring path for now; flag if that scope should expand).

**Canvas fit/sizing model** (previously underspecified — this caused a regression once, don't let it happen again): the canvas container is full available width within the shell's gutters, height derived via CSS `aspect-ratio` matching the current viewBox ratio, capped by a **fixed 740px** max-height (not viewport-relative — a `vh`-based cap reintroduces bars on shorter screens, which is what happened in Phase 4.6). Letterbox/pillarbox bars should appear **only** when that fixed cap is the actual binding constraint (4:3 at larger viewport widths is the one preset this currently affects, by design) — every other aspect, including 16:9 and the wide presets, fills its container edge-to-edge with no bars. The SVG fills its frame flush to the edges with no inset padding, and is clipped to match the frame's rounded corners rather than floating inside a visible gap. If bars appear on an aspect that isn't hitting the height cap, or the image doesn't reach the frame edge, that's a bug, not expected behavior.

**Canvas**
- Aspect ratio (dropdown: 4:3, 16:9, Cine 2.39:1, X-Pan 2.71:1, LinkedIn 4:1)
- Feature density auto-scales with canvas width (wider aspect → proportionally more ridge/spur features, never fewer)

**Scene**
- Landscape type (dropdown)
- Complexity (slider — noise octave count / point sampling density only. Controls detail resolution — how fine or coarse the terrain silhouette is — not feature count. See Peak count below for that.)
- Peak count (slider — number of peaks/spurs/ridges, independent of Complexity. Normalized 0–1 like Complexity/Elevation; each archetype maps it to its own sensible integer range. No-op on archetypes where a fixed count is the defining trait (Twin Peaks' 2, Stacked Ridges' band count) or where the concept doesn't apply.)
- Peak sharpness (slider — blends the terrain profile between smooth/rolling and jagged/ridged. 0 = rounded hills, 1 = sharp ridgelines.)
- Point of view height (slider, global — see section 6a. Active on all archetypes except In Gorge, which is a deferred edge case; disabled/labelled accordingly there. Known bug open — see section 18.)
- Seed value (display + lock). **Default: locked.** Lock guards against *incidental* reseeding from other Scene/Canvas control changes (landscape type, complexity, peak count, sharpness, elevation, aspect ratio) — with it on by default, tweaking those sliders no longer reseeds unless explicitly asked to. New View always draws a new seed regardless of lock state — the one control whose purpose is to change the seed isn't disabled by it.
- Regenerate ("New View") — the sole reseed action. A separate "Randomize seed" button existed alongside this in earlier phases and was functionally identical (both drew a new seed and regenerated, unconditionally) — removed as redundant in Phase 5.12 rather than kept as a second control doing the same thing.

**Lighting**
- Time of day (continuous slider, 0–24) — drives sky gradient, mist tint, sun/moon crossfade, star field opacity
- Show sun/moon (toggle) — hides the celestial disc and its glow only; no effect on sky/mist lighting itself
- Show stars (toggle) — independent of the above; hides the night star field only
- Shadow / pseudo-3D toggle
- Light source angle (slider, active when shadow on — independent of time-of-day by default, see section 6)
- Lock angle to time of day (toggle, active when shadow on — "tidelock," see section 6)
- Shadow intensity (slider, active when shadow on — non-linear response, see section 6b)

**Color**
- Theme preset (dropdown, curated palettes — 7 as of Phase 5: Alpine dusk, Glacier, Cascade pine, Sandstone mesa, Volcanic ash, Heather moor, Ink wash). A button-grid blade directly beneath it: Previous | Randomise | Next, in that order. Previous/Next cycle the curated list only (wraps at both ends, not through "Randomized"); Randomise is the existing algorithmic generator from Phase 5. Replaces the Phase 5.5 vertically-flanking buttons — this needed the Tweakpane essentials plugin to lay the three out in one row (see section 2).
- Color depth (slider — controls contrast between near and far layers in ramp-position space: compression toward the palette midpoint below 0.5, an S-curve spreading toward the ramp's extremes above 0.5. 0.5 is the theme as authored. Not a literal band/posterize count, and not endpoint extrapolation — that was tried and clamps out near the top of the range.)
- Distance haze (slider — horizon-level atmospheric mist band: opacity/spread only. Lighting owns the tint via time-of-day; Color owns this band's presence and shape.)
- Valley mist (slider, Phase 5.10 revision — renamed from Ridge mist, rebuilt three times: crest-topology mechanism (5.6) → simple per-layer vertical fade to a shared canvas-bottom anchor (5.8) → depth-aware grading with foreground exclusion and layer-linked color (5.9) → per-layer bottom anchor corrected (5.10). Mechanism per layer, except the nearest/foreground layer which is always fully excluded — no mist on it at any slider value, not just a low amount. Each remaining layer gets a vertical fade: 0% opacity at that layer's own single highest crest point, increasing to that layer's scaled maximum opacity at **that layer's own bottom anchor** — the next-nearer layer's peak Y (the true-foreground layer's peak, for the nearest misted layer), not the shared canvas bottom used in 5.8/5.9. Guard: falls back to the 5.9 canvas-floor anchor when the occluder's peak isn't below this layer's own peak — this happens on Open valley, In gorge, and partly Gorge, where near layers reach the top of frame; those three archetypes don't get 5.10's benefit, they just don't break. Everything else unchanged from 5.9: userSpaceOnUse, the `<use>` reuse trick, section 6b's response curve, per-layer distance-scaled ceiling (Distance control), and per-layer color-derived mist tone.)
- Distance (slider, Phase 5.9) — controls how strongly Valley mist's per-layer intensity scales with distance. At 0: all non-excluded layers get equal mist intensity (foreground exclusion still applies). At 1: strong compounding — the nearest non-excluded layer's mist ceiling is scaled well down, the farthest reaches full ceiling. This scales each layer's *maximum opacity* (the ceiling reached at its own bottom anchor, per the anchor fix above) — it does not change where each layer's fade starts or ends vertically, only how intense it gets there.

Themes own the terrain color ramp only — sky gradient and mist tint are Lighting's (time-of-day), not the palette's. This narrowed from Phase 2, where the theme shape also carried sky/mist keys that Phase 4's lighting keyframes superseded; those dead keys were removed rather than left in place.

**Actions** — tabbed layout (Phase 5.7), two tabs:
- **Tab 1** — Download SVG only.
- **Tab 2** — Preset name (optional text field; included in the exported JSON and, where possible, in the downloaded JSON's filename), Download JSON button, and beneath it a small readonly scrollable text preview (~5 lines tall) of the JSON that button will download — not editable, just a live preview.
- Reset to defaults (still Phase 6 — placement within this tabbed structure to be decided when it's built)

**Preferences**
- UI theme: Light / Dark / System
- Tips: on/off
- Help (opens modal)

Pseudo-3D and lighting are UX-independent of the UI chrome theme: in-scene Day/Dawn/Night lighting and light/dark interface skin are separate systems. Tweakpane's own panel chrome must follow the UI theme too, via its `--tp-*` CSS custom properties — this is a documented Tweakpane capability, not a limitation to design around.

## 6. Pseudo-3D / shadow model
Each hill/peak polygon is split into a light-side and dark-side sub-path along an internal ridge boundary — distinct from the silhouette boundary against the sky. Boundary position and shadow-side is derived from the light source angle. This is treated as its own build task, not a simple style toggle.

Light source angle is directly user-controlled, not slaved to the time-of-day slider by default — the two are independent so shadow direction and sky mood don't fight each other. A sensible default angle may be derived from time-of-day on load, but the slider doesn't auto-follow it afterward — **unless "Lock angle to time of day" is engaged.** Enabling it captures the current offset between the light angle and the time-of-day-derived sun/moon arc position; from then on the light angle rotates automatically to preserve that offset as time-of-day changes — both rotate together, phase fixed, like a literal tidelock. While locked, the Light source angle slider becomes a read-only display of the derived value rather than directly editable, to avoid two controls fighting over the same value. Disengaging the toggle returns the angle to direct manual control at its current (locked) position, not back to whatever it was before locking.

## 6a. Point of view / elevation model
A global `elevation` (0–1) parameter simulates viewer height, interpolating horizon position and how tightly nested features converge toward the viewer — low elevation reads as ground-level (features fan out, horizon low), high elevation reads as looking down into a landscape (horizon rises, features nest tighter, e.g. converging valley spurs). Meaningfully implemented across all nine archetypes except In Gorge, which is treated as a deferred edge case — its foreground-wall composition doesn't have an obvious viewer-height analog yet and needs separate design thought.

## 6b. Non-linear slider response
Some sliders need more usable resolution at one end of their travel than a linear 0–1 mapping gives — Shadow intensity's most visually meaningful range sits in roughly the first quarter of the slider, and Valley mist is deliberately near-invisible through most of its travel, becoming noticeable only near the top. Rather than special-casing each one, the underlying parameter is driven through a shared response-curve mapping: the *displayed slider* stays a normal linear 0–1 drag control, but a power/ease curve maps that linear position to the value actually used in rendering, concentrating resolution where it's needed. One reusable utility, applied to both Shadow intensity (more resolution at the low end) and Valley mist (suppressed through most of the range, ramping up near the top) — not two one-off mappings.

## 7. Persistence (localStorage)
Used generally for user preferences, not just theme:
- UI theme
- Tips enabled/disabled
- Last-used control values (restored on load)

## 8. Settings export
Downloadable JSON of all control values including the numeric seed — audited for completeness in Phase 5.12 (it had drifted out of sync with the growing control list; see section 18). Noted caveat to retain in help copy: seeded noise + identical settings gets a close/near-identical result, not always pixel-identical, depending on which draws remain unseeded.

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
4.6. Bug-fix round: canvas fit/sizing (bars appearing where they shouldn't — fixed cap was vh-relative, corrected to fixed 740px), Tweakpane panel following UI light/dark theme via `--tp-*` variables (fixed)
5. Palette system: curated themes + algorithmic generator, color depth/haze controls. Also carried two small fixes rolled in at the start: app title correction (SVG Landscape Generator, was reversed) and image-to-frame-edge gap fix (root cause was the frame's border inset, not the rounded corners as first suspected).
5.5. Small feature additions: Show sun/moon + Show stars toggles, non-linear slider response utility (Shadow intensity, Ridge mist), theme preset stepper buttons, light-angle tidelock toggle, new Ridge mist slider, Download settings renamed to Download JSON
5.6. Ridge mist mechanism corrected — was specified as a top-edge fade (measures depth into the shape), rebuilt to be driven by crest-line topology (measures local dip depth relative to nearby peaks) so ridges stay clear and valleys/saddles read as misty
5.7. UI targeted tweaks + preset system wiring: confirmed stack version numbers, theme stepper consolidated into a button-grid blade (Previous/Randomise/Next), Downloads restructured into a tabbed layout (SVG tab, JSON tab with preset name + live JSON preview), new Presets panel above the canvas (dropdown + empty curated list, ready for future entries)
5.8. Ridge mist replaced entirely by Valley mist — the crest-topology dip-depth mechanism (correct by its own definition, verified r=0.98+) still produced the wrong visual result: a stepped/banded look, not a fade, and read as misty at peaks rather than in valleys. Stripped out and replaced with one simple per-layer vertical fade (clear at that layer's own peak, misty white at canvas bottom) — see section 5's Color group.
5.9. Valley mist adapted for depth perception: foreground/nearest layer fully excluded from mist, remaining layers' intensity scaled by distance from viewer via a new Distance control, mist color now derived from each layer's own base color (lightened) instead of a fixed tone
5.10. Valley mist bottom anchor corrected — 5.8/5.9 anchored every layer's fade to the shared canvas bottom, which made distant layers' mist invisible (their fade barely started before being occluded by nearer layers) and the nearest misted layer's wash too strong (a short visible sliver anchored to a long span). Each layer now fades to its own bottom anchor — the next-nearer layer's peak — so every layer's fade completes within its own actually-visible extent. Landed cleanly on six archetypes; a no-op on three (Open valley, In gorge, partial Gorge) where near layers reach the top of frame, leaving no downward span — falls back safely to the 5.9 canvas-floor anchor rather than breaking, but doesn't fix those archetypes. A median-crest-based anchor would cover them; not built, flagged as future work if wanted.
5.11. Right-edge vertical line leak — extensive diagnosis (magenta background test, 736 render combinations, edge/rounding checks) ruled out background leak, width mismatch, and edge rounding as causes. A scrollbar-on-frame hypothesis was proposed from pixel analysis of the report screenshot but explicitly rejected by Joel ("not a browser scrollbar, this is clearly the case"). Stopped reproducing after a dev server restart before the hypothesis could be tested. Root cause never confirmed — closed as not currently reproducing, not as fixed. See section 18.
5.12. Seed UX simplified (lock defaults on, redundant Randomize seed button removed, New View is the sole reseed action), settings export completeness fixed (Lighting values were missing — escalated from Phase 6, since presets depend on this), and the preset-loading mechanism finalized as folder-based auto-discovery (`src/presets/*.json` via Vite glob import) rather than hand-edited source — replaces whatever Phase 5.7 built for this before it was ever used
6. Persistence, settings export, help modal, tips toggle
7. Accessibility, SEO, responsive pass, final polish

## 18. Known issues

**Open**
- Point of view height has a reported bug/unexpected behavior (nature not yet diagnosed). Still deliberately deferred.

**Closed**
- Canvas fit/sizing bug (bars appearing on aspects that shouldn't have any). Root cause was not a repeat of the Phase 3.6 width fix — it was a `vh`-relative max-height cap binding at typical viewport heights (e.g. 522px on a 900px-tall viewport), forcing 16:9 to letterbox inside a too-short frame. Fixed in Phase 4.6 with a fixed 740px cap (see section 5). Recorded here rather than deleted since it was initially misdiagnosed as the earlier issue — worth not rediscovering.
- Tweakpane panel not following UI light/dark theme. Fixed in Phase 4.6 via `--tp-*` custom properties keyed off the same `dark` class `theme.js` already toggles.
- Generated image not reaching the frame edge. Root cause was not the rounded corners (initial suspicion) — it was the frame's 1px border insetting the content box against which `aspect-ratio` resolved, producing a sub-pixel mismatch against the viewBox ratio. Fixed by replacing the border with an inset ring that paints over the image rather than displacing it.
- Right-edge vertical line leak (Phase 5.11). Closed as **not currently reproducing** — not confirmed fixed. Extensive testing ruled out background/edge leaks, width mismatches, and edge rounding as causes. A scrollbar-on-frame hypothesis was raised from screenshot pixel analysis but explicitly rejected before it could be tested. Stopped reproducing after a dev server restart. If it recurs: get a fresh screenshot and confirm it's the same symptom before restarting the investigation with the already-ruled-out hypotheses.
- Settings JSON export missing Lighting values (hour, shadow, lightAngle, shadowIntensity). Was deferred to Phase 6, escalated and fixed in Phase 5.12 instead since presets depend on export completeness — see section 8.