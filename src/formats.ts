// wobbli/formats: the studio's saved settings, share links and generated code.
// Share links carry `$` (format, now 2) and `g` (generator); stored settings carry `ver` (now 3) and
// `generator`. Readers accept older versions and read what they can of newer ones, with a console warning.
import { HOLIDAYS, REGIONS } from './generated/holiday-meta.js';
import { EVENT_MAP } from './controller.js';
import { CLOTHES, FACIAL_HAIR, GENERATOR, GENERATORS, GLASSES, HAIRS, MAX_NAME, SHAPE_MID, TRAITS, type Pins, type ShapeName, type TraitKey } from './look.js';
import { STATE } from './registry.js';
import type { Motion, ShadowMode } from './render.js';
import { normHex, r3 } from './util.js';

export const SHARE_FORMAT = 2;
export const SETTINGS_VERSION = 3;
export const SETTINGS_KEY = 'agent-avatar-studio:look:v2';
export const PACKAGE_NAME = 'wobbli';
export const REGISTRY_URL = 'https://wobbli.dev/r/wobbli.json';

export const SKIN_TONES = ['#F6D7C3', '#EDC3A3', '#D9A385', '#C68863', '#A86B47', '#8A5235', '#64391F', '#3F2416'];

/** The studio's look, as stored and shared. Field names are the stored format's. */
export interface StudioSettings {
  name: string;
  shape: ShapeName | null;
  pins: Partial<Record<TraitKey, number>>;
  /** auto: from the name; custom: picked, until the name changes; skin: a skin tone, stays. */
  colorMode: 'auto' | 'custom' | 'skin';
  color: string;
  eyeAuto: boolean;
  eyeColor: string;
  mouth: boolean;
  hands: boolean;
  shadow: ShadowMode;
  shadowColor: 'auto' | 'body' | 'custom';
  shadowHex: string;
  shadowK: number;
  shadowAnim: boolean;
  /** 'name': style from the name. */
  dress: 'off' | 'name';
  hair: string | null;
  hairColor: string | null;
  beard: string | null;
  brows: boolean | null;
  clothes: string | null;
  clothesColor: string | null;
  glasses: string | null;
  motion: Motion;
  speed: number;
  intensity: number;
  chatSize: number;
  holMode: 'off' | 'auto' | 'pick';
  region: string;
  lead: number;
  pickHol: string;
  cosPin: string;
  fidgets: 'off' | 'some' | 'often';
  dozeAfter: number;
  events: Record<string, string>;
  waitAfter: number;
  waitState: string;
  waitVar: string;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  name: 'agent-39', shape: null, pins: {}, colorMode: 'auto', color: '#74A8FC', eyeAuto: true, eyeColor: '#0A1018', mouth: true, hands: true,
  shadow: 'auto', shadowColor: 'auto', shadowHex: '#111118', shadowK: 1, shadowAnim: true, dress: 'off',
  hair: null, hairColor: null, beard: null, brows: null, clothes: null, clothesColor: null, glasses: null,
  motion: 'follow', speed: 1, intensity: 1, chatSize: 28, holMode: 'off', region: 'US', lead: 7, pickHol: 'halloween', cosPin: 'random',
  fidgets: 'some', dozeAfter: 600, events: {}, waitAfter: 20, waitState: 'still', waitVar: 'random'
};
const WAIT_DEFAULT: [number, string, string] = [20, 'still', 'random'];
const MOTIONS: Motion[] = ['none', 'hover', 'always', 'follow'];
const HOL = Object.fromEntries(HOLIDAYS.map(h => [h.key, h]));
const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
const warn = (msg: string) => { if (typeof console !== 'undefined') console.warn('[wobbli] ' + msg); };

/** Takes a loosely trusted object (saved settings or a share link) and returns clean settings. */
export function sanitizeSettings(o: unknown, base: StudioSettings = DEFAULT_SETTINGS): StudioSettings {
  const s = clone(base);
  if (!o || typeof o !== 'object') return s;
  const x = o as Record<string, any>;
  if (typeof x.name === 'string' && x.name.trim()) s.name = Array.from(x.name.trim()).slice(0, MAX_NAME).join('');
  if (x.shape === null || SHAPE_MID[x.shape as ShapeName] !== undefined) s.shape = x.shape || null;
  if (x.pins && typeof x.pins === 'object') { s.pins = {}; TRAITS.forEach(k => { const v = x.pins[k]; if (num(v, 0, 1)) s.pins[k] = Math.min(0.999, v); }); }
  if (['custom', 'auto', 'skin'].includes(x.colorMode)) s.colorMode = x.colorMode;
  if (normHex(x.color)) s.color = normHex(x.color) as string;
  if (s.colorMode === 'custom' && SKIN_TONES.includes(s.color)) s.colorMode = 'skin';
  if (typeof x.eyeAuto === 'boolean') s.eyeAuto = x.eyeAuto;
  if (normHex(x.eyeColor)) s.eyeColor = normHex(x.eyeColor) as string;
  if (typeof x.mouth === 'boolean') s.mouth = x.mouth;
  if (typeof x.hands === 'boolean') s.hands = x.hands;
  if (['auto', 'always', 'off'].includes(x.shadow)) s.shadow = x.shadow;
  if (['auto', 'body', 'custom'].includes(x.shadowColor)) s.shadowColor = x.shadowColor;
  if (normHex(x.shadowHex)) s.shadowHex = normHex(x.shadowHex) as string;
  if (num(x.shadowK, 0.25, 2)) s.shadowK = Math.round(x.shadowK * 100) / 100;
  if (typeof x.shadowAnim === 'boolean') s.shadowAnim = x.shadowAnim;
  // style choices are pins (null = not pinned). Looks saved before "style from the name" stored every value,
  // so there the defaults mean "not picked".
  const legacy = x.dress === undefined;
  if (x.dress === 'name' || x.dress === 'off') s.dress = x.dress;
  const opt = (k: 'hair' | 'beard' | 'clothes' | 'glasses', list: readonly string[]) => { if (list.includes(x[k]) && !(legacy && x[k] === 'none')) s[k] = x[k]; };
  opt('hair', HAIRS); opt('beard', FACIAL_HAIR); opt('clothes', CLOTHES); opt('glasses', GLASSES);
  if (normHex(x.hairColor) && !(legacy && normHex(x.hairColor) === '#1F1A19')) s.hairColor = normHex(x.hairColor);
  if (normHex(x.clothesColor) && !(legacy && normHex(x.clothesColor) === '#2E3440')) s.clothesColor = normHex(x.clothesColor);
  if (typeof x.brows === 'boolean' && !(legacy && !x.brows)) s.brows = x.brows;
  if (MOTIONS.includes(x.motion)) s.motion = x.motion;
  if (num(x.speed, 0.25, 2)) s.speed = x.speed;
  if (num(x.intensity, 0, 2)) s.intensity = x.intensity;
  if (num(x.chatSize, 20, 40)) s.chatSize = Math.round(x.chatSize / 2) * 2;
  if (['auto', 'pick', 'off'].includes(x.holMode)) s.holMode = x.holMode;
  if (REGIONS[x.region]) s.region = x.region;
  if ([0, 3, 7].includes(x.lead)) s.lead = x.lead;
  if (HOL[x.pickHol]) s.pickHol = x.pickHol;
  if (x.cosPin === 'random' || (HOL[s.pickHol] && HOL[s.pickHol].costumes.some(c => c.key === x.cosPin))) s.cosPin = x.cosPin;
  if (['off', 'some', 'often'].includes(x.fidgets)) s.fidgets = x.fidgets;
  if ([0, 60, 300, 600].includes(x.dozeAfter)) s.dozeAfter = x.dozeAfter;
  if (x.events && typeof x.events === 'object') {
    s.events = {};
    Object.keys(x.events).forEach(k => { if (EVENT_MAP[k] && STATE[x.events[k]] && x.events[k] !== EVENT_MAP[k]) s.events[k] = x.events[k]; });
  }
  if (num(x.waitAfter, 3, 120)) s.waitAfter = Math.round(x.waitAfter);
  if (STATE[x.waitState] && x.waitState !== 'idle') s.waitState = x.waitState;
  if (x.waitVar === 'random' || STATE[s.waitState].variants.some(v => v.key === x.waitVar)) s.waitVar = x.waitVar;
  if (s.waitVar !== 'random' && !STATE[s.waitState].variants.some(v => v.key === s.waitVar)) s.waitVar = 'random';
  return s;
}

/** Settings saved before ver 3 stored every default; the defaults that changed fall back to the new ones. */
export function migrateSettings<T>(o: T): T {
  if (!o || typeof o !== 'object') return o;
  const x = o as Record<string, any>;
  if (x.ver >= SETTINGS_VERSION) return o;
  const out = { ...x };
  if (out.mouth === false) delete out.mouth;
  if (out.hands === false) delete out.hands;
  if (out.holMode === 'auto') delete out.holMode;
  // the old long-wait default (Rate limited, Hourglass) moved to the Still working state
  if (out.waitState === 'queued' && out.waitVar === 'quhour') { out.waitState = 'still'; out.waitVar = 'random'; }
  return out as T;
}

/** Reads stored settings (the parsed JSON), migrating old ones. */
export function readSettings(stored: unknown, base: StudioSettings = DEFAULT_SETTINGS): StudioSettings {
  const x = stored as Record<string, any> | null;
  if (x && typeof x === 'object') {
    if (typeof x.ver === 'number' && x.ver > SETTINGS_VERSION) warn('Saved settings are format ' + x.ver + '; this version reads format ' + SETTINGS_VERSION + ' and keeps what it understands.');
    if (x.generator != null && !GENERATORS.includes(x.generator)) warn('Saved settings were made with generator ' + x.generator + ', which this version does not ship. The avatar is drawn with generator ' + GENERATOR + ' and may look different.');
  }
  return sanitizeSettings(migrateSettings(x), base);
}
/** The object to store. */
export const writeSettings = (s: StudioSettings) => ({ ver: SETTINGS_VERSION, generator: GENERATOR, ...s });

// ---------- share links ----------
const TK: Record<string, string> = { 'body.r': 'br', 'body.ratio': 'bp', 'body.n': 'bn', 'body.rot': 'bt', 'capsule.squat': 'cs', 'poly.round': 'pr', 'eye.rx': 'er', 'eye.ratio': 'eo', 'eye.n': 'en', 'eye.gap': 'eg', 'eye.lean': 'el', 'gaze.x': 'gx', 'gaze.y': 'gy' };
const TK_BACK: Record<string, string> = Object.fromEntries(Object.entries(TK).map(([a, b]) => [b, a]));
const utf8 = (s: string) => new TextEncoder().encode(s);
const b64u = (s: string) => {
  let bin = ''; utf8(s).forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64u = (s: string) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

export interface LiveState { state: string; variant: string }

/** The share token (format 2): always $, g, n, m and h; the rest only when it differs from the defaults. */
export function encodeShare(s: StudioSettings, live?: LiveState | null): string {
  const o: Record<string, unknown> = { $: SHARE_FORMAT, g: GENERATOR, n: s.name };
  if (s.shape) o.s = s.shape;
  const t: Record<string, number> = {};
  (Object.keys(s.pins) as TraitKey[]).forEach(k => { t[TK[k]] = Math.round((s.pins[k] as number) * 1000); });
  if (Object.keys(t).length) o.t = t;
  if (s.colorMode !== 'auto') o.c = s.color.slice(1);
  if (s.colorMode === 'skin') o.cs = 's';
  if (!s.eyeAuto) o.e = s.eyeColor.slice(1);
  if (!s.mouth) o.mo = 0;
  if (!s.hands) o.hn = 0;
  if (s.shadow !== 'auto') o.sh = s.shadow === 'off' ? 'o' : 'w';
  if (s.shadowColor === 'body') o.sc = 'b'; else if (s.shadowColor === 'custom') o.sc = s.shadowHex.slice(1);
  if (s.shadowK !== 1) o.sk = Math.round(s.shadowK * 100);
  if (!s.shadowAnim) o.sa = 0;
  if (s.dress === 'name') o.dr = 1;
  if (s.hair != null) o.hr = s.hair;
  if (s.hairColor != null) o.hc = s.hairColor.slice(1);
  if (s.beard != null) o.bd = s.beard;
  if (s.brows != null) o.bw = s.brows ? 1 : 0;
  if (s.clothes != null) o.cl = s.clothes;
  if (s.clothesColor != null) o.cc = s.clothesColor.slice(1);
  if (s.glasses != null) o.gl = s.glasses;
  o.m = s.motion.charAt(0);
  if (s.speed !== 1) o.p = Math.round(s.speed * 100);
  if (s.intensity !== 1) o.i = Math.round(s.intensity * 100);
  if (s.chatSize !== 28) o.z = s.chatSize;
  if (s.holMode === 'auto') { o.h = 'a'; o.r = s.region; o.l = s.lead; }
  else if (s.holMode === 'off') o.h = '-';
  else { o.h = s.pickHol; if (s.cosPin !== 'random') o.o = s.cosPin; }
  if (live && live.state !== 'idle') { o.x = live.state; o.v = live.variant; }
  if (s.fidgets !== 'some') o.f = s.fidgets;
  if (s.dozeAfter !== 600) o.d = s.dozeAfter;
  if (Object.keys(s.events).length) o.ev = s.events;
  if (s.waitAfter !== WAIT_DEFAULT[0] || s.waitState !== WAIT_DEFAULT[1] || s.waitVar !== WAIT_DEFAULT[2]) o.w = [s.waitAfter, s.waitState, s.waitVar];
  return b64u(JSON.stringify(o));
}
export const shareUrl = (base: string, s: StudioSettings, live?: LiveState | null) => base.replace(/#.*$/, '') + '#studio~' + encodeShare(s, live);

export interface DecodedShare { settings: StudioSettings; live: LiveState | null; format: number; generator: number }
/** Reads a share token, or a hash or URL that holds one ("#studio~..."). Format 1 links (no `$`) had mouth and hands off. */
export function decodeShare(input: string, base: StudioSettings = DEFAULT_SETTINGS): DecodedShare | null {
  const i = input.indexOf('studio~');
  const tok = i >= 0 ? input.slice(i + 7) : input;
  let o: Record<string, any>;
  try { o = JSON.parse(unb64u(decodeURIComponent(tok))); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  const format = typeof o.$ === 'number' ? o.$ : 1;
  const generator = typeof o.g === 'number' ? o.g : 1;
  if (format > SHARE_FORMAT) warn('This share link is format ' + format + '; this version reads format ' + SHARE_FORMAT + ' and keeps what it understands.');
  if (!GENERATORS.includes(generator)) warn('This share link was made with generator ' + generator + ', which this version does not ship. The avatar is drawn with generator ' + GENERATOR + ' and may look different.');
  const pins: Record<string, number> = {};
  if (o.t && typeof o.t === 'object') Object.keys(o.t).forEach(k => { if (TK_BACK[k] && num(o.t[k], 0, 1000)) pins[TK_BACK[k]] = o.t[k] / 1000; });
  const long = {
    name: o.n, shape: o.s || null, pins,
    colorMode: o.c ? (o.cs === 's' ? 'skin' : 'custom') : 'auto', color: o.c ? '#' + o.c : undefined,
    eyeAuto: !o.e, eyeColor: o.e ? '#' + o.e : undefined,
    mouth: format >= 2 ? o.mo !== 0 : o.mo === 1, hands: format >= 2 ? o.hn !== 0 : o.hn === 1,
    shadow: o.sh === 'o' ? 'off' : o.sh === 'w' ? 'always' : 'auto', shadowColor: o.sc === 'b' ? 'body' : o.sc ? 'custom' : 'auto',
    shadowHex: o.sc && o.sc !== 'b' ? '#' + o.sc : undefined, shadowK: o.sk ? o.sk / 100 : 1, shadowAnim: o.sa !== 0,
    dress: o.dr === 1 ? 'name' : 'off', hair: o.hr, hairColor: o.hc ? '#' + o.hc : undefined, beard: o.bd,
    brows: o.bw === 1 ? true : o.bw === 0 ? false : undefined, clothes: o.cl, clothesColor: o.cc ? '#' + o.cc : undefined, glasses: o.gl,
    motion: ({ n: 'none', h: 'hover', a: 'always', f: 'follow' } as Record<string, string>)[o.m],
    speed: o.p ? o.p / 100 : 1, intensity: o.i != null ? o.i / 100 : 1, chatSize: o.z || 28,
    holMode: o.h === 'a' ? 'auto' : o.h === '-' ? 'off' : HOL[o.h] ? 'pick' : undefined,
    region: o.r, lead: o.l, pickHol: HOL[o.h] ? o.h : undefined, cosPin: o.o || 'random',
    fidgets: o.f || 'some', dozeAfter: o.d != null ? o.d : 600, events: o.ev || {},
    waitAfter: o.w ? o.w[0] : WAIT_DEFAULT[0], waitState: o.w ? o.w[1] : WAIT_DEFAULT[1], waitVar: o.w ? o.w[2] : WAIT_DEFAULT[2]
  };
  const settings = sanitizeSettings(long, base);
  let live: LiveState | null = null;
  if (STATE[o.x]) live = { state: o.x, variant: STATE[o.x].variants.some(v => v.key === o.v) ? o.v : STATE[o.x].variants[0].key };
  return { settings, live, format, generator };
}

// ---------- settings to props, and the code the studio shows ----------
/** Pins for look() from settings (what overrides the name). */
export function settingsPins(s: StudioSettings, skinTone = true): Pins {
  const p: Pins = { shape: s.shape, traits: { ...s.pins }, styleFromName: s.dress === 'name' };
  if (s.colorMode !== 'auto' && (skinTone || s.colorMode === 'custom')) p.color = s.color;
  if (!s.eyeAuto) p.eyeColor = s.eyeColor;
  if (s.hair != null) p.hair = s.hair as Pins['hair'];
  if (s.hairColor != null) p.hairColor = s.hairColor;
  if (s.beard != null) p.facialHair = s.beard as Pins['facialHair'];
  if (s.brows != null) p.eyebrows = s.brows;
  if (s.clothes != null) p.clothes = s.clothes as Pins['clothes'];
  if (s.clothesColor != null) p.clothesColor = s.clothesColor;
  if (s.glasses != null) p.glasses = s.glasses as Pins['glasses'];
  return p;
}

/** The component props for settings: name, state and motion, plus every prop that differs from the defaults. */
export function settingsToProps(s: StudioSettings, live: LiveState = { state: 'idle', variant: 'idle' }, variantPinned = false): Record<string, unknown> {
  const c: Record<string, unknown> = { name: s.name, state: live.state };
  if (live.state !== 'idle' && variantPinned) c.variant = live.variant;
  if (s.holMode === 'auto') { c.holiday = 'auto'; c.region = s.region; if (s.lead !== 7) c.leadDays = s.lead; }
  else if (s.holMode === 'pick') { c.holiday = s.pickHol; if (s.cosPin !== 'random') c.costume = s.cosPin; }
  c.motion = s.motion;
  if (s.speed !== 1) c.speed = s.speed;
  if (s.intensity !== 1) c.intensity = s.intensity;
  if (s.colorMode !== 'auto') c.color = s.color;
  if (!s.eyeAuto) c.eyeColor = s.eyeColor;
  if (!s.mouth) c.mouth = false;
  if (!s.hands) c.hands = false;
  if (s.shadow !== 'auto') c.shadow = s.shadow;
  if (s.shadow !== 'off') {
    if (s.shadowColor !== 'auto') c.shadowColor = s.shadowColor === 'body' ? 'body' : s.shadowHex;
    if (s.shadowK !== 1) c.shadowStrength = s.shadowK;
    if (!s.shadowAnim) c.shadowAnimation = false;
  }
  if (s.dress === 'name') c.styleFromName = true;
  if (s.hair != null) c.hair = s.hair;
  if (s.hairColor != null) c.hairColor = s.hairColor;
  if (s.beard != null) c.facialHair = s.beard;
  if (s.brows != null) c.eyebrows = s.brows;
  if (s.clothes != null) c.clothes = s.clothes;
  if (s.clothesColor != null) c.clothesColor = s.clothesColor;
  if (s.glasses != null) c.glasses = s.glasses;
  if (s.fidgets !== 'some') c.fidgets = s.fidgets === 'off' ? 'off' : 'often';
  if (s.dozeAfter !== 600) c.dozeAfter = s.dozeAfter;
  if (Object.keys(s.events).length) c.events = { ...s.events };
  if (s.waitAfter !== WAIT_DEFAULT[0] || s.waitState !== WAIT_DEFAULT[1] || s.waitVar !== WAIT_DEFAULT[2]) c.stillWorking = { after: s.waitAfter, state: s.waitState, variant: s.waitVar };
  const t: Record<string, number> = {};
  (Object.keys(s.pins) as TraitKey[]).forEach(k => { t[k] = s.pins[k] as number; });
  if (s.shape) t.shape = SHAPE_MID[s.shape];
  const keys = Object.keys(t);
  if (keys.length) { const o: Record<string, number> = {}; keys.sort().forEach(k => { o[k] = r3(t[k]); }); c.traits = o; }
  return c;
}

export type PackageManager = 'npm' | 'pnpm' | 'bun' | 'shadcn';
export const installCommand = (pm: PackageManager, pkg = PACKAGE_NAME, registry = REGISTRY_URL) =>
  pm === 'npm' ? 'npm install ' + pkg : pm === 'pnpm' ? 'pnpm add ' + pkg : pm === 'bun' ? 'bun add ' + pkg : 'npx shadcn@latest add ' + registry;
const importLines = (pm: PackageManager, pkg: string) => (pm === 'shadcn'
  ? ['import { Wobbli } from "@/components/wobbli";']
  : ['import { Wobbli } from "' + pkg + '/react";', 'import "' + pkg + '/styles.css";']);

/** The code the studio shows: the React component, the events example or the props as JSON. */
export function codeFor(kind: 'react' | 'events' | 'json', props: Record<string, unknown>, pm: PackageManager = 'npm', pkg = PACKAGE_NAME): string {
  if (kind === 'json') return JSON.stringify(props, null, 2);
  if (kind === 'events') {
    return ['import { useRef } from "react";', ...importLines(pm, pkg), '', 'const avatar = useRef(null);', '', '<Wobbli ref={avatar} name=' + JSON.stringify(props.name) + ' />', '', '// as your agent works',
      'avatar.current.emit("tool.query");', 'avatar.current.emit("progress", 0.42);', 'avatar.current.emit("stream.end");'].join('\n');
  }
  const lines = [...importLines(pm, pkg), '', '<Wobbli'];
  Object.keys(props).forEach(k => {
    const v = props[k];
    if (v && typeof v === 'object') {
      lines.push('  ' + k + '={{');
      Object.keys(v).forEach(t => lines.push('    ' + (/^\w+$/.test(t) ? t : JSON.stringify(t)) + ': ' + JSON.stringify((v as Record<string, unknown>)[t]) + ','));
      lines.push('  }}');
    } else if (typeof v === 'number') lines.push('  ' + k + '={' + v + '}');
    else if (typeof v === 'boolean') lines.push('  ' + k + (v ? '' : '={false}'));
    else lines.push('  ' + k + '=' + JSON.stringify(v));
  });
  lines.push('/>');
  return lines.join('\n');
}
