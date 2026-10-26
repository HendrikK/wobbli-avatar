// wobbli/holidays: costumes by date, region and kind. Nothing here loads unless an app
// turns holidays on; each region's costume parts and CSS load only when that region (or holiday) is used.
import { HOLIDAY_CSS } from '../generated/hol-common.js';
import { PACK_LOADERS } from '../generated/hol-loaders.js';
import { isPackLoaded, registerPack } from '../registry.js';
import type { HolidayDress } from '../render.js';
import { HOLIDAY, REGIONS, type HolidayFilter, dayOf, detectRegion, holidayOn, zodiacFor } from './calendar.js';

export * from './calendar.js';
export type * from './types.js';

const pending = new Map<string, Promise<void>>();
function loadPack(pack: string): Promise<void> {
  const id = 'holidays:' + pack;
  if (isPackLoaded(id)) return Promise.resolve();
  let p = pending.get(id);
  if (!p) {
    if (!isPackLoaded('holidays:common')) registerPack({ id: 'holidays:common', states: [], parts: [], css: HOLIDAY_CSS });
    p = (PACK_LOADERS[pack] ? PACK_LOADERS[pack]() : Promise.reject(new Error('No holiday pack ' + pack))).then(registerPack).finally(() => pending.delete(id));
    pending.set(id, p);
  }
  return p;
}
/** Loads the costumes a region can show. */
export function loadRegion(region: string): Promise<void> {
  const R = REGIONS[region];
  return R ? Promise.all(R.packs.map(loadPack)).then(() => undefined) : Promise.resolve();
}
/** Loads one holiday's costumes. */
export function loadHoliday(key: string): Promise<void> {
  const h = HOLIDAY[key];
  return h ? Promise.all(h.packs.map(loadPack)).then(() => undefined) : Promise.resolve();
}
export const isHolidayLoaded = (key: string) => !!HOLIDAY[key] && HOLIDAY[key].packs.every(p => isPackLoaded('holidays:' + p));

export interface HolidayProps {
  /** Omitted: no costume. "auto": by date for `region`. A holiday key: always that holiday. */
  holiday?: string | null;
  /** A region code (US, IE, IN ...). Default: from the time zone, falling back to the United States. */
  region?: string;
  /** Days before a holiday its costume starts showing with "auto": 0, 3 or 7. Default 7. */
  leadDays?: number;
  /** With a holiday key: one of its costumes. Default: random. */
  costume?: string;
  /** What "auto" may show, by holiday key or kind. */
  holidays?: HolidayFilter;
  /** The day to dress for (tests and previews). Default today. */
  date?: Date | string;
}

/**
 * The costume to wear for a set of props, or null. For a pinned holiday with no costume pin, `current` (the
 * costume it wears now) stays on when it belongs to that holiday; otherwise one is picked at random.
 */
export function resolveHoliday(p: HolidayProps, current?: string | null, random = Math.random): HolidayDress | null {
  if (!p.holiday) return null;
  const day = dayOf(p.date ?? new Date());
  if (p.holiday === 'auto') {
    const region = p.region && REGIONS[p.region] ? p.region : detectRegion();
    const lead = [0, 3, 7].includes(p.leadDays as number) ? (p.leadDays as number) : 7;
    const a = holidayOn(region, day, lead, p.holidays);
    return a ? { key: a.key, costume: a.costume, zodiac: zodiacFor(day), label: HOLIDAY[a.key].label } : null;
  }
  const h = HOLIDAY[p.holiday];
  if (!h) return null;
  let costume = p.costume && h.costumes.some(c => c.key === p.costume) ? p.costume : null;
  if (!costume) costume = current && h.costumes.some(c => c.key === current) ? current : h.costumes[Math.floor(random() * h.costumes.length) % h.costumes.length].key;
  return { key: h.key, costume, zodiac: zodiacFor(day), label: h.label };
}

/** Resolves and loads in one go. */
export async function dressFor(p: HolidayProps, current?: string | null): Promise<HolidayDress | null> {
  const d = resolveHoliday(p, current);
  if (d) await loadHoliday(d.key);
  if (p.holiday === 'auto') await loadRegion(p.region && REGIONS[p.region] ? p.region : detectRegion());
  return d;
}
