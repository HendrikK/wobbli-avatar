// render(look, state, variant, options): one frame of the avatar as markup. Pure: no window, no document.
// The DOM runtime uses the same pieces (skeleton + zones + eye transforms) to patch a live avatar in
// place, so CSS transitions between poses keep playing.
import { fillPart, geoOf, type Geo } from './geo.js';
import type { Look } from './look.js';
import { handsSVG, mouthSVG } from './face.js';
import { hasStyle, styleLayers } from './style.js';
import { STATE, partsFor } from './registry.js';
import type { Pose } from './types.js';
import { esc, fnv1a, normHex, r1, r2, r3 } from './util.js';

export type Motion = 'none' | 'hover' | 'always' | 'follow';
export type ShadowMode = 'auto' | 'always' | 'off';
export type Theme = 'auto' | 'light' | 'dark';

export interface HolidayDress {
  /** Holiday key, e.g. "diwali". */
  key: string;
  /** Costume key, e.g. "dw-diyas". */
  costume: string;
  /** Lunar New Year's zodiac hat: horse, goat, monkey or other. */
  zodiac?: string;
  /** Label for the accessible name, e.g. "Diwali". */
  label?: string;
}

export interface CustomLayers {
  /** Behind everything, outside the bounce (like clothes). */
  pre?: string;
  /** In front of the face, under the hands. */
  front?: string;
  /** With the eyes. */
  glyph?: string;
  /** The layers include clothes: the avatar stands on the bottom edge and the ground moves down to meet it. */
  standing?: boolean;
}

export interface RenderOptions {
  /** Draw the mouth. Default true. */
  mouth?: boolean;
  /** Draw the hands. Default true. */
  hands?: boolean;
  /** A costume to wear. */
  holiday?: HolidayDress | null;
  /** Reported progress, 0 to 1, or null. Shown by the ring and bar variants. */
  progress?: number | null;
  /** Motion mode, as a class the CSS reads (follow tilts posed eyes toward the pointer). Default "follow". */
  motion?: Motion;
  shadow?: ShadowMode;
  /** "auto" (soft grey), "body" or a hex colour. */
  shadowColor?: string;
  /** 0.25 to 2. Default 1. */
  shadowStrength?: number;
  shadowAnimation?: boolean;
  /** How far things move, 0 to 2. Default 1. */
  intensity?: number;
  /** CSS size of the avatar (a number is pixels). Unset: it fills its container. */
  size?: number | string;
  /** Small-size tuning (thicker strokes, bigger effects). Default: on when size is 40 px or less. */
  small?: boolean;
  theme?: Theme;
  /** Accessible name. Default "Avatar: <state>, <way of acting>". */
  label?: string;
  /** Extra hand-drawn layers (personas). */
  layers?: CustomLayers;
  /** Blobatar's bare look: no mouth, hands, style, shadow or costume. */
  plain?: boolean;
  /** Blink phase in seconds (negative starts part-way). Default: from the name. */
  blinkDelay?: number;
}

export const ZONES = ['pre', 'cosb', 'back', 'mid', 'glyph', 'mouth', 'front', 'hands', 'fb', 'gnd', 'top', 'fx'] as const;
export type FrameZone = (typeof ZONES)[number];
export interface Frame {
  className: string;
  /** Inline styles for the root element. */
  style: Record<string, string>;
  /** Markup per zone of the skeleton. */
  zones: Record<FrameZone, string>;
  /** CSS transforms for the left and right eye. */
  eyes: [string, string];
  label: string;
  /** Changes whenever any zone changes. */
  sig: string;
}

const IDLE_POSE: Pose = { sx: 1, sy: 1, ex: 0, ey: 0, rot: 0, lock: 0 };
const GROUND: Record<string, 1> = { 'fx-shadow': 1, 'x-puddle': 1, 'x-pond': 1 };
const PROGRESS_VARIANTS: Record<string, 1> = { ring: 1, dlbar: 1, qubar: 1 };

/** The variant (or idle fidget) record for a state. */
export function variantOf(state: string, variant: string) {
  const s = STATE[state];
  if (!s) return null;
  return s.variants.find(v => v.key === variant) || s.fidgets?.find(f => f.key === variant) || null;
}

/** "Busy, read" (idle has no way of acting to name). */
export function describe(state: string, variant: string): string {
  const s = STATE[state];
  if (!s) return state;
  const v = variantOf(state, variant);
  return s.name + (v && state !== 'idle' ? ', ' + v.name.toLowerCase() : '');
}

function eyeT(e: Geo['l'], xs: number, p: Pose) {
  const sx = p.sx + (xs > 0 ? p.sx2 || 0 : 0);
  const sy = p.sy + (xs > 0 ? p.sy2 || 0 : 0);
  const rot = -xs * p.rot + (xs > 0 ? p.rt2 || 0 : 0);
  return 'translate(' + xs * p.ex + 'px, ' + p.ey + 'px) rotate(' + rot + 'deg) scale(' + sx + ', ' + sy + ') rotate(' + -p.lock * e[3] + 'deg)';
}

const sizeCss = (s: number | string) => (typeof s === 'number' ? s + 'px' : s);
const isSmall = (s: number | string | undefined) => {
  if (s == null) return false;
  if (typeof s === 'number') return s <= 40;
  const m = /^(\d+(?:\.\d+)?)px$/.exec(s.trim());
  return !!m && +m[1] <= 40;
};

/** The blink phase a name gets, so a page full of avatars does not blink in step. */
export const blinkDelayOf = (look: Look) => -((fnv1a(look.seed) % 5200) / 1000);

/** The part of the markup that only depends on the look: built once, then patched zone by zone. */
export function skeleton(look: Look, blinkDelay = blinkDelayOf(look), fill?: { zones: Frame['zones']; eyes: [string, string] }): string {
  const g = geoOf(look);
  const z = (name: FrameZone, cls: string) => '<g class="' + cls + '">' + (fill ? fill.zones[name] : '') + '</g>';
  const d = 'animation-delay: ' + r2(blinkDelay) + 's';
  const eye = (cls: string, e: Geo['l'], t?: string) =>
    '<g class="e ' + cls + '" style="transform-origin: ' + e[1] + 'px ' + e[2] + 'px' + (t ? '; transform: ' + t : '') + '"><path d="' + e[0] + '" style="' + d + '"></path></g>';
  return '<svg class="bb" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + z('gnd', 'gnd') +
    '<g class="w" style="transform-origin: 50px ' + g.H.base + 'px">' + z('pre', 'zp') +
    '<g class="sp" style="transform-origin: 50px ' + g.H.mid + 'px">' + z('cosb', 'cosb') + z('back', 'zb') +
    '<g class="bd" fill="' + g.head + '">' + g.body + '</g>' + z('mid', 'zm') +
    '<g class="gz"><g class="fol">' + z('fb', 'zfb') + '<g class="ey" fill="' + g.eye + '">' +
    eye('el', g.l, fill?.eyes[0]) + eye('er', g.r, fill?.eyes[1]) +
    '</g>' + z('mouth', 'zmo') + z('glyph', 'zg') + '</g></g>' + z('front', 'zf') + z('hands', 'hz') + z('top', 'cos') + '</g></g></svg>' +
    '<svg class="fx" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + (fill ? fill.zones.fx : '') + '</svg>';
}

/** One frame's classes, styles, zone contents and eye transforms. */
export function frame(look: Look, state: string, variant: string, o: RenderOptions = {}): Frame {
  const g = geoOf(look);
  const st = STATE[state] ? state : 'idle';
  const v = variantOf(st, variant) ? variant : st === 'idle' ? 'idle' : STATE[st].variants[0].key;
  const vm = variantOf(st, v);
  const plain = !!o.plain;
  const hol = !plain && o.holiday ? o.holiday : null;
  const small = o.small ?? isSmall(o.size);
  const prog = o.progress != null && PROGRESS_VARIANTS[v] ? Math.max(0, Math.min(1, o.progress)) : null;
  const motion = o.motion || 'follow';
  const shadow = o.shadow || 'auto', shadowColor = o.shadowColor || 'auto';
  const strength = o.shadowStrength ?? 1, intensity = o.intensity ?? 1;
  const shx = !plain && !o.layers, rest = shx && shadow === 'always';

  let className = 'aa-av st-' + st + ' v-' + v + (small ? ' sm' : '');
  if (hol) className += ' hol-' + hol.key + ' cos-' + hol.costume + (hol.costume === 'ln-zodiac' && hol.zodiac ? ' zy-' + hol.zodiac : '');
  if (prog != null) className += ' has-p';
  className += ' mo-' + motion;
  if (shx) className += ' sh-' + shadow + (o.shadowAnimation === false ? ' sh-still' : '') + (shadowColor !== 'auto' ? ' sh-tint' : '');
  if (o.theme === 'dark' || o.theme === 'light') className += ' aa-theme-' + o.theme;

  const style: Record<string, string> = { color: g.head, '--amp': String(r3(intensity * (small ? 1.35 : 1))) };
  if (shx && shadowColor !== 'auto') style['--aa-shadow-color'] = shadowColor === 'body' ? 'currentColor' : normHex(shadowColor) || shadowColor;
  if (shx && strength !== 1) style['--aa-shadow-strength'] = String(strength);
  if (prog != null) {
    const ang = ((-90 + prog * 360) * Math.PI) / 180;
    style['--p'] = String(r3(prog));
    style['--pex'] = r2(Math.cos(ang) * 5.5 * intensity) + 'px';
    style['--pey'] = r2(Math.sin(ang) * 4.5 * intensity) + 'px';
  }
  if (o.size != null) { style.width = sizeCss(o.size); style.height = sizeCss(o.size); }

  const pose = (vm && 'pose' in vm && vm.pose) || STATE[st].pose || IDLE_POSE;
  const eyes: [string, string] = [eyeT(g.l, -1, pose), eyeT(g.r, 1, pose)];

  const mouthOn = !plain && o.mouth !== false && !o.layers, handsOn = !plain && o.hands !== false && !o.layers;
  const sty = !plain && !o.layers && hasStyle(look.style) ? styleLayers(g, look.style, mouthOn) : null;
  const zones = {} as Frame['zones'];
  ZONES.forEach(z => { zones[z] = ''; });
  const triggers = ['st-' + st, 'v-' + v];
  if (hol) triggers.push('hol-' + hol.key, 'cos-' + hol.costume);
  const parts = partsFor(triggers);
  let gnd = '';
  (Object.keys(parts) as (keyof typeof parts)[]).forEach(zn => {
    let html = '';
    parts[zn].forEach(p => { if (GROUND[p[2]]) gnd += fillPart(g, p[4]); else html += fillPart(g, p[4]); });
    zones[zn === 'top' ? 'top' : zn] = html;
  });
  // ground layer: the shadow, puddles and ponds sit behind everything and stay put while the body moves.
  // With clothes the avatar stands on the bottom edge, so the ground moves down to meet it.
  const standing = (sty && look.style.clothes !== 'none') || !!o.layers?.standing, b = g.bb;
  const lift = standing ? r1(Math.max(0, 101 - ((g.H.base as number) + 5))) : 0;
  const rx = r1(Math.min(24, Math.max(14, (b[2] - b[0]) * 0.42)));
  zones.gnd = '<g class="gnd-in" transform="translate(0 ' + lift + ')">' + (rest ? '<ellipse class="gsh" cx="50" cy="' + r1((g.H.base as number) + 5) + '" rx="' + rx + '" ry="3.3"></ellipse>' : '') + gnd + '</g>';
  const s = STATE[st];
  const mouthKind = (vm && vm.mouth) || s.mouth || 'smile';
  zones.mouth = mouthOn ? mouthSVG(g, mouthKind, sty ? sty.drop : 0) : '';
  zones.hands = handsOn ? handsSVG(g, (vm && vm.hands) || s.hands || 'rest') : '';
  zones.fb = sty ? sty.patch : '';
  if (sty) {
    zones.pre = sty.clothes + zones.pre;
    zones.cosb = sty.back + zones.cosb;
    zones.mid = sty.mid + zones.mid;
    zones.glyph = zones.glyph + sty.glyph;
  }
  if (o.layers) {
    zones.pre += o.layers.pre || '';
    zones.front = (o.layers.front || '') + zones.front;
    zones.glyph += o.layers.glyph || '';
  }
  const label = o.label || 'Avatar: ' + describe(st, v) + (hol ? ', dressed for ' + (hol.label || hol.key) : '');
  const sig = [st, v, hol ? hol.key + ':' + hol.costume + ':' + (hol.zodiac || '') : '', mouthOn ? 'm' : '', handsOn ? 'h' : '', sty ? JSON.stringify(look.style) : '', rest ? 'g' : '', lift, o.layers ? 'L' : ''].join('|');
  return { className, style, zones, eyes, label, sig };
}

/** Identifies a drawn avatar's look, so the runtime can take over a server-drawn one. */
export const lookTag = (l: Look) => fnv1a(l.key).toString(36);

export const styleText = (style: Record<string, string>) => Object.keys(style).map(k => k + ': ' + style[k]).join('; ');

/**
 * One still frame of the avatar as HTML: a root element with role="img" holding two SVGs (the body and an
 * effects overlay). Needs the package CSS on the page. Works in Node: nothing here touches a browser.
 */
export function render(look: Look, state = 'idle', variant = 'idle', options: RenderOptions = {}): string {
  const f = frame(look, state, variant, options);
  return '<div class="' + f.className + '" style="' + esc(styleText(f.style)) + '" role="img" aria-label="' + esc(f.label) + '" data-look="' + lookTag(look) + '" data-sig="' + fnv1a(f.sig).toString(36) + '">' +
    skeleton(look, options.blinkDelay ?? blinkDelayOf(look), { zones: f.zones, eyes: f.eyes }) + '</div>';
}
