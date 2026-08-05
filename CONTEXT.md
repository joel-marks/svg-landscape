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
  panel-a11y.js           Phase 8 — accessible names and slider roles for the panel's rendered DOM
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
  utils.js                 shared geometry helpers: feature-density/aspect width scaling, common spur/wall primitives used across archetypes, EDGE_BLEED (HISTORY.md, Closed issues)
  /archetypes
    open-valley.js, valley-floor.js, v-valley.js,
    gorge.js, in-gorge.js, mountain-top.js, stacked-ridges.js,
    dominant-peak.js, twin-peaks.js, desert-mesa.js
    index.js            registry mapping name -> generator module
/public                favicon, static assets
index.html               single page, semantic landmarks, meta tags. Header carries a top-right GitHub icon (inlined SVG) and the build-time git short commit hash from Phase 6.12 — the hash is a `__COMMIT_HASH__` constant declared in `vite.config.js`'s `define` from `git rev-parse --short HEAD`, evaluated once at build/dev-server start (falls back to `unknown` outside a git checkout rather than failing the build), and written into the header by `main.js`.
```

Each archetype module owns its own generation logic (not shared parameters over one generator) and exports `generate(params) -> geometryItems`. Every `generate()` signature accepts `elevation`, `peakCount`, and `sharpness` (see sections 5, 6a) even where a given archetype treats one as a no-op (e.g. Twin Peaks ignores `peakCount`) — keeps the schema stable as effects are extended to more archetypes later. **Layer ordering convention** (which Phase 7's Layers mode builds on): `layers[0]` is farthest from the viewer, `layers[layerCount-1]` is nearest — every archetype's `generate()` builds the array in that order, and every layer carries `index` and `depth` (0..1) as set by `ridgeLayer()` in `utils.js`.

**Second archetype export, added Phase 7**: `LAYER_BOUNDARIES = { backgroundUntil, foregroundFrom }` — two fractional depths saying where that archetype's own stack divides into background / middle distance / foreground for Layers mode (section 5). All ten declare one; the values differ per archetype and each module carries its own reasoning in a comment above the export. `state.js` reads it off the module per paint and passes it to `createPalette`; a module without one falls back to a generic `{ 0.25, 0.7 }` rather than failing.

## 4. Landscape types (seed list — carried from prior prototype naming)
Open valley · Valley floor · V valley · Gorge · In gorge · Mountain top · Stacked ridges · Dominant peak · Twin peaks · Desert mesa (Phase 7.5)

"V valley" and its former "rising" variant are merged into one generator driven by the elevation parameter (section 6a) rather than two separate archetypes.

## 5. Control panel — grouped logically

Entirely Tweakpane — title-less Pane instances, folder titles the only headings, no separate HTML/Tailwind panel chrome. One pane per column was the original rule; all three columns now stack two (Presets over Canvas/Scene on the left since 5.7, Actions over Preferences on the right since 6.6, Lighting over Color in the centre since the post-7.5 panel split). Renders below the canvas, not beside it (still required — X-Pan 2.71:1 and LinkedIn 4:1 rule out a side panel). Three columns:
- **Left** — Presets (its own pane, stacked on top), then Canvas, Scene
- **Centre** — Lighting, then Color — **one Pane instance each** since the post-7.5 panel split
- **Right** — Actions, then Preferences — **one Pane instance each** since Phase 6.6

Folders are collapsible (accordion). Header/nav side margins align with canvas and panel — one `.shell` class from 6.12 onward, header+main sharing it since the footer was removed.

**Input visibility (Phase 6.12)**: Tweakpane sliders/text/checkboxes get a pale 1px border via scoped overrides on Tweakpane's own classes (`.tp-txtv_i`, `.tp-ckbv_w`, `.tp-sldv_t::before`, `.tp-sldv_k::after`, `.tp-sglv_i`, `.tp-mllv_i`), coloured from `--tp-input-border-color` per theme. Written **outside every cascade layer** because Tweakpane injects its stylesheet unlayered and would beat any `@layer base` rule — the inset-ring bug with roles swapped (HISTORY.md, Closed issues). The slider rail takes a spread `box-shadow` since a border would consume its 2px `::before`.

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
- **Banded colors (toggle, Phase 7)** — off (default) is the continuous ramp every scene before that phase was drawn with; on gives each layer one of the theme's three stops flat, chosen by region (section 6d). Per-scene, not a preference: in `SETTINGS_KEYS`, exported, restored by presets (sections 7, 8). **Labelled "Layers" until Phase 8**, which found the name pointing at the wrong thing — every scene has layers in both modes, so a checkbox called Layers reads as an intensity control rather than a mode switch. Label only: the state key stays `layersMode` and exports, presets and the stored blob are byte-identical either side of the rename.
- Horizon haze (slider — horizon-level atmospheric band; opacity/spread only, tint owned by Lighting). Labelled "Distance haze" until the post-7.5 rename; label only, the state key stays `haze`, so exports, presets and the stored blob are unchanged.
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

**Phase 8 checked the tint end to end and found it working as designed.** The report of it being invisible had two candidate explanations — a missing stylesheet link, which `applyUITint()`'s silent no-op on a missing base would have hidden, or a mechanism that works and is simply subtle. It is the second. All three `-base` tokens are declared in both the `:root` and `.dark` blocks, all three consumed tokens default to their base, and `.tweakpane-scope` maps `--tp-input-border-color` from `--input-ring`; nothing was missing and nothing was wired. Read off `<html>` in the live app (Light UI theme): Sandstone mesa gives `--accent` #292f39, `--border` #47332b, `--tp-input-border-color` #715e57 against bases #0a3247 / #34383d / #575e66 — an unmistakable warm shift on both lines. Ink wash, the documented control case, gives #163143 / #35383b / #5d6368 — within a couple of steps of the base, desaturated rather than tinted, exactly as intended. Dark behaves the same: Sandstone #92b2c2 / #3e2d27 / #685a57 against #6fb7d4 / #27323b / #5f7586.

So the finding is **"works, too subtle to notice"**, and the reason is what the tinted tokens are spent on: two of the three draw 1px lines, and the third is an accent that deliberately keeps its own hue at a 0.18 ratio. Whether that is too subtle is a tuning decision, not a defect, and it was deliberately left alone in Phase 8 rather than retuned mid-audit — moving the ratios would have invalidated the contrast measurements taken against them.

Pseudo-3D and lighting are UX-independent of the UI chrome theme. Tweakpane's own panel chrome follows the UI theme via its `--tp-*` custom properties.

**Panel accessibility (Phase 8)** — `src/panel-a11y.js`, ~80 lines, is a post-pass over the DOM each Pane renders. Tweakpane puts a control's label in a sibling `<div class="tp-lblv_l">` rather than a `<label for>`, so every slider, checkbox, dropdown and number field reached the tab order with no accessible name; this copies the label's own text onto whatever in that row can take focus, and is re-run from `refresh()` so the two labels that change with state (POV when the archetype defers it, Light angle under the tidelock) stay in step. It also gives the slider *track* — a focusable div Tweakpane ships with no role, name or value — `role="slider"` plus a position read from the knob's own width percentage and an `aria-valuetext` read from the number field beside it. Folder headings get `aria-expanded`, kept in step through Tweakpane's `fold` event; the three modal-opening buttons get `aria-haspopup="dialog"`; the JSON preview, the one control with no label column to copy from, is named in `controls.js`. Focus indicators are a separate fix in style.css and are described in section 11.

## 6. Pseudo-3D / shadow model
Each hill/peak polygon is split into a light-side and dark-side sub-path along an internal ridge boundary — distinct from the silhouette boundary against the sky. Boundary position and shadow-side derived from the light source angle.

Light source angle is directly user-controlled, not slaved to time-of-day by default — the two are independent so shadow direction and sky mood don't fight each other. **Unless "Lock angle to time of day" is engaged**, in which case the current offset is captured and preserved as time-of-day changes ("tidelock"). While locked, the Light source angle slider is a read-only display of the derived value; disengaging returns direct manual control at the current locked position.

**New default state, Phase 6.12**: Shadow on, tidelock engaged, offset such that light source angle reads exactly 0° at time of day 05:40. `state.js` holds `ANGLE_ZERO_AT_HOUR = 5 + 40/60` and derives `DEFAULT_ANGLE_OFFSET = normalizeAngle(0 − suggestedAngle(ANGLE_ZERO_AT_HOUR))` via `lighting.js`'s exported `suggestedAngle` — same function the tidelock tracks, so the two can't drift. At 05:40 the moon branch supplies the direction: offset = 355°. At the unchanged default hour of 18.5, the panel opens with the angle reading 168°. Both first-visit defaults and Reset to defaults come from that one computation. Note that Time of day historically had a 0.1h step (6 min), meaning 05:40 wasn't reachable — 05:42 was the reachable step where the readout showed 0° — but with the clock face (Phase 6.14) replacing the slider, this stepping concern is now moot for the input side. Direct hex export still writes a numeric hour, so the offset math is unchanged.

## 6a. Point of view / elevation model
Global `elevation` (0–1) simulates viewer height. Meaningfully implemented across all archetypes except In Gorge (deferred edge case) — Desert mesa, added in Phase 7.5, is on the implemented side: elevation lifts the horizon by a third of the canvas, grows the dune field against the sand foreground, and damps the mesas' own height so a high horizon does not crowd them into the top edge. Reads well on some, weakly on others — that's per-archetype quality variation (section 13a), not a defect.

## 6b. Non-linear slider response
Shadow intensity and Valley mist run through a shared response-curve utility rather than being special-cased individually — displayed slider stays linear 0–1, a power/ease curve maps that to the value actually used. Shadow intensity gets more resolution at the low end; Valley mist is suppressed through most of its range and ramps near the top.

## 6c. Sun and moon appearance (Phase 6.13)
The sun disc and glow were a fixed colour at every hour prior to this phase. Position and glow radius already varied with the solar-altitude term; colour did not.

**Sun colour ramp**: hour-indexed, hand-tuned keyframes matching the `SKY` table's approach — pale near-white/warm-yellow through most of the day, subtly warmer gold near sunrise, richer red-orange near sunset. Deliberately asymmetric. Glow gradient sources from the same ramp so disc and glow can't disagree.

**Moon colour** unchanged. Moon horizon-size growth was in-scope-if-trivial; verify against `render.js` for what actually landed.

## 6d. Palette internals — what themes hand to the renderer

Documented here after being read directly for Phase 7's spec, rather than inferred from CONTEXT.md. Section 5 gives the user-facing behaviour of Theme preset, Color depth, Valley mist and Distance; this section describes how `palette.js` actually produces the per-layer colours those controls operate on.

**Themes are data since Phase 7.** `src/themes.json` — one file, not one per theme, because eight fit on a screen and cohesion is easier to judge at a glance. Each entry is `id`, `name`, `terrain: [far, mid, near]`, `uiTint`, and an optional `_note` carrying authorial reasoning (JSON has no comments; nothing reads these). Imported directly rather than via `import.meta.glob` — there is one file and naming it beats matching a pattern that can only match it — and written `import themeData from './themes.json' with { type: 'json' }`. The attribute is redundant for Vite and required by Node, and being importable in plain Node is what let the migration be verified by diffing rendered output before and after.

**Every theme is three ramp stops**, farthest ridge to nearest foreground. The middle stop matters: a straight interpolation from a pale far to a near-black near desaturates through grey, so a theme that should read as pine or sandstone needs its ramp bent through its own hue via the mid stop. Ink wash exists partly to prove the negative case — deliberately zero-chroma, so only the value spread does work; used as the honest test of Color depth. **Desert (Phase 7) is the one theme whose ramp runs dark-to-pale** — mesa brown, dune yellow, sand off-white — because it is authored for Layers mode, where the pale stop is the foreground sand. In continuous mode it therefore inverts aerial perspective; checked against the render rather than assumed, and it reads as a lit desert rather than as a mistake. **Phase 7.5 gave it the companion archetype it was named for** — Desert mesa, whose three built-in regions hand the three stops straight to the three parts of the scene (section 17). The theme was authored against a picture that did not exist yet and needed no retuning when that picture arrived.

**`uiTint` is declared, never derived.** An explicit hex per theme, not computed from the ramp: a derived tint would be one more thing that silently changes when a stop is retuned, and a per-theme literal is trivially auditable (section 11). The randomiser emits one too — `mid`, which is the chroma peak in all three strategies and therefore the only stop that reliably carries a generated palette's identity.

**`createPalette(theme, { colorDepth, layersMode, boundaries })`** returns a resolved palette with a `terrainAt(depth)` method, where `depth` is the 0..1 position of a layer in its scene's stack.

*Continuous mode (`layersMode: false`, default, unchanged since Phase 5):* the ramp is `chroma.scale(terrain).mode('lab')`; Color depth **never recolours it**, it only reshapes where each layer lands on it. Below 0.5 compresses toward the palette midpoint (at 0 every layer resolves to the mid colour — one flat silhouette mass); above 0.5 expands via a smootherstep (Ken Perlin's second-order, C² continuity) so the outermost layers don't visibly snap onto the endpoints as the slider approaches 1. 0.5 is the theme as authored.

*Banded mode (`layersMode: true`, Phase 7):* no ramp. A layer's `depth` is tested against the archetype's `LAYER_BOUNDARIES` (section 3) and it takes `far`, `mid` or `near` flat. Fractional boundaries compared against depth directly — **not** resolved to integer indices as the pre-phase intended-state prose in section 17 said; layer counts run 4 to 20+ and move with Peak count, elevation and canvas width, and depth is the axis that stays comparable. `foregroundFrom` is tested first, so a crossed declaration can't produce a gap. An archetype wanting everything in one band declares `foregroundFrom` **above** 1 (1.01), not at it — most archetypes' nearest layer has depth exactly 1 and `>=` would hand it `near`. Nothing exercises that today: all ten turned out to have a legible three-part structure, including the two the Phase 7 prompt offered the escape hatch to (Stacked ridges and Twin peaks both declined it, with the reasoning in their own files). Desert mesa (Phase 7.5) is the inverse case — it is *built* as three regions, so its boundaries fall in the gaps between them rather than being fitted to a continuum.

*Color depth in banded mode:* the same slider, mode-appropriate mechanism, no new UI. 0.5 is the three stops as authored; below mixes `far` and `near` toward `mid` in Lab, reaching one flat mass at 0 — the same end state continuous mode reaches, by a different route; above pushes them further from `mid`, up to 40% past the authored positions at 1. The push deliberately moves **lightness** and holds each stop's own **hue**, with chroma clamped to the authored range: extrapolating a hue past an endpoint invents a hue in neither colour, and lightness spread is what aerial perspective is made of anyway. This is what stops a saturated mid from throwing fluorescent bands at the top of the slider.

**The mode branch is one call site, and it is in `palette.js`, not `render.js`** where the Phase 7 prompt located it. `render.js` calls `palette.terrainAt(layer.depth)` exactly as it always has and needed no change at all — depth is everything either mode needs, so the method signature is the whole interface, and neither the paint object nor the archetype registry had to be threaded anywhere new.

**Two helpers on the same file feed the renderer beyond the base ramp.** `shade(color, amount)` produces the dark-side fill for the pseudo-3D split by mixing toward a cold near-black (`#070a10`) rather than pure black — shaded slopes read as terrain in shadow, not as holes. `mistTone(color)` derives the per-layer Valley mist wash from that layer's own fill, in LCH — lightness climbs toward a near-white, chroma clamped, hue untouched — so a warm ridge mists warm and a cold ridge mists cold. Both work on any hex regardless of which theme produced it, and both are unaffected by Phase 7's mode branch (section 17).

**Algorithmic Randomise** generates hue-related triples, never three independent random colours. Three strategies — complementary (180° opposite, ramp crosses neutral), analogous (32° window, quiet and naturalistic), split-hue (150° with the mid biased 0.68 toward the near for a saturated middle). Lightness and chroma follow aerial perspective in all three: far is high-lightness low-chroma, mid is the chroma peak, near is dark and only moderately saturated. Direction is signed so split-hue's two mirrors are genuinely different palettes. Unchanged by Phase 7 apart from emitting `uiTint`. In banded mode three deliberately-generated stops read as three distinct bands rather than a smooth gradient — that is the mode working, not something to fix.

## 7. Persistence (localStorage)
Two keys: `svg-landscape:state` for the scene/panel blob and `svg-landscape:theme` for the UI theme (theme.js owns the latter since Phase 2, must be readable before scene state loads). The scene blob is a strict superset of a settings export: export keys verbatim plus `seedLocked`, `presetName` and `tips`. Saving hooked to the panel's own post-change refresh; corrupt/hand-edited blobs fall back to defaults, mismatched-type values skipped. Factory defaults include Shadow on and tidelock engaged since 6.12, and Layers off since 7.

The type guard on restore (`plausible()`) is coarse by design — matching the factory default's type, since unknown *values* are already safe. `customPalette` is its one special case, having a factory value of `null` and no type to match; Phase 7 found and fixed a five-phase-old bug there (HISTORY.md, Closed issues) and it now accepts a theme-shaped object.

## 8. Settings export
Downloadable JSON of all control values including seed. Audited for completeness in Phase 5.12 (had drifted out of sync; HISTORY.md, Closed issues). One `SETTINGS_KEYS` list drives the export, the preset loader and the preset match test, so adding a control means adding its key there — **Phase 7 added `layersMode`** and both shipped presets gained the field (value `false`, matching what they were authored under). Caveat retained in help: seeded noise + identical settings gets close/near-identical, not always pixel-identical. **Note (Phase 6.14 consequence)**: with the clock face removing the numeric readout, the exported JSON is now the only place a user can read the exact hour value — matters for hand-authoring presets (which is currently the only preset authoring path, section 5's Presets panel).

## 9. Initial-load fade

Initial app/library load only, never per-generation — the scope this section has always described. **What implements it, as of Phase 8, is a fade rather than a bar.** Worth stating plainly: no loading bar was ever built. This section described one from Phase 1 onward and nothing in `src/` or `index.html` ever drew it, which went unnoticed because the app comes up fast enough locally that nobody missed it. Phase 8 found the gap while auditing animations and filled it with the thing the phase actually needed.

The mechanism is a **critical inline `<style>` in `index.html`'s `<head>`**, and it has to be inline: the whole point is to cover the window before `style.css` exists, so a rule living in that file could not do the job. `<body>` starts at `opacity: 0`, `main.js` adds `app-ready` to `<html>` as its last statement — after `regenerate()`, so what fades in is the finished scene rather than an empty frame — and a 200ms `opacity` transition carries it up.

Three things about it are load-bearing:

- **Failure-safe by construction.** The starting opacity is not an `opacity: 0` waiting on a class that a thrown exception would stop arriving. The same `html:not(.app-ready)` state carries a keyframe animation that runs at 2.5s and ends at full opacity; an animation beats the declaration it overlaps, so a module that errors before init — or never runs — costs the fade, not the page. Verified by aborting the JS bundle outright: body opacity 1, header visible. A `<noscript>` block covers scripting being off, where no animation is wanted at all.
- **Everything is scoped under `html:not(.app-ready)`,** which main.js clears. That is not tidiness: the block is *unlayered*, so it outranks every rule in style.css's `@layer base` regardless of specificity. The `a { color: inherit }` in it would otherwise beat both `.markdown a` and the header link's own hover for the life of the page.
- **Gated on `prefers-reduced-motion: no-preference`.** At `reduce` there is no starting opacity and no transition — the content simply appears (section 11).

**The second half of the same fix is the header's GitHub mark.** It is an inlined `<svg>` inside an `<a>`, and before Phase 8 it carried neither `width` nor `height`. With no stylesheet an `<svg>` has no intrinsic size, so the UA gave it the full width of its block parent, and `fill="currentColor"` resolved against the UA's own link colour — blue unvisited, purple visited. That is the large purple flash this section's fix removes. Measured either side, with the stylesheet held back 1.5s on the production build: **before**, body opacity 1, icon 1264×1264, colour `rgb(0, 0, 238)`; **after**, body opacity 0, icon 20×20, colour black. Explicit `width="20" height="20"` attributes match what `h-5 w-5` resolves to once CSS arrives, so nothing moves when it does.

## 10. Help, Read Me and About
Three in-app modals sharing one `<dialog>` implementation (`modal.js`, Phase 6.6). Native `showModal()` so Escape-to-close, focus handling, page-inert all come from the platform. Explicit Close controls at both ends because click-outside is keyboard-unreachable.

All three render markdown through `src/markdown.js` (Phase 6.9), and all three are sourced from `.md` files via Vite's `?raw` since Phase 6.11. `help.js` holds modal wiring and nothing else — no copy for any of the three.

- **Help** — control explanations for end users, seed/reproducibility caveat, Tips-toggle location. Copy in `src/help/help.md`.
- **Read Me** — `README.md` via `?raw`. Button labelled "readme.md" since 6.12.
- **About** — `src/about/about.md`. Real hand-written content since 6.11 (verify wording against the file directly).

Layout: each modal is a flex column, shell set to `overflow: hidden`, body sized as remaining space (`flex-1 min-h-0`). Exactly one scrollable region per modal — see HISTORY.md (Closed issues) for the double-scrollbar bug this replaced. `display: flex` must be gated on `[open]` (author `display` beats the UA's `dialog:not([open])` rule). Scroll region carries `tabindex`; scrollbar themed from the same tokens as elsewhere.

## 11. Accessibility / SEO

**Audited in Phase 8 rather than asserted.** Every claim below was measured in a real browser and the numbers are reproducible; where something still does not meet a target it says so and says why.

**Landmarks.** Semantic `header` / `main`, no footer since 6.12. The six panel containers are `<section aria-label="…">`; the canvas `<svg>` carries `role="img"` and an `aria-label` that `main.js` rewrites per render with the archetype and seed.

**Keyboard.** Tab reaches all 57 interactive stops across the seven panes in source order — header link, every folder heading, every tips trigger, every control, both Actions tabs, the preset dropdown and all three modal buttons — and each is operable there. Disabled controls correctly leave the tab order (the mist Distance slider, while Valley mist is 0). Modals open, take focus, scroll from the keyboard and close on Escape or either explicit Close control. **The clock face was already compliant** — 6.14 built its `role="slider"`, `aria-valuetext` and arrow / Shift+arrow / PageUp / PageDown / Home / End with the control rather than deferring them — and was excluded from the audit on that basis.

**Focus indicators — the one substantial failure the audit found.** Of those 57 stops, **50 had no visible focus indicator at all**. Tweakpane's own reset sets `outline: none` on every control it renders, and its stylesheet is injected *unlayered*, so the page's `:focus-visible` rule in `@layer base` never painted inside the panel. Fixed the way Phase 6.12 fixed the input borders, and for the identical reason: an unlayered block in style.css, `.tweakpane-scope .tp-*:focus-visible` (0,2,0) beating Tweakpane's own `.tp-*` (0,1,0). The ring is 2px of `--accent`, so it follows the scene-theme tint with everything else. Offsets differ by geometry — `-2px` for full-width controls that sit flush against a pane edge or inside an `overflow: hidden` button grid, `+3px` for the 2px slider rail, and the checkbox draws on its visible box via `.tp-ckbv_i:focus-visible + .tp-ckbv_w` because the input itself is a transparent overlay at `opacity: 0`.

**ARIA.** Accessible names on the panel's controls come from `src/panel-a11y.js` (section 5). Hand-rolled controls carry their own: the tips trigger has an `aria-label` naming its folder, `aria-expanded`, and `aria-describedby` pointing at the single `role="tooltip"` popover while it is open; folder headings carry `aria-expanded`; the modal-opening buttons carry `aria-haspopup="dialog"`; each dialog is `aria-labelledby` its own heading.

**Flagged as Tweakpane-internal, not fixed:** the Actions tab strip. Its two buttons are named, reachable and operable, but they are plain `<button>`s rather than a `tablist`/`tab`/`tabpanel` set. Adding those roles without the arrow-key navigation the pattern requires would announce a contract the widget does not honour, and adding the navigation means reaching inside Tweakpane's own tab controller.

**Contrast, both UI themes.** Re-measured against current tokens — 6.13 moved `--surface-raised` after the 6.12 floors were taken, and Phase 7 added tint to three tokens. Measured off the computed values on `<html>` and `.tweakpane-scope` so the tint is included rather than reasoned about, across all eight scene themes in both UI themes. **Full table in HISTORY.md (Phase 8 contrast audit).** Summary: every text pair clears 4.5:1 and every interactive boundary and focus indicator clears 3:1, at the values below.

- Light: text/raised **10.34**, text/base **4.90**, muted/raised **7.36**, accent/raised **7.55**, border/base **3.12**, panel input fg/bg **9.19**, panel button fg/bg **7.04**, input ring/container **3.18**, focus ring/panel button **5.14** (the weakest focus pair).
- Dark: **14.58 / 16.00 / 6.52 / 7.60 / 1.43\* / 16.00 / 8.44 / 3.18 / 4.40**.

**Three token moves, all minimal and all lightness-only** (the 6.13 approach — hue and saturation held, the scale's shape preserved): `--input-ring-base` light `#5b636b` → `#575e66` (39% → 37% lightness; it was calibrated by eye to ~2.9:1 and measured 2.96:1 against the container behind a row, just under 3:1), and dark `#4e5f6d` → `#5f7586` (37% → 45%; 2.32:1 against the same). **That dark move is the only change the dark theme has taken in the project's history**, made because it did not pass, not because it was being tidied; the rest of the `.dark` block is byte-identical.

Two pairings were also retired rather than retuned, because the token was not the defect: markdown code and `pre` backgrounds moved from `--surface-sunken` (the letterbox-bar colour, 3.54:1 under body text in light) to `--surface` (4.90:1), and the modals' two Close controls stopped using `--border` as a component boundary — it is the decorative-rule token and sits at 1.3:1 in dark — in favour of `--input-ring`, dropping a fill that was doing no work at 2.13:1 and 1.19:1 against the dialog.

**\*The one exemption, stated rather than hidden:** `--border` against the dark surfaces, at 1.30–1.44:1. It now draws separators only — header rule, canvas frame ring, modal rules, table and blockquote borders, tips popover outline — and WCAG 1.4.11 covers what is required to *identify a component or its state*, which a rule between two regions is not. The single interactive use was moved out in this phase specifically so the exemption is honest. Light mode passes anyway at 3.12 and 6.59.

**The Phase 7 tint claim is confirmed, not inherited.** Across all eight themes and both UI themes, the largest movement any tint causes to any measured pair is **0.08**. Holding each token's lightness through the mix keeps the audit one lightness per token per UI theme, exactly as section 5 said it would.

**`prefers-reduced-motion`.** Everything that moves is gated. The initial-load fade (section 9) is declared inside `@media (prefers-reduced-motion: no-preference)`, so at `reduce` there is no starting opacity at all. Everything else — the modal buttons' 0.15s colour transition, the tips trigger's opacity, and Tweakpane's own 0.2s folder expand — is clamped by the `@media (prefers-reduced-motion: reduce)` block in `@layer base`. That block reaches Tweakpane's unlayered rules because it is `!important`: important declarations reverse layer precedence, so a layered `!important` beats an unlayered normal declaration. Verified under emulation rather than assumed — the folder transition reads 0.2s at `no-preference` and 0.00001s at `reduce`. No CSS animation is declared anywhere in the steady state.

**Responsive.** Desktop-first, three breakpoints. **≥1024px** three columns (unchanged), **640–1023px** two, **<640px** one. Before Phase 8 the layout fell straight from three to one at 1024px, which made the 768px range the worst width to use the app at. Verified at 1024 / 768 / 414 / 375 in both UI themes: no horizontal scrollbar anywhere, canvas frame full usable width at each, header intact, modals fitting the width axis with one scroll region and no horizontal scroll inside it, tips popovers clamped inside the viewport at every width. **Touch targets** raised below 640px by lifting Tweakpane's own `--tp-container-unit-size` from its 20px default to 28px — 20px is a comfortable desktop density and 4px under what WCAG 2.2 asks of a touch target; one variable covers the whole panel, and the desktop density every screenshot in this project's history was judged against is untouched. The tips trigger is widened to match, being this project's own element.

**Meta / SEO.** Title, description, canonical URL, per-scheme `theme-color`, and full Open Graph plus Twitter card tags — no scaffold placeholders remain. The OG image is a real 1200×630 render (`public/og-image.png`), referenced absolutely because crawlers do not resolve relative URLs.

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

**Phase 7 has landed and section 17's entry has been reconciled against what was actually built** — four corrections were recorded there rather than quietly edited away, which is the point of keeping the pre-phase prose long enough to check it. Phase 8 archived that entry to HISTORY.md and did the same for its own.

**Permissions, corrected in Phase 8.** `.claude/settings.json` carries the standing permissions this section describes as three broad rules — `Bash`, `Edit`, `Write` — plus `WebSearch` and two `Read` globs for the offline harness's browser cache, against a `deny` list that keeps `rm -rf`, `sudo` and `.env` reads out regardless. It had also accumulated roughly 150 auto-recorded one-off entries, every one of them already covered by `Bash`; those are gone, `.claude/settings.local.json` is now in `.gitignore` (it was never tracked, so nothing needed removing from the index) and its own accumulated list is cleared.

**The broad rules were not wrong — but they do not stop the accumulation.** New narrow entries appeared in the tracked `settings.json` *during* Phase 8, for commands the broad `Bash` rule already allowed and which ran without prompting. So the file will drift again, and the drift lands in a tracked file where it shows up as commit noise. Recorded here rather than worked around: the durable fix is for recordings to land in the now-ignored local file, which is not something this project controls.

## 17. Next step — phased CC prompt breakdown

**Phases 1 through 8 complete — the planned build is finished.** Renumber note: **Phase 7 is the theme system rebuild**; the previous "Phase 7" (accessibility/SEO/responsive/final polish) moved to Phase 8. Renumber done at the end of Phase 6.14 in anticipation of Phase 7 being genuinely large, which it was.

Nothing is scheduled after Phase 8. The two things Phase 8 left as decisions rather than work: whether the scene-theme UI tint should be less subtle (section 5 — measured, working, and deliberately not retuned), and whether the Actions tab strip is worth full `tablist` semantics given what that costs (section 11).

1–6.14. Complete. Per-phase history archived in HISTORY.md (Phase log).

7. **Theme system rebuild — landed.** Themes moved to `src/themes.json` as data, each declaring a `uiTint` that feeds the interface-tint mechanism (sections 5, 6d); a banded colouring mode joined the continuous ramp, with every archetype declaring its own `LAYER_BOUNDARIES` (section 3); Desert shipped as the demonstrator. No new dependency, and all seven original themes verified bit-identical in continuous mode either side of the migration.

    Full entry — including the four corrections to the intended-state prose it replaced and the boundary-tuning notes — archived verbatim in HISTORY.md (Phase log, archived Phase 8).

7.4. **Documentation split — landed.** History moved out of this file into HISTORY.md (append-only archive: phase log, twelve closed issues, superseded 6.12 contrast measurements), read on demand rather than every session. CLAUDE.md gained a Project documentation section codifying the split, the edit-as-it-stands rule, and verbatim archiving. Docs-only; no code changed. The Phase 7 entry above, including its four-corrections block, deliberately remains here until Phase 8 lands.

7.5. **Desert mesa archetype — landed.** The tenth archetype, and the demonstrator Phase 7's Desert theme was authored for. Three regions with genuinely different silhouettes rather than one terrain idea varied across a stack: three mesa layers, three dune layers, two sand layers — eight in all, and fixed, which is what lets every layer's depth be a known constant.

    **The mesas are the part the noise pipeline could not produce.** Ridged fbm folds noise through `1 - |n|`, so every local maximum is a point; a mesa is the opposite shape. The silhouette is therefore explicit trapezoids — level caprock, straight side faces, a wider low talus skirt under each — combined with `Math.max` rather than summed, because summed bumps round each other's tops off and put the peak back. Noise is demoted to roughening, weighted away from the caprock: 0.05 of the amplitude on top, 0.16 on the pan between formations. `peakCount` sets the formation count, decreasing as the layers come forward so three layers of rock cannot stack into one continuous wall. `sharpness` drives cliff steepness through a single number — the fraction of a formation's half-width given over to its side — where 0.42 is a weathered slope with rounded shoulders and 0.12 a near-vertical face with the trapezoid's corners left intact.

    **Dune asymmetry shipped.** Long windward slope, short steep leeward face, produced by domain warp: the sample coordinate is displaced by the field's own value before it is read, one extra noise evaluation. `sharpness` scales that warp rather than ridge weight, because these are deliberately the softest silhouettes in the project and the control that makes every other archetype pointier had to do something else here. The warp is signed one way per scene rather than per crest — dunes facing both ways in one frame read as noise, which is exactly what they would be.

    **Boundaries: `backgroundUntil: 0.36`, `foregroundFrom: 0.79`.** Depths run k/7, so the three regions occupy 0–0.286, 0.429–0.714 and 0.857–1, and both values sit at the midpoint of the gap between two runs. This is the one archetype where the arithmetic answer is also the rendered one, because here the regions are *built* as regions rather than read out of a continuum after the fact. **Neither number moved during tuning, and that is the finding rather than a shortcut taken.** Phase 7's lesson — layer count and frame area are different measures — lands somewhere else in this archetype: the boundaries decide only which stop a layer takes, while how much *frame* each band covers is set entirely by the baseline schedule, so everything the renders actually corrected was amplitude and spacing. Three things needed it, all found by looking rather than by reasoning: the dune layers were invisible at the amplitude first chosen (the spacing between their ground lines exceeded their own relief, so each was hidden behind the next); the three mesa layers stacked into one continuous wall until the formation count was made to *fall* as the layers come forward; and the sand region's upper edge rendered as a ruled horizontal line across the frame until its amplitude was roughly tripled — the one place in the scene where near-flat stopped reading as ground. A fourth, at the top of the elevation range: mesas keeping full height off a horizon lifted a third of the canvas crowd the top edge, so their amplitude now damps with elevation.

    **Shadow-split observation (section 13a).** Flat tops turn out to be the easy case rather than the hard one: a level facet's normal points straight up, so plateaus stay lit whenever the light is above the horizon, one cliff face shades and the other does not, and the read is the intended one without any special-casing. The genuine limitation is elsewhere. `render.js` discards shaded runs shorter than `line.length / 90`, and a cliff's run length is `90 × edge × halfWidth` of the sample count *regardless of Complexity* — so a sufficiently narrow cliff can never take shading at any detail setting. The `edge` floor of 0.12 keeps ordinary scenes clear of it; at high Peak count on the widest canvases the formations get narrow enough that some faces go unshaded. Recorded rather than designed around: the shadow system is not being rebuilt for one archetype.

    **Shared files: none changed** beyond the two registry lines in `archetypes/index.js`. No helper was added to `utils.js` — the plateau primitive stays private to the module until something else actually needs it. Verified rather than asserted: all nine existing archetypes render **bit-identical** before and after, at a fixed seed, in two configurations each (continuous / Alpine dusk / Cine and banded / Desert / 4:3).

    **Verified in a real browser** as well as through an offline render harness. Desert mesa is the tenth dropdown entry; selecting it changes `archetype` and nothing else, checked as a whole-export diff either side of the one dropdown change, so there is no coupling to the theme or the Layers toggle. Download SVG's paths are identical to the live preview's, with the viewBox carried and the file standalone; Download JSON carries `archetype`, `layersMode` and the seed; a reload restores a byte-identical scene from localStorage and the Presets dropdown correctly reads "Custom". Ten archetypes × five aspects × both colouring modes render without throwing. 180 extreme combinations (elevation × peakCount × sharpness × complexity × aspect) produce no NaN, no inverted depth order, no frame-edge gap, and always eight layers. Zero console errors or warnings throughout. Judged visually against Desert and Ink wash, banded and continuous, at 4:3, Cine, X-Pan and LinkedIn 4:1.

8. **Accessibility, SEO, responsive, final polish — landed.** *(Was previously Phase 7; renumbered at end of 6.14.)* The closing phase of the planned build: ten tasks, no new dependency, and nothing touching generation or rendering.

    **The uiTint diagnosis came out the way the prompt's second branch predicted.** Nothing was missing — all three `-base` tokens declared in both theme blocks, all three consumed tokens defaulting to their base, `--tp-input-border-color` mapped from `--input-ring` — and the values do move: Sandstone mesa takes `--border` from #34383d to #47332b and the input ring from #575e66 to #715e57 in light, with Ink wash landing within two steps of base as the documented control case. So: **works as designed, too subtle to notice.** Left alone rather than retuned, and deliberately so — the ratios are what the contrast measurements were taken against, and moving them mid-audit would have invalidated the numbers. Full hexes for both UI themes in section 5.

    **The largest single finding was the one nobody was looking for.** 50 of 57 tab stops had no visible focus indicator, because Tweakpane's unlayered reset sets `outline: none` on everything it renders and the page's `:focus-visible` rule lives in `@layer base`. Exactly the Phase 6.12 inset-ring lesson with the roles swapped, in a codebase that had already written that lesson down twice. Fixed the same way, unlayered. The related gap was names: Tweakpane renders a control's label as a sibling `<div>`, not a `<label for>`, so every slider, checkbox, dropdown and field reached the tab order anonymous — `src/panel-a11y.js` now copies the label text onto whatever takes focus and gives the slider track a real `role="slider"` with a value (section 5).

    **The contrast audit moved three token values and retired two pairings.** `--input-ring-base` in both themes, minimally and by lightness alone — including **the only change the dark theme has taken in this project's history**, made because 2.32:1 is not 3:1, not because it was being tidied. Markdown code backgrounds and the modals' Close controls stopped pairing tokens that were never sized for each other. `--border` against dark surfaces stays at 1.3:1 and is exempted in writing, with the reasoning and the one interactive use that had to move out first. Every measured ratio is in HISTORY.md; the summary and the exemption are in section 11.

    **Two pieces of intended-state prose turned out to be wrong**, both recorded rather than quietly corrected:
    - *Section 9 described a loading bar.* None was ever built — not in Phase 1, not since. The section had described a feature that did not exist for the entire life of the project, and nobody noticed because the app comes up fast enough locally that nobody waited. Phase 8 replaced the description with the initial-load fade it actually built.
    - *This entry previously assumed the tint audit might need a worst-case sweep and asked for the claim to be confirmed before being relied on.* Confirmed: across eight themes and both UI themes the largest movement to any measured pair is 0.08.

    **The FOUC had a specific cause, measured either side.** The header's inlined GitHub `<svg>` carried no `width`/`height`, so with no stylesheet the UA sized it to its block parent and `fill="currentColor"` resolved against the UA link colour. With the stylesheet held back 1.5s on the production build: before, icon 1264×1264 at `rgb(0, 0, 238)` on a fully visible page; after, 20×20 black behind an opacity-0 body. The fade that hides the window is failure-safe by construction rather than by a try/catch — verified by aborting the JS bundle outright (section 9).

    **Responsive was genuinely untested territory and mostly held.** The layout fell from three columns straight to one at 1024px; a two-column step at 640px is the whole structural change. At 1024 / 768 / 414 / 375 in both UI themes: no horizontal scrollbar, canvas full width, modals fitting, tips popovers clamped in-viewport. The one real defect was touch targets at 20px, fixed by lifting Tweakpane's own unit-size variable below 640px only.

    **Also landed:** the Layers toggle relabelled to **Banded colors** (label only — exports byte-identical); meta, canonical, per-scheme `theme-color`, OG and Twitter tags replacing the scaffold placeholders, with a real 1200×630 render as the social image; `.claude/settings.json` reduced to its broad standing rules with ~150 accumulated one-off entries removed and the local file gitignored (section 16 — the accumulation itself is flagged there as unfixed and not this project's to fix); help.md and README brought current, including a Time of day entry that had described the linear slider 6.14 removed.

    **Verified**: `npm run build` clean. Three consecutive Playwright runs of the 7.5 checklist — module-instance guard, dropdown counts, single-key coupling on an archetype change, SVG export matching the live preview, settings round-trip, all three presets loading and matching themselves, reload restoring the scene with the dropdown reading "Custom", modals opening and closing from the keyboard — all clean, zero console errors or warnings. Fixed-seed renders of four archetypes × both colouring modes, hashed against a detached worktree at the pre-phase commit: **eight of eight bit-identical**, so nothing here reached the generator.

## 18. Known issues

**Open**
- *(None as of Phase 8.)* Two Phase 8 observations are deliberately **not** entries here, both being decisions rather than defects: the UI tint reading as too subtle (section 5) and the Actions tab strip lacking `tablist` semantics (section 11).

**Closed** — twelve entries as of Phase 7.4, archived verbatim in HISTORY.md (Closed issues).
