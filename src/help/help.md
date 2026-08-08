# Using the landscape generator

Everything generates in your browser — nothing is uploaded. The panel below the canvas is grouped the same way this page is; each section below matches one of those groups.

## Presets

- **Load preset** — loads a saved scene in one step. Falls back to "Custom" the moment you change anything, since the scene is now yours rather than the saved one.
- **Reset to defaults** — returns every control to its factory value and draws a new seed. Everything under Preferences is left alone; those are interface settings, not scene parameters.

## Canvas

- **Aspect ratio** — 4:3 through a 4:1 banner. Feature density scales with width, so a wide canvas doesn't read as stretched.
- On a phone or a tablet the scene stays pinned to the top of the screen while the panel scrolls underneath it, so you can see what a control is doing while you drag it. Scroll all the way back up to release it and bring the page heading back.

## Scene

- **Landscape type** — each archetype is its own generator, not one shape with different settings.
- **Complexity** — detail resolution: noise octave count and point sampling density. Never changes feature count.
- **Peak count** — how many peaks, spurs, ridge bands or rock formations. A no-op on archetypes where the count is fixed by definition — Twin peaks is always two.
- **Peak sharpness** — blends the terrain profile between two noise flavours: smooth at 0, ridged at 1.
- **Point of view height** — viewer elevation. Raises the horizon and tightens how features nest toward each other, as if looking down into the landscape. Not available on In gorge.
- **Seed / Lock seed** — the number the terrain is drawn from. Locked by default, so the sliders above refine what's on screen instead of redrawing it.
- **New seed | Random all | Random scene** — three ways to change the scene, ordered by how much they touch. New seed: new seed, same parameters. Random scene: same seed, new parameters (Complexity, Peak count, Peak sharpness, Point of view height). Random all: both at once. None of the three touches Landscape type, and the seed lock doesn't block any of them — Random scene never reseeds, and the other two reseed on purpose.

## Lighting

- **Time of day** — a 24-hour clock face: drag the hand, or focus it and use the arrow keys. Noon is at the top and the day runs clockwise, so sunrise sits on the left and sunset on the right. It drives sky, mist tint, the sun/moon arc and star visibility. Dawn and dusk are tuned independently rather than mirrored, since they don't actually look alike.
- **Show sun/moon** / **Show stars** — independent toggles; hide only the body/glow or the star field, nothing else about the lighting.
- **Shadow / pseudo-3D** — splits each landform into a lit and shaded facet, based on which way it faces relative to the light. On by default.
- **Light source angle** — free to set on its own whenever the lock below is off. While the lock is on it becomes a readout of the tracked value, and the slider is inactive.
- **Lock angle to time of day** — captures the current offset between the angle and the sun/moon position, then preserves that offset as the hour changes, rather than syncing outright. On by default, with the offset set so the angle reads 0° at 05:40. Switch it off to take the angle back at wherever it currently sits.
- **Shadow intensity** — how dark the shaded side gets. Weighted so the lower half of the slider carries most of the usable range.

## Color

- **Theme preset** — eight curated ramps, each three colours running from the farthest ridge to the nearest foreground. Previous/Next step through them; Randomise generates a new one algorithmically (complementary, analogous or split-hue), shown as "Randomized". Each theme also carries a colour for the interface, used only if you switch **Tint UX to scene** on under Preferences.
- **Color depth** — how strongly near and far separate. 0.5 is the theme as authored; below that everything flattens toward the middle colour, above it the extremes spread further apart. It works in both colouring modes, and means the same thing in each — with Banded colors off it moves where layers sit on the ramp, with Banded colors on it moves the three band colours apart or together.
- **Banded colors** — off, the three theme colours blend into a continuous ramp across the depth of the scene. On, each layer takes one of the three flat, by how far away it is: background, middle distance or foreground. Where those regions divide is a property of each landscape type. The Desert theme and the Desert mesa landscape type are built for this mode, and are the clearest place to see it.
- **Horizon haze** — the atmospheric band at the horizon. Coloured by time of day, not the palette.
- **Valley mist** — a wash that fades from each layer's own summit down to the next-nearer layer's summit, clear at the top. The nearest layer never takes it, so the foreground stays sharp. Deliberately subtle for most of the slider, more visible near the top.
- **Distance** — how much valley mist grows with distance: even across every layer at 0, weighted toward the far ones at 1. Inactive while Valley mist is 0.

## Actions

- **Download SVG** — the artwork as a vector file.
- **Preset name** — optional; sets the name written into the JSON and its filename.
- **Download JSON** — every control value, including the seed. The box below the button previews exactly what's written.

## Preferences

- **UI theme** — Light, Dark, or System, which follows your operating system and keeps following it while the page is open. This is the interface only; it has nothing to do with the time of day in the scene.
- **Tint UX to scene** — **off by default.** On, the controls take their colour from whichever theme the scene is using: rows, fields, buttons, outlines and the focus ring all shift toward it, so the panel reads as part of the picture. The page, the bar across the top and the panel's own background stay neutral on purpose — what the interface sits on shouldn't compete with the artwork. Switching scene theme then recolours the controls with it. Nothing about the artwork changes, and nothing about it is exported — this is a preference, so presets never carry it and Reset to defaults leaves it where you put it. Ink wash is the one theme with no colour of its own, so it very slightly drains the interface's instead of tinting it.
- **Tips** — off by default. On, a "?" appears beside each panel heading with a one-line description of what that group does.
- **Help | Readme.md | About** — this page, the project's README, and the story behind the app.

## Seeds and reproducibility

The seed plus the settings are what reproduce a scene. Reloading them gives you a close — usually indistinguishable — result, not a guaranteed pixel-for-pixel match: a small amount of incidental detail stays unseeded.