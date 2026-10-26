// Holidays by date and region. Fixed and rule-based dates work for any year; moon-based dates come from
// the regions' tables (data/holidays/<region>.json), which a test keeps at least two years ahead.
import { HOLIDAYS, REGIONS, SHARED_RULES } from '../generated/holiday-meta.js';
import type { DateRule, DateSpec, HolidayKind, HolidayMeta, RegionData } from './types.js';

export { HOLIDAYS, REGIONS };
export const HOLIDAY: Record<string, HolidayMeta> = Object.fromEntries(HOLIDAYS.map(h => [h.key, h]));
export const REGION_CODES = Object.keys(REGIONS).sort((a, b) => REGIONS[a].name.localeCompare(REGIONS[b].name));
export const KINDS: HolidayKind[] = ['civic', 'cultural', 'religious', 'seasonal'];

// ---------- day numbers: days since 1970-01-01, calendar dates only (no time zone) ----------
const DAY = 864e5;
export const dn = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m - 1, d) / DAY);
export const ymd = (n: number): [number, number, number] => { const D = new Date(n * DAY); return [D.getUTCFullYear(), D.getUTCMonth() + 1, D.getUTCDate()]; };
const wd = (n: number) => new Date(n * DAY).getUTCDay();
const nth = (y: number, m: number, w: number, k: number) => { const f = dn(y, m, 1); return f + ((w - wd(f) + 7) % 7) + (k - 1) * 7; };
const lastWd = (y: number, m: number, w: number) => { const l = dn(y, m + 1, 1) - 1; return l - ((wd(l) - w + 7) % 7); };
/** Today in the viewer's own calendar, as a day number. */
export const today = (now = new Date()) => dn(now.getFullYear(), now.getMonth() + 1, now.getDate());
export const isoDay = (n: number) => { const [y, m, d] = ymd(n); return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };
export const fromIso = (s: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? dn(+m[1], +m[2], +m[3]) : null; };
/** A Date or "YYYY-MM-DD" to a day number. */
export const dayOf = (d: Date | string | number) => (typeof d === 'number' ? d : typeof d === 'string' ? fromIso(d) ?? today() : today(d));

/** Easter Sunday (Gregorian, anonymous algorithm). */
export function easter(y: number): number {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return dn(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
}

const md = (y: number, s: string) => dn(y, +s.slice(0, 2), +s.slice(3, 5));
// the dates that need code
const RULES: Record<string, (y: number, n: number) => number> = {
  // Ireland: St Brigid's bank holiday is the first Monday in February, or 1 February when that is a Friday
  'ie-brigid-bank-holiday': y => { const b1 = dn(y, 2, 1); return wd(b1) === 5 ? b1 : nth(y, 2, 1, 1); },
  // Japan: Setsubun is 2 February in years after a leap year's 1 (2021, 2025, 2029 ...), else 3 February
  'jp-setsubun': y => dn(y, 2, y % 4 === 1 ? 2 : 3),
  // Germany: the four Sundays of Advent before Christmas Eve
  advent: (y, n) => { const a4 = dn(y, 12, 24) - wd(dn(y, 12, 24)); return a4 - 21 + n * 7; }
};

export interface Occurrence { key: string; main: number; start: number; end: number; costume: string | null }

// a moon table entry: one occurrence ["MM-DD" main, first, last] or several
const tableEntries = (region: RegionData, y: number, key: string): string[][] => {
  const t = region.moon[y]?.[key];
  if (!t || !t.length) return [];
  return Array.isArray(t[0]) ? (t as string[][]) : [t as string[]];
};
function resolve(rule: DateRule, y: number, region: RegionData): number | null {
  if (typeof rule === 'string') return md(y, rule);
  if ('easter' in rule) return easter(y) + rule.easter;
  if ('nth' in rule) return nth(y, rule.nth[0], rule.nth[1], rule.nth[2]);
  if ('last' in rule) return lastWd(y, rule.last[0], rule.last[1]);
  if ('onOrAfter' in rule) { const d = md(y, rule.onOrAfter[0]); return d + ((rule.onOrAfter[1] - wd(d) + 7) % 7); }
  if ('table' in rule) { const t = tableEntries(region, y, rule.table)[0]; return t ? md(y, t[0]) : null; }
  if ('rule' in rule) return RULES[rule.rule] ? RULES[rule.rule](y, rule.n ?? 0) : null;
  return null;
}
function spans(spec: DateSpec, key: string, y: number, region: RegionData): Occurrence[] {
  const one = (main: number, table: string[] | null): Occurrence => {
    const edge = (v: number | DateRule | undefined, i: 1 | 2) =>
      v == null ? (table && table[i] ? md(y, table[i]) : main) : typeof v === 'number' ? main + v : resolve(v, y, region) ?? main;
    return { key, main, start: edge(spec.from, 1), end: edge(spec.to, 2), costume: spec.costume || null };
  };
  if (typeof spec.on === 'object' && 'table' in spec.on) return tableEntries(region, y, spec.on.table).map(t => one(md(y, t[0]), t));
  const main = resolve(spec.on, y, region);
  return main == null ? [] : [one(main, null)];
}

/** Every holiday a region keeps in a year. */
export function occurrences(year: number, region: string): Occurrence[] {
  const R = REGIONS[region];
  if (!R) return [];
  const out: Occurrence[] = [];
  const add = (list: Occurrence[]) => list.forEach(o => { if (!out.some(x => x.key === o.key && x.main === o.main)) out.push(o); });
  R.shared.forEach(k => add(spans(R.overrides[k] || SHARED_RULES[k], k, year, R)));
  R.dates.forEach(d => add(spans(d, d.key, year, R)));
  return out;
}
const around = (region: string, d: number) => { const y = ymd(d)[0]; return [...occurrences(y - 1, region), ...occurrences(y, region), ...occurrences(y + 1, region)]; };

/** The costume a holiday wears on a given day: the same all day, different across the days of a festival. */
export function costumeOfDay(key: string, d: number): string {
  let h = 2166136261; const s = key + ':' + d;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const vs = HOLIDAY[key].costumes;
  return vs[(h >>> 0) % vs.length].key;
}

export interface HolidayFilter {
  /** Only these holidays: keys or kinds. */
  include?: string[];
  /** Never these: keys or kinds, e.g. ["halloween", "religious"]. */
  exclude?: string[];
}
export function allowed(key: string, filter?: HolidayFilter): boolean {
  const h = HOLIDAY[key];
  if (!h) return false;
  const hit = (list?: string[]) => !!list && (list.includes(key) || list.includes(h.kind));
  if (filter?.include && filter.include.length && !hit(filter.include)) return false;
  return !hit(filter?.exclude);
}

export interface DatedHoliday { key: string; costume: string; occurrence: Occurrence; /** It has started (not just in its lead-in). */ on: boolean }
/**
 * What a region's avatar wears on a day: ongoing holidays beat ones still in their lead-in, and the region's
 * own holidays beat the shared ones.
 */
export function holidayOn(region: string, day: number, leadDays = 7, filter?: HolidayFilter): DatedHoliday | null {
  let best: Occurrence | null = null, bs: number[] | null = null;
  const cmp = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  for (const o of around(region, day)) {
    if (day > o.end || day < o.start - leadDays || !allowed(o.key, filter)) continue;
    const on = day >= o.start, shared = HOLIDAY[o.key].pack === 'shared' ? 1 : 0;
    const score = on ? [0, shared, Math.abs(o.main - day)] : [1, o.start - day, shared];
    if (!bs || cmp(score, bs) < 0) { best = o; bs = score; }
  }
  return best ? { key: best.key, costume: best.costume || costumeOfDay(best.key, day), occurrence: best, on: day >= best.start } : null;
}
/** The next holidays after a day. */
export const upcoming = (region: string, day: number, n: number, filter?: HolidayFilter) =>
  around(region, day).filter(o => o.main > day && allowed(o.key, filter)).sort((a, b) => a.main - b.main).slice(0, n);

const ZOD = ['monkey', 'rooster', 'dog', 'pig', 'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat'];
/** The Lunar New Year zodiac hat follows the lunar year (it switches a month early, when the costume can start showing). */
export function zodiacFor(d: number): string {
  let y = ymd(d)[0];
  const t = REGIONS.CN ? tableEntries(REGIONS.CN, y, 'lny')[0] : null, lny = t ? md(y, t[0]) : dn(y, 2, 1);
  if (d < lny - 30) y -= 1;
  const z = ZOD[((y % 12) + 12) % 12];
  return z === 'horse' || z === 'goat' || z === 'monkey' ? z : 'other';
}

/** The last year each region's moon table covers (regions without one are left out). */
export function tableCoverage(): Record<string, number> {
  const out: Record<string, number> = {};
  Object.keys(REGIONS).forEach(r => { const ys = Object.keys(REGIONS[r].moon).map(Number); if (ys.length) out[r] = Math.max(...ys); });
  return out;
}

const TZ: Record<string, string> = {
  'Europe/Dublin': 'IE', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Guernsey': 'GB', 'Europe/Jersey': 'GB', 'Europe/Isle_of_Man': 'GB',
  'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Chongqing': 'CN', 'Asia/Harbin': 'CN', 'Asia/Urumqi': 'CN', 'Asia/Hong_Kong': 'CN', 'Asia/Macau': 'CN', 'Asia/Taipei': 'CN', 'Asia/Singapore': 'CN',
  'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE', 'Europe/Stockholm': 'SE', 'Europe/Paris': 'FR'
};
/** The region for a time zone (the viewer's by default), falling back to the United States. */
export function detectRegion(timeZone?: string): string {
  let tz = timeZone || '';
  if (!tz) { try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { tz = ''; } }
  if (TZ[tz]) return TZ[tz];
  if (/^Australia\//.test(tz)) return 'AU';
  if (/^America\/(Mexico_City|Cancun|Merida|Monterrey|Matamoros|Chihuahua|Ojinaga|Mazatlan|Bahia_Banderas|Hermosillo|Tijuana|Ciudad_Juarez)$/.test(tz)) return 'MX';
  if (/^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Araguaina|Maceio|Santarem|Noronha|Eirunepe)$/.test(tz)) return 'BR';
  if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Glace_Bay|Goose_Bay|Whitehorse|Dawson|Dawson_Creek|Yellowknife|Iqaluit|Rankin_Inlet|Resolute|Cambridge_Bay|Inuvik|Swift_Current|Fort_Nelson|Creston|Atikokan|Blanc-Sablon)$/.test(tz)) return 'CA';
  return 'US';
}
