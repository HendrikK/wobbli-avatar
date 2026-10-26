// The drawing geometry of one look: where every state prop and costume part hangs from.
// Same maths as the prototype's design boards (holes()), computed once per look.
import type { Look } from './look.js';
import { samplePath } from './path.js';
import { r1 } from './util.js';

export type EyeTuple = [d: string, cx: number, cy: number, rot: number];
export interface Geo {
  look: Look;
  key: string;
  head: string;
  eye: string;
  body: string;
  bodyD: string;
  bb: [number, number, number, number];
  l: EyeTuple;
  r: EyeTuple;
  ery: [number, number];
  erx: [number, number];
  H: Record<string, string | number>;
  /** Filled part templates, by template. */
  filled: Map<string, string>;
  /** Style layers by style signature. */
  stc?: Map<string, unknown>;
  sg?: unknown;
  /** Radius of the head outline by angle (lazy). */
  rAt?: (a: number) => number;
}

const shade = (x: number, y: number) => 'M' + r1(x - 8) + ' ' + r1(y - 5) + 'H' + r1(x + 8) + 'V' + r1(y) + 'Q' + r1(x + 8) + ' ' + r1(y + 5) + ' ' + r1(x + 3) + ' ' + r1(y + 5) + 'H' + r1(x - 3) + 'Q' + r1(x - 8) + ' ' + r1(y + 5) + ' ' + r1(x - 8) + ' ' + r1(y) + 'Z';
const circ = (x: number, y: number, r: number) => 'M' + r1(x - r) + ' ' + r1(y) + 'A' + r + ' ' + r + ' 0 1 1 ' + r1(x + r) + ' ' + r1(y) + 'A' + r + ' ' + r + ' 0 1 1 ' + r1(x - r) + ' ' + r1(y) + 'Z';
const cup = (x: number, y: number) => 'M' + r1(x - 4) + ' ' + r1(y - 8) + 'H' + r1(x + 4) + 'V' + r1(y + 8) + 'H' + r1(x - 4) + 'Z';

function holes(g: Pick<Geo, 'l' | 'r' | 'bb' | 'head' | 'eye' | 'bodyD'>): Record<string, string | number> {
  const l = g.l, r = g.r, b = g.bb, mid = (b[1] + b[3]) / 2;
  const lex = l[1], ley = l[2], rex = r[1], rey = r[2], low = Math.max(ley, rey), hi = Math.min(ley, rey);
  const mx = r1((lex + rex) / 2), my = r1(low + 13);
  return {
    head: g.head, eye: g.eye, body: g.bodyD, ld: l[0], rd: r[0],
    base: b[3], mid: r1(mid), up: r1(b[1] - 16), dn: r1(b[3] - 81), mo: r1(mid - 48), side: r1(b[2] - 81),
    top: r1(b[1] + 1), hat: r1(b[1] + 8), ls: r1(b[0] - 18.5),
    neck: r1(low + 17), nws: Math.round((((b[2] - b[0]) / 2 - 4) / 27) * 100) / 100,
    mx, my, smx: r1(mx + 6), nsy: r1(low + 9.5), bty: r1(low + 19), pinx: r1(lex - 5), piny: r1(low + 14),
    hgb: 'M' + r1(lex + 6) + ' ' + r1(ley - 4) + 'Q' + mx + ' ' + r1(hi - 7) + ' ' + r1(rex - 6) + ' ' + r1(rey - 4),
    sgd: shade(lex, ley) + shade(rex, rey),
    sgb: 'M' + r1(lex + 7) + ' ' + r1(ley - 3) + 'Q' + mx + ' ' + r1(hi - 6) + ' ' + r1(rex - 7) + ' ' + r1(rey - 3),
    fg: 'M' + r1(mx - 5) + ' ' + r1(my - 3) + 'l1.7 4.5l1.7 -4.5ZM' + r1(mx + 1.6) + ' ' + r1(my - 3) + 'l1.7 4.5l1.7 -4.5Z',
    wsk: 'M' + r1(lex - 6) + ' ' + r1(ley + 8) + 'l-10 -2M' + r1(lex - 6) + ' ' + r1(ley + 11) + 'l-10 1.5M' + r1(rex + 6) + ' ' + r1(rey + 8) + 'l10 -2M' + r1(rex + 6) + ' ' + r1(rey + 11) + 'l10 1.5',
    s1x: r1(lex - 9), s1y: r1(ley + 13), s2x: r1(rex + 8), s2y: r1(rey - 11), s3x: r1(mx + 3), s3y: r1(low + 20), s4x: r1(lex + 1), s4y: r1(hi - 13),
    ck1: r1(lex - 3), ck2: r1(rex + 3), cky: r1((ley + rey) / 2 + 11),
    tx: r1(rex + 2), ty: r1(rey + 11), lx: r1((lex + rex) / 2), ly: r1((ley + rey) / 2),
    lex, ley, rex, rey,
    swx: r1(b[2] - 10), swy: r1(b[1] + 13), medy: r1(b[3] - 14),
    spd: 'M' + r1(b[0] - 14) + ' ' + r1(mid - 10) + 'H' + r1(b[0] - 4) + 'M' + r1(b[0] - 17) + ' ' + r1(mid) + 'H' + r1(b[0] - 5) + 'M' + r1(b[0] - 14) + ' ' + r1(mid + 10) + 'H' + r1(b[0] - 4),
    shx1: r1(lex + 1.4), shy1: r1(ley - 3), shx2: r1(rex + 1.4), shy2: r1(rey - 3),
    bandx: r1(b[2] - 17), bandy: r1(b[1] + 11), bkx: r1(b[2] - 8), bky: r1(b[1] + 3),
    nx: r1((lex + rex) / 2 + 4), ny: r1(low + 8), wkx: r1(rex + 10), wky: r1(rey - 9),
    gd: circ(lex, ley, 7.5) + circ(rex, rey, 7.5) + 'M' + r1(lex + 7.5) + ' ' + ley + 'Q' + r1((lex + rex) / 2) + ' ' + r1(hi - 3) + ' ' + r1(rex - 7.5) + ' ' + rey,
    bnd: circ(lex, ley, 7.8) + circ(rex, rey, 7.8) + 'M' + lex + ' ' + r1(ley - 3) + 'H' + rex + 'V' + r1(rey + 3) + 'H' + lex + 'Z',
    hpd: 'M' + r1(b[0] + 3) + ' ' + r1(ley + 2) + 'C' + r1(b[0] + 1) + ' ' + r1(b[1] - 20) + ' ' + r1(b[2] - 1) + ' ' + r1(b[1] - 20) + ' ' + r1(b[2] - 3) + ' ' + r1(rey + 2),
    hpc: cup(b[0] + 2, ley + 2) + cup(b[2] - 2, rey + 2)
  };
}

const GEO = new WeakMap<Look, Geo>();
export function geoOf(look: Look): Geo {
  let g = GEO.get(look);
  if (g) return g;
  const [L, R] = look.eyes;
  const base = {
    look, key: look.key, head: look.head, eye: look.eye, body: look.body, bodyD: look.bodyPath, bb: look.bb,
    l: [L.d, L.cx, L.cy, L.rot] as EyeTuple, r: [R.d, R.cx, R.cy, R.rot] as EyeTuple,
    ery: [L.ry, R.ry] as [number, number], erx: [L.rx, R.rx] as [number, number], filled: new Map<string, string>()
  };
  g = { ...base, H: holes(base) };
  GEO.set(look, g);
  return g;
}

/** Fills a part template's {{a.key}} holes from the geometry. */
export function fillPart(g: Geo, t: string): string {
  let s = g.filled.get(t);
  if (s === undefined) {
    s = t.replace(/\{\{\s*a\.(\w+)\s*\}\}/g, (_m, k: string) => (g.H[k] === undefined ? '' : String(g.H[k])));
    if (g.filled.size > 400) g.filled.clear();
    g.filled.set(t, s);
  }
  return s;
}

/**
 * Radius of the head outline around (cx, cy) by angle, from 480 points spaced evenly along it
 * (96 angle bins, the largest radius in each, gaps filled from the ellipse).
 */
export function outlineR(d: string, cx: number, cy: number, rx: number, ry: number): (a: number) => number {
  const N = 96, R = new Array<number>(N).fill(0);
  for (const q of samplePath(d, 480)) {
    const a = Math.atan2(q[1] - cy, q[0] - cx);
    const k = ((Math.round((a / (2 * Math.PI)) * N) % N) + N) % N;
    R[k] = Math.max(R[k], Math.hypot(q[0] - cx, q[1] - cy));
  }
  for (let k = 0; k < N; k++) if (!R[k]) { const a = (k / N) * 2 * Math.PI; R[k] = 1 / Math.hypot(Math.cos(a) / rx, Math.sin(a) / ry); }
  return a => { const t = (((a / (2 * Math.PI)) * N) % N + N) % N, i = Math.floor(t), j = (i + 1) % N, u = t - i; return R[i] * (1 - u) + R[j] * u; };
}

/** Catmull-Rom through points, as cubic curves. */
export function smooth(pts: [number, number][]): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += 'C' + r1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + r1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + r1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + r1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + r1(p2[0]) + ' ' + r1(p2[1]);
  }
  return d;
}
