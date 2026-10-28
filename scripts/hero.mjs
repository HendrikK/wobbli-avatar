// The README hero: six avatars acting out agent events, drawn by the built package into one animated SVG per
// colour scheme (docs/hero-light.svg, docs/hero-dark.svg). No script in the SVG: each avatar's frames sit on top
// of each other and a CSS loop shows one at a time, so it plays inside GitHub's <img>. Run `pnpm build` first.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { look, frame, skeleton, describe, preload, allCss, EVENTS_DATA, styleText } = await import(path.join(ROOT, 'dist/index.js'));
await preload();

// One column per name; each shows three events, four seconds each.
const CAST = [
  ['atlas', [['session.start', 'grwave'], ['message.sent', 'read'], ['stream.end', 'hop']]],
  ['otto', [['tool.search', 'seradar'], ['tool.analyze', 'anbars'], ['stream.start', 'wrpencil']]],
  ['pixel', [['input.unclear', 'tilt'], ['instruction.ack', 'gibulb'], ['tool.build', 'buhammer']]],
  ['miso', [['tool.query', 'qusql'], ['tool.sync', 'sygears'], ['approval.needed', 'apbell']]],
  ['ziggy', [['error.network', 'ofwifi'], ['error.no_results', 'rain'], ['stream.end', 'dance']]],
  ['juniper', [['tool.download', 'dlchute'], ['tool.upload', 'ulrocket'], ['session.end', null]]]
];
const PHASE = 4, STAGGER = 0.2, LOOP = PHASE * 3;
const W = 1200, H = 252, COL = W / CAST.length, SIZE = 132, TOP = 18;
const THEMES = {
  light: { ink: '#3A3833', muted: '#857D70', pill: '#3A3833', pillOpacity: 0.07 },
  dark: { ink: '#E6E1D6', muted: '#A39C8F', pill: '#E6E1D6', pillOpacity: 0.1 }
};

const stateOf = event => EVENTS_DATA.events.find(e => e.event === event).state;
const escXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Top-level CSS blocks, with @media bodies filtered the same way.
function blocks(css) {
  const out = [];
  let depth = 0, start = 0, open = -1;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') { if (!depth) open = i; depth++; }
    else if (css[i] === '}' && !--depth) { out.push([css.slice(start, open).trim(), css.slice(open + 1, i)]); start = i + 1; }
  }
  return out;
}
const splitTop = sel => {
  const parts = [];
  let depth = 0, last = 0;
  for (let i = 0; i < sel.length; i++) {
    if (sel[i] === '(') depth++; else if (sel[i] === ')') depth--;
    else if (sel[i] === ',' && !depth) { parts.push(sel.slice(last, i)); last = i + 1; }
  }
  return parts.concat(sel.slice(last)).map(s => s.trim()).filter(Boolean);
};

// Keeps the rules for the states, variants and costumes drawn here, and the keyframes those rules use.
function trimCss(css, used) {
  const keep = sel => (sel.match(/\.(?:st|v|hol|cos|zy)-[\w-]+/g) || []).every(c => used.has(c.slice(1)));
  const rules = list => list.flatMap(([pre, body]) => {
    if (pre.startsWith('@keyframes')) return [[pre, body]];
    if (pre.startsWith('@')) { const inner = rules(blocks(body)); return inner.length ? [[pre, inner]] : []; }
    const sels = splitTop(pre).filter(keep);
    return sels.length ? [[sels.join(', '), body.trim()]] : [];
  });
  const kept = rules(blocks(css));
  const text = list => list.map(([pre, body]) => pre + ' { ' + (Array.isArray(body) ? text(body) : body) + ' }').join('\n');
  const named = new Set(text(kept.filter(([pre]) => !pre.startsWith('@keyframes'))).match(/aa-[\w-]+/g));
  return text(kept.filter(([pre]) => !pre.startsWith('@keyframes') || named.has(pre.split(/\s+/)[1])));
}

function hero(theme) {
  const t = THEMES[theme];
  const used = new Set();
  const cols = CAST.map(([name, steps], c) => {
    const l = look(name), cx = COL * c + COL / 2;
    return steps.map(([event, variant], k) => {
      const state = stateOf(event);
      const f = frame(l, state, variant || 'idle', { theme });
      f.className.split(' ').forEach(n => used.add(n));
      // always negative, so every frame starts part-way through the loop and none waits out a delay on load
      const delay = PHASE * k + STAGGER * c - LOOP;
      const label = describe(state, f.className.match(/ v-([\w-]+)/)[1]);
      const pill = event.length * 10.2 + 22;
      return '<g class="ph' + (k ? ' later' : '') + '" style="animation-delay: ' + delay.toFixed(2) + 's">' +
        '<svg x="' + (cx - SIZE / 2) + '" y="' + TOP + '" width="' + SIZE + '" height="' + SIZE + '" viewBox="0 0 100 100" overflow="visible">' +
        '<g class="' + f.className + '" style="' + escXml(styleText(f.style)) + '">' + skeleton(l, undefined, f) + '</g></svg>' +
        '<rect x="' + (cx - pill / 2) + '" y="' + (TOP + SIZE + 34) + '" width="' + pill + '" height="30" rx="15" class="pill"/>' +
        '<text x="' + cx + '" y="' + (TOP + SIZE + 54) + '" class="ev">' + escXml(event) + '</text>' +
        '<text x="' + cx + '" y="' + (TOP + SIZE + 86) + '" class="st">' + escXml(label) + '</text></g>';
    }).join('');
  });
  const css = trimCss(allCss().map(c => c.css).join('\n') + '\n' + fs.readFileSync(path.join(ROOT, 'data/runtime.css'), 'utf8'), used);
  const own = [
    '.ph { animation: hero-phase ' + LOOP + 's linear infinite; }',
    '.ph.later { opacity: 0; }',
    '@keyframes hero-phase { 0% { opacity: 0; } 2%, 31% { opacity: 1; } 33.4%, 100% { opacity: 0; } }',
    '@media (prefers-reduced-motion: reduce) { .ph { animation: none; } }',
    'text { text-anchor: middle; }',
    '.ev { font: 600 17px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ' + t.ink + '; }',
    '.st { font: 500 16px system-ui, -apple-system, "Segoe UI", sans-serif; fill: ' + t.muted + '; }',
    '.pill { fill: ' + t.pill + '; fill-opacity: ' + t.pillOpacity + '; }'
  ].join('\n');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-labelledby="title">' +
    '<title id="title">Six Wobbli avatars acting out agent events: greeting, reading, searching, building, going offline and more</title>' +
    '<style>\n' + css + '\n' + own + '\n</style>\n' + cols.join('\n') + '\n</svg>\n';
}

for (const theme of Object.keys(THEMES)) {
  const file = path.join(ROOT, 'docs', 'hero-' + theme + '.svg');
  fs.writeFileSync(file, hero(theme));
  console.log('wrote', path.relative(ROOT, file), (fs.statSync(file).size / 1024).toFixed(1) + ' KB');
}
