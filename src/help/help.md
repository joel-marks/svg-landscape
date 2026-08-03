# Using the landscape generator

Everything generates in your browser — nothing is uploaded. The panel below the canvas is grouped the same way this page is; each section below matches one of those groups.

## Presets

- **Load preset** — loads a saved scene in one step. Falls back to "Custom" the moment you change anything, since the scene is now yours rather than the saved one.
- **Reset to defaults** — returns every control to its factory value and draws a new seed. Your UI theme and Tips setting are left alone; they're interface preferences, not scene parameters.

## Canvas

- **Aspect ratio** — 4:3 through a 4:1 banner. Feature density scales with width, so a wide canvas doesn't read as stretched.

## Scene

- **Landscape type** — each archetype is its own generator, not one shape with different settings.
- **Complexity** — detail resolution: noise octave count and point sampling density. Never changes feature count.
- **Peak count** — how many peaks, spurs or ridge bands. A no-op on archetypes where the count is fixed by definition — Twin peaks is always two.
- **Peak sharpness** — blends the terrain profile between two noise flavours: smooth at 0, ridged at 1.
- **Point of view height** — viewer elevation. Raises the horizon and tightens how features nest toward each other, as if looking down into the landscape. Not available on In gorge.
- **Seed / Lock seed** — the number the terrain is drawn from. Locked by default, so the sliders above refine what's on screen instead of redrawing it.
- **New View | Random all | Random scene** — three ways to change the scene, ordered by how much they touch. New View: new seed, same parameters. Random scene: same seed, new parameters (Complexity, Peak count, Peak sharpness, Point of view height). Random all: both at once. None of the three touches Landscape type, and the seed lock doesn't block any of them — Random scene never reseeds, and the other two reseed on purpose.

## Lighting

- **Time of day** — a continuous 24-hour slider driving sky, mist tint, the sun/moon arc and star visibility. Dawn and dusk are tuned independently rather than mirrored, since they don't actually look alike.
- **Show sun/moon** / **Show stars** — independent toggles; hide only the body/glow or the star field, nothing else about the lighting.
- **Shadow / pseudo-3D** — splits each landform into a lit and shaded facet, based on which way it faces relative to the light.
- **Light source angle** — independent of time of day by default; only seeds its starting value from the hour.
- **Lock angle to time of day** — captures the current offset between the angle and the sun/moon position, then preserves that offset as the hour changes, rather than syncing outright.
- **Shadow intensity** — how dark the shaded side gets. Weighted so the lower half of the slider carries most of the usable range.

## Color

- **Theme preset** — seven curated ramps running from a pale far stop to a dark near one. Previous/Next step through them; Randomise generates a new one algorithmically (complementary, analogous or split-hue), shown as "Randomized".
- **Color depth** — how strongly near and far layers separate. 0.5 is the theme as authored; below that layers flatten toward each other, above it they spread toward the ramp's extremes.
- **Distance haze** — the atmospheric band at the horizon. Coloured by time of day, not the palette.
- **Valley mist** — a wash that fades from each layer's own summit down to the next-nearer layer's summit, clear at the top. The nearest layer never takes it, so the foreground stays sharp. Deliberately subtle for most of the slider, more visible near the top.
- **Distance** — how much valley mist grows with distance: even across every layer at 0, weighted toward the far ones at 1. Inactive while Valley mist is 0.

## Actions

- **Download SVG** — the artwork as a vector file.
- **Preset name** — optional; sets the name written into the JSON and its filename.
- **Download JSON** — every control value, including the seed. The box below the button previews exactly what's written.

## Seeds and reproducibility

The seed plus the settings are what reproduce a scene. Reloading them gives you a close — usually indistinguishable — result, not a guaranteed pixel-for-pixel match: a small amount of incidental detail stays unseeded.