import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages project site: https://joel-marks.github.io/svg-landscape/
// `base` must match the repo-name subpath or asset URLs 404 in production.
export default defineConfig({
  base: '/svg-landscape/',
  plugins: [tailwindcss()],
});
