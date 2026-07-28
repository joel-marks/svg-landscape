// archetypes/index.js — registry mapping name -> generator module.
// Single source of truth for the Landscape type dropdown (CONTEXT.md section 5)
// and the seed list in section 4. Adding an archetype means adding a module
// beside this file and one entry here.
//
// Every module exports generate({ seed, elevation, complexity, width, height })
// and returns { archetype, width, height, horizonY, mistAfter, layers }, where
// each layer is { index, depth, points } and points is a closed polygon in
// absolute coordinates. `depth` runs 0 (farthest) to 1 (nearest) and selects
// the palette ramp position.

import * as openValley from './open-valley.js';
import * as valleyFloor from './valley-floor.js';
import * as vValley from './v-valley.js';
import * as gorge from './gorge.js';
import * as inGorge from './in-gorge.js';
import * as mountainTop from './mountain-top.js';
import * as stackedRidges from './stacked-ridges.js';
import * as dominantPeak from './dominant-peak.js';
import * as twinPeaks from './twin-peaks.js';

export const archetypes = {
  'open-valley': { label: 'Open valley', module: openValley },
  'valley-floor': { label: 'Valley floor', module: valleyFloor },
  'v-valley': { label: 'V valley', module: vValley },
  gorge: { label: 'Gorge', module: gorge },
  'in-gorge': { label: 'In gorge', module: inGorge },
  'mountain-top': { label: 'Mountain top', module: mountainTop },
  'stacked-ridges': { label: 'Stacked ridges', module: stackedRidges },
  'dominant-peak': { label: 'Dominant peak', module: dominantPeak },
  'twin-peaks': { label: 'Twin peaks', module: twinPeaks },
};

export function getArchetype(name) {
  return archetypes[name] ?? archetypes['open-valley'];
}

// Tweakpane options map: display label -> registry key.
export function archetypeOptions() {
  return Object.fromEntries(
    Object.entries(archetypes).map(([key, { label }]) => [label, key]),
  );
}
