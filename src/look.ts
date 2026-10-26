// GENERATOR 1: the name-to-look mapping. Blobatar 2.7.0's geometry plus the style tables below.
// Frozen for the whole of package version 1: the golden fixtures in test/fixtures pin its output,
// and any change that would alter an avatar ships as generator 2 in package version 2.
import { _layout, _normalizeSeed, _posed, _traits } from './vendor/blobatar.js';
import { circleBounds, pathBounds } from './path.js';
import { autoEye, normHex, r2 } from './util.js';

export const GENERATOR = 1 as const;
/** Generators this build can draw. */
export const GENERATORS: readonly number[] = [1];

export const SHAPE_BANDS = [['round', 0.22], ['organic', 0.48], ['boxy', 0.6], ['capsule', 0.7], ['nub', 0.79], ['cloud', 0.86], ['droplet', 0.915], ['hexagon', 0.95], ['sun', 0.98], ['triangle', 1]] as const;
export type ShapeName = (typeof SHAPE_BANDS)[number][0];
export const SHAPES: ShapeName[] = SHAPE_BANDS.map(b => b[0]);
/** The trait value a pinned shape uses: the middle of its band. */
export const SHAPE_MID: Record<ShapeName, number> = Object.fromEntries(
  SHAPE_BANDS.map((b, i) => [b[0], Math.round((((i ? SHAPE_BANDS[i - 1][1] : 0) + b[1]) / 2) * 10000) / 10000])
) as Record<ShapeName, number>;

/** The traits the studio exposes, in its order. Each is 0 to 1. */
export const TRAITS = ['body.r', 'body.ratio', 'body.n', 'body.rot', 'capsule.squat', 'poly.round', 'eye.rx', 'eye.ratio', 'eye.n', 'eye.gap', 'eye.lean', 'gaze.x', 'gaze.y'] as const;
export type TraitKey = (typeof TRAITS)[number];

// ---------- style tables (part of generator 1) ----------
export const HAIRS = ['none', 'short', 'sweep', 'curly', 'spiky', 'bob', 'long', 'bun'] as const;
export const FACIAL_HAIR = ['none', 'stubble', 'moustache', 'goatee', 'full'] as const;
export const CLOTHES = ['none', 'tee', 'shirt', 'hoodie', 'sweater', 'suit'] as const;
export const GLASSES = ['none', 'round', 'square', 'shades'] as const;
export const HAIR_COLORS = ['#1F1A19', '#4A3020', '#7A4E2D', '#A8502E', '#D8B26E', '#9EA0A3', '#EDEDED', '#E07BAF', '#5B8DEF'] as const;
export const CLOTHES_COLORS = ['#2E3440', '#C8CCD0', '#F4F3EF', '#2F4A7A', '#3E6B4F', '#B5443B', '#E0A93B', '#B7B4F2', '#E78FB3'] as const;
export type Hair = (typeof HAIRS)[number];
export type FacialHair = (typeof FACIAL_HAIR)[number];
export type Clothes = (typeof CLOTHES)[number];
export type Glasses = (typeof GLASSES)[number];

export interface Style {
  hair: Hair;
  hairColor: string;
  facialHair: FacialHair;
  eyebrows: boolean;
  clothes: Clothes;
  clothesColor: string;
  glasses: Glasses;
}
export const STYLE_KEYS = ['hair', 'hairColor', 'facialHair', 'eyebrows', 'clothes', 'clothesColor', 'glasses'] as const;

// [value, weight]. The hash keys keep the prototype's names (beard, brows) so the picks stay the same.
const STYLE_TABLE: Record<keyof Style, { seed: string; items: [unknown, number][] }> = {
  hair: { seed: 'hair', items: [['none', 2], ['short', 4], ['sweep', 3], ['curly', 3], ['spiky', 2], ['bob', 3], ['long', 3], ['bun', 2]] },
  hairColor: { seed: 'hairColor', items: [['#1F1A19', 4], ['#4A3020', 4], ['#7A4E2D', 3], ['#A8502E', 2], ['#D8B26E', 3], ['#9EA0A3', 1], ['#EDEDED', 1], ['#E07BAF', 1], ['#5B8DEF', 1]] },
  facialHair: { seed: 'beard', items: [['none', 10], ['stubble', 2], ['moustache', 2], ['goatee', 2], ['full', 3]] },
  eyebrows: { seed: 'brows', items: [[true, 6], [false, 4]] },
  clothes: { seed: 'clothes', items: [['none', 1], ['tee', 4], ['shirt', 3], ['hoodie', 3], ['sweater', 3], ['suit', 2]] },
  clothesColor: { seed: 'clothesColor', items: CLOTHES_COLORS.map(c => [c, 1] as [unknown, number]) },
  glasses: { seed: 'glasses', items: [['none', 6], ['round', 2], ['square', 2], ['shades', 1]] }
};
export const NO_STYLE: Style = { hair: 'none', hairColor: '#1F1A19', facialHair: 'none', eyebrows: false, clothes: 'none', clothesColor: '#2E3440', glasses: 'none' };

// FNV-1a of "style:<key>:<name>" against fixed weights
function hashStr(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function weighted<T>(seed: string, items: [T, number][]): T {
  const tot = items.reduce((n, x) => n + x[1], 0);
  let r = (hashStr(seed) / 4294967296) * tot;
  for (const [v, w] of items) { r -= w; if (r < 0) return v; }
  return items[items.length - 1][0];
}

/** Names are trimmed and capped at 40 characters (code points) before anything else. */
export const MAX_NAME = 40;
export function cleanName(name: unknown): string {
  return Array.from(String(name ?? '').trim()).slice(0, MAX_NAME).join('').trim();
}
/** The seed both the body and the style hash: Unicode NFC, trimmed, lower case (Blobatar's rule). */
export const normalizeName = (name: string): string => _normalizeSeed(cleanName(name));

/** The style a name gives when "style from the name" is on. */
export function styleFromName(name: string): Style {
  const n = normalizeName(name);
  const o = {} as Record<keyof Style, unknown>;
  (Object.keys(STYLE_TABLE) as (keyof Style)[]).forEach(k => { o[k] = weighted('style:' + STYLE_TABLE[k].seed + ':' + n, STYLE_TABLE[k].items); });
  return o as unknown as Style;
}

/** The name's own trait values (0 to 1), before any pin. */
export function traitsOf(name: string): Record<TraitKey | 'shape', number> {
  const t = _traits(cleanName(name));
  const o = { shape: t('shape') } as Record<TraitKey | 'shape', number>;
  TRAITS.forEach(k => { o[k] = t(k); });
  return o;
}

// ---------- pins and the look ----------
export interface Pins {
  shape?: ShapeName | null;
  /** Trait values, 0 to 1: the studio's 13, or any of Blobatar's own keys for hand-made looks. */
  traits?: Partial<Record<TraitKey, number>> & Record<string, number | undefined>;
  /** Body colour, hex. Overrides the name's colour. */
  color?: string | null;
  /** Eye colour, hex. With only `color` pinned, the eyes pick near-black or near-white for contrast. */
  eyeColor?: string | null;
  /** Let the name pick hair, facial hair, clothes and glasses. Off by default. */
  styleFromName?: boolean;
  hair?: Hair | null;
  hairColor?: string | null;
  facialHair?: FacialHair | null;
  eyebrows?: boolean | null;
  clothes?: Clothes | null;
  clothesColor?: string | null;
  glasses?: Glasses | null;
}

export interface EyeGeo { d: string; cx: number; cy: number; rot: number; rx: number; ry: number }
export interface Look {
  generator: 1;
  /** The name as used: trimmed, at most 40 characters. */
  name: string;
  /** The hashed form of the name. */
  seed: string;
  /** Stable key for caching: same key, same drawing. */
  key: string;
  shape: ShapeName;
  head: string;
  eye: string;
  /** The traits as drawn (the name's, with pins on top). */
  traits: Record<TraitKey | 'shape', number>;
  /** Body markup: Blobatar's circles and paths, no fill. */
  body: string;
  /** The body as one path (circles turned into arcs). */
  bodyPath: string;
  /** Body bounds [x0, y0, x1, y1] in the 100 x 100 view box. */
  bb: [number, number, number, number];
  eyes: [EyeGeo, EyeGeo];
  style: Style;
}

const marksMarkup = (marks: { kind: string; cx?: number; cy?: number; r?: number; d?: string }[]) =>
  marks.map(m => (m.kind === 'circle' ? '<circle cx="' + m.cx + '" cy="' + m.cy + '" r="' + m.r + '"></circle>' : '<path d="' + m.d + '"></path>')).join('');
// winding of a path's points, so circles joined into one outline turn the same way and never punch a hole
function sweepOf(d: string) {
  const n = d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || [], pts: [number, number][] = [];
  let a = 0;
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([+n[i], +n[i + 1]]);
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a >= 0 ? 1 : 0;
}
const circleD = (m: { cx: number; cy: number; r: number }, sw: number) =>
  'M' + r2(m.cx - m.r) + ' ' + m.cy + 'a' + m.r + ' ' + m.r + ' 0 1 ' + sw + ' ' + r2(2 * m.r) + ' 0a' + m.r + ' ' + m.r + ' 0 1 ' + sw + ' ' + r2(-2 * m.r) + ' 0Z';

function resolveStyle(name: string, pins: Pins): Style {
  const base = pins.styleFromName ? styleFromName(name) : NO_STYLE;
  const pick = <K extends keyof Style>(k: K, ok: (v: unknown) => boolean): Style[K] => {
    const v = pins[k];
    return v != null && ok(v) ? (v as Style[K]) : base[k];
  };
  const hex = (v: unknown) => !!normHex(v);
  const s: Style = {
    hair: pick('hair', v => (HAIRS as readonly unknown[]).includes(v)),
    hairColor: pick('hairColor', hex),
    facialHair: pick('facialHair', v => (FACIAL_HAIR as readonly unknown[]).includes(v)),
    eyebrows: pick('eyebrows', v => typeof v === 'boolean'),
    clothes: pick('clothes', v => (CLOTHES as readonly unknown[]).includes(v)),
    clothesColor: pick('clothesColor', hex),
    glasses: pick('glasses', v => (GLASSES as readonly unknown[]).includes(v))
  };
  s.hairColor = normHex(s.hairColor) as string;
  s.clothesColor = normHex(s.clothesColor) as string;
  return s;
}

const CACHE = new Map<string, Look>();

/**
 * Generator 1: a name (and optional pins) to a look. Pure and deterministic: no browser, no randomness.
 * Pins sit on top of the name's choices and never feed back into them.
 */
export function look(name: string, pins: Pins = {}): Look {
  const n = cleanName(name);
  const tm: Record<string, number> = {};
  if (pins.traits) for (const k of Object.keys(pins.traits).sort()) { const v = pins.traits[k]; if (typeof v === 'number' && isFinite(v)) tm[k] = Math.max(0, Math.min(0.999, v)); }
  if (pins.shape && SHAPE_MID[pins.shape] !== undefined) tm.shape = SHAPE_MID[pins.shape];
  const pal: { head?: string; eye?: string } = {};
  const color = normHex(pins.color), eyeColor = normHex(pins.eyeColor);
  if (color) pal.head = color;
  if (eyeColor) pal.eye = eyeColor;
  else if (color) pal.eye = autoEye(color);
  const style = resolveStyle(n, pins);
  const key = JSON.stringify([n, tm, pal, style]);
  const hit = CACHE.get(key);
  if (hit) return hit;

  const opts = { traits: tm, palette: pal };
  const P = _posed(n, opts), L = _layout(n, opts);
  // tight bounds from the path maths (the prototype measured them with getBBox)
  let bb: [number, number, number, number] | null = null;
  for (const m of P.marks) {
    const b = m.kind === 'circle' ? circleBounds(m.cx as number, m.cy as number, m.r as number) : pathBounds(m.d as string);
    if (!b) continue;
    bb = bb ? [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])] : b;
  }
  if (!bb || !(bb[2] - bb[0] > 1)) { const B = L.body; bb = [B.cx - B.rx, B.cy - B.ry, B.cx + B.rx, B.cy + B.ry]; }
  bb = bb.map(r2) as [number, number, number, number];
  const paths = P.marks.filter(m => m.kind === 'path');
  const sw = paths.length ? sweepOf(paths[paths.length - 1].d as string) : 1;
  const fr = P.eyeFrames;
  const eye = (i: 0 | 1): EyeGeo => ({ d: P.eyes[i].d as string, cx: r2(fr[i].cx), cy: r2(fr[i].cy), rot: r2(fr[i].rot), rx: r2(fr[i].rx), ry: r2(fr[i].ry) });
  const t = _traits(n, true, tm);
  const traits = { shape: t('shape') } as Record<TraitKey | 'shape', number>;
  TRAITS.forEach(k => { traits[k] = t(k); });
  const out: Look = {
    generator: GENERATOR,
    name: n,
    seed: _normalizeSeed(n),
    key,
    shape: L.shape as ShapeName,
    head: P.fill.head,
    eye: P.fill.eye,
    traits,
    body: marksMarkup(P.marks),
    bodyPath: P.marks.map(m => (m.kind === 'circle' ? circleD(m as { cx: number; cy: number; r: number }, sw) : m.d)).join(''),
    bb,
    eyes: [eye(0), eye(1)],
    style
  };
  if (CACHE.size > 200) CACHE.clear();
  CACHE.set(key, out);
  return out;
}
