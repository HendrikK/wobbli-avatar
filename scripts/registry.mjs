// Writes the shadcn registry item (wobbli.dev/r/wobbli.json) from registry/wobbli.tsx.
// Usage: node scripts/registry.mjs <out dir>
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'dist/r'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const item = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'wobbli',
  type: 'registry:component',
  title: 'Wobbli',
  description: pkg.description,
  dependencies: [pkg.name + '@^' + pkg.version.replace(/-.*$/, '')],
  files: [{ path: 'registry/wobbli.tsx', type: 'registry:component', target: 'components/wobbli.tsx', content: fs.readFileSync(path.join(ROOT, 'registry/wobbli.tsx'), 'utf8') }]
};
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'wobbli.json'), JSON.stringify(item, null, 2) + '\n');
console.log('wrote', path.join(out, 'wobbli.json'));
