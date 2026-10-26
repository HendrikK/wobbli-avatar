// The optional mouth and hands. Both are drawn from the look's geometry, so they fit every shape.
import type { Geo } from './geo.js';

// ---------- mouth: one expression per state, with overrides for single ways of acting ----------
// Closed mouths are filled shapes in the eye colour. Open mouths have a dark inside, a coral tongue and white teeth,
// outlined in the eye colour, so a dark body gets a light outline.
const MT = '#EF6B6B', MI = '#2B171C', MW = '#FFFFFF';
const mN = (x: number) => Math.round(x * 100) / 100;
const MD = (...a: (number | string)[]) => a.map(x => (typeof x === 'number' ? mN(x) : x)).join(' ');
const mFill = (d: string, c: string, w?: number) => '<path d="' + d + '" fill="' + c + '"' + (w != null ? ' stroke-width="' + w + '"' : '') + '></path>';
const mLine = (d: string, w?: number) => '<path d="' + d + '" fill="none" stroke-width="' + (w || 2.6) + '"></path>';
const mEl = (cx: number, cy: number, rx: number, ry: number, c: string, w?: number) => '<ellipse cx="' + mN(cx) + '" cy="' + mN(cy) + '" rx="' + mN(rx) + '" ry="' + mN(ry) + '" fill="' + c + '"' + (w != null ? ' stroke-width="' + w + '"' : ' stroke="none"') + '></ellipse>';
const mRect = (x: number, y: number, w: number, h: number, rx: number, c: string, sw?: number) => '<rect x="' + mN(x) + '" y="' + mN(y) + '" width="' + mN(w) + '" height="' + mN(h) + '" rx="' + mN(rx) + '" fill="' + c + '"' + (sw != null ? ' stroke-width="' + sw + '"' : ' stroke="none"') + '></rect>';
// an open mouth: the inside, then teeth and tongue, then the outline on top
const openD = (d: string, extra?: string) => mFill(d, MI, 0) + (extra || '') + '<path d="' + d + '" fill="none" stroke-width="1.4"></path>';
const crescent = (h: number, w: number, up: number, dn: number, y0: number) => MD('M', -h * w, h * y0, 'Q', 0, h * dn, h * w, h * y0, 'Q', 0, h * up, -h * w, h * y0, 'Z');
const gritLines = (h: number, w: number, t: number) => '<path stroke="' + MI + '" stroke-width="1" d="' + MD('M', -h * w, 0, 'H', h * w, 'M', -h * w * 0.33, -h * t, 'V', h * t, 'M', h * w * 0.33, -h * t, 'V', h * t) + '"></path>';
export const MOUTHS: Record<string, (h: number, E: string) => string> = {
  smile: (h, E) => mFill(crescent(h, 0.78, 0.3, 0.74, -0.14), E, 1.2),
  bigsmile: (h, E) => mFill(crescent(h, 1, 0.42, 0.96, -0.3), E, 1.2),
  frown: (h, E) => mFill(MD('M', -h * 0.74, h * 0.46, 'Q', 0, -h * 0.42, h * 0.74, h * 0.46, 'Q', 0, -h * 0.02, -h * 0.74, h * 0.46, 'Z'), E, 1.2),
  pout: (h, E) => mFill(MD('M', -h * 0.46, h * 0.36, 'Q', 0, -h * 0.14, h * 0.46, h * 0.36, 'Q', 0, h * 0.1, -h * 0.46, h * 0.36, 'Z'), E, 1.2),
  smirk: (h, E) => mFill(MD('M', -h * 0.62, h * 0.18, 'Q', h * 0.1, h * 0.62, h * 0.78, -h * 0.34, 'Q', h * 0.12, h * 0.3, -h * 0.62, h * 0.18, 'Z'), E, 1.2),
  flat: (h, E) => mRect(-h * 0.55, -h * 0.05, h * 1.1, h * 0.34, h * 0.17, E, 1),
  tongue: (h, E) => mEl(h * 0.48, h * 0.3, h * 0.22, h * 0.28, MT, 1) + mFill(crescent(h, 0.7, 0.22, 0.55, -0.08), E, 1.2),
  cat: h => mLine(MD('M', -h * 0.8, -h * 0.1, 'Q', -h * 0.4, h * 0.6, 0, 0, 'Q', h * 0.4, h * 0.6, h * 0.8, -h * 0.1), 2.6),
  kiss: h => mLine(MD('M', -h * 0.05, -h * 0.44, 'Q', h * 0.46, -h * 0.34, h * 0.02, -h * 0.02, 'Q', h * 0.46, h * 0.3, -h * 0.05, h * 0.44), 2.6),
  pucker: h => mEl(h * 0.26, h * 0.12, h * 0.24, h * 0.26, MI, 2),
  grin: h => openD(MD('M', -h * 0.9, -h * 0.26, 'Q', 0, -h * 0.06, h * 0.9, -h * 0.26, 'C', h * 0.9, h * 0.6, h * 0.45, h * 0.95, 0, h * 0.95, 'C', -h * 0.45, h * 0.95, -h * 0.9, h * 0.6, -h * 0.9, -h * 0.26, 'Z'),
    mFill(MD('M', -h * 0.74, -h * 0.2, 'Q', 0, -h * 0.02, h * 0.74, -h * 0.2, 'L', h * 0.66, h * 0.08, 'Q', 0, h * 0.24, -h * 0.66, h * 0.08, 'Z'), MW, 0) + mEl(0, h * 0.68, h * 0.42, h * 0.2, MT)),
  laugh: h => openD(MD('M', -h, -h * 0.32, 'Q', 0, -h * 0.1, h, -h * 0.32, 'C', h, h * 0.8, h * 0.5, h * 1.2, 0, h * 1.2, 'C', -h * 0.5, h * 1.2, -h, h * 0.8, -h, -h * 0.32, 'Z'),
    mFill(MD('M', -h * 0.84, -h * 0.26, 'Q', 0, -h * 0.06, h * 0.84, -h * 0.26, 'L', h * 0.76, h * 0.04, 'Q', 0, h * 0.22, -h * 0.76, h * 0.04, 'Z'), MW, 0) + mEl(0, h * 0.9, h * 0.5, h * 0.25, MT)),
  talk: h => mRect(-h * 0.62, -h * 0.08, h * 1.24, h * 0.72, h * 0.32, MI) + mEl(0, h * 0.48, h * 0.4, h * 0.14, MT) + mRect(-h * 0.62, -h * 0.08, h * 1.24, h * 0.72, h * 0.32, 'none', 1.4),
  o: h => mEl(0, h * 0.28, h * 0.42, h * 0.55, MI) + mEl(0, h * 0.64, h * 0.24, h * 0.12, MT) + mEl(0, h * 0.28, h * 0.42, h * 0.55, 'none', 1.4),
  osmall: h => mEl(0, h * 0.14, h * 0.26, h * 0.32, MI, 1.3),
  hum: h => mEl(0, h * 0.14, h * 0.22, h * 0.28, MI, 1.3),
  sleepo: h => mEl(0, h * 0.12, h * 0.2, h * 0.24, MI, 1.3),
  scream: h => mEl(0, h * 0.36, h * 0.5, h * 0.8, MI) + mFill(MD('M', -h * 0.4, -h * 0.3, 'Q', 0, -h * 0.5, h * 0.4, -h * 0.3, 'L', h * 0.34, -h * 0.14, 'Q', 0, -h * 0.28, -h * 0.34, -h * 0.14, 'Z'), MW, 0) +
    mEl(0, h * 0.9, h * 0.3, h * 0.16, MT) + mEl(0, h * 0.36, h * 0.5, h * 0.8, 'none', 1.4),
  wail: h => openD(MD('M', -h * 0.75, h * 0.62, 'C', -h * 0.75, -h * 0.38, h * 0.75, -h * 0.38, h * 0.75, h * 0.62, 'Q', 0, h * 0.44, -h * 0.75, h * 0.62, 'Z'), mEl(0, h * 0.48, h * 0.36, h * 0.12, MT)),
  yell: h => openD(MD('M', -h * 0.85, -h * 0.22, 'H', h * 0.85, 'L', h * 0.6, h * 0.78, 'Q', 0, h * 0.92, -h * 0.6, h * 0.78, 'Z'),
    mFill(MD('M', -h * 0.8, -h * 0.18, 'H', h * 0.8, 'L', h * 0.74, h * 0.06, 'H', -h * 0.74, 'Z'), MW, 0) + mEl(0, h * 0.66, h * 0.36, h * 0.15, MT)),
  grit: h => mRect(-h * 0.85, -h * 0.32, h * 1.7, h * 0.66, h * 0.2, MW) + gritLines(h, 0.85, 0.32) + mRect(-h * 0.85, -h * 0.32, h * 1.7, h * 0.66, h * 0.2, 'none', 1.4),
  eek: h => { const d = MD('M', -h * 0.85, -h * 0.12, 'Q', 0, -h * 0.32, h * 0.85, -h * 0.12, 'L', h * 0.72, h * 0.34, 'Q', 0, h * 0.24, -h * 0.72, h * 0.34, 'Z'); return mFill(d, MW, 0) + gritLines(h, 0.75, 0.24) + '<path d="' + d + '" fill="none" stroke-width="1.4"></path>'; },
  nervous: h => mRect(-h * 0.75, -h * 0.28, h * 1.5, h * 0.62, h * 0.22, MW) + '<path fill="none" stroke="' + MI + '" stroke-width="1.1" d="' + MD('M', -h * 0.7, h * 0.03, 'L', -h * 0.47, -h * 0.1, 'L', -h * 0.23, h * 0.14, 'L', 0, -h * 0.1, 'L', h * 0.23, h * 0.14, 'L', h * 0.47, -h * 0.1, 'L', h * 0.7, h * 0.03) + '"></path>' +
    mRect(-h * 0.75, -h * 0.28, h * 1.5, h * 0.62, h * 0.22, 'none', 1.4),
  wobble: h => openD(MD('M', -h * 0.7, 0, 'Q', -h * 0.35, -h * 0.26, 0, 0, 'Q', h * 0.35, -h * 0.26, h * 0.7, 0, 'Q', h * 0.62, h * 0.48, 0, h * 0.48, 'Q', -h * 0.62, h * 0.48, -h * 0.7, 0, 'Z'), mEl(0, h * 0.34, h * 0.26, h * 0.09, MT)),
  bleh: h => openD(MD('M', -h * 0.62, 0, 'Q', 0, -h * 0.16, h * 0.62, 0, 'Q', h * 0.52, h * 0.42, 0, h * 0.44, 'Q', -h * 0.52, h * 0.42, -h * 0.62, 0, 'Z')) +
    mFill(MD('M', -h * 0.28, h * 0.2, 'V', h * 0.72, 'A', h * 0.28, h * 0.28, 0, 0, 0, h * 0.28, h * 0.72, 'V', h * 0.2, 'Z'), MT, 1.1) + '<path stroke="#C24A4A" stroke-width=".8" d="' + MD('M', 0, h * 0.42, 'V', h * 0.82) + '"></path>'
};

/** Where the mouth sits and how big it is: [x, y, height]. */
export function mouthAt(g: Geo): [number, number, number] {
  const l = g.l, r = g.r, b = g.bb, low = Math.max(l[2], r[2]), ery = Math.max(g.ery[0], g.ery[1]);
  let h = Math.max(5, Math.min(9.5, (r[1] - l[1]) * 0.44));
  let my = low + Math.max(13, ery + 7.5);
  my = Math.min(my, b[3] - h - 3);
  if (my - h * 0.5 < low + ery + 1.5) h = Math.max(2.6, (my - low - ery - 1.5) * 2);
  return [(l[1] + r[1]) / 2, my, h];
}

/** The mouth markup for an expression ('own' draws nothing: the way of acting opens its own mouth). */
export function mouthSVG(g: Geo, kind: string, drop = 0): string {
  if (kind === 'own' || !MOUTHS[kind]) return '';
  const [mx, my, h] = mouthAt(g);
  return '<g class="mz" transform="translate(' + mN(mx) + ' ' + mN(my + drop) + ')"><g class="ma ma-' + kind + '" fill="none" stroke="' + g.eye + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + MOUTHS[kind](h, g.eye) + '</g></g>';
}

// ---------- hands: chunky cartoon gloves that gesture with each state ----------
// A pose is a right hand with the wrist at 0,0, fingers up and the thumb toward -x (the body); the left hand is its mirror.
// Each layer is a set of round shapes that merge into one outlined silhouette, plus inner crease lines.
// Shapes: ['c', x, y, r] circle, ['e', x, y, rx, ry, deg] ellipse, ['t', width, d] round-capped tube, ['p', d] filled path.
type Prim = ['c', number, number, number] | ['e', number, number, number, number, number] | ['t', number, string] | ['p', string];
const HPOSE: Record<string, { s: Prim[]; l: string }[]> = {
  open: [{ s: [['e', 0.4, -6.4, 6.2, 6, 0], ['t', 5.4, 'M-1.6 -9.6L-2.8 -17.6'], ['t', 5.2, 'M3.2 -9L5 -16.4'], ['t', 4.8, 'M-4.2 -5Q-7.4 -6.6 -9.2 -9.8']], l: 'M1.3 -16.4Q1.1 -13.6 .9 -11.6' }],
  flat: [{ s: [['e', 0.3, -6.6, 6.1, 6, 0], ['t', 5.6, 'M-1.4 -9.6L-1.8 -17.6'], ['t', 5.4, 'M3.4 -9.4L4 -16.8'], ['t', 4.6, 'M-4.4 -4.6Q-7 -6.4 -8.2 -9.6']], l: 'M1.2 -18.4Q1.1 -15 1 -12' }],
  relax: [{ s: [['e', 0.4, -6.4, 6, 6.2, 0], ['t', 5.4, 'M-1.2 -9.6Q-1.2 -15 -3.8 -17.4'], ['t', 5.2, 'M3.4 -9Q3.8 -14.2 1.6 -16.6'], ['t', 4.6, 'M-4.4 -4.8Q-6.8 -6.2 -7.8 -9']], l: 'M-1.4 -19.2Q1.4 -16.6 1.1 -11.8' }],
  fist: [{ s: [['p', 'M-6.4 -5.4Q-6.6 -12.6 0 -12.8Q6.6 -12.8 6.6 -6Q6.6 .4 0 .4Q-6.4 .4 -6.4 -5.4Z'], ['c', -2.7, -12, 3], ['c', 2.8, -11.8, 3]], l: 'M.05 -14Q.05 -11.6 .05 -9.6M-6.3 -3.6Q-2.8 -5.2 2 -6.6' }],
  thumb: [{ s: [['p', 'M-5.6 -5.6Q-6 -11.8 .6 -12Q7.4 -12 7.6 -5.8Q7.6 .2 1 .2Q-5.4 .2 -5.6 -5.6Z'], ['c', 6.6, -8.6, 3], ['c', 6.6, -3.2, 2.9], ['t', 5, 'M-2.4 -9.6L-2.6 -17.4']], l: 'M9.4 -5.9Q6.6 -5.8 3.8 -6.2' }],
  point: [{ s: [['p', 'M-5.6 -5.6Q-6 -11.8 .6 -12Q7.4 -12 7.6 -5.8Q7.6 .2 1 .2Q-5.4 .2 -5.6 -5.6Z'], ['c', 6.2, -5.8, 3.6], ['t', 4.8, 'M-2.2 -9.6L-2.4 -19']], l: 'M-5.2 -3.2Q-1.4 -5.4 3 -4.4' }],
  peace: [{ s: [['p', 'M-5.6 -5.6Q-6 -11.8 .6 -12Q7.4 -12 7.6 -5.8Q7.6 .2 1 .2Q-5.4 .2 -5.6 -5.6Z'], ['t', 4.6, 'M-2.6 -9.6L-4.6 -18.6'], ['t', 4.6, 'M2 -9.8L4.2 -18.6']], l: 'M-5.2 -3.2Q-1.4 -5.4 3 -4.4' }],
  // heart hands: drawn around the heart's centre instead of a wrist; the pair meets at x = 0
  heart: [{ s: [['e', 10.2, 1.4, 3.4, 4.3, -25], ['t', 4.2, 'M2.1 -6.2A5 5 0 1 1 10.26 -.5'], ['t', 3.9, 'M9.2 2.8L1.95 10.2']], l: '' }]
};
function handSVG(pose: string, w: number, lw: number, ink: string) {
  const n = (x: number) => Math.round(x * 100) / 100;
  const prim = (p: Prim, o: boolean) => p[0] === 'c' ? '<circle cx="' + p[1] + '" cy="' + p[2] + '" r="' + p[3] + '"></circle>'
    : p[0] === 'e' ? '<ellipse cx="' + p[1] + '" cy="' + p[2] + '" rx="' + p[3] + '" ry="' + p[4] + '"' + (p[5] ? ' transform="rotate(' + p[5] + ' ' + p[1] + ' ' + p[2] + ')"' : '') + '></ellipse>'
      : p[0] === 't' ? '<path d="' + p[2] + '" fill="none" stroke-width="' + n(o ? p[1] + 2 * w : p[1]) + '"></path>'
        : '<path d="' + p[1] + '"></path>';
  return HPOSE[pose].map(L =>
    '<g style="fill: ' + ink + '; stroke: ' + ink + '" stroke-linecap="round" stroke-linejoin="round" stroke-width="' + n(2 * w) + '">' + L.s.map(p => prim(p, true)).join('') + '</g>' +
    '<g style="fill: currentColor; stroke: currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="0">' + L.s.map(p => prim(p, false)).join('') + '</g>' +
    (L.l ? '<path class="hl" d="' + L.l + '" stroke-linecap="round" style="fill: none; stroke: ' + ink + '" stroke-width="' + n(lw) + '"></path>' : '')
  ).join('');
}
// [pose, across, down, rotation, motion, frame, size]. Frame 'b' (default): across -1..1 is the body's left..right edge and down 0..1 its top..bottom.
// Frame 'f': measured from the point between the eyes, in half eye-spacings, so hands can touch the face.
type Hand = [pose: string, u: number, v: number, rot: number, anim: string | null, frame?: string, k?: number];
const both = (pose: string, u: number, v: number, rot: number, anim: string | null, anim2?: string | null, fr?: string, k?: number): Hand[] =>
  [[pose, -u, v, -rot, anim, fr, k], [pose, u, v, rot, anim2 || anim, fr, k]];
const RESTL: Hand = ['relax', -1, 0.66, -150, 'sway'];
export const GESTURES: Record<string, Hand[]> = {
  rest: both('relax', 1, 0.66, 150, 'sway'),
  droop: both('relax', 0.96, 0.7, 176, null),
  type: both('flat', 0.62, 1.08, -28, 'tap', 'tap2'),
  wave: [RESTL, ['open', 1.12, 0.32, 16, 'wave']],
  yay: both('open', 1.06, 0.24, 22, 'pump'),
  cheer: both('fist', 1.02, 0.24, 8, 'pump'),
  clap: both('flat', 0.24, 1.08, -60, 'clap'),
  thumbs: [RESTL, ['thumb', 1.04, 0.5, 0, 'bob']],
  peace: [RESTL, ['peace', 1.08, 0.4, 12, 'bob']],
  hips: both('fist', 1.04, 0.8, -112, null),
  cheeks: both('flat', 2.4, 2.5, -12, null, null, 'f'),
  covereyes: both('flat', 1, 1.5, -6, null, 'peek', 'f'),
  facepalm: [RESTL, ['flat', 1.2, 1.3, -24, null, 'f']],
  covermouth: [RESTL, ['flat', 2.2, 1.9, -78, null, 'f']],
  fists: both('fist', 0.96, 0.5, 0, 'shake'),
  tremble: both('flat', 2.2, 3, -20, 'jitter', null, 'f'),
  stop: [RESTL, ['open', 1.14, 0.46, 0, 'push']],
  chin: [RESTL, ['point', 1.4, 3, -22, 'bob', 'f']],
  visor: [RESTL, ['flat', 2.3, -2.15, -96, 'look', 'f']],
  bino: both('fist', 1, 1, 0, 'look', null, 'f'),
  ear: [RESTL, ['flat', 1.04, 0.36, -18, 'cup']],
  shrug: both('open', 1.1, 0.6, 70, 'shrug'),
  heart: both('heart', 0, 0.9, 0, 'bob', null, 'b', 0.9),
  clasp: both('flat', 0.2, 1, -50, 'rubhands'),
  tap: [RESTL, ['point', 1.02, 0.8, 64, 'tapf']],
  lift: both('open', 1.02, 0.16, 40, 'bob'),
  offer: [RESTL, ['open', 1.2, 0.68, 80, 'bob']],
  reach: [RESTL, ['point', 1.1, 0.22, 28, 'bob']],
  hammer: [RESTL, ['fist', 1.1, 0.46, 0, 'hammer']],
  brow: [RESTL, ['flat', 2, -2.25, -100, 'wipe', 'f']],
  rubeye: [RESTL, ['fist', 1.2, 1.2, -16, 'rub', 'f']],
  scratch: [RESTL, ['flat', 0.84, 0.06, -52, 'scratch']],
  hattip: [RESTL, ['fist', 0.46, 0.02, 0, 'bob']],
  fold: both('relax', 0.44, 1.02, -74, null)
};

/** The hands markup for a gesture. */
export function handsSVG(g: Geo, gesture: string): string {
  const gs = GESTURES[gesture] || GESTURES.rest;
  const b = g.bb, cx = (b[0] + b[2]) / 2, hw = (b[2] - b[0]) / 2, H = b[3] - b[1];
  const ex = (g.l[1] + g.r[1]) / 2, ey = (g.l[2] + g.r[2]) / 2, ed = Math.max(6, (g.r[1] - g.l[1]) / 2);
  const s = Math.max(0.8, Math.min(1.4, (hw / 31) * 1.15));
  return '<g class="hd">' + gs.map((p, i) => {
    const [pose, u, vv, rot, anim, fr, k] = p, sc = s * (k || 1);
    const x = fr === 'f' ? ex + u * ed : cx + u * hw, y = fr === 'f' ? ey + vv * ed : b[1] + vv * H;
    return '<g transform="translate(' + mN(x) + ' ' + mN(y) + ') rotate(' + rot + ') scale(' + mN(i === 0 ? -sc : sc) + ' ' + mN(sc) + ')"><g class="ha' + (anim ? ' h-' + anim : '') + '">' + handSVG(pose, 1.45 / sc, 1.1 / sc, g.eye) + '</g></g>';
  }).join('') + '</g>';
}
