# SVG Landscape Generator

A one-page web app that generates procedural 2D landscape SVGs. Pick a
landscape archetype, tweak parameters — complexity, viewpoint height, time of
day, palette, aspect ratio — and download the result as an SVG, plus a JSON
file of the settings that produced it.

No backend, no accounts, no server. Everything runs in the browser and is
served as a static site.

**Live demo:** _PLACEHOLDER — link added once GitHub Pages is confirmed
deployed (expected: https://joel-marks.github.io/svg-landscape/)._

> **Status:** Phase 6.5. All nine landscape archetypes generate and are
> selectable from the control panel, with complexity, peak count, peak
> sharpness, viewpoint height, seed lock, aspect ratio, a continuous
> time-of-day lighting system with sun/moon and star visibility toggles, an
> optional pseudo-3D shadow split with a light-angle tidelock, and the full
> colour system — seven curated themes with a Previous / Randomise / Next row,
> an algorithmic palette randomizer, colour depth, distance haze, and valley mist
> with distance grading.
> Both the SVG and its settings JSON export, the latter with an optional preset
> name and a live preview, and now carrying every control that affects the
> render. Presets load from `src/presets/*.json`, auto-discovered at build time,
> with one preset shipped. The whole panel state, seed included, is remembered
> between visits; a Preferences folder carries the UI theme, the folder tips and
> the help modal, and Reset to defaults puts everything back. Accessibility,
> SEO and the responsive pass (Phase 7) are still to come.

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
or LinkedIn strip. The canvas frame carries a display-only max-height cap so a
full-width frame doesn't push the panels off a typical desktop viewport; the
logical viewBox is unaffected.

Every control is a Tweakpane control, one pane per column, and each group is a
collapsible folder:

**Left — Canvas, Scene.** Aspect ratio (4:3, 16:9, Cine 2.39:1, X-Pan 2.71:1,
LinkedIn 4:1); then landscape type, complexity, peak count, peak sharpness,
point-of-view height, seed (display + lock), New View.
**Centre — Lighting, Color.** Time of day, sun/moon and star visibility, the
shadow toggle, light source angle, the angle tidelock and shadow intensity; then
theme preset with its Previous / Randomise / Next row, colour depth, distance
haze, valley mist and its distance grading.
**Right — Actions, Preferences.** Actions has two tabs: **SVG** (Download SVG,
Reset to defaults) and **JSON** (preset name, Download JSON, and a live preview
of the file that button writes). Preferences holds the UI theme, the Tips
switch and Help.

The left column stacks two panes rather than one: the **Presets** dropdown sits
on top in a panel of its own, with Canvas and Scene in the panel beneath it.

**Reset to defaults** sits beside Download SVG rather than on the JSON tab —
it is a general app action, not part of naming and exporting a preset. It
restores the spec's factory values rather than the last-used ones, draws a
fresh seed, and saves that as the new last-used state, so a reload afterwards
comes back reset. Your UI theme and Tips setting are interface preferences and
are deliberately left alone.

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

## Lighting

**Time of day** is a continuous 0–24 slider, not a set of day/dawn/night
presets. It drives the sky gradient and mist tint from hand-tuned hourly
keyframes — dawn and dusk are not colour mirrors of each other, so a physical
model gets them wrong — while the sun and moon arcs and the star-field opacity
come from a solar-altitude term, which genuinely is symmetric. Around sunrise
and sunset both bodies are drawn at partial opacity, so the handover is a
crossfade rather than a swap.

**Show sun/moon** and **Show stars** are independent, both on by default, and
hide only what they name — the drawn disc and its glow, or the star field.
Everything else time of day drives is untouched: the sky gradient, the mist
tint, and the star *opacity* underneath the switch all keep tracking the hour.
Turning stars off suppresses them at any hour, including the middle of the
night when they would otherwise be at full strength.

The star field is a **fixed backdrop**. Positions are generated once per scene
seed against a reference frame no control can move — the canvas height by the
widest aspect the app offers — and then clipped to whatever the current canvas
actually is. Raising the horizon with point-of-view height reveals less of that
same field, by ordinary draw order: the terrain is painted over the sky and
hides what falls behind it. A wider aspect reveals further into the field, so
the star count rises with width at constant density, but no star already on
screen moves.

This replaced a version that placed each star as a fraction of two moving
references — `horizonY` vertically and `width` horizontally — which made the
whole pattern squash as the horizon rose and stretch as the canvas widened. It
was never per-star distortion: stars are `<circle>` elements and stayed circles
throughout. See the Phase 6.5 entry in `CONTEXT.md` section 18 for the
measurements.

**Shadow / pseudo-3D** is off by default and adds a light/dark split to every
layer. Each layer is divided along an internal boundary — distinct from its
silhouette against the sky — with the band below the crest darkened wherever
that facet faces away from the light. **Light source angle** sets the direction
in screen-space degrees (0 from the right, 90 overhead, 180 from the left) and
is independently controlled by default: time of day only seeds its starting
value at startup and never overrides it afterwards. **Shadow intensity** sets
how far the dark side is pushed toward black; at 0 it matches the base fill and
the split disappears. The whole group is greyed out while the toggle is off.

A light placed exactly overhead lights every crest facet, so the split
legitimately vanishes at 90°; from directly below at 270° every facet shades.

### Lock angle to time of day

The tidelock, off by default. Engaging it captures the *offset* between the
current light angle and the sun/moon arc position time of day implies; from
then on the angle rotates to preserve that offset as the hour changes, so the
two turn together with the phase between them fixed. Because it captures rather
than snaps, switching it on never moves the scene — it only constrains what
happens next. While locked the angle slider becomes a read-only readout
(relabelled, so a value moving on its own doesn't read as a broken control);
switching the lock off hands the angle back to the slider wherever the lock
last left it, not wherever it was before.

The tracked angle jumps roughly 180° as the hour crosses sunrise or sunset.
That is the sun/moon handover, not a glitch: the light source genuinely changes
body, and the one rising is on the opposite horizon from the one setting.

## Non-linear slider response

Some parameters have their useful range bunched into one end of a linear
slider. Rather than special-casing each, `responseCurve()` in `src/utils.js`
maps a linear 0–1 slider position to the value actually rendered. The slider
the user drags stays an ordinary linear control; only the mapping differs.

| Slider | Curve | Effect |
| --- | --- | --- |
| Shadow intensity | `x²·²` | The usable shading range — previously crammed into the first quarter of the travel — now spans the first half, so the whole low end is finely controllable while the full range is still reachable at the top. |
| Valley mist | `x³·²` | Near-invisible for most of the travel, climbing only near the top. Slider 0.5 renders 0.09; 0.8 renders 0.49. |

## Color

Colour and lighting are separate systems. Lighting owns everything that changes
with the hour — sky gradient, mist tint, sun and moon, stars. A palette owns the
**terrain ramp**: three stops running from the farthest ridge to the nearest
foreground. That makes the themes time-of-day-agnostic colour moods, usable
under any sky.

**Theme preset** offers seven curated ramps:

| Theme | Reads as |
| --- | --- |
| Alpine dusk | Cool blue-violet — the original default |
| Glacier | Pale cyan distance falling to deep meltwater teal |
| Cascade pine | Sage distance through forest green |
| Sandstone mesa | Warm ochre through burnt sienna |
| Volcanic ash | Near-neutral, warm-shifted, dark |
| Heather moor | Muted mauve and purple |
| Ink wash | Zero-chroma greyscale |

The middle stop is what gives each theme its identity: interpolating straight
from a pale distance to a near-black foreground desaturates through grey, so a
ramp that should read as pine or sandstone has to be bent through its own hue.

Directly beneath the dropdown is a single row of three: **Previous**,
**Randomise**, **Next**. Previous and Next cycle the curated list, wrapping at
both ends. They skip "Randomized" — stepping from a randomized palette enters
the list at whichever end the direction implies (forward lands on Alpine dusk,
back on Ink wash). Tweakpane lays a pane out vertically, so the row is a
buttongrid blade from `@tweakpane/plugin-essentials`; before that plugin was
added the two steppers had to sit above and below the dropdown instead.

**Randomize palette** generates a fresh ramp from a hue relationship —
complementary, analogous, or split-hue — rather than three independent random
colours, which would turn to mud once the ramp interpolates between them. Every
strategy applies the same aerial-perspective structure (pale, low-chroma
distance; dark, denser foreground), so a generated palette is usable as terrain
and not merely colourful. The result appears in the preset dropdown as
**Randomized**, and travels with the settings JSON, since an id alone can't
reproduce it.

**Color depth** controls how strongly the layers separate. It is not a
posterize/band count. At 0 every layer collapses onto the palette's midpoint —
one flat silhouette mass, no aerial-perspective cue at all. **0.5 is the theme
as authored.** Above that, an S-curve carries the far layers toward the pale end
of the ramp and the near ones toward the dark end, exaggerating the separation.
It reshapes where each layer *lands* on the ramp rather than recolouring the
ramp's endpoints — pushing the endpoint colours apart instead saturates almost
immediately, because the far stop of a high-key theme is already near white.

**Distance haze** sets the mist band's opacity and how far it spreads up into
the sky. At 0 the band is omitted from the SVG entirely rather than emitted as a
transparent no-op rect.

**Valley mist** is a different effect from Distance haze: not one atmospheric
band at the horizon, but a soft wash lying low in frame, so summits stay clear
and everything below them whitens. It defaults to 0 and is routed through the
response curve above, so it stays close to invisible until the top of its
travel.

Each misted layer gets **one vertical gradient**, `userSpaceOnUse`, and both of
its anchors are per layer:

- **Top** — that layer's own highest crest point, at 0% opacity. A background
  ridge and a foreground ridge each begin fading from wherever they happen to
  peak, so the onset tracks the terrain rather than a scene constant.
- **Bottom** — the *next-nearer layer's* highest crest point, at full opacity.
  Not the canvas floor: a layer is only ever visible in the sliver above
  whatever is drawn in front of it, and anchoring to the floor meant a distant
  layer's fade had barely left zero before the next layer covered it. The
  occluder's summit is a conservative bound — that layer cannot cover this one
  *above its own peak* at any x — so the fade is guaranteed to complete inside
  the visible sliver without solving the real per-x occlusion boundary.

For the nearest misted layer the occluder is the excluded foreground layer.
Where the rule degenerates — a nearer layer peaking *above* a farther one, which
is normal on archetypes whose near layers sweep up the frame edges, or both
summits sitting above the canvas top — that layer falls back to the canvas-floor
anchor, which is weak rather than broken. A span that is positive but under 24px
is clamped to 24px instead, so a 1px difference in summit height can't flip a
layer between a fast fade and an invisible one.

Three stops, with the middle one below a straight line between the ends so the
mist creeps in under the summit rather than starting at a visible rate the
moment the crest drops. It renders as a full-canvas rect filled with that
gradient and clipped to the layer's own polygon, painted over the base fill and
over the shadow split — mist sits in front of the terrain, so a misted slope
lightens whether or not that facet is shaded.

**The frontmost layer never takes mist**, at any slider value. It is what the
viewer is standing in; misting it flattens the depth cue the rest of the effect
is building.

**Distance** grades the remaining layers by how far away they are. At 0 every
misted layer gets the same intensity; at 1 the nearest one still taking mist
keeps only a trace while the farthest takes the full amount. A plain linear
blend between those two — this control is deliberately *not* on a response
curve. Note the axis direction: `layer.depth` is 0 at the **farthest** layer and
1 at the nearest, the same axis the palette's near/far ramp reads, so mist
strength grows as depth *falls*. Reading it the other way would pile the
heaviest mist onto the foreground, which is the inversion this control exists to
avoid. Distance is greyed out while Valley mist is 0, since it has nothing to
grade.

**Mist colour comes from each layer's own fill**, not from a fixed pale tone:
converted to LCH, lightness pushed most of the way toward near-white and chroma
cut, hue left alone. A dark blue ridge mists pale blue, a sandstone ridge mists
pale warm, Ink wash mists neutral. Lightness moves proportionally rather than to
a fixed value, so a layer that is already pale is not dragged darker by its own
mist.

The clip reuses the base path by reference (`<use>`) rather than repeating its
`d`. That matters: a layer's polygon runs to a few thousand points, and copying
it per layer would roughly double the download for geometry already in the file.
As built, the effect adds **no path data at all** — about 3.3 kB of defs on a
default 16:9 scene, against 48 kB for the mechanism it replaced.

Two earlier mechanisms were tried and discarded, both replaced rather than
tuned. The first faded from each shape's top edge downward into its fill; that
measures how far down a slope a point sits, which is identical on a peak's flank
and in a saddle floor, so it cannot tell a ridge from a valley. The second
measured per-point crest topology — local dip depth relative to nearby peaks —
which was correct by its own definition but wrong to look at: three nested
translucent bands read as steps rather than a fade, and hugging the crest put
the mist along the ridgelines instead of pooling below them.

## Settings export

**Download JSON** writes every control value that affects the render:

| Group | Keys |
| --- | --- |
| Scene | `archetype`, `seed`, `complexity`, `peakCount`, `sharpness`, `elevation` |
| Canvas | `aspect` |
| Lighting | `hour`, `showBodies`, `showStars`, `shadow`, `lightAngle`, `lockAngle`, `shadowIntensity` |
| Color | `palette`, `customPalette`, `colorDepth`, `haze`, `valleyMist`, `mistDistance` |

The Lighting row is new in Phase 5.12 — the whole group was missing from the
export until then. That gap was originally deferred to Phase 6 and pulled
forward, because a preset that can't carry the hour or the shadow settings
can't reproduce its own scene.

A few things are deliberately *not* in the file. `width` is derived from
`aspect` and recomputed on load. `seedLocked` guards how the seed changes, not
what the scene looks like — the file carries the seed itself, so the lock is
irrelevant to reproducing it. `angleOffset`, the tidelock's captured phase, is
recovered from `lightAngle` and `hour` when the file loads rather than stored.
`customPalette` is written only when the palette actually is a randomized one.

The list lives once, as `SETTINGS_KEYS` in `src/state.js`, and the export is
generated from it rather than written out a second time by hand — which is how
the Lighting values went missing in the first place. It also drives the preset
loader and the preset match test, so those three cannot disagree.

Export only; there is no import button — dropping a file into `src/presets/`
is the way back in. Reloading the same seed and settings reproduces a
near-identical scene, though not always pixel-identical, since some draws
remain unseeded.

**Preset name** on the same tab is optional free text. Fill it in and it is
written into the JSON as `presetName` and, sanitized to a slug, into the
filename in place of the archetype — `landscape-my-alpine-look-1837465.json`
rather than `landscape-open-valley-1837465.json`. Leave it blank and the export
is exactly what it was before the field existed: no `presetName` key, and the
archetype back in the filename. Tweakpane text fields commit on blur or Enter,
which is when the preview and the filename pick the name up.

Beneath the button is a readonly five-row preview of that same JSON, scrollable
and live. It is built from the same `exportSettings()` call the download uses,
so the two cannot drift apart.

## Presets

The **Presets** dropdown at the top of the left column loads a saved parameter
set in one step.

Presets are **files, not code**. `src/presets.js` globs `./presets/*.json` with
`import.meta.glob(..., { eager: true })`, so every JSON file in `src/presets/`
becomes a dropdown entry at build time. Adding one is:

1. Build the scene you want.
2. Type a name into **Preset name** on the Actions → JSON tab.
3. **Download JSON**.
4. Move that file into `src/presets/` and commit it.

No manifest, no array to edit, no code change — the file *is* the preset, and
its shape is exactly what Download JSON writes. The dev server picks a new file
up on the next page load.

One preset ships today, **Rocky sunset blues**, authored exactly that way. An
empty folder is equally valid: the dropdown then offers **Custom** alone.

The **label** comes from the file's own `presetName`. A file without one still
gets a usable entry rather than a blank or a dropped one: `alpine-dawn.json`
falls back to "Alpine dawn". Ids come from the filename rather than the name,
since filenames are unique within a folder by definition — two presets that
happen to share a name can't collapse into one entry. Duplicate labels get a
numeric suffix for the same reason.

Selecting a preset loads its full parameter set — including its seed, so it
reproduces its scene rather than drawing a new one — and regenerates like any
other control. If the file has the tidelock engaged, loading it re-engages
tracking from the loaded angle and hour, not from whatever phase the previous
scene was locked at. The dropdown falls back to **Custom** whenever the live
scene stops matching a saved preset, which includes the first manual change
after a preset is loaded. That is recomputed from the state itself after every
change rather than tracked with a dirty flag, so it can't go stale.

Numbers in that comparison are matched to a 1e-9 tolerance rather than exactly.
Tweakpane's step constraint takes its origin from the value a slider was built
with, so writing a value back through one that has since moved can land an ulp
off — `0.5` arriving as `0.49999999999999994` — which under `===` would drop the
dropdown to Custom immediately after loading the preset that set it. The
tolerance sits far below the panel's finest step (0.01) and far above the ulp it
absorbs, so it cannot merge two scenes anyone could tell apart.

There is no in-app "save current as preset" yet — the folder drop above is the
authoring path.

## Persistence

Everything is kept in **localStorage** — there is no backend and no other
storage mechanism. Two keys:

| Key | Holds |
| --- | --- |
| `svg-landscape:state` | The whole panel state: every settings-export key plus the seed lock, preset name and Tips switch |
| `svg-landscape:theme` | The UI theme mode — `system`, `light` or `dark` |

The scene blob is written on **every control change**, from the same panel
refresh that already runs after one, so what is saved and what the panel is
showing cannot come apart. It reuses `SETTINGS_KEYS` — the same list the export
and the preset loader are built from — rather than inventing a second shape, so
it is a settings export plus the three panel values that deliberately are not
scene parameters.

It is restored **before the first render**, seed included: come back later and
you get the exact scene you left, not the same slider positions with a new
random landscape. Loading a preset saves like any other change, so the preset
you loaded is what you come back to — and the Preset dropdown, being recomputed
from the state rather than stored, still reads as that preset after a reload.

A first-ever visit restores nothing and renders the factory defaults.
Unreadable, corrupt or hand-edited storage falls back the same way rather than
erroring, and individual values that are the wrong type are skipped rather than
handed to the generators — the app has to survive a bad blob, since anyone can
edit one.

The theme keeps its own key. It is an interface preference rather than part of
the scene, and it has to be readable before any of the scene state is loaded.

## Help and tips

**Tips**, in Preferences, puts a small **?** beside each of the Scene, Canvas,
Lighting, Color and Actions folder headings. Opening one shows a single line
saying what that group is for — folder-level, not per-control.

The trigger answers to **hover, click or tap, and keyboard focus**, not hover
alone: a hover-only tooltip is invisible on touch and usually to keyboard users,
and this app being desktop-first is no reason to ship a control a third of its
users can't open. A tooltip opened by click or focus outlives the pointer
moving away; Escape, a click elsewhere, or re-triggering all dismiss it. The
trigger is a real button placed immediately after its heading, so Tab reaches it
where you would expect.

It arrived in Phase 6 as a permanent caption under each heading and became a
tooltip in Phase 6.5, which gives the same explanation without the panel
carrying five extra lines of text at all times. Switching Tips off removes the
triggers from the page entirely rather than dimming them. The setting persists
with everything else.

**Help** opens a single in-app modal — no separate route or page, this stays a
one-pager. It explains the controls end-user-first, group by group in the same
order as the panel, carries the seed/reproducibility caveat, and says where the
Tips switch is. It is a native `<dialog>` opened with `showModal()`, so Escape
closes it, focus moves in and returns to the Help button afterwards, and the
page behind it goes inert — behaviours a hand-rolled overlay would have to
reimplement, which is where keyboard traps come from. There are explicit Close
controls at both ends of the dialog; click-outside also works, but never as the
only way out, since it is unreachable from a keyboard.

## The seed lock

**Lock seed is on by default.** It guards against *incidental* reseeding only:
while it is on, changing landscape type, complexity, peak count, peak
sharpness, point-of-view height or aspect ratio re-renders the same layout, so
you can refine a composition you like without it dissolving under you. Turn it
off and any of those redraws from a new seed.

**New View** always draws a new seed, lock or no lock — it is the one control
whose entire purpose is to change the seed, so being disabled by the lock would
make it useless. It is also the *only* reseed action: a separate "Randomize
seed" button sat above it through earlier phases and did precisely the same
thing, and was removed in Phase 5.12 rather than kept as a second button for
one behaviour.

## Stack

- [Vite](https://vite.dev/) — dev server and production build
- Vanilla JS (ES modules) — no UI framework
- [simplex-noise](https://github.com/jwagner/simplex-noise.js) — noise base
- [chroma-js](https://gka.github.io/chroma.js/) — palette generation and interpolation
- [Tweakpane](https://tweakpane.github.io/docs/) — control panel UI
- [@tweakpane/plugin-essentials](https://github.com/tweakpane/plugin-essentials) — buttongrid blade for the theme row
- [Tailwind CSS v4](https://tailwindcss.com/) — page chrome and design tokens

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
  presets.js         preset discovery (globs presets/*.json) + lookup helpers
  presets/           preset files — drop an exported settings JSON in to add one
  lighting.js        time-of-day -> sun/moon position, sky blend, shadow angle
  render.js          SVG paint: sky, mist, polygons, shadow split, stars/moon
  controls.js        Tweakpane panes — the three-column panel plus the presets bar
  tips.js            "?" tooltip trigger + popover beside each folder heading
  download.js        SVG export + settings JSON export
  help.js            help modal content + open/close
  theme.js           UI light/dark theme, prefers-color-scheme, persistence
  utils.js           shared geometry helpers, width-scaling rules, slider response curve
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

The interface has three modes — Light, Dark, and System — chosen from **UI
theme** in the Preferences folder and remembered in localStorage. System follows
`prefers-color-scheme` live. All three resolve to a single `dark` class on
`<html>`, which the tokens in `src/style.css` key off.

The control lived in a header button that cycled the three modes until Phase 6,
when it moved into the panel with the rest of the preferences. It is not
duplicated in the header.

This is interface chrome only. The in-scene time-of-day lighting that tints the
sky and drives shadows, and the palette that colours the terrain, are separate
systems entirely — a dark interface does not imply a night scene.

`CONTEXT.md` at the repo root is the authoritative project spec.

## License

MIT — see [LICENSE](LICENSE).
