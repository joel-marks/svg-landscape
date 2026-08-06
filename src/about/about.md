# SVG Landscape Generator

SVG Landscape Generator is a small procedural tool: pick a landscape archetype, tune noise-driven terrain, lighting, and colour, and export the result as a standalone SVG — or save the settings that produced it, so a scene can be reproduced or shared. No backend, no accounts. Everything runs client-side and ships as a static site.

It's also my first public, functional vibe-coded app. As an app it solved a need I had to create simple svg landscapes or colorscapes for another project. Its started as a single skill in Claude producing an html canvas, then became an experiment to test my production process in VS Code, using Claude Code.

## How it was built

The workflow split planning from execution. Architecture, scope, and code review happened in conversation with Claude chat in a project; the actual implementation ran through Claude Code inside VS Code using a Max 5x account. I sat in the middle — relaying instructions between the two, testing results, making the calls that got flagged rather than silently resolved, and deciding what actually shipped. Nothing here merged without a human looking at it first. The feedback from this particular process is that the single point of failure is syncing CONTEXT.md manually between the two.

## Status

This is under active development, not a finished release. Expect rough edges. In particular, the archetypes will be refined when I have time. Open Valley is the production ready one, with the others having been ported from the original project but not improved or refined.

## Credits

Idea, concept and vibe coding: [Joel B. Marks](https://joelbmarks.com)

First release: August 2026