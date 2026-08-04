# Claude Code — Project Instructions

Read `CONTEXT.md` at repo root first, on every session. Do not read HISTORY.md unless directed (see Project documentation). It is the authoritative spec — architecture, control panel structure, archetype list, persistence, license, and README requirements. This file (`CLAUDE.md`) covers operating rules only.

## Project documentation
- `CONTEXT.md` — authoritative current state. Read in full at session start, every session. You maintain it directly: apply the edits a phase prompt describes as part of that phase, and always edit the file as it currently stands in the repo — never from a remembered or previously pasted copy.
- `HISTORY.md` — append-only archive of closed issues, per-phase history, and superseded measurements. Do NOT read at session start. Read only when a phase prompt directs you to, or when a CONTEXT.md pointer for the area you are touching refers there.
- Archiving is verbatim: when an entry moves from CONTEXT.md to HISTORY.md, cut-and-paste it unedited and note the archiving phase. Never rewrite or summarise during a move.
- Every phase report lists the CONTEXT.md reconciliation edits made in that phase (or states "none").

## Operating scope
- Run from repo root.
- Execute bash, git, and stack-related commands (npm install, npm run dev/build, vite commands, file creation/edits within the repo) without asking for per-command confirmation.
- Do not ask for setup/install confirmation — proceed.
- Stay within the stack defined in `CONTEXT.md` (Vite, vanilla JS ES modules, simplex-noise, chroma-js, Tweakpane, and any plugin/library added with explicit sign-off in a phase prompt). Do not introduce a UI framework or additional major dependencies without flagging it first.

## Conventions
- Vanilla JS, ES modules, no build-time framework.
- One archetype = one module under `/src/archetypes`, each exporting `generate(params)`.
- All new UI controls go into the grouped Tweakpane panel structure defined in `CONTEXT.md` section 5 — do not add ungrouped or ad hoc controls.
- Every archetype `generate()` signature accepts the global `elevation`, `peakCount`, and `sharpness` parameters (sections 5, 6a), even where unused.
- LocalStorage is the single persistence mechanism — no other storage.
- License: MIT (`LICENSE` file at root).
- Maintain `README.md` as features land — do not leave it stale by the end of a prompt that changes setup, usage, or deploy steps.

## Version control discipline
- **Commit at the end of every phase, before ending the session.** Not "when convenient" — every single prompt, no exceptions, even for small fixes. This lapsed silently for eight consecutive phases (5 through 5.11) before being caught, which is exactly the kind of drift this file exists to prevent.
- **Report the exact commit hash in the phase summary.** A phase report without a hash is incomplete, the same way a report without console-error verification would be.
- **Push to `origin` after committing, and confirm it succeeded.** Deployment triggers on push per `CONTEXT.md` section 12 — an unpushed commit means nothing reaches GitHub Pages regardless of how correct the local code is. If push fails (auth, missing upstream, etc.), state that plainly rather than treating the commit alone as done.
- **Run `git status` before reporting a phase complete.** "Clean, nothing to commit" is part of the definition of done, not an optional extra check.

## Deliverable discipline
- Each prompt in this project targets a specific phase (see `CONTEXT.md` section 17). Do not pull forward work from a later phase unless asked.
- Flag, rather than silently resolve, any decision that changes something already agreed in `CONTEXT.md`.
