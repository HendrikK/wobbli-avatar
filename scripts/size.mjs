// Package size check: the gzipped size of each entry with the chunks it imports up front (not the ones it loads
// on demand), against sizes.json. Fails when an entry grows more than 10% past its recorded size, or when the
// core entry pulls in holiday code. `node scripts/size.mjs --record` writes the current sizes.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const FILE = path.join(ROOT, 'sizes.json');
const read = f => fs.readFileSync(path.join(DIST, f), 'utf8');
const staticImports = f => [...read(f).matchAll(/(?:^|[;\s}])(?:import|export)[^'"()]*?from\s*['"]\.\/([^'"]+)['"]/g)].map(m => m[1]);
function closure(entry) {
  const seen = new Set([entry]), todo = [entry];
  while (todo.length) for (const d of staticImports(todo.pop())) if (!seen.has(d)) { seen.add(d); todo.push(d); }
  return [...seen];
}
const gz = files => zlib.gzipSync(files.map(read).join('\n'), { level: 9 }).length;
const ENTRIES = ['index.js', 'element.js', 'dom.js', 'react.js', 'holidays.js', 'formats.js', 'styles.css'];
const now = {};
const problems = [];
for (const e of ENTRIES) {
  const files = e.endsWith('.css') ? [e] : closure(e);
  now[e] = gz(files);
  if (e === 'index.js' || e === 'element.js' || e === 'dom.js' || e === 'react.js') {
    const holiday = files.filter(f => /hol-|holidays/.test(f) || /"newyear"|holidays:shared/.test(read(f)));
    if (holiday.length) problems.push(e + ' pulls in holiday code: ' + holiday.join(', '));
  }
}
// what loads later, for the record
const lazy = fs.readdirSync(DIST).filter(f => /^(group|hol)-.*\.js$/.test(f)).sort();
const later = Object.fromEntries(lazy.map(f => [f.replace(/-[A-Z0-9]{8}\.js$/, ''), gz([f])]));
if (process.argv.includes('--record')) {
  fs.writeFileSync(FILE, JSON.stringify({ note: 'Gzipped bytes per entry with its up-front imports. Update with: pnpm size --record', entries: now, lazy: later }, null, 2) + '\n');
  console.log('recorded', now);
} else {
  const rec = JSON.parse(fs.readFileSync(FILE, 'utf8')).entries;
  for (const e of ENTRIES) {
    const limit = Math.round(rec[e] * 1.1);
    const ok = now[e] <= limit;
    console.log((ok ? 'ok  ' : 'FAIL') + ' ' + e.padEnd(12) + String(now[e]).padStart(7) + ' B gz (recorded ' + rec[e] + ', limit ' + limit + ')');
    if (!ok) problems.push(e + ' is ' + now[e] + ' B, over its limit of ' + limit + ' B');
  }
  console.log('lazy chunks:', Object.entries(later).map(([k, v]) => k + ' ' + v).join(', '));
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
