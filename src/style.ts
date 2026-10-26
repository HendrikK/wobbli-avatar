// Hair, facial hair, eyebrows, clothes and glasses. Drawn from the head's own outline, so every option fits every
// shape. Clothes and long hair sit behind the body; hair and facial hair sit on the face under the eyes and mouth;
// eyebrows and glasses ride with the eyes.
import type { Style } from './look.js';
import { type Geo, outlineR, smooth } from './geo.js';
import { mouthAt } from './face.js';
import { lum, mixHex, r1 } from './util.js';

type P = [number, number];
const P2 = (p: P) => r1(p[0]) + ' ' + r1(p[1]);

interface SGeo {
  x0: number; y0: number; x1: number; y1: number; w: number; h: number; cx: number; cy: number;
  at: (a: number, off?: number) => P; angY: (y: number, side: number) => number; halfW: (y: number) => number;
  ery: number; eyeTop: number; eyeBot: number; top: number; mx: number; my: number; mh: number;
  l: Geo['l']; r: Geo['r']; k: number;
}

// outline helpers for one head, made once per geometry
function sgeo(g: Geo): SGeo {
  if (g.sg) return g.sg as SGeo;
  const [x0, y0, x1, y1] = g.bb, w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const rAt = g.rAt || (g.rAt = outlineR(g.bodyD, cx, cy, w / 2, h / 2));
  const at = (a: number, off?: number): P => { const r = rAt(a) + (off || 0); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  // the angle where the outline crosses height y, on the left (-1) or right (1); left angles run below -PI/2
  const angY = (y: number, side: number) => {
    let best = -Math.PI / 2, bd = 1e9;
    for (let i = 0; i <= 120; i++) {
      const a = -Math.PI / 2 + (side * Math.PI * i) / 120, d = Math.abs(at(a)[1] - y);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  };
  const halfW = (y: number) => (at(angY(y, 1))[0] - at(angY(y, -1))[0]) / 2;
  const ery = Math.max(g.ery[0], g.ery[1]);
  const eyeTop = Math.min(g.l[2] - g.ery[0], g.r[2] - g.ery[1]), eyeBot = Math.max(g.l[2] + g.ery[0], g.r[2] + g.ery[1]);
  const top = at(-Math.PI / 2)[1];
  const [mx, my, mh] = mouthAt(g);
  const sg: SGeo = { x0, y0, x1, y1, w, h, cx, cy, at, angY, halfW, ery, eyeTop, eyeBot, top, mx, my, mh, l: g.l, r: g.r, k: Math.max(0.75, Math.min(1.2, w / 62)) };
  g.sg = sg;
  return sg;
}
/** Radius of the head outline by angle (exposed for custom layers such as hand-made personas). */
export function headOutline(g: Geo) { return sgeo(g).at; }

// a smooth bump over the crown: 1 at the top of the head, 0 past `wide` radians either side
const crown = (a: number, wide?: number, at0?: number) => { const u = (a - (at0 == null ? -Math.PI / 2 : at0)) / (wide || 1.25); return Math.abs(u) >= 1 ? 0 : Math.cos((u * Math.PI) / 2); };
interface CapOpts { side: number; sw: number; line: number; bend?: number; tilt?: number; wave?: number; across?: number[]; frame?: number[]; n?: number; thick: (a: number, u: number) => number }
// A cap of hair: the outer edge follows the outline from one side over the top to the other, pushed out by
// `thick`; the inner edge comes back from the right sideburn across the hairline to the left one.
function capPath(q: SGeo, o: CapOpts) {
  const aL = q.angY(o.side, -1), aR = q.angY(o.side, 1), M = o.n || 56;
  const pts: P[] = [];
  for (let i = 0; i <= M; i++) {
    const u = i / M, a = aL + (aR - aL) * u, taper = Math.min(1, Math.min(u, 1 - u) / 0.14);
    pts.push(q.at(a, 0.5 + (o.thick(a, u) - 0.5) * taper));
  }
  const hw = q.halfW(o.line), lineY = o.line, pR = q.at(aR, -o.sw), pL = q.at(aL, -o.sw);
  const across = (o.across || [0.82, 0.45, 0, -0.45, -0.82]).map((f, i): P => [q.cx + f * hw * 0.92, lineY + (o.bend || 0) * f * f + (o.wave ? (i % 2 ? o.wave : 0) : 0) + (o.tilt || 0) * f]);
  // hair that frames the face (bob, long) runs down beside it instead of cutting across the cheeks
  const inner: P[] = o.frame
    ? [pR, ...o.frame.map(y => q.at(q.angY(y, 1), -o.sw)), ...across, ...o.frame.slice().reverse().map(y => q.at(q.angY(y, -1), -o.sw)), pL]
    : [pR, ...across, pL];
  const outer = 'M' + P2(pts[0]) + smooth(pts);
  return { d: outer + 'L' + P2(pR) + smooth(inner) + 'Z', rim: outer };
}
// A soft outline for hair, beards and clothes whose colour would vanish against the page: very dark ones get a
// light rim on dark backgrounds, very light ones a faint dark rim on light backgrounds. Drawn under the fill, so
// only the outer half shows.
const rimOf = (d: string, c: string) => { const L = lum(c); return L < 0.1 ? '<path class="sty-rd" d="' + d + '"></path>' : L > 0.7 ? '<path class="sty-rl" d="' + d + '"></path>' : ''; };
// a moustache or goatee needs room above and below the mouth, so the mouth moves down a little (inside the head)
const mouthDrop = (q: SGeo, beard: string) => (beard === 'moustache' || beard === 'goatee') ? Math.max(0, Math.min(5 * q.k, q.y1 - 2 - (q.my + q.mh / 2) - (beard === 'goatee' ? 8 * q.k : 2))) : 0;

function hairParts(q: SGeo, kind: string, c: string) {
  const k = q.k, hairLine = Math.min(q.y0 + q.h * 0.19, q.eyeTop - 5.5);
  const strand = lum(c) < 0.2 ? mixHex(c, '#FFFFFF', 0.22) : mixHex(c, '#000000', 0.2);
  const fill = (o: CapOpts) => { const p = capPath(q, o); return rimOf(p.rim, c) + '<path fill="' + c + '" d="' + p.d + '"></path>'; };
  let front = '', back = '';
  if (kind === 'short') {
    front = fill({ side: q.eyeTop + 1.5, sw: 2.6 * k, line: hairLine, bend: 2.5, thick: a => 1.3 + 1.6 * crown(a) });
  } else if (kind === 'sweep') {
    const ly = (q.l[2] + q.r[2]) / 2 + 1;
    front = fill({ side: ly, sw: q.w * 0.05, line: q.y0 + q.h * 0.2, bend: 3.5, tilt: -1.2, thick: a => 1.5 + q.h * 0.15 * crown(a, 1.05, -Math.PI / 2 + 0.2) });
    const t = q.top - q.h * 0.12, L = q.y0 + q.h * 0.2;
    front += '<path fill="none" stroke="' + strand + '" stroke-width="1.1" stroke-linecap="round" d="M' + P2([q.cx - q.w * 0.19, L - 1]) + 'C' + P2([q.cx - q.w * 0.13, t + (L - t) * 0.35]) + ' ' + P2([q.cx + q.w * 0.02, t + (L - t) * 0.08]) + ' ' + P2([q.cx + q.w * 0.2, t + (L - t) * 0.12]) +
      'M' + P2([q.cx - q.w * 0.03, L - 2.5]) + 'C' + P2([q.cx + q.w * 0.02, t + (L - t) * 0.5]) + ' ' + P2([q.cx + q.w * 0.14, t + (L - t) * 0.32]) + ' ' + P2([q.cx + q.w * 0.3, t + (L - t) * 0.4]) + '"></path>';
  } else if (kind === 'curly') {
    front = fill({ side: (q.l[2] + q.r[2]) / 2, sw: 3.6 * k, line: hairLine + 1, wave: 2.6, across: [0.86, 0.64, 0.43, 0.21, 0, -0.21, -0.43, -0.64, -0.86], n: 96,
      thick: a => 2.4 + 1.2 * crown(a, 1.6) + 2.2 * (0.5 + 0.5 * Math.cos(15 * (a + Math.PI / 2))) });
  } else if (kind === 'spiky') {
    front = fill({ side: q.eyeTop + 1.5, sw: 2.6 * k, line: hairLine, bend: 2, n: 120,
      thick: a => { const env = crown(a, 1.5), u = ((((a + Math.PI / 2) / 0.42) % 1) + 1) % 1; return 1.4 + env * 7.5 * k * (1 - Math.abs(u - 0.5) * 2); } });
  } else if (kind === 'bob' || kind === 'long') {
    const side = Math.min(q.y1 - 4, q.my + (kind === 'long' ? 7 : 3));
    const eyeY = (q.l[2] + q.r[2]) / 2;
    front = fill({ side, sw: q.w * 0.12, line: q.eyeTop - 5.5, bend: 1.2, across: [0.6, 0.3, 0, -0.3, -0.6], frame: [Math.min(side - 3, eyeY + 4), q.eyeTop - 1], thick: a => 1.6 + 2.2 * crown(a, 1.4) });
    if (kind === 'long') {
      const aR = q.angY(q.cy, 1), aL = q.angY(q.cy, -1), pts: P[] = [];
      for (let i = 0; i <= 40; i++) { const a = aL + ((aR - aL) * i) / 40; pts.push(q.at(a, 2.4 + 0.4 * crown(a, 1.4))); }
      const bot = Math.min(98, q.y1 + 10 * k), r0 = pts[pts.length - 1], l0 = pts[0];
      const bc = mixHex(c, '#000000', 0.12), bd = 'M' + P2(l0) + smooth(pts) + 'C' + P2([r0[0] + 2.5, r0[1] + 9]) + ' ' + P2([r0[0] + 1.5, bot - 2]) + ' ' + P2([r0[0] - 5, bot]) +
        'Q' + P2([q.cx, bot - 7]) + ' ' + P2([l0[0] + 5, bot]) + 'C' + P2([l0[0] - 1.5, bot - 2]) + ' ' + P2([l0[0] - 2.5, l0[1] + 9]) + ' ' + P2(l0) + 'Z';
      back = rimOf(bd, bc) + '<path fill="' + bc + '" d="' + bd + '"></path>';
    }
  } else if (kind === 'bun') {
    const rb = q.w * 0.14, bc: P = [q.cx, q.top - rb * 0.5];
    const bunD = 'M' + r1(bc[0] - rb) + ' ' + r1(bc[1]) + 'a' + r1(rb) + ' ' + r1(rb) + ' 0 1 0 ' + r1(2 * rb) + ' 0a' + r1(rb) + ' ' + r1(rb) + ' 0 1 0 ' + r1(-2 * rb) + ' 0';
    front = rimOf(bunD, c) + '<circle fill="' + c + '" cx="' + r1(bc[0]) + '" cy="' + r1(bc[1]) + '" r="' + r1(rb) + '"></circle>' +
      '<path fill="none" stroke="' + strand + '" stroke-width="1.1" stroke-linecap="round" d="M' + P2([bc[0] - rb * 0.55, bc[1] - rb * 0.1]) + 'Q' + P2([bc[0], bc[1] - rb * 0.7]) + ' ' + P2([bc[0] + rb * 0.55, bc[1] - rb * 0.1]) + '"></path>' +
      fill({ side: q.eyeTop + 1.5, sw: 2.6 * k, line: q.y0 + q.h * 0.2, bend: 3, thick: a => 1.2 + 1.1 * crown(a) });
  }
  return { front, back };
}

// Facial hair. The moustache and goatee sit in the face layer and move with the mouth; stubble and the full beard
// cover the jaw and stay put, and a full beard keeps a patch of skin around the mouth that moves with it.
function beardPart(g: Geo, q: SGeo, kind: string, c: string, mouthOn: boolean) {
  const k = q.k, mx = q.mx, drop = mouthDrop(q, kind), my = q.my + drop, mh = q.mh;
  if (kind === 'moustache' || kind === 'goatee') {
    const mTop = mouthOn ? my - mh * 0.45 : my - 1.5, mBot = mouthOn ? my + mh * 0.5 : my + 1.5;
    const b = mTop - 1.3, s = Math.max(0.55, Math.min(k, (b - q.eyeBot - 1.5) / 3.4));
    let d = 'M' + P2([mx, b - 2.5 * s]) + 'C' + P2([mx - 2.4 * s, b - 3.5 * s]) + ' ' + P2([mx - 6.6 * s, b - 3.1 * s]) + ' ' + P2([mx - 8.6 * s, b - 0.3 * s]) +
      'C' + P2([mx - 6.2 * s, b - 0.8 * s]) + ' ' + P2([mx - 3.2 * s, b]) + ' ' + P2([mx, b - 0.7 * s]) +
      'C' + P2([mx + 3.2 * s, b]) + ' ' + P2([mx + 6.2 * s, b - 0.8 * s]) + ' ' + P2([mx + 8.6 * s, b - 0.3 * s]) +
      'C' + P2([mx + 6.6 * s, b - 3.1 * s]) + ' ' + P2([mx + 2.4 * s, b - 3.5 * s]) + ' ' + P2([mx, b - 2.5 * s]) + 'Z';
    if (kind === 'goatee') {
      const t = mBot + 1.7, B = Math.min(q.y1 - 2.2, t + 7.5 * k);
      if (B - t >= 3) d += 'M' + P2([mx - 3.6 * k, t]) + 'C' + P2([mx - 4 * k, t + (B - t) * 0.6]) + ' ' + P2([mx - 1.6 * k, B]) + ' ' + P2([mx, B]) +
        'C' + P2([mx + 1.6 * k, B]) + ' ' + P2([mx + 4 * k, t + (B - t) * 0.6]) + ' ' + P2([mx + 3.6 * k, t]) +
        'C' + P2([mx + 1.8 * k, t + 0.9 * k]) + ' ' + P2([mx - 1.8 * k, t + 0.9 * k]) + ' ' + P2([mx - 3.6 * k, t]) + 'Z';
    }
    return { mid: '', face: '<path fill="' + c + '" d="' + d + '"></path>' };
  }
  const cheek = (q.l[2] + q.r[2]) / 2 + 1, aR = q.angY(cheek, 1), aL = q.angY(cheek, -1) + 2 * Math.PI, pts: P[] = [];
  for (let i = 0; i <= 40; i++) pts.push(q.at(aR + ((aL - aR) * i) / 40, 0.6));
  const sw = q.w * 0.05, low = kind === 'stubble' ? 2 : 0, jaw = 'M' + P2(pts[0]) + smooth(pts);
  const top: P[] = [q.at(aL, -sw), [q.cx - q.w * 0.27, my - 1 + low], [q.cx - q.w * 0.15, my - 4.8 + low], [q.cx, my - 6.6 + low], [q.cx + q.w * 0.15, my - 4.8 + low], [q.cx + q.w * 0.27, my - 1 + low], q.at(aR, -sw)];
  const d = jaw + 'L' + P2(top[0]) + smooth(top) + 'Z';
  if (kind === 'stubble') return { mid: '<path fill="' + c + '" fill-opacity=".3" d="' + d + '"></path>', face: '' };
  let face = '';
  if (mouthOn) {
    const room = my - Math.max(g.l[2], g.r[2]) - q.ery - 1.2;
    const rx = Math.max(5.5, Math.min(8.5, q.w * 0.12)), ry = Math.max(3.4, Math.min(6.5, mh * 0.6 + 2, room));
    face = '<ellipse fill="' + g.head + '" cx="' + r1(mx) + '" cy="' + r1(my + 0.4) + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '"></ellipse>';
  }
  return { mid: rimOf(jaw, c) + '<path fill="' + c + '" fill-opacity=".95" d="' + d + '"></path>', face };
}
function browsPart(g: Geo, c: string) {
  const brow = (ex: number, ey: number, ry: number, side: number) => { const by = ey - ry - 3.4, o = side * 5.6; return 'M' + r1(ex + o) + ' ' + r1(by + 1.1) + 'Q' + r1(ex + o * 0.1) + ' ' + r1(by - 1.6) + ' ' + r1(ex - side * 4.4) + ' ' + r1(by - 0.2); };
  return '<path fill="none" stroke="' + c + '" stroke-width="2.7" stroke-linecap="round" d="' + brow(g.l[1], g.l[2], g.ery[0], -1) + brow(g.r[1], g.r[2], g.ery[1], 1) + '"></path>';
}
function glassesPart(g: Geo, q: SGeo, kind: string) {
  const lx = g.l[1], ly = g.l[2], rx0 = g.r[1], ry0 = g.r[2], gap = rx0 - lx, erx = Math.max(g.erx[0], g.erx[1]);
  // lenses stay clearly bigger than the eyes, even when that brings them close together
  const rx = Math.max(erx + 2.6, Math.min(gap / 2 - 1, erx + 4.4)), ry = Math.max(rx * 0.82, Math.min(q.ery + 2.6, rx * 1.2));
  const ink = g.eye, shades = kind === 'shades';
  const lensFill = shades ? ' fill="#16151B" fill-opacity=".94"' : ' fill="#FFFFFF" fill-opacity=".16"';
  const lens = (cx: number, cy: number) => kind === 'round'
    ? '<ellipse cx="' + r1(cx) + '" cy="' + r1(cy) + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '"' + lensFill + '></ellipse>'
    : '<rect x="' + r1(cx - rx) + '" y="' + r1(cy - ry * 0.9) + '" width="' + r1(rx * 2) + '" height="' + r1(ry * 1.8) + '" rx="' + r1(Math.min(rx, ry) * (shades ? 0.55 : 0.4)) + '"' + lensFill + '></rect>';
  const by = (ly + ry0) / 2 - Math.min(2, ry * 0.2);
  const tL0 = q.at(q.angY(ly - 2, -1), -1.8), tR0 = q.at(q.angY(ry0 - 2, 1), -1.8);
  const tL: P = [Math.max(tL0[0], lx - rx - 5), ly - 2], tR: P = [Math.min(tR0[0], rx0 + rx + 5), ry0 - 2];
  let out = '<g stroke="' + ink + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + lens(lx, ly) + lens(rx0, ry0) +
    '<path fill="none" d="M' + r1(lx + rx) + ' ' + r1(by) + 'Q' + r1((lx + rx0) / 2) + ' ' + r1(by - 3) + ' ' + r1(rx0 - rx) + ' ' + r1(by) +
    (tL[0] < lx - rx - 1 ? 'M' + r1(lx - rx) + ' ' + r1(ly - 2) + 'L' + P2(tL) : '') + (tR[0] > rx0 + rx + 1 ? 'M' + r1(rx0 + rx) + ' ' + r1(ry0 - 2) + 'L' + P2(tR) : '') + '"></path></g>';
  if (shades) out += '<path fill="none" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round" d="M' + r1(lx - rx * 0.5) + ' ' + r1(ly - ry * 0.45) + 'l' + r1(rx * 0.35) + ' ' + r1(-ry * 0.18) + 'M' + r1(rx0 - rx * 0.5) + ' ' + r1(ry0 - ry * 0.45) + 'l' + r1(rx * 0.35) + ' ' + r1(-ry * 0.18) + '"></path>';
  return out;
}
function clothesPart(q: SGeo, kind: string, c: string) {
  const { x0, x1, y1, cx, w } = q, k = q.k, B = 100, f = r1;
  const dk = mixHex(c, '#000000', 0.22), lt = lum(c) > 0.6 ? mixHex(c, '#000000', 0.1) : mixHex(c, '#FFFFFF', 0.3);
  // a torso with rounded lower corners, so it still reads as a body when a state tilts or squashes it
  const bodyD = 'M' + f(x0 - 9) + ' ' + (B - 7) + 'C' + f(x0 - 8.6) + ' ' + f(y1 - 2) + ' ' + f(cx - w * 0.32) + ' ' + f(y1 - 6) + ' ' + f(cx) + ' ' + f(y1 - 6) +
    'C' + f(cx + w * 0.32) + ' ' + f(y1 - 6) + ' ' + f(x1 + 8.6) + ' ' + f(y1 - 2) + ' ' + f(x1 + 9) + ' ' + (B - 7) +
    'Q' + f(x1 + 9) + ' ' + B + ' ' + f(x1 + 2) + ' ' + B + 'H' + f(x0 - 2) + 'Q' + f(x0 - 9) + ' ' + B + ' ' + f(x0 - 9) + ' ' + (B - 7) + 'Z';
  const body = rimOf(bodyD, c) + '<path fill="' + c + '" d="' + bodyD + '"></path>';
  if (kind === 'tee') return body + '<path fill="none" stroke="' + dk + '" stroke-width="2.2" stroke-linecap="round" d="M' + f(cx - w * 0.2) + ' ' + f(y1 - 3) + 'Q' + f(cx) + ' ' + f(y1 + 7 * k) + ' ' + f(cx + w * 0.2) + ' ' + f(y1 - 3) + '"></path>';
  if (kind === 'shirt') {
    return body + '<path fill="none" stroke="' + dk + '" stroke-width="1" d="M' + f(cx) + ' ' + f(y1 + 5) + 'V' + B + '"></path>' +
      '<circle fill="' + dk + '" cx="' + f(cx) + '" cy="' + f(y1 + 10 * k) + '" r=".9"></circle><circle fill="' + dk + '" cx="' + f(cx) + '" cy="' + f(y1 + 16 * k) + '" r=".9"></circle>' +
      '<path fill="' + lt + '" stroke="' + dk + '" stroke-width=".8" stroke-linejoin="round" d="M' + f(cx - w * 0.2) + ' ' + f(y1 - 4) + 'L' + f(cx - 0.6) + ' ' + f(y1 + 5) + 'L' + f(cx - w * 0.13) + ' ' + f(y1 + 8 * k) + 'Z' +
      'M' + f(cx + w * 0.2) + ' ' + f(y1 - 4) + 'L' + f(cx + 0.6) + ' ' + f(y1 + 5) + 'L' + f(cx + w * 0.13) + ' ' + f(y1 + 8 * k) + 'Z"></path>';
  }
  if (kind === 'hoodie') {
    return body + '<ellipse fill="' + dk + '" cx="' + f(cx) + '" cy="' + f(y1 - q.h * 0.2) + '" rx="' + f(w * 0.58) + '" ry="' + f(q.h * 0.34) + '"></ellipse>' +
      '<path fill="none" stroke="' + lt + '" stroke-width="1.3" stroke-linecap="round" d="M' + f(cx - w * 0.08) + ' ' + f(y1 + 1) + 'v' + f(12 * k) + 'M' + f(cx + w * 0.08) + ' ' + f(y1 + 1) + 'v' + f(11 * k) + '"></path>' +
      '<circle fill="' + lt + '" cx="' + f(cx - w * 0.08) + '" cy="' + f(y1 + 1 + 12 * k) + '" r="1.1"></circle><circle fill="' + lt + '" cx="' + f(cx + w * 0.08) + '" cy="' + f(y1 + 1 + 11 * k) + '" r="1.1"></circle>';
  }
  if (kind === 'sweater') {
    return body + '<path fill="' + dk + '" d="M' + f(cx - w * 0.25) + ' ' + f(y1 - 4) + 'L' + f(cx - w * 0.21) + ' ' + f(y1 + 8) + 'L' + f(cx + w * 0.21) + ' ' + f(y1 + 8) + 'L' + f(cx + w * 0.25) + ' ' + f(y1 - 4) + 'Z"></path>' +
      '<path fill="#F4F3EF" d="M' + f(cx - 3.4) + ' ' + f(y1 + 1.5) + 'L' + f(cx + 3.4) + ' ' + f(y1 + 1.5) + 'L' + f(cx) + ' ' + f(y1 + 9) + 'Z"></path>' +
      '<path fill="none" stroke="' + mixHex(c, '#000000', 0.45) + '" stroke-width="1.1" stroke-linecap="round" d="M' + f(cx) + ' ' + f(y1 + 6) + 'V' + B + '"></path>';
  }
  if (kind === 'suit') {
    const tie = lum(c) < 0.1 || c === '#B5443B' ? '#5B6B8C' : '#B5443B';
    return body + '<path fill="#F4F3EF" d="M' + f(cx - w * 0.17) + ' ' + f(y1 - 4) + 'L' + f(cx) + ' ' + f(y1 + 18 * k) + 'L' + f(cx + w * 0.17) + ' ' + f(y1 - 4) + 'Z"></path>' +
      '<path fill="' + dk + '" d="M' + f(cx - w * 0.17) + ' ' + f(y1 - 4) + 'L' + f(cx - w * 0.25) + ' ' + f(y1 + 5 * k) + 'L' + f(cx - w * 0.13) + ' ' + f(y1 + 8 * k) + 'L' + f(cx - 1) + ' ' + f(y1 + 18 * k) + 'Z' +
      'M' + f(cx + w * 0.17) + ' ' + f(y1 - 4) + 'L' + f(cx + w * 0.25) + ' ' + f(y1 + 5 * k) + 'L' + f(cx + w * 0.13) + ' ' + f(y1 + 8 * k) + 'L' + f(cx + 1) + ' ' + f(y1 + 18 * k) + 'Z"></path>' +
      '<path fill="' + tie + '" d="M' + f(cx - 1.8 * k) + ' ' + f(y1 + 0.5) + 'H' + f(cx + 1.8 * k) + 'L' + f(cx + 1.1 * k) + ' ' + f(y1 + 3 * k) + 'H' + f(cx - 1.1 * k) + 'Z' +
      'M' + f(cx - 1.1 * k) + ' ' + f(y1 + 3.4 * k) + 'H' + f(cx + 1.1 * k) + 'L' + f(cx + 2.2 * k) + ' ' + f(y1 + 14 * k) + 'L' + f(cx) + ' ' + f(y1 + 16.5 * k) + 'L' + f(cx - 2.2 * k) + ' ' + f(y1 + 14 * k) + 'Z"></path>';
  }
  return '';
}

export interface StyleLayers {
  /** Behind the head, outside the bounce: the clothes. */
  clothes: string;
  /** Behind the body, moving with it: long hair. */
  back: string;
  /** On the face, under the eyes: hair and beards. */
  mid: string;
  /** With the eyes: eyebrows and glasses. */
  glyph: string;
  /** With the mouth: a moustache, a goatee, or the skin patch in a full beard. */
  patch: string;
  /** How far the mouth moves down to make room for a moustache or goatee. */
  drop: number;
}
export const hasStyle = (s: Style) => s.hair !== 'none' || s.facialHair !== 'none' || s.eyebrows || s.clothes !== 'none' || s.glasses !== 'none';

/** The style layers for one head. */
export function styleLayers(g: Geo, s: Style, mouthOn: boolean): StyleLayers {
  const key = [s.hair, s.hairColor, s.facialHair, s.eyebrows ? 1 : 0, s.clothes, s.clothesColor, s.glasses, mouthOn ? 1 : 0].join('|');
  if (!g.stc) g.stc = new Map();
  const hit = g.stc.get(key) as StyleLayers | undefined;
  if (hit) return hit;
  const q = sgeo(g), hp = s.hair !== 'none' ? hairParts(q, s.hair, s.hairColor) : { front: '', back: '' };
  const bp = s.facialHair !== 'none' ? beardPart(g, q, s.facialHair, s.hairColor, mouthOn) : { mid: '', face: '' };
  const p: StyleLayers = {
    // clothes stay upright under the head (outside the bounce and spin); long hair moves with the head
    clothes: s.clothes !== 'none' ? clothesPart(q, s.clothes, s.clothesColor) : '',
    back: hp.back,
    mid: bp.mid + hp.front,
    glyph: (s.eyebrows ? browsPart(g, s.hairColor) : '') + (s.glasses !== 'none' ? glassesPart(g, q, s.glasses) : ''),
    patch: bp.face,
    drop: mouthDrop(q, s.facialHair)
  };
  if (g.stc.size > 60) g.stc.clear();
  g.stc.set(key, p);
  return p;
}
