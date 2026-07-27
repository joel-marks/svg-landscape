// download.js — SVG export + settings JSON export.
// The settings JSON includes the numeric seed; help copy retains the caveat
// that identical settings reproduce a near-identical, not always pixel-
// identical, result (CONTEXT.md section 8).
//
// Phase 2 scope: SVG export. Settings JSON export is Phase 6.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function downloadSVG(svg, filename = 'landscape.svg') {
  // Clone so the live element keeps its layout classes and the exported file
  // carries the standalone attributes a viewer needs to open it directly.
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.removeAttribute('class');

  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const [, , width, height] = viewBox.split(/\s+/);
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
  }

  const markup = new XMLSerializer().serializeToString(clone);
  const source = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${markup}`;

  triggerDownload(
    new Blob([source], { type: 'image/svg+xml;charset=utf-8' }),
    filename,
  );
}

export function downloadSettings() {
  // Phase 6 — serialize all control values plus the numeric seed to JSON.
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
