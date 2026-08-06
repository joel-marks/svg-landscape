// presets.js — preset discovery + lookup helpers (CONTEXT.md section 5).
//
// Presets live as loose `.json` files in `src/presets/`, each one byte-for-byte
// a "Download JSON" export (section 8). Authoring one is therefore: build the
// scene, name it on the Downloads tab, Download JSON, move the file into the
// folder, commit. No manifest to update and no code change here — the glob
// below picks the file up at build time, so a new preset is a data change.
//
// This replaces the Phase 5.7 arrangement, which was a hand-maintained array
// literal in this file. It was never populated, so nothing had to be migrated:
// the empty array is simply gone.
//
// Discovery-only for now. There is no in-app "save current as preset".

import { slugify } from './utils.js';

// "Custom" is a real dropdown entry rather than an absent selection: the
// control has to be able to say that the live scene matches nothing saved.
export const CUSTOM_PRESET_ID = '__custom__';
export const CUSTOM_PRESET_LABEL = 'Custom';

// Eager, so the presets are plain values by the time the panel is built rather
// than promises the dropdown would have to be rebuilt around. They are a few
// hundred bytes each and inlined into the bundle.
const modules = import.meta.glob('./presets/*.json', { eager: true });

export const presets = buildPresets(modules);

// Ids key the dropdown and are derived from the *filename*, not the name field:
// filenames are unique within a folder by definition, so two presets that
// happen to share a name can't collide into one entry.
export function presetId(preset) {
  return preset.id;
}

export function findPreset(id) {
  return presets.find((preset) => preset.id === id) ?? null;
}

// Custom first, then the discovered presets in filename order.
export function presetOptions() {
  return {
    [CUSTOM_PRESET_LABEL]: CUSTOM_PRESET_ID,
    ...Object.fromEntries(presets.map((preset) => [preset.label, preset.id])),
  };
}

function buildPresets(found) {
  // Glob key order isn't specified, so sort for a stable dropdown across
  // builds rather than letting the bundler's traversal decide it.
  const entries = Object.entries(found).sort(([a], [b]) => a.localeCompare(b));

  const ids = new Set();
  const labels = new Set();

  return entries.map(([path, module]) => {
    // Vite parses JSON to a module whose default export is the object; the
    // fallback covers a plain object arriving from any other loader.
    const settings = module?.default ?? module ?? {};
    const stem = fileStem(path);

    return {
      id: unique(ids, slugify(stem) || 'preset', '-'),
      // The file's own name field is the label; a file without one still has a
      // filename, and a readable label derived from it beats dropping the entry
      // or rendering it blank.
      label: unique(labels, presetLabel(settings, stem), ' '),
      name: settings.presetName,
      path,
      settings,
    };
  });
}

function fileStem(path) {
  return path.split('/').pop().replace(/\.json$/i, '');
}

// `alpine-dawn.json` -> "Alpine dawn". Deliberately light-touch: separators to
// spaces, first letter up, everything else left as typed, so a filename with
// intentional casing ("XPan wide") isn't mangled on its way to the dropdown.
function presetLabel(settings, stem) {
  const named = String(settings.presetName ?? '').trim();
  if (named) return named;

  const words = stem.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Untitled preset';
}

// Both ids and labels key an object literal downstream, where a duplicate would
// silently swallow the earlier entry. Suffixing keeps every file visible.
function unique(seen, value, separator) {
  let candidate = value;
  for (let n = 2; seen.has(candidate); n += 1) candidate = `${value}${separator}${n}`;
  seen.add(candidate);
  return candidate;
}
