// SVG path maths without a browser: tight bounds (the prototype used getBBox) and points spaced
// evenly along the outline (the prototype used getTotalLength and getPointAtLength).

type Pt = [number, number];
/** A segment in absolute coordinates. */
type Seg =
  | { t: 'L'; p0: Pt; p1: Pt }
  | { t: 'C'; p0: Pt; c1: Pt; c2: Pt; p1: Pt }
  | { t: 'Q'; p0: Pt; c: Pt; p1: Pt }
  | { t: 'A'; p0: Pt; p1: Pt; cx: number; cy: number; rx: number; ry: number; phi: number; th0: number; dth: number };

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

/** Parses the path commands the avatar uses: M L H V C Q A Z, absolute or relative. */
export function parsePath(d: string): Seg[] {
  const segs: Seg[] = [];
  const re = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let cur: Pt = [0, 0], start: Pt = [0, 0], m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const cmd = m[1], rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const n = (m[2].match(NUM) || []).map(Number);
    const at = (x: number, y: number): Pt => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
    if (C === 'Z') {
      if (cur[0] !== start[0] || cur[1] !== start[1]) segs.push({ t: 'L', p0: cur, p1: start });
      cur = start;
      continue;
    }
    let i = 0;
    const take = (k: number) => { const out = n.slice(i, i + k); i += k; return out; };
    let first = true;
    while (i < n.length) {
      if (C === 'M') {
        const [x, y] = take(2), p = at(x, y);
        if (first) { cur = p; start = p; } else { segs.push({ t: 'L', p0: cur, p1: p }); cur = p; }
      } else if (C === 'L') {
        const [x, y] = take(2), p = at(x, y); segs.push({ t: 'L', p0: cur, p1: p }); cur = p;
      } else if (C === 'H') {
        const [x] = take(1), p: Pt = [rel ? cur[0] + x : x, cur[1]]; segs.push({ t: 'L', p0: cur, p1: p }); cur = p;
      } else if (C === 'V') {
        const [y] = take(1), p: Pt = [cur[0], rel ? cur[1] + y : y]; segs.push({ t: 'L', p0: cur, p1: p }); cur = p;
      } else if (C === 'C') {
        const [a, b, c, e, x, y] = take(6), p = at(x, y);
        segs.push({ t: 'C', p0: cur, c1: at(a, b), c2: at(c, e), p1: p }); cur = p;
      } else if (C === 'Q') {
        const [a, b, x, y] = take(4), p = at(x, y);
        segs.push({ t: 'Q', p0: cur, c: at(a, b), p1: p }); cur = p;
      } else if (C === 'A') {
        const [rx, ry, rot, large, sweep, x, y] = take(7), p = at(x, y);
        const a = arcSeg(cur, p, rx, ry, rot, !!large, !!sweep);
        if (a) segs.push(a); else segs.push({ t: 'L', p0: cur, p1: p });
        cur = p;
      } else {
        throw new Error('Unsupported path command ' + cmd);
      }
      first = false;
    }
  }
  return segs;
}

// endpoint to centre parametrisation (SVG implementation notes, F.6.5)
function arcSeg(p0: Pt, p1: Pt, rx: number, ry: number, rotDeg: number, large: boolean, sweep: boolean): Seg | null {
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (!rx || !ry || (p0[0] === p1[0] && p0[1] === p1[1])) return null;
  const phi = (rotDeg * Math.PI) / 180, cs = Math.cos(phi), sn = Math.sin(phi);
  const dx = (p0[0] - p1[0]) / 2, dy = (p0[1] - p1[1]) / 2;
  const x1 = cs * dx + sn * dy, y1 = -sn * dx + cs * dy;
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  let k = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) k = -k;
  const cxp = (k * rx * y1) / ry, cyp = (-k * ry * x1) / rx;
  const cx = cs * cxp - sn * cyp + (p0[0] + p1[0]) / 2, cy = sn * cxp + cs * cyp + (p0[1] + p1[1]) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const th0 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
  let dth = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
  if (!sweep && dth > 0) dth -= 2 * Math.PI;
  if (sweep && dth < 0) dth += 2 * Math.PI;
  return { t: 'A', p0, p1, cx, cy, rx, ry, phi, th0, dth };
}

function pointAt(s: Seg, t: number): Pt {
  if (s.t === 'L') return [s.p0[0] + (s.p1[0] - s.p0[0]) * t, s.p0[1] + (s.p1[1] - s.p0[1]) * t];
  if (s.t === 'C') {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
    return [a * s.p0[0] + b * s.c1[0] + c * s.c2[0] + e * s.p1[0], a * s.p0[1] + b * s.c1[1] + c * s.c2[1] + e * s.p1[1]];
  }
  if (s.t === 'Q') {
    const u = 1 - t;
    return [u * u * s.p0[0] + 2 * u * t * s.c[0] + t * t * s.p1[0], u * u * s.p0[1] + 2 * u * t * s.c[1] + t * t * s.p1[1]];
  }
  const th = s.th0 + s.dth * t, x = s.rx * Math.cos(th), y = s.ry * Math.sin(th);
  return [s.cx + Math.cos(s.phi) * x - Math.sin(s.phi) * y, s.cy + Math.sin(s.phi) * x + Math.cos(s.phi) * y];
}

// roots in [0, 1] of a t^2 + b t + c
function quadRoots(a: number, b: number, c: number): number[] {
  const out: number[] = [];
  if (Math.abs(a) < 1e-12) { if (Math.abs(b) > 1e-12) out.push(-c / b); }
  else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) { const r = Math.sqrt(disc); out.push((-b + r) / (2 * a), (-b - r) / (2 * a)); }
  }
  return out.filter(t => t > 0 && t < 1);
}

/** Tight bounds [x0, y0, x1, y1] of one or more paths, including curve extrema. */
export function pathBounds(d: string): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (p: Pt) => { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; };
  for (const s of parsePath(d)) {
    add(s.p0); add(s.p1);
    if (s.t === 'C') {
      for (const k of [0, 1] as const) {
        const p0 = s.p0[k], p1 = s.c1[k], p2 = s.c2[k], p3 = s.p1[k];
        // derivative / 3: (-p0 + 3p1 - 3p2 + p3) t^2 + 2(p0 - 2p1 + p2) t + (p1 - p0)
        quadRoots(-p0 + 3 * p1 - 3 * p2 + p3, 2 * (p0 - 2 * p1 + p2), p1 - p0).forEach(t => add(pointAt(s, t)));
      }
    } else if (s.t === 'Q') {
      for (const k of [0, 1] as const) {
        const den = s.p0[k] - 2 * s.c[k] + s.p1[k];
        if (Math.abs(den) > 1e-12) { const t = (s.p0[k] - s.c[k]) / den; if (t > 0 && t < 1) add(pointAt(s, t)); }
      }
    } else if (s.t === 'A') {
      for (let i = 1; i < 64; i++) add(pointAt(s, i / 64));
      // exact extrema of an unrotated arc: the angles where cos or sin is ±1
      if (s.phi === 0) for (let q = -8; q <= 8; q++) {
        const th = (q * Math.PI) / 2, t = (th - s.th0) / s.dth;
        if (t > 0 && t < 1) add(pointAt(s, t));
      }
    }
  }
  return x0 === Infinity ? null : [x0, y0, x1, y1];
}

/** Bounds of a circle given as cx, cy, r. */
export const circleBounds = (cx: number, cy: number, r: number): [number, number, number, number] => [cx - r, cy - r, cx + r, cy + r];

/**
 * `count` points spaced evenly by length along the whole path (all subpaths, jumps not counted),
 * starting at length 0: the same points getPointAtLength(total * i / count) gives in a browser.
 */
export function samplePath(d: string, count: number): Pt[] {
  const segs = parsePath(d);
  const poly: Pt[][] = []; // per segment, a fine polyline
  const lens: number[] = [];
  let total = 0;
  for (const s of segs) {
    const n = s.t === 'L' ? 1 : 48;
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) pts.push(pointAt(s, i / n));
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    poly.push(pts); lens.push(len); total += len;
  }
  const out: Pt[] = [];
  if (!total) return out;
  let si = 0, acc = 0;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / count;
    while (si < lens.length - 1 && acc + lens[si] < target) { acc += lens[si]; si++; }
    const pts = poly[si];
    let rem = target - acc;
    let j = 1;
    for (; j < pts.length; j++) {
      const l = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
      if (rem <= l || j === pts.length - 1) {
        const u = l ? Math.min(1, rem / l) : 0;
        out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]);
        break;
      }
      rem -= l;
    }
  }
  return out;
}
