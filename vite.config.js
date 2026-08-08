import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// The app's own markdown renderer, imported straight into the config (Phase 12).
// It was written dependency-free and touches no browser API, so Node runs it as
// it stands — no fork, no second renderer, and the modal and the crawler read
// the same output of the same function over the same file.
import { renderMarkdown } from './src/ui/markdown.js';

// The build the header reports (CONTEXT.md section 3). Read from git at
// build/dev-server start rather than from package.json, whose version is a
// permanent `0.0.0` on a private, unpublished package and therefore tells a
// visitor nothing about which build they are looking at.
//
// Falls back rather than failing the build: a source tarball or a shallow
// checkout without .git is a legitimate way to build this, and a missing hash
// should cost the readout, not the deploy.
function commitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

const ABOUT_MD = fileURLToPath(new URL('./src/about/about.md', import.meta.url));

// The comment index.html carries where the rendered About copy goes.
const ABOUT_SLOT = '<!--about-content-->';

// Phase 12. The About copy used to reach the page only as a `?raw` import that
// markdown.js rendered when the modal was first opened, which means it did not
// exist in the document a crawler is served — the page's only real prose was
// invisible to it. This renders it into index.html instead, and `help.js` adopts
// the served node rather than rendering a second copy: one file, one render, two
// consumers.
//
// Read here rather than imported at the top so the dev server picks up an edit
// to about.md — index.html is transformed per request, so a reload re-reads the
// file. `configureServer` supplies the reload itself, which the `?raw` import
// used to get from Vite's module graph for free.
//
// `order: 'pre'` for one reason: nothing else should have had a chance to touch
// the slot comment before the copy is in it.
function aboutContent() {
  return {
    name: 'svg-landscape:about-content',

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Headings shift down one level: the header's title is the page's <h1>
        // and this document opens with its own. See markdown.js on why that is
        // an offset rather than a rewrite of about.md.
        const rendered = renderMarkdown(readFileSync(ABOUT_MD, 'utf8'), {
          headingOffset: 1,
        });

        // Function replacement, not a string: `$&` and friends in rendered
        // markdown would otherwise be substitution patterns.
        return html.replace(ABOUT_SLOT, () => rendered);
      },
    },

    configureServer(server) {
      server.watcher.add(ABOUT_MD);
      server.watcher.on('change', (file) => {
        if (file !== ABOUT_MD) return;
        server.ws.send({ type: 'full-reload', path: '*' });
      });
    },
  };
}

// GitHub Pages project site: https://joel-marks.github.io/svg-landscape/
// `base` must match the repo-name subpath or asset URLs 404 in production.
export default defineConfig({
  base: '/svg-landscape/',
  plugins: [tailwindcss(), aboutContent()],
  define: {
    // Evaluated once, here — the constant is substituted into the bundle at
    // build time, so nothing reads git at runtime.
    __COMMIT_HASH__: JSON.stringify(commitHash()),
  },
});
