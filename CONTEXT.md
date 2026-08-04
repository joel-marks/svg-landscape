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
- **@tweakpane/plugin-essentials** `^0.2.1` → **0.2.1** (added Phase 5.7) — button-grid blade (theme prev/randomize/next row) and tabbed layout (Downloads). This is the confirmed plugin package; note its 0.2.x line is the one paired with Tweakpane 4.x. **`@tweakpane/plugin-camerakit` was trialled in Phase 6.13 and removed in 6.14 along with the rotary trial that motivated it — see section 5.**
- **Tailwind CSS** `^4.3.3` → **4.3.3**, via **@tailwindcss/vite** `^4.3.3` → **4.3.3** (no PostCSS config needed) — page shell styling: layout, light/dark theme, responsive breakpoints, design tokens (surface/border/text). Tweakpane's own panel keeps its native styling; Tailwind covers everything outside it (header, canvas frame, buttons, modals). **Phase 6.12/6.13**: light mode's surface tokens moved into a mid-gray band and then brightened again optically. Values in play: `--surface-raised` (header/nav, panel chrome) sits above the mid-band; `--surface-base` and `--surface-sunken` stayed at 52% / 43% lightness at hue 212 / 5% saturation. Foreground tokens and the Tweakpane light palette moved in lockstep in 6.12 because the panel is the largest single piece of chrome on the page. Dark mode is untouched throughout. The formal contrast re-check against these values is Phase 8's job (was Phase 7 before the 6.14 renumber; see section 17); measured starting points are recorded in section 11.
- ~~**Lucide**~~ — **removed in Phase 6.5.** Uninstalled rather than left as an unused dependency; nothing renders an icon today. **Phase 6.12** adds a header GitHub icon without reinstalling it — a single inlined SVG mark in `index.html`, not a package, for one static icon.
- **No markdown library.** The Help, Read Me and About modals render markdown through `src/markdown.js`, ~200 lines written for this project in Phase 6.9. Covers what these documents actually use — counted against real content: headings, bold, italic, inline code, links, ordered and unordered lists, blockquotes, fenced code blocks and tables. A general CommonMark implementation is a large dependency for three modals; the failure mode of a small renderer is the right one — unsupported syntax renders as its own literal text rather than breaking. Escapes HTML before inserting any tag, and lifts code spans out before the inline rules run so `**text**` inside backticks stays literal.
- **No rotary/dial control library.** Confirmed in Phase 6.14 rather than assumed: Tweakpane 4.0.5 ships no rotary view, `@tweakpane/plugin-essentials` and `@tweakpane/plugin-camerakit` don't have one between them (the cameraring is a knob for continuous ranges, not a 24-hour clock), and the one library advertising dials — `svelte-tweakpane-ui`'s Ring component — embeds a camerakit fork and is Svelte-only. A formal input plugin would have needed `@tweakpane/core`, which isn't installed. So the Time of day clock face (section 5) is hand-drawn SVG in `src/clockface.js`, ~217 lines, mounted as an ordinary panel row and themed entirely from the existing `--tp-*` tokens — no new dependency. Net dependency change for Phase 6.14 was −1.
- **No theme or colour-schema tooling.** Phase 7 moved the curated themes into `src/themes.json` and added a scene-driven interface tint without adding anything: JSON is a native import (Vite by extension, Node by import attribute), and the tint mixing is chroma-js, which the palette already depends on. Net dependency change for Phase 7 was zero.
- No routing, no state-management library — a single plain state object is sufficient.

*Assumption: no framework. Flag now if you want React/Vue instead — changes the build slightly.*

## 3. Architecture

```
/src
  main.js            entry point — wires state, controls, render
  state.js            central state object + localStorage load/save
  noise.js             fbm / ridged-fbm wrappers over simplex-noise
  palette.js           theme loading, algorithmic generator, resolved palette (both colouring modes)
  themes.json           Phase 7 — the curated themes as data: id, name, terrain triple, uiTint, optional _note
  uitint.js             Phase 7 — mixes the scene theme's uiTint into the interface's accent/border/ring tokens
  lighting.js           time-of-day -> sun/moon position, sky color blend, shadow angle, sun colour ramp
  render.js             SVG paint: sky, mist/haze, polygons, light/dark shadow split, stars/moon
  controls.js            Tweakpane panel, grouped folders
  clockface.js            Phase 6.14 — hand-drawn SVG 24-hour clock face for Time of day, mounted as an ordinary panel row
  tips.js                  "?" tooltip trigger + popover beside each folder heading
  download.js            SVG export + settings JSON export
  modal.js                shared <dialog> shell every informational modal is built on
  markdown.js             hand-rolled markdown -> HTML for the modals (no dependency)
  help.js                 Help / Read Me / About modals — sources three .md files, open/close, nothing else
  /help
    help.md               Help copy — the control explanations, in panel order
  /about
    about.md              About copy — written by hand, not generated. No longer a placeholder as of the update noted in section 10 — exact current wording not held in this document; verify against the file itself if precision matters.
  theme.js                 UI light/dark theme, prefers-color-scheme, persistence
  utils.js                 shared geometry helpers: feature-density/aspect width scaling, common spur/wall primitives used across archetypes, EDGE_BLEED (section 18)
  /archetypes
    open-valley.js, valley-floor.js, v-valley.js,
    gorge.js, in-gorge.js, mountain-top.js, stacked-ridges.js,
    dominant-peak.js, twin-peaks.js
    index.js            registry mapping name -> generator module
/public                favicon, static assets
index.html               single page, semantic landmarks, meta tags. Header carries a top-right GitHub icon (inlined SVG) and the build-time git short commit hash from Phase 6.12 — the hash is a `__COMMIT_HASH__` constant declared in `vite.config.js`'s `define` from `git rev-parse --short HEAD`, evaluated once at build/dev-server start (falls back to `unknown` outside a git checkout rather than failing the build), and written into the header by `main.js`.
```

Each archetype module owns its own generation logic (not shared parameters over one generator) and exports `generate(params) -> geometryItems`. Every `generate()` signature accepts `elevation`, `peakCount`, and `sharpness` (see sections 5, 6a) even where a given archetype treats one as a no-op (e.g. Twin Peaks ignores `peakCount`) — keeps the schema stable as effects are extended to more archetypes later. **Layer ordering convention** (which Phase 7's Layers mode builds on): `layers[0]` is farthest from the viewer, `layers[layerCount-1]` is nearest — every archetype's `generate()` builds the array in that order, and every layer carries `index` and `depth` (0..1) as set by `ridgeLayer()` in `utils.js`.

**Second archetype export, added Phase 7**: `LAYER_BOUNDARIES = { backgroundUntil, foregroundFrom }` — two fractional depths saying where that archetype's own stack divides into background / middle distance / foreground for Layers mode (section 5). All nine declare one; the values differ per archetype and each module carries its own reasoning in a comment above the export. `state.js` reads it off the module per paint and passes it to `createPalette`; a module without one falls back to a generic `{ 0.25, 0.7 }` rather than failing.

## 4. Landscape types (seed list — carried from prior prototype naming)
Open valley · Valley floor · V valley · Gorge · In gorge · Mountain top · Stacked ridges · Dominant peak · Twin peaks

"V valley" and its former "rising" variant are merged into one generator driven by the elevation parameter (section 6a) rather than two separate archetypes.

## 5. Control panel — grouped logically

Entirely Tweakpane — title-less Pane instances, folder titles the only headings, no separate HTML/Tailwind panel chrome. One pane per column was the original rule; both outer columns now stack two (Presets over Canvas/Scene on the left since 5.7, Actions over Preferences on the right since 6.6). Renders below the canvas, not beside it (still required — X-Pan 2.71:1 and LinkedIn 4:1 rule out a side panel). Three columns:
- **Left** — Presets (its own pane, stacked on top), then Canvas, Scene
- **Centre** — Lighting, Color
- **Right** — Actions, then Preferences — **one Pane instance each** since Phase 6.6

Folders are collapsible (accordion). Header/nav side margins align with canvas and panel — one `.shell` class from 6.12 onward, header+main sharing it since the footer was removed.

**Input visibility (Phase 6.12)**: Tweakpane sliders/text/checkboxes get a pale 1px border via scoped overrides on Tweakpane's own classes (`.tp-txtv_i`, `.tp-ckbv_w`, `.tp-sldv_t::before`, `.tp-sldv_k::after`, `.tp-sglv_i`, `.tp-mllv_i`), coloured from `--tp-input-border-color` per theme. Written **outside every cascade layer** because Tweakpane injects its stylesheet unlayered and would beat any `@layer base` rule — the inset-ring bug with roles swapped (section 18). The slider rail takes a spread `box-shadow` since a border would consume its 2px `::before`.

**Optical brightness pass (Phase 6.13)**: `--surface-raised` and the Tweakpane light palette's base tone brightened by eye against before/after screenshots rather than to a computed target. `--surface-base` and `--surface-sunken` unchanged. Foreground/border/accent tokens moved in lockstep to preserve the scale's shape.

**Time of day: 24-hour clock face (Phase 6.14)** — the first control in Lighting, above Show sun/moon. Hand-drawn SVG in `src/clockface.js` (see section 2), ~217 lines, mounted as an ordinary panel row and themed from `--tp-*` tokens so Light/Dark/System resolve through one code path. **Layout**: circle, tick on every hour, hand from centre to edge. **Orientation**: noon at the top, clockwise — 06:00 left (sunrise in-frame), 12:00 up, 18:00 right (sunset in-frame), 00:00 bottom. Cardinal points verified exact. **No numeric readout** — deliberate visual-first design; **acknowledged consequence: the panel now shows the exact hour nowhere**, so 18:30 and 18:36 are indistinguishable by eye, and hand-authoring a preset requires reading the exported JSON rather than the panel. Not a defect; recorded as a known consequence so reinstating a readout later is a small change if it ever bites. The linear slider that had lived here since Phase 4 and the `cameraring` dial trialled in 6.13 are both gone; `@tweakpane/plugin-camerakit` was uninstalled with them (section 2). **Midnight wrap is trivial**: `atan2` can't return a value outside one revolution, so no proxy value, no wrap-on-drag-end, no mid-drag flag — the clock binds straight to `state.hour` and a drag across the bottom runs 00:56 → 23:04 without stopping. **Keyboard operability was built with the control, not deferred to the accessibility phase**: `role="slider"`, `aria-valuetext` carrying the clock reading, arrow / Shift+arrow / PageUp / PageDown / Home / End, focus ring drawn round the face. **A placement bug worth remembering**: Tweakpane inserts each blade at its own child index counting only blades it knows about, so a foreign element sitting at index 0 gets stepped over by every later insert and ends up last — mounting after the folder is otherwise complete, then prepending, is what actually puts it first.

**Presets panel** (Phase 5.7, mechanism finalized 5.12) — separate Tweakpane instance stacked at the top of the left column, above Canvas/Scene. Same gutter-alignment discipline as everything else. Titled "Presets" since 6.6. Contains **Load preset** (dropdown, defaults to "Custom" — verified live in 6.12, not assumed), then a separator blade, then **Reset to defaults** (relocated from Actions in 6.6). Preset source: `src/presets/*.json`, auto-discovered at build time via Vite's `import.meta.glob('./presets/*.json', { eager: true })` — same shape as a Download JSON export, so authoring a preset is: configure, name it in Downloads tab, Download JSON, drop into `src/presets/`. No in-app "save current as preset" yet.

**Canvas fit/sizing model**: container full width within gutters, height via CSS `aspect-ratio`, capped at fixed 740px max-height. Letterbox/pillarbox bars only when the cap is the binding constraint (4:3 at wider viewports, by design). SVG fills frame edge-to-edge, clipped to rounded corners.

**Canvas**
- Aspect ratio (dropdown: 4:3, 16:9, Cine 2.39:1, X-Pan 2.71:1, LinkedIn 4:1)
- Feature density auto-scales with canvas width

**Scene**
- Landscape type (dropdown)
- Complexity (slider — noise octave count / point sampling density; detail resolution, not feature count)
- Peak count (slider — feature count independent of Complexity; no-op where the count is fixed by definition)
- Peak sharpness (slider — smooth-to-ridged blend)
- Point of view height (slider — global, section 6a; In Gorge disabled)
- Seed value (display + lock; default locked)
- **New View | Random all | Random scene** (Phase 6.7 button-grid). Landscape type deliberately excluded from all three.

**Lighting**
- **Time of day** — the 24-hour clock face described above (Phase 6.14). Drives sky gradient, mist tint, sun/moon crossfade, star field opacity, and the sun's colour ramp (section 6c).
- Show sun/moon (toggle)
- Show stars (toggle) — see section 5's fixed-backdrop treatment
- **Shadow / pseudo-3D toggle — default: ON since Phase 6.12**
- Light source angle (slider — independent of time-of-day by default, section 6)
- **Lock angle to time of day — default: ON since Phase 6.12** ("tidelock")
- Shadow intensity (slider, non-linear response, section 6b)

**Color**
- Theme preset (dropdown, curated palettes — **8 since Phase 7**: Alpine dusk, Glacier, Cascade pine, Sandstone mesa, Volcanic ash, Heather moor, Ink wash, **Desert**). Beneath: Previous | Randomise | Next button-grid. The themes themselves live in `src/themes.json` since Phase 7 (section 6d).
- Color depth (slider — 0.5 is the theme as authored in both modes. Continuous: reshapes ramp-position sampling, below compresses toward midpoint, above spreads toward extremes via S-curve. Banded: becomes a contrast-between-bands control — below mixes all three toward `mid`, above pushes `far` and `near` further from it. See section 6d.)
- **Layers (toggle, Phase 7)** — off (default) is the continuous ramp every scene before this phase was drawn with; on gives each layer one of the theme's three stops flat, chosen by region (section 6d). Per-scene, not a preference: in `SETTINGS_KEYS`, exported, restored by presets (sections 7, 8).
- Distance haze (slider — horizon-level atmospheric band; opacity/spread only, tint owned by Lighting)
- Valley mist (slider, Phase 5.10 revision — per-layer vertical fade with per-layer bottom anchor; foreground layer always excluded; see section 6d for how it derives its per-layer tint)
- Distance (slider, Phase 5.9) — scales Valley mist's per-layer ceiling with distance

**Actions** — tabbed layout (Phase 5.7):
- Tab 1: Download SVG
- Tab 2: Preset name, Download JSON, live JSON preview
- Reset to defaults moved to Presets panel in 6.6

**Preferences** — its own Pane in the right column since 6.6:
- UI theme: Light / Dark / System
- Tips: on/off. **Default: off** — found wrong (`true`) in `state.js` in Phase 6.12 and fixed. Scope: Presets, Scene, Canvas, Lighting, Color, Actions. Preferences deliberately excluded.
- Help | **readme.md** | About — one row of three (middle button relabelled from "Read Me" in 6.12)

**Scene-theme UI tint (Phase 7)** — the current scene theme's declared `uiTint` is mixed into three interface tokens: `--accent` (links, Help's group headings, the page focus ring), `--border` (every line the page draws), and the Tweakpane input outline `--tp-input-border-color`. **Not surface backgrounds** — a tinted page behind a tinted artwork is two colour fields competing, and the artwork has to win. `src/uitint.js` owns it, ~90 lines, no dependency beyond chroma-js.

Three mechanics worth keeping written down, each being the reason the obvious version doesn't work. (a) **Base tokens are read, not assumed**: style.css declares `--accent-base` / `--border-base` / `--input-ring-base` per UI theme and the consumed token defaults to its base; uitint.js reads the resolved base off `<html>` and writes the tinted value as an inline custom property, which outranks both theme blocks and cannot feed back into its own input. `theme.js`'s `apply()` recomputes on every Light/Dark/System resolution; `state.js`'s `paint()` supplies the tint, so every route to a new scene theme carries the interface with it. (b) **Lightness is taken from the token, not from the mix** — contrast is very nearly a function of lightness, so holding L fixed keeps Phase 8's audit at one lightness per token per UI theme rather than a worst-case-across-themes sweep. (c) **The mix is a Lab (chroma-vector) mix, not an LCH hue interpolation** — LCH takes the shorter way round the hue circle, so mixing a warm tint into a cold token lands on a hue in neither colour. Ratios differ per token and the reason is that a Lab mix moves a chromatic colour *through neutral* first: near-neutral tokens read the tint as hue immediately and take ~0.3, the accent is a saturated blue in both UI themes and stays at 0.18 so no theme flattens it to grey. Ink wash's tint is itself neutral, so it desaturates slightly rather than tinting — the honest outcome for a palette whose identity is having no hue, and the control case when checking the other seven.

Pseudo-3D and lighting are UX-independent of the UI chrome theme. Tweakpane's own panel chrome follows the UI theme via its `--tp-*` custom properties.

## 6. Pseudo-3D / shadow model
Each hill/peak polygon is split into a light-side and dark-side sub-path along an internal ridge boundary — distinct from the silhouette boundary against the sky. Boundary position and shadow-side derived from the light source angle.

Light source angle is directly user-controlled, not slaved to time-of-day by default — the two are independent so shadow direction and sky mood don't fight each other. **Unless "Lock angle to time of day" is engaged**, in which case the current offset is captured and preserved as time-of-day changes ("tidelock"). While locked, the Light source angle slider is a read-only display of the derived value; disengaging returns direct manual control at the current locked position.

**New default state, Phase 6.12**: Shadow on, tidelock engaged, offset such that light source angle reads exactly 0° at time of day 05:40. `state.js` holds `ANGLE_ZERO_AT_HOUR = 5 + 40/60` and derives `DEFAULT_ANGLE_OFFSET = normalizeAngle(0 − suggestedAngle(ANGLE_ZERO_AT_HOUR))` via `lighting.js`'s exported `suggestedAngle` — same function the tidelock tracks, so the two can't drift. At 05:40 the moon branch supplies the direction: offset = 355°. At the unchanged default hour of 18.5, the panel opens with the angle reading 168°. Both first-visit defaults and Reset to defaults come from that one computation. Note that Time of day historically had a 0.1h step (6 min), meaning 05:40 wasn't reachable — 05:42 was the reachable step where the readout showed 0° — but with the clock face (Phase 6.14) replacing the slider, this stepping concern is now moot for the input side. Direct hex export still writes a numeric hour, so the offset math is unchanged.

## 6a. Point of view / elevation model
Global `elevation` (0–1) simulates viewer height. Meaningfully implemented across all archetypes except In Gorge (deferred edge case). Reads well on some, weakly on others — that's per-archetype quality variation (section 13a), not a defect.

## 6b. Non-linear slider response
Shadow intensity and Valley mist run through a shared response-curve utility rather than being special-cased individually — displayed slider stays linear 0–1, a power/ease curve maps that to the value actually used. Shadow intensity gets more resolution at the low end; Valley mist is suppressed through most of its range and ramps near the top.

## 6c. Sun and moon appearance (Phase 6.13)
The sun disc and glow were a fixed colour at every hour prior to this phase. Position and glow radius already varied with the solar-altitude term; colour did not.

**Sun colour ramp**: hour-indexed, hand-tuned keyframes matching the `SKY` table's approach — pale near-white/warm-yellow through most of the day, subtly warmer gold near sunrise, richer red-orange near sunset. Deliberately asymmetric. Glow gradient sources from the same ramp so disc and glow can't disagree.

**Moon colour** unchanged. Moon horizon-size growth was in-scope-if-trivial; verify against `render.js` for what actually landed.

## 6d. Palette internals — what themes hand to the renderer

Documented here after being read directly for Phase 7's spec, rather than inferred from CONTEXT.md. Section 5 gives the user-facing behaviour of Theme preset, Color depth, Valley mist and Distance; this section describes how `palette.js` actually produces the per-layer colours those controls operate on.

**Themes are data since Phase 7.** `src/themes.json` — one file, not one per theme, because eight fit on a screen and cohesion is easier to judge at a glance. Each entry is `id`, `name`, `terrain: [far, mid, near]`, `uiTint`, and an optional `_note` carrying authorial reasoning (JSON has no comments; nothing reads these). Imported directly rather than via `import.meta.glob` — there is one file and naming it beats matching a pattern that can only match it — and written `import themeData from './themes.json' with { type: 'json' }`. The attribute is redundant for Vite and required by Node, and being importable in plain Node is what let the migration be verified by diffing rendered output before and after.

**Every theme is three ramp stops**, farthest ridge to nearest foreground. The middle stop matters: a straight interpolation from a pale far to a near-black near desaturates through grey, so a theme that should read as pine or sandstone needs its ramp bent through its own hue via the mid stop. Ink wash exists partly to prove the negative case — deliberately zero-chroma, so only the value spread does work; used as the honest test of Color depth. **Desert (Phase 7) is the one theme whose ramp runs dark-to-pale** — mesa brown, dune yellow, sand off-white — because it is authored for Layers mode, where the pale stop is the foreground sand. In continuous mode it therefore inverts aerial perspective; checked against the render rather than assumed, and it reads as a lit desert rather than as a mistake.

**`uiTint` is declared, never derived.** An explicit hex per theme, not computed from the ramp: a derived tint would be one more thing that silently changes when a stop is retuned, and a per-theme literal is trivially auditable (section 11). The randomiser emits one too — `mid`, which is the chroma peak in all three strategies and therefore the only stop that reliably carries a generated palette's identity.

**`createPalette(theme, { colorDepth, layersMode, boundaries })`** returns a resolved palette with a `terrainAt(depth)` method, where `depth` is the 0..1 position of a layer in its scene's stack.

*Continuous mode (`layersMode: false`, default, unchanged since Phase 5):* the ramp is `chroma.scale(terrain).mode('lab')`; Color depth **never recolours it**, it only reshapes where each layer lands on it. Below 0.5 compresses toward the palette midpoint (at 0 every layer resolves to the mid colour — one flat silhouette mass); above 0.5 expands via a smootherstep (Ken Perlin's second-order, C² continuity) so the outermost layers don't visibly snap onto the endpoints as the slider approaches 1. 0.5 is the theme as authored.

*Banded mode (`layersMode: true`, Phase 7):* no ramp. A layer's `depth` is tested against the archetype's `LAYER_BOUNDARIES` (section 3) and it takes `far`, `mid` or `near` flat. Fractional boundaries compared against depth directly — **not** resolved to integer indices as the pre-phase intended-state prose in section 17 said; layer counts run 4 to 20+ and move with Peak count, elevation and canvas width, and depth is the axis that stays comparable. `foregroundFrom` is tested first, so a crossed declaration can't produce a gap. An archetype wanting everything in one band declares `foregroundFrom` **above** 1 (1.01), not at it — most archetypes' nearest layer has depth exactly 1 and `>=` would hand it `near`. Nothing exercises that today: all nine turned out to have a legible three-part structure, including the two the Phase 7 prompt offered the escape hatch to (Stacked ridges and Twin peaks both declined it, with the reasoning in their own files).

*Color depth in banded mode:* the same slider, mode-appropriate mechanism, no new UI. 0.5 is the three stops as authored; below mixes `far` and `near` toward `mid` in Lab, reaching one flat mass at 0 — the same end state continuous mode reaches, by a different route; above pushes them further from `mid`, up to 40% past the authored positions at 1. The push deliberately moves **lightness** and holds each stop's own **hue**, with chroma clamped to the authored range: extrapolating a hue past an endpoint invents a hue in neither colour, and lightness spread is what aerial perspective is made of anyway. This is what stops a saturated mid from throwing fluorescent bands at the top of the slider.

**The mode branch is one call site, and it is in `palette.js`, not `render.js`** where the Phase 7 prompt located it. `render.js` calls `palette.terrainAt(layer.depth)` exactly as it always has and needed no change at all — depth is everything either mode needs, so the method signature is the whole interface, and neither the paint object nor the archetype registry had to be threaded anywhere new.

**Two helpers on the same file feed the renderer beyond the base ramp.** `shade(color, amount)` produces the dark-side fill for the pseudo-3D split by mixing toward a cold near-black (`#070a10`) rather than pure black — shaded slopes read as terrain in shadow, not as holes. `mistTone(color)` derives the per-layer Valley mist wash from that layer's own fill, in LCH — lightness climbs toward a near-white, chroma clamped, hue untouched — so a warm ridge mists warm and a cold ridge mists cold. Both work on any hex regardless of which theme produced it, and both are unaffected by Phase 7's mode branch (section 17).

**Algorithmic Randomise** generates hue-related triples, never three independent random colours. Three strategies — complementary (180° opposite, ramp crosses neutral), analogous (32° window, quiet and naturalistic), split-hue (150° with the mid biased 0.68 toward the near for a saturated middle). Lightness and chroma follow aerial perspective in all three: far is high-lightness low-chroma, mid is the chroma peak, near is dark and only moderately saturated. Direction is signed so split-hue's two mirrors are genuinely different palettes. Unchanged by Phase 7 apart from emitting `uiTint`. In banded mode three deliberately-generated stops read as three distinct bands rather than a smooth gradient — that is the mode working, not something to fix.

## 7. Persistence (localStorage)
Two keys: `svg-landscape:state` for the scene/panel blob and `svg-landscape:theme` for the UI theme (theme.js owns the latter since Phase 2, must be readable before scene state loads). The scene blob is a strict superset of a settings export: export keys verbatim plus `seedLocked`, `presetName` and `tips`. Saving hooked to the panel's own post-change refresh; corrupt/hand-edited blobs fall back to defaults, mismatched-type values skipped. Factory defaults include Shadow on and tidelock engaged since 6.12, and Layers off since 7.

The type guard on restore (`plausible()`) is coarse by design — matching the factory default's type, since unknown *values* are already safe. `customPalette` is its one special case, having a factory value of `null` and no type to match; Phase 7 found and fixed a five-phase-old bug there (section 18) and it now accepts a theme-shaped object.

## 8. Settings export
Downloadable JSON of all control values including seed. Audited for completeness in Phase 5.12 (had drifted out of sync; section 18). One `SETTINGS_KEYS` list drives the export, the preset loader and the preset match test, so adding a control means adding its key there — **Phase 7 added `layersMode`** and both shipped presets gained the field (value `false`, matching what they were authored under). Caveat retained in help: seeded noise + identical settings gets close/near-identical, not always pixel-identical. **Note (Phase 6.14 consequence)**: with the clock face removing the numeric readout, the exported JSON is now the only place a user can read the exact hour value — matters for hand-authoring presets (which is currently the only preset authoring path, section 5's Presets panel).

## 9. Loading bar
Initial app/library load only, not per-generation.

## 10. Help, Read Me and About
Three in-app modals sharing one `<dialog>` implementation (`modal.js`, Phase 6.6). Native `showModal()` so Escape-to-close, focus handling, page-inert all come from the platform. Explicit Close controls at both ends because click-outside is keyboard-unreachable.

All three render markdown through `src/markdown.js` (Phase 6.9), and all three are sourced from `.md` files via Vite's `?raw` since Phase 6.11. `help.js` holds modal wiring and nothing else — no copy for any of the three.

- **Help** — control explanations for end users, seed/reproducibility caveat, Tips-toggle location. Copy in `src/help/help.md`.
- **Read Me** — `README.md` via `?raw`. Button labelled "readme.md" since 6.12.
- **About** — `src/about/about.md`. Real hand-written content since 6.11 (verify wording against the file directly).

Layout: each modal is a flex column, shell set to `overflow: hidden`, body sized as remaining space (`flex-1 min-h-0`). Exactly one scrollable region per modal — see section 18 for the double-scrollbar bug this replaced. `display: flex` must be gated on `[open]` (author `display` beats the UA's `dialog:not([open])` rule). Scroll region carries `tabindex`; scrollbar themed from the same tokens as elsewhere.

## 11. Accessibility / SEO
- Semantic landmarks (header/main — no footer since 6.12)
- ARIA labeling on custom controls — **Phase 6.14 built the Time of day clock face's ARIA (`role="slider"`, `aria-valuetext`) with the control rather than deferring it**, so that specific control is already Phase 8-compliant
- Full keyboard operability — clock face has arrow/Shift+arrow/PageUp/PageDown/Home/End since 6.14
- Contrast-checked in both UI themes — **still Phase 8's job (renumbered from Phase 7 in the 6.14 renumber)**. Phase 6.12 measurements as the floor: text/raised 6.4:1, text/base 4.9:1, muted/raised 4.6:1, accent/raised 4.7:1, border/base 3.1:1, panel input fg/bg 5.6:1, panel button fg/bg 4.1:1 (weakest, where the mid-gray band bites). Phase 6.13 brightened `--surface-raised` above this — new numbers to be re-measured in Phase 8 rather than reproduced from memory. **Phase 7's UI tint is deliberately shaped to keep this audit the same size**: three tokens take a tint, and the tint holds each token's own lightness, so the audit is still one lightness per token per UI theme plus the small luminance shift added chroma carries — not a worst-case sweep across eight themes and the randomiser. Verify that claim rather than inherit it; the tints are per-theme literals in `themes.json` and each is one value to check.
- `prefers-reduced-motion` respected for load bar / transitions
- Meta title, description, OG tags on the single page
- Desktop-first layout, responsive breakpoints for narrower viewports

## 12. Deployment
GitHub repo → Vite build → GitHub Actions → GitHub Pages. No manual dist commits.

## 13. Out of scope
No backend, accounts, analytics, server-rendered content, or security surface beyond static hosting.

## 13a. Per-archetype quality variation policy
An effect correctly implemented per spec but reading well on some archetypes and weakly on others is not a bug and not tracked in section 18. Post-MVP polish (per-archetype tuning), not a defect. Only cross-archetype defects belong in section 18.

## 14. License
MIT.

## 15. README
Root-level, rewritten in Phase 6.11 to narrower scope — standard open-source orientation only (features, live demo, quick start, stack, structure, deploy note, pointers to Help and this file, license). Roughly a tenth of its previous length. Per-control detail lives in `src/help/help.md`, decision history lives here. As of 6.6 also user-facing via the readme.md modal, so accuracy matters. Rendered as markdown since 6.9 — has to stay within `markdown.js`'s subset (section 2 / 10). Live demo URL real since 6.9.

## 16. Claude Code operating scope
CC runs from repo root with standing permission to execute bash/git/npm/vite. Since Phase 6.7, **CC maintains this file directly** — edits described in a phase prompt are applied to CONTEXT.md as part of that phase, not relayed through chat and pasted. Replaced a relay that failed silently for phases 6/6.5/6.6.

**Two failure modes learned since:**
1. Edits authored against a stale copy of this file silently revert CC's own corrections (Phase 6.8). Rule: **edit the file as it currently stands in the repo.**
2. Intended-state prose written ahead of a phase can be wrong in ways that only surface when CC actually builds against it (Phase 6.12 had three sentences wrong; 6.13 surfaced misunderstandings caught in one phase rather than several because the trial-not-commit shape gave room to fail cheaply). Keep writing intended state ahead of phases; keep reconciling it afterwards.

**Phase 7 has landed and section 17's entry has been reconciled against what was actually built** — four corrections are recorded there rather than quietly edited away, which is the point of keeping the pre-phase prose long enough to check it. The same applies to the Phase 8 note below it.

## 17. Next step — phased CC prompt breakdown

Phases 1 through 7 complete. Renumber note: **Phase 7 is the theme system rebuild**; the previous "Phase 7" (accessibility/SEO/responsive/final polish) moved to Phase 8. Renumber done at the end of Phase 6.14 in anticipation of Phase 7 being genuinely large, which it was.

1–6.14. [History summarised in prior versions of this document; see git log for detail.] The most recent phases:
- 6.10. Right-edge rendering artifact closed on confirmed root cause (fractional-DPR compositing, not geometry). See section 18.
- 6.11. Help re-sourced to markdown file; README rewritten to conventional scope; About given real content.
- 6.12. Eight independent changes: inset ring, default lighting state, Tweakpane input borders, footer removal + header GitHub icon + build hash, "Read Me" → "readme.md", Tips-off default corrected, Presets-Custom confirmed, light mode moved to 40–60% gray band. Zero console errors across every check.
- 6.13. Light-mode raised surfaces brightened optically. Sun colour ramp (asymmetric, sunset richer than sunrise). Moon size near horizon in-scope-if-trivial. Time of day dial trialled via `@tweakpane/plugin-camerakit` alongside the slider — trial surfaced that no off-the-shelf rotary suited a 24-hour cyclic value.
- 6.14. Time of day replaced by a hand-drawn SVG 24-hour clock face (`src/clockface.js`) as the first control in Lighting. Linear slider and camerakit dial both removed, `@tweakpane/plugin-camerakit` uninstalled with them (net dependency change: −1). Noon at top, clockwise, cardinal points exact. No numeric readout — visual-first design with an acknowledged consequence (section 5). Midnight wrap trivial (atan2). ARIA and keyboard operability built alongside rather than deferred. Placement bug surfaced and fixed (Tweakpane blade-index counting only its own children). Phases renumbered from 6.14 forward.

7. **Theme system rebuild — landed.** Themes migrated from a hardcoded array in `palette.js` to `src/themes.json` (section 6d), each gaining a declared `uiTint` that feeds a new interface-tint mechanism (section 5). A **Layers** toggle in the Color folder selects between the continuous ramp and a new banded mode, where each layer takes one of the theme's three stops flat by region; all nine archetypes declare their own `LAYER_BOUNDARIES` (section 3). Color depth gains a mode-appropriate second meaning in banded mode. **Desert** ships as the demonstrator. No new dependency; net change to `package.json` was zero.

    **Verified**: all seven original themes render **bit-identical** in continuous mode, before and after the migration — 99 fixed-seed artefacts per pass (nine archetypes × seven themes, a Color-depth sweep, and a raw ramp dump at 7 slider positions × 21 depths), diffed at three points during the phase. Layers off is the default on cleared localStorage. Both presets load and the dropdown still matches them. Zero console errors anywhere.

    **Four corrections to the intended-state prose this entry replaced**, kept rather than quietly edited away (section 16's second failure mode):
    - *"The mode branch is one call site: wherever `render.js` calls `terrainAt(depth)`."* The branch is in `palette.js` instead, one level upstream. `render.js` was not modified at all — it still calls `palette.terrainAt(layer.depth)`, and depth is everything either mode needs. Stronger version of the same claim.
    - *"Fractional boundary values… resolved to integer indices at render time."* They are compared against `depth` directly; no index resolution exists. Indices would have to be recomputed per scene because layer counts move with Peak count, elevation and canvas width.
    - *"Archetypes where the concept doesn't apply (Stacked Ridges, Twin Peaks) can declare boundaries putting everything in `mid`."* Both declined the escape hatch after their geometry was actually looked at — Stacked ridges is the most legibly ordered stack in the project and bands beautifully; Twin peaks' pair/ridge/foreground *is* three distances. The renderer still supports all-one-band; nothing uses it, and it needs `foregroundFrom` **above** 1, not at it.
    - *"Valley mist becomes visibly stepped at region boundaries."* True in principle — `mistTone()` derives from a layer's own fill, so layers in a band mist identically — but it is not a new effect: within a band the layers are the same colour, so the "steps" fall exactly on the silhouettes that were already visible. Nothing to soften.

    **What actually took the thought** was the boundary values, exactly as the prompt predicted. The recurring lesson, learned by rendering rather than reasoning: *layer count and frame area are different measures*. Mountain top's `foregroundFrom` looked self-selecting at 0.9 ("the one rolling hill") and rendered as a sliver, because that hill's crest sits at 1.06 × canvas height and the ridge bands above it are spaced by an accelerating curve — 0.75 restored the proportion. Dominant peak and Twin peaks moved from 0.9 to 0.7 for the same reason. Gorge went the other way, 0.8 → 0.9: its nearest wall covers most of the lower frame regardless, so a wider foreground band only ate the terraced strip that is the only place the middle band shows. V valley's are the fussiest — both values are set to fall *between* left/right spur pairs, because a boundary landing mid-pair splits the interlock into a staircase of colour changes. Valley floor's are pinned to its own depth constants (bands end at exactly 0.3) and produce the cleanest three-part read in the set.

    **Two things to keep an eye on rather than act on:**
    - Desert's ramp runs dark-to-pale, inverting aerial perspective in continuous mode. Checked in the app; it reads as a lit desert, not a mistake. Revisit only if a second Layers-first theme lands and the pattern needs a convention.
    - "Randomise" now sits beside a `themes.json` a user can edit trivially, so its role shifts from "the only source of variety" to "a novelty generator." Not a decision for now.

    **A five-phase-old bug surfaced and was closed on the way** — restoring a randomised palette never worked (section 18).

8. *(Was previously Phase 7; renumbered at end of 6.14.)* Accessibility, SEO, responsive pass, final polish. ARIA labelling on remaining custom controls (clock face's already built, Phase 6.14). Full keyboard operability audit (clock face passes already). Contrast check in both UI themes against Phase 6.12/6.13 values (measured floors in section 11). `prefers-reduced-motion` respected. Meta/OG tags replacing scaffold placeholders. Responsive behaviour below ~1024px — genuinely untested territory since every verification through Phase 7 has been desktop-width only. The contrast audit now covers three tinted tokens (Phase 7, section 5). Because the tint holds each token's lightness, the audit shape is **not** "worst case across eight themes and the randomiser" as this entry previously assumed — it stays per token per UI theme, plus a check that the added chroma's luminance shift doesn't move a borderline pair. Confirm that before relying on it.

## 18. Known issues

**Open**
- *(None as of Phase 7.)*

**Closed**
- **Randomised palettes never survived a reload.** `state.js`'s `plausible()` guard accepted `customPalette` only as `null` or an array — with a comment saying "an array of colours" — but `generatePalette()` has returned an *object* (`{ id, name, strategy, terrain }`) since Phase 5. Every restore from localStorage, and every preset carrying a generated palette, failed the check silently and was skipped; `activeTheme()` then lazily drew a *fresh* random palette, so a returning visitor got a different one from the one they left, and the app looked like it had merely re-randomised. Found in Phase 7 while adding `uiTint` to that same shape. Fixed by accepting a theme-shaped object, plus a matching object branch in `sameValue()` so a preset carrying a generated palette can't load correctly and then immediately report itself as "Custom". Verified live: terrain triple identical across a reload.
- Canvas frame's 1px inset ring never painted (`@layer base` box-shadow beaten by Tailwind's `shadow-sm` utility because layers resolve before specificity). Diagnosed via `getComputedStyle`. Fixed in Phase 6.12 by moving to Tailwind's `inset-ring-1` utility which composes with `shadow-*` through `--tw-inset-ring-shadow` — verified both present in computed `box-shadow` in both themes. Same lesson applied inversely to Tweakpane input borders written unlayered because Tweakpane's stylesheet is unlayered.
- Two/three scrollbar tracks on the modals. Two independent causes plus a third horizontal one. Read Me: nested scrolling `<pre>` inside scrolling body. All three: `70dvh` body cap vs `90dvh` dialog cap plus default `<dialog>` `overflow: auto`, showed up below ~560px viewport height (About: ~460px). README table overflow: third horizontal track. Fixed in Phase 6.9 by making the shell a clipped flex column with body as remaining space, verified at six viewport heights from 1000px to 360px; tables wrapped rather than scrolling.
- Presets panel documented position wrong ("between header and canvas frame" vs actual top-of-left-column since 5.7). Closed in 6.7 by correcting documentation to the working, unchanged UI.
- Star field distorting with elevation and aspect. Not shape distortion — pattern redistribution: `starField()` placed stars as fractions of `horizonY` and `width`, both of which move. Fixed in 6.5 by generating against a fixed reference frame (widest aspect × canvas height) and clipping. Bit-identical star lists across elevation sweep, every aspect's field a strict subset of the widest. Cost: field covers full frame height, night scene has ~2× circles, widest-aspect export grows ~7%.
- Preset matching broken by an ulp. Tweakpane's step constraint has `origin` fixed at construction time, so values written through a moved slider can land ulp-off. `currentPresetId()` `===` comparison dropped matching scenes to "Custom". Closed 6.5 with 1e-9 tolerance in `sameValue`. Doesn't change what Tweakpane writes, only what `currentPresetId` accepts.
- Canvas fit/sizing bug (bars on aspects without them). Not the earlier width fix — vh-relative max-height cap binding at typical viewport heights, forcing 16:9 into too-short frame. Fixed 4.6 with fixed 740px cap.
- Tweakpane panel not following UI light/dark theme. Fixed 4.6 via `--tp-*` custom properties keyed off `theme.js`'s `dark` class.
- Image not reaching frame edge. Not rounded corners — frame's 1px border insetting the content box for `aspect-ratio` resolution. Fixed by replacing border with inset ring (which then had its own bug — see the ring/shadow-sm entry above).
- **Right-edge vertical band** (5.11 raised, closed as not-reproducing; 6.10 reopened, closed on confirmed root cause). **Not the geometry**: 720 combinations, every crest polygon reaches x=0 and x=W exactly, worst-case gap 0.0000. Rendered SVG clean at edge, 45 archetype×aspect scenes rasterized clean. **Exported file never affected** — only the on-page preview. **Actual cause**: full-canvas shapes ending on the viewBox edge + outermost `<svg>` clipping to element box → shared edge/clip boundary antialiased twice at fractional devicePixelRatio, frame's `bg-surface-sunken` backdrop filling the doubled column. Confirmed via magenta backdrop test. **Trigger**: fractional effective devicePixelRatio (OS scaling 125/150/175% or browser zoom) + viewport width putting the frame edge off the device grid. Right-edge-only because the fixed 16px gutter puts the left edge on-grid. Reproduces in VS Code's Simple Browser (introduces fractional scale) but not standalone Firefox at 2x (integer). **Fix (6.10)**: `EDGE_BLEED` in `utils.js` carries full-canvas fills past viewBox on all four sides (polygons + sky/haze/valley-mist rects, never the crest line so shadow splits and mist anchors are untouched), plus `overflow: visible` on `#landscape` so the frame does the clipping — one antialiased edge instead of two. Sky and haze gradients moved to `userSpaceOnUse` so bleeding wouldn't stretch the ramp. **Measured**: 45 scenes before/after — edge-column distance from scene colour median 109→28.5, p90 148→81, max 166→85. Chroma loss median 4→0, max 90→52. Zero console errors. **Regression**: exports identical except outermost row/column (the fix) plus ≤2/255 rounding shift from gradient-units change, isolated by re-running with bleed=0.
- Settings JSON export missing Lighting values. Escalated from Phase 6 to 5.12 and fixed since presets depend on export completeness.
- Nothing ever pushed to `origin` — ten local commits existed only locally, GitHub Pages had never deployed any of it despite phase reports. Fixed 5.13 with content-hash verification. CLAUDE.md's version-control-discipline rule (meant to prevent exactly this) had never been saved to disk either — also fixed.