# SVG Landscape Generator — History

Append-only archive. Entries here were moved verbatim from CONTEXT.md, each noting the phase in which it was archived. Do not read this file at session start — read it only when a phase prompt directs you to, or when a CONTEXT.md pointer for the area you are touching refers here. Never rewrite or delete entries; corrections are appended, not edited in.

## Phase log

*Archived Phase 7.4 — moved verbatim from CONTEXT.md section 17.*

1–6.14. [History summarised in prior versions of this document; see git log for detail.] The most recent phases:
- 6.10. Right-edge rendering artifact closed on confirmed root cause (fractional-DPR compositing, not geometry). See section 18.
- 6.11. Help re-sourced to markdown file; README rewritten to conventional scope; About given real content.
- 6.12. Eight independent changes: inset ring, default lighting state, Tweakpane input borders, footer removal + header GitHub icon + build hash, "Read Me" → "readme.md", Tips-off default corrected, Presets-Custom confirmed, light mode moved to 40–60% gray band. Zero console errors across every check.
- 6.13. Light-mode raised surfaces brightened optically. Sun colour ramp (asymmetric, sunset richer than sunrise). Moon size near horizon in-scope-if-trivial. Time of day dial trialled via `@tweakpane/plugin-camerakit` alongside the slider — trial surfaced that no off-the-shelf rotary suited a 24-hour cyclic value.
- 6.14. Time of day replaced by a hand-drawn SVG 24-hour clock face (`src/clockface.js`) as the first control in Lighting. Linear slider and camerakit dial both removed, `@tweakpane/plugin-camerakit` uninstalled with them (net dependency change: −1). Noon at top, clockwise, cardinal points exact. No numeric readout — visual-first design with an acknowledged consequence (section 5). Midnight wrap trivial (atan2). ARIA and keyboard operability built alongside rather than deferred. Placement bug surfaced and fixed (Tweakpane blade-index counting only its own children). Phases renumbered from 6.14 forward.

*Archived Phase 8 — moved verbatim from CONTEXT.md section 17, where 7.4 deliberately left it until Phase 8 landed.*

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

    **A five-phase-old bug surfaced and was closed on the way** — restoring a randomised palette never worked (HISTORY.md, Closed issues).

## Closed issues

*Archived Phase 7.4 — moved verbatim from CONTEXT.md section 18's **Closed** subsection. Twelve entries, in their original order.*

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

## Phase 8 contrast audit

*Written Phase 8. The full table CONTEXT.md section 11 summarises. Measured in a real browser off the computed tokens on `<html>` and `.tweakpane-scope`, so the scene-theme tint is included rather than reasoned about. Eight scene themes were measured in each UI theme; the two columns shown are the extremes — Ink wash, whose tint is deliberately neutral, and Sandstone mesa, the most chromatic — with the spread giving the whole eight-theme range for that pair.*

Post-fix values. Three tokens moved in this phase: `--input-ring-base` in both themes, and the markdown code background and modal Close controls stopped pairing tokens that were never sized for each other (section 11).

| Pair | Target | Light (Ink wash) | Light (Sandstone) | Light spread | Dark (Ink wash) | Dark (Sandstone) | Dark spread |
| --- | --- | --- | --- | --- | --- | --- | --- |
| text / surface-raised | 4.5:1 | 10.34 | 10.34 | 0.00 | 14.58 | 14.58 | 0.00 |
| text / surface-base | 4.5:1 | 4.90 | 4.90 | 0.00 | 16.00 | 16.00 | 0.00 |
| muted / surface-raised | 4.5:1 | 7.36 | 7.36 | 0.00 | 6.52 | 6.52 | 0.00 |
| accent / surface-raised | 4.5:1 | 7.55 | 7.52 | 0.08 | 7.60 | 7.59 | 0.06 |
| border / surface-base | 3:1 | 3.12 | 3.13 | 0.03 | 1.43 | 1.43 | 0.02 |
| panel input fg / bg | 4.5:1 | 9.19 | 9.19 | 0.00 | 16.00 | 16.00 | 0.00 |
| panel button fg / bg | 4.5:1 | 7.04 | 7.04 | 0.00 | 8.44 | 8.44 | 0.00 |
| panel label fg / base | 4.5:1 | 7.36 | 7.36 | 0.00 | 6.52 | 6.52 | 0.00 |
| panel container fg / bg | 4.5:1 | 8.99 | 8.99 | 0.00 | 13.13 | 13.13 | 0.00 |
| panel monitor fg / bg | 4.5:1 | 5.51 | 5.51 | 0.00 | 7.16 | 7.16 | 0.00 |
| input ring / input bg | 3:1 | 3.25 | 3.26 | 0.03 | 3.88 | 3.87 | 0.03 |
| input ring / container bg | 3:1 | 3.18 | 3.19 | 0.03 | 3.18 | 3.18 | 0.02 |
| focus ring / panel base | 3:1 | 7.55 | 7.52 | 0.08 | 7.60 | 7.59 | 0.06 |
| focus ring / panel button | 3:1 | 5.14 | 5.12 | 0.05 | 4.40 | 4.39 | 0.04 |
| focus ring / panel input | 3:1 | 6.71 | 6.69 | 0.07 | 8.34 | 8.33 | 0.07 |
| focus ring / surface-raised | 3:1 | 7.55 | 7.52 | 0.08 | 7.60 | 7.59 | 0.06 |
| border / surface-raised | 3:1 | 6.59 | 6.61 | 0.05 | 1.31 | 1.30 | 0.01 |
| muted / surface-base | 4.5:1 | 3.49 | 3.49 | 0.00 | 7.16 | 7.16 | 0.00 |
| markdown code fg / bg | 4.5:1 | 4.90 | 4.90 | 0.00 | 16.00 | 16.00 | 0.00 |
| modal btn label / hover fill | 4.5:1 | 4.90 | 4.90 | 0.00 | 16.00 | 16.00 | 0.00 |
| modal btn ring / dialog | 3:1 | 3.66 | 3.67 | 0.04 | 3.54 | 3.53 | 0.03 |

**Reading the spread columns.** The largest movement any tint causes to any measured pair, across all eight themes and both UI themes, is **0.08**. Phase 7's claim — that holding each token's lightness through the mix keeps the audit one lightness per token per UI theme rather than a worst-case sweep — is confirmed rather than inherited. The three tinted tokens (`--accent`, `--border`, `--input-ring`) behave exactly as the untinted ones do.

**The two rows that do not meet their target, and why they are not failures.**

- `border / surface-base` and `border / surface-raised` in dark, at 1.43:1 and 1.31:1. `--border` draws separators only: the header rule, the canvas frame's inset ring, the modal shell/header/footer rules, the markdown `h2` rule, `pre` and table borders, the blockquote rule and the tips popover outline. WCAG 1.4.11 covers the visual information *required to identify a user interface component or its state*; a rule between two regions is not that. The one place this token did bound an interactive control — the modals' two Close buttons — was moved to `--input-ring` in this phase precisely so the exemption is honest rather than convenient. Light mode passes anyway, at 3.12 and 6.59.
- `muted / surface-base` at 3.49:1 in light. Measured because the archived 6.12 list implies the pairing, but after this phase's modal and blockquote changes **nothing renders it**: `--text-muted` appears on `--surface-raised` (7.36:1) in the header and, through `--tp-label-foreground-color` and `--tp-monitor-foreground-color`, on the panel's own backgrounds (7.36:1 and 5.51:1). Kept in the table as a standing constraint on where the token may be used, not as an outstanding defect.

**Superseded by nothing yet.** The 6.12 floors this replaces are above, under Superseded measurements.

## Superseded measurements

*Archived Phase 7.4 — moved verbatim from CONTEXT.md section 11.*

### Phase 7 scene-theme UI tint, as designed and as audited in Phase 8 — superseded

*Archived Phase 10 — moved verbatim from CONTEXT.md section 5. Phase 10 replaced the design these three paragraphs describe: the tint became opt-in and default off, its token coverage grew from three tokens to twenty, and its ratios were raised (accent 0.18 → 0.4, border 0.32 → 0.5, input ring 0.3 → 0.5). Every hex below was measured at the old ratios and against the old always-on default, so none of it describes the shipping interface any more; the always-on design it documents is now simply what the toggle's off state does not do.*

**Scene-theme UI tint (Phase 7)** — the current scene theme's declared `uiTint` is mixed into three interface tokens: `--accent` (links, Help's group headings, the page focus ring), `--border` (every line the page draws), and the Tweakpane input outline `--tp-input-border-color`. **Not surface backgrounds** — a tinted page behind a tinted artwork is two colour fields competing, and the artwork has to win. `src/ui/uitint.js` owns it, ~90 lines, no dependency beyond chroma-js.

Three mechanics worth keeping written down, each being the reason the obvious version doesn't work. (a) **Base tokens are read, not assumed**: style.css declares `--accent-base` / `--border-base` / `--input-ring-base` per UI theme and the consumed token defaults to its base; uitint.js reads the resolved base off `<html>` and writes the tinted value as an inline custom property, which outranks both theme blocks and cannot feed back into its own input. `theme.js`'s `apply()` recomputes on every Light/Dark/System resolution; `state.js`'s `paint()` supplies the tint, so every route to a new scene theme carries the interface with it. (b) **Lightness is taken from the token, not from the mix** — contrast is very nearly a function of lightness, so holding L fixed keeps Phase 8's audit at one lightness per token per UI theme rather than a worst-case-across-themes sweep. (c) **The mix is a Lab (chroma-vector) mix, not an LCH hue interpolation** — LCH takes the shorter way round the hue circle, so mixing a warm tint into a cold token lands on a hue in neither colour. Ratios differ per token and the reason is that a Lab mix moves a chromatic colour *through neutral* first: near-neutral tokens read the tint as hue immediately and take ~0.3, the accent is a saturated blue in both UI themes and stays at 0.18 so no theme flattens it to grey. Ink wash's tint is itself neutral, so it desaturates slightly rather than tinting — the honest outcome for a palette whose identity is having no hue, and the control case when checking the other seven.

**Phase 8 checked the tint end to end and found it working as designed.** The report of it being invisible had two candidate explanations — a missing stylesheet link, which `applyUITint()`'s silent no-op on a missing base would have hidden, or a mechanism that works and is simply subtle. It is the second. All three `-base` tokens are declared in both the `:root` and `.dark` blocks, all three consumed tokens default to their base, and `.tweakpane-scope` maps `--tp-input-border-color` from `--input-ring`; nothing was missing and nothing was wired. Read off `<html>` in the live app (Light UI theme): Sandstone mesa gives `--accent` #292f39, `--border` #47332b, `--tp-input-border-color` #715e57 against bases #0a3247 / #34383d / #575e66 — an unmistakable warm shift on both lines. Ink wash, the documented control case, gives #163143 / #35383b / #5d6368 — within a couple of steps of the base, desaturated rather than tinted, exactly as intended. Dark behaves the same: Sandstone #92b2c2 / #3e2d27 / #685a57 against #6fb7d4 / #27323b / #5f7586.

So the finding is **"works, too subtle to notice"**, and the reason is what the tinted tokens are spent on: two of the three draw 1px lines, and the third is an accent that deliberately keeps its own hue at a 0.18 ratio. Whether that is too subtle is a tuning decision, not a defect, and it was deliberately left alone in Phase 8 rather than retuned mid-audit — moving the ratios would have invalidated the contrast measurements taken against them.

### Phase 6.12 measured contrast floors — superseded

Measured in Phase 6.12. **Phase 6.13 brightened `--surface-raised` after these were taken**, so every figure involving a raised surface is a floor for a token that has since moved. Phase 8 re-measures against current tokens rather than reproducing these from memory.

text/raised 6.4:1, text/base 4.9:1, muted/raised 4.6:1, accent/raised 4.7:1, border/base 3.1:1, panel input fg/bg 5.6:1, panel button fg/bg 4.1:1 (weakest, where the mid-gray band bites).
