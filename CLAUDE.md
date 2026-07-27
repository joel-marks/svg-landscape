# Claude Code — Project Instructions

Read `CONTEXT.md` at repo root first, on every session. It is the authoritative spec — architecture, control panel structure, archetype list, persistence, license, and README requirements. This file (`CLAUDE.md`) covers operating rules only.

## Operating scope
- Run from repo root.
- Execute bash, git, and stack-related commands (npm install, npm run dev/build, vite commands, file creation/edits within the repo) without asking for per-command confirmation.
- Do not ask for setup/install confirmation — proceed.
- Stay within the stack defined in `CONTEXT.md` (Vite, vanilla JS ES modules, simplex-noise, chroma-js, Tweakpane). Do not introduce a UI framework or additional major dependencies without flagging it first.

## Conventions
- Vanilla JS, ES modules, no build-time framework.
- One archetype = one module under `/src/archetypes`, each exporting `generate(params)`.
- All new UI controls go into the grouped Tweakpane panel structure defined in `CONTEXT.md` section 5 — do not add ungrouped or ad hoc controls.
- Every archetype `generate()` signature accepts the global `elevation` parameter (section 6a), even where unused.
- LocalStorage is the single persistence mechanism — no other storage.
- License: MIT (`LICENSE` file at root).
- Maintain `README.md` as features land — do not leave it stale by the end of a prompt that changes setup, usage, or deploy steps.

## Deliverable discipline
- Each prompt in this project targets a specific phase (see `CONTEXT.md` section 17). Do not pull forward work from a later phase unless asked.
- Flag, rather than silently resolve, any decision that changes something already agreed in `CONTEXT.md`.