// Generator suite: generator 1 must reproduce the 64 golden names exactly (bounding box to 0.01), never
// throw, and keep Blobatar's shape shares. A change to any of this is a new generator (docs/DESIGN.md, name contract).
import { describe, expect, test } from 'vitest';
import fx from './fixtures/generator-1.json';
import { GENERATOR, SHAPE_BANDS, SHAPES, look, normalizeName, styleFromName, traitsOf } from '../src/index';

type Case = (typeof fx.cases)[number];
const cases = fx.cases as Case[];
const HEX = /^#[0-9a-f]{6}$/i;

describe('golden fixtures', () => {
  test('the fixtures are generator 1, as this package is', () => {
    expect(fx.generator).toBe(1);
    expect(GENERATOR).toBe(1);
    expect(cases).toHaveLength(64);
  });

  test.each(cases.map(c => [JSON.stringify(c.name), c] as const))('%s', (_n, c) => {
    const L = look(c.name);
    // 14 trait values at full precision
    expect(traitsOf(c.name)).toEqual(c.traits);
    expect(L.shape).toBe(c.shape);
    expect(L.head).toBe(c.head);
    expect(L.eye).toBe(c.eye);
    expect(L.bodyPath).toBe(c.body);
    L.bb.forEach((v, i) => expect(Math.abs(v - c.bb[i])).toBeLessThanOrEqual(0.01 + 1e-9));
    expect(L.eyes.map(e => [e.d, e.cx, e.cy, e.rot])).toEqual(c.eyes);
    expect({ rx: L.eyes.map(e => e.rx), ry: L.eyes.map(e => e.ry) }).toEqual(c.eyeRadii);
    // the style "style from the name" gives (the fixture keeps the prototype's key names)
    const s = styleFromName(c.name);
    expect({ hair: s.hair, hairColor: s.hairColor, beard: s.facialHair, brows: s.eyebrows, clothes: s.clothes, clothesColor: s.clothesColor, glasses: s.glasses }).toEqual(c.style);
  });
});

describe('the name is normalised', () => {
  test('case, spaces and Unicode form give the same avatar, body and style alike', () => {
    const a = look('nova', { styleFromName: true });
    for (const n of ['Nova', 'NOVA', ' nova ', 'nova\t']) {
      const b = look(n, { styleFromName: true });
      expect(b.bodyPath).toBe(a.bodyPath);
      expect(b.head).toBe(a.head);
      expect(b.style).toEqual(a.style);
    }
    expect(look('café').bodyPath).toBe(look('café').bodyPath);
    expect(normalizeName('  Zoë ')).toBe('zoë');
  });
  test('names are capped at 40 characters', () => {
    const long = 'x'.repeat(40);
    expect(look(long + 'yyyy').bodyPath).toBe(look(long).bodyPath);
    expect(look(long + 'yyyy').name).toBe(long);
  });
});

describe('pins sit on top', () => {
  test('a pinned trait, shape, colour or style overrides the name and never feeds back', () => {
    const base = look('atlas');
    const pinned = look('atlas', { shape: 'hexagon', color: '#FF8F66', traits: { 'eye.rx': 0.9 }, hair: 'bun' });
    expect(pinned.shape).toBe('hexagon');
    expect(pinned.head).toBe('#FF8F66');
    expect(pinned.style.hair).toBe('bun');
    expect(pinned.traits['eye.rx']).toBeCloseTo(0.9, 6);
    // the unpinned look is untouched
    expect(look('atlas')).toBe(base);
    expect(look('atlas').shape).toBe(base.shape);
    // the other traits still come from the name
    expect(pinned.traits['gaze.x']).toBe(base.traits['gaze.x']);
  });
  test('style from the name is off by default', () => {
    expect(look('agent-39').style.hair).toBe('none');
    expect(look('agent-39', { styleFromName: true }).style.hair).toBe('spiky');
  });
});

describe('10,000 random names', () => {
  // a small seeded generator, so the run is the same every time
  let seed = 12345;
  const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
  const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.@ éüßøłçñ東京김민수प्रियाمرحبا🤖';
  const chars = Array.from(ALPHA);
  const names = Array.from({ length: 10000 }, (_, i) => {
    const n = 1 + Math.floor(rnd() * 24);
    let s = '';
    for (let j = 0; j < n; j++) s += chars[Math.floor(rnd() * chars.length)];
    return s + (i % 7 === 0 ? '-' + i : '');
  });

  test('never throw and always give a valid shape and colours', () => {
    const counts: Record<string, number> = {};
    for (const n of names) {
      const L = look(n);
      expect(SHAPES).toContain(L.shape);
      expect(L.head).toMatch(HEX);
      expect(L.eye).toMatch(HEX);
      expect(L.bb[2] - L.bb[0]).toBeGreaterThan(1);
      counts[L.shape] = (counts[L.shape] || 0) + 1;
    }
    // shape shares match Blobatar's bands within 2 points
    SHAPE_BANDS.forEach((b, i) => {
      const want = (b[1] - (i ? SHAPE_BANDS[i - 1][1] : 0)) * 100;
      const got = ((counts[b[0]] || 0) / names.length) * 100;
      expect(Math.abs(got - want)).toBeLessThanOrEqual(2);
    });
  });
});
