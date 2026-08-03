import { execSync } from 'node:child_process';

import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

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

// GitHub Pages project site: https://joel-marks.github.io/svg-landscape/
// `base` must match the repo-name subpath or asset URLs 404 in production.
export default defineConfig({
  base: '/svg-landscape/',
  plugins: [tailwindcss()],
  define: {
    // Evaluated once, here — the constant is substituted into the bundle at
    // build time, so nothing reads git at runtime.
    __COMMIT_HASH__: JSON.stringify(commitHash()),
  },
});
