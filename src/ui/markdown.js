// markdown.js — a small markdown-to-HTML converter for the three modals.
//
// Deliberately not a CommonMark implementation and deliberately not a
// dependency (CONTEXT.md section 2). It covers the constructs this project's
// own documents actually use — counted against README.md rather than guessed:
// headings, bold, italic, inline code, links, unordered and ordered lists,
// blockquotes, fenced code blocks and tables. Anything outside that renders as
// its own literal text, which is the failure mode you want from a renderer this
// size: unsupported syntax looks plain, never broken.
//
// Two rules the implementation is built around:
//
//   1. Escape first, insert tags second. Every piece of source text goes
//      through escapeHtml before any tag is added, so a document containing
//      `<script>` renders those characters rather than executing them. The
//      inputs here are all first-party, but a renderer that only behaves for
//      trusted input is one refactor away from being a hole.
//   2. Code spans are lifted out before the other inline rules run and put back
//      afterwards, so `**not bold**` inside backticks stays literal — which
//      matters immediately, since this project's README is full of code spans
//      containing asterisks and underscores.

// Written as an escape rather than a literal NUL byte: an invisible control
// character in source is a trap for anyone editing this file later.
const CODE_PLACEHOLDER = '\u0000';

// `headingOffset` shifts every heading down the document outline without
// changing how it looks (Phase 12). It exists because about.md is rendered into
// index.html at build time and the page already has an `<h1>` — a document
// opening with `# Title` would give it a second one. Presentation is therefore
// decoupled from the tag: every heading carries an `md-hN` class naming its
// *authored* level, which is what style.css sizes on, while the tag names its
// level *in the document it lands in*. Two axes, because with one they disagree —
// demoting the tags alone would render about.md's `##` sections in the 0.75rem
// uppercase treatment the third level is styled for.
export function renderMarkdown(source, { headingOffset = 0 } = {}) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  return blocks(lines, headingOffset).join('\n');
}

// --- block level -------------------------------------------------------------

function blocks(lines, headingOffset = 0) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Fenced code. Everything up to the closing fence is literal, including
    // anything that would otherwise look like a heading or a list.
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const body = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : '';
      out.push(`<pre><code${language}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    // Table — only when the line after the header is a delimiter row, which is
    // what separates a real table from a paragraph that happens to contain a
    // pipe character.
    if (line.trimStart().startsWith('|') && isDelimiterRow(lines[i + 1])) {
      const header = cells(line);
      const aligns = alignments(lines[i + 1]);
      i += 2;

      const rows = [];
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        rows.push(cells(lines[i]));
        i += 1;
      }

      out.push(table(header, aligns, rows));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const authored = heading[1].length;
      // Clamped: there is no <h7>, so a `######` in an offset document keeps the
      // deepest tag there is and its own authored class carries the styling.
      const level = Math.min(6, authored + headingOffset);
      out.push(
        `<h${level} class="md-h${authored}">${inline(heading[2].trim())}</h${level}>`,
      );
      i += 1;
      continue;
    }

    // Blockquote. The stripped content is run back through the block parser, so
    // a quote containing a list or heading renders as one.
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${blocks(body, headingOffset).join('\n')}</blockquote>`);
      continue;
    }

    const bullet = line.match(/^\s*([-*+])\s+/);
    const number = line.match(/^\s*\d+\.\s+/);
    if (bullet || number) {
      const ordered = Boolean(number);
      const items = [];

      while (i < lines.length) {
        const item = lines[i].match(ordered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/);
        if (!item) {
          // A plainer continuation line belongs to the item above it rather
          // than starting a paragraph mid-list.
          if (items.length && lines[i].trim() && /^\s+\S/.test(lines[i])) {
            items[items.length - 1] += ` ${lines[i].trim()}`;
            i += 1;
            continue;
          }
          break;
        }
        items.push(item[1]);
        i += 1;
      }

      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    // Paragraph: consecutive lines up to a blank one or the start of another
    // block, joined — markdown's soft-wrap rule.
    const body = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i], lines[i + 1])) {
      body.push(lines[i].trim());
      i += 1;
    }
    if (body.length) out.push(`<p>${inline(body.join(' '))}</p>`);
    else i += 1;
  }

  return out;
}

function startsBlock(line, next) {
  return (
    /^```/.test(line) ||
    /^#{1,6}\s/.test(line) ||
    /^>\s?/.test(line) ||
    /^\s*([-*+]|\d+\.)\s+/.test(line) ||
    (line.trimStart().startsWith('|') && isDelimiterRow(next))
  );
}

function isDelimiterRow(line) {
  return Boolean(line) && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-');
}

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function alignments(delimiter) {
  return cells(delimiter).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return ' style="text-align:center"';
    if (right) return ' style="text-align:right"';
    return '';
  });
}

function table(header, aligns, rows) {
  const head = header.map((c, n) => `<th${aligns[n] ?? ''}>${inline(c)}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${row.map((c, n) => `<td${aligns[n] ?? ''}>${inline(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

// --- inline level ------------------------------------------------------------

function inline(text) {
  const codes = [];

  // Lifted out before anything else runs, and restored last — see the header
  // note. The placeholder is a NUL, which cannot appear in the source at this
  // point because escapeHtml has not introduced one and markdown files do not
  // carry them.
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `${CODE_PLACEHOLDER}${codes.length - 1}${CODE_PLACEHOLDER}`;
  });

  out = out
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, href) => {
      const url = safeUrl(href);
      return url ? `<a href="${url}">${label}</a>` : whole;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, '$1<em>$2</em>')
    .replace(/(^|[^\w_])_([^_\n]+)_(?![\w_])/g, '$1<em>$2</em>');

  return out.replace(
    new RegExp(`${CODE_PLACEHOLDER}(\\d+)${CODE_PLACEHOLDER}`, 'g'),
    (_, n) => `<code>${codes[Number(n)]}</code>`,
  );
}

// Only schemes that cannot execute script. `javascript:` and `data:` are the
// two that matter; anything unrecognised is left as plain text by the caller
// rather than linked.
function safeUrl(href) {
  const url = href.trim();
  if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(url)) return url;
  if (/^[\w.-]+(\/|$)/.test(url) && !url.includes(':')) return url;
  return null;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
