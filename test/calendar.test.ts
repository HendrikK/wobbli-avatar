// Calendar suite: moon tables match the lists they come from and stay two years ahead, Easter, region
// detection, lead days, kinds and filters.
import { describe, expect, test } from 'vitest';
import {
  HOLIDAY, HOLIDAYS, KINDS, REGIONS, allowed, costumeOfDay, detectRegion, dn, easter, holidayOn, isoDay, occurrences, resolveHoliday, tableCoverage, upcoming, ymd, zodiacFor
} from '../src/holidays/index';

const d = (s: string) => { const [y, m, dd] = s.split('-').map(Number); return dn(y, m, dd); };
const on = (region: string, day: string, lead = 7, filter?: Parameters<typeof holidayOn>[3]) => holidayOn(region, d(day), lead, filter);

describe('the data', () => {
  test('74 holidays, five costumes each, every one with a kind', () => {
    expect(HOLIDAYS).toHaveLength(74);
    for (const h of HOLIDAYS) {
      expect(h.costumes).toHaveLength(5);
      expect(KINDS).toContain(h.kind);
      // kinds stay provisional until the cultural review (docs/DESIGN.md, Holidays)
      expect(h.reviewed).toBe(false);
    }
    expect(Object.keys(REGIONS)).toHaveLength(14);
  });
  test('every moon table reaches at least two years past today', () => {
    const now = new Date();
    for (const [r, last] of Object.entries(tableCoverage())) expect(last, r).toBeGreaterThanOrEqual(now.getFullYear() + 2);
    expect(tableCoverage()).toEqual({ IN: 2036, CN: 2036, KR: 2036 });
  });
  test('table dates are real dates, in order within each entry', () => {
    for (const [r, R] of Object.entries(REGIONS)) for (const [y, T] of Object.entries(R.moon)) for (const [k, v] of Object.entries(T)) {
      const entries = (Array.isArray(v[0]) ? v : [v]) as string[][];
      for (const e of entries) {
        const days = e.map(s => dn(+y, +s.slice(0, 2), +s.slice(3)));
        days.forEach((x, i) => expect(isoDay(x), r + ' ' + y + ' ' + k).toBe(y + '-' + e[i]));
        if (days.length === 3) { expect(days[1], k).toBeLessThanOrEqual(days[0]); expect(days[2], k).toBeGreaterThanOrEqual(days[0]); }
      }
    }
  });
});

describe('moon-based dates equal the official lists', () => {
  // India: central government (DoPT) lists for 2026 and 2027
  test.each([
    ['diwali', '2026-11-08'], ['holi', '2026-03-04'], ['eidfitr', '2026-03-21'], ['eidadha', '2026-05-28'], ['dussehra', '2026-10-20'], ['gurpurab', '2026-11-24'],
    ['diwali', '2027-10-29'], ['holi', '2027-03-23'], ['eidfitr', '2027-03-10'], ['eidadha', '2027-05-17'], ['janmashtami', '2027-08-25'], ['onam', '2027-09-12']
  ])('India %s %s', (key, day) => {
    expect(occurrences(+day.slice(0, 4), 'IN').some(o => o.key === key && isoDay(o.main) === day)).toBe(true);
  });
  // Hong Kong Observatory and KASI tables
  test.each([
    ['CN', 'lny', '2026-02-17'], ['CN', 'lny', '2030-02-03'], ['CN', 'lny', '2036-01-28'], ['CN', 'midautumn', '2029-09-22'], ['CN', 'dragonboat', '2033-06-01'],
    ['KR', 'seollal', '2027-02-07'], ['KR', 'seollal', '2028-01-27'], ['KR', 'chuseok', '2035-09-16']
  ])('%s %s %s', (r, key, day) => {
    expect(occurrences(+day.slice(0, 4), r).some(o => o.key === key && isoDay(o.main) === day)).toBe(true);
  });
  test('Eid al-Fitr falls twice in 2033', () => {
    expect(occurrences(2033, 'IN').filter(o => o.key === 'eidfitr').map(o => isoDay(o.main))).toEqual(['2033-01-03', '2033-12-24']);
  });
});

describe('Easter, 2026 to 2036', () => {
  test.each([
    [2026, '04-05'], [2027, '03-28'], [2028, '04-16'], [2029, '04-01'], [2030, '04-21'], [2031, '04-13'],
    [2032, '03-28'], [2033, '04-17'], [2034, '04-09'], [2035, '03-25'], [2036, '04-13']
  ])('%i: %s', (y, md) => expect(isoDay(easter(y))).toBe(y + '-' + md));
});

describe('rule-based dates work for any year', () => {
  test.each([
    ['US', 'thanksgiving', 2026, '2026-11-26'], ['US', 'mlk', 2027, '2027-01-18'], ['CA', 'thanksgiving', 2030, '2030-10-14'], ['GB', 'pancake', 2026, '2026-02-17'],
    ['IE', 'bankhol', 2026, '2026-10-26'], ['SE', 'midsummer', 2026, '2026-06-19'], ['JP', 'setsubun', 2029, '2029-02-02'], ['US', 'july4', 2045, '2045-07-04']
  ])('%s %s %i', (r, key, y, day) => {
    expect(occurrences(y, r).some(o => o.key === key && isoDay(o.main) === day)).toBe(true);
  });
  test('Ireland: St Brigid on 1 February plus the bank holiday Monday', () => {
    expect(occurrences(2027, 'IE').filter(o => o.key === 'brigid').map(o => isoDay(o.main))).toEqual(['2027-02-01']); // a Monday
    expect(occurrences(2026, 'IE').filter(o => o.key === 'brigid').map(o => isoDay(o.main))).toEqual(['2026-02-01', '2026-02-02']);
  });
  test('Germany: four Sundays of Advent', () => {
    expect(occurrences(2026, 'DE').filter(o => o.key === 'advent').map(o => isoDay(o.main))).toEqual(['2026-11-29', '2026-12-06', '2026-12-13', '2026-12-20']);
  });
});

describe('by date', () => {
  test('lead days: a week, three days, on the day', () => {
    expect(on('US', '2026-10-24', 7)?.key).toBe('halloween');
    expect(on('US', '2026-10-24', 3)).toBeNull();
    expect(on('US', '2026-10-28', 3)?.key).toBe('halloween');
    expect(on('US', '2026-10-30', 0)).toBeNull();
    expect(on('US', '2026-10-31', 0)).toMatchObject({ key: 'halloween', on: true });
  });
  test('ongoing beats lead-in; the region’s own beats the shared ones', () => {
    // Ireland, 26 Oct 2026: the October bank holiday is on, Halloween is in its lead-in
    expect(on('IE', '2026-10-26')).toMatchObject({ key: 'bankhol', costume: 'bh-october', on: true });
    // Mexico, 31 Oct 2026: Día de Muertos starts the same day Halloween would, and it is Mexico's own
    expect(on('MX', '2026-10-31')?.key).toBe('muertos');
  });
  test('Eid shows from the eve through the day after', () => {
    expect(on('IN', '2027-03-09', 0)?.key).toBe('eidfitr');
    expect(on('IN', '2027-03-11', 0)?.key).toBe('eidfitr');
    expect(on('IN', '2027-03-12', 0)?.key).not.toBe('eidfitr');
  });
  test('the costume is the same all day and changes across the days of a festival', () => {
    expect(costumeOfDay('diwali', d('2026-11-08'))).toBe(costumeOfDay('diwali', d('2026-11-08')));
    const days = ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'].map(x => costumeOfDay('diwali', d(x)));
    expect(new Set(days).size).toBeGreaterThan(1);
  });
  test('upcoming lists the next holidays in order', () => {
    const u = upcoming('US', d('2026-10-26'), 3).map(o => o.key);
    expect(u).toEqual(['halloween', 'thanksgiving', 'christmas']);
  });
  test('the Lunar New Year zodiac hat follows the lunar year', () => {
    expect(zodiacFor(d('2026-03-01'))).toBe('horse');
    expect(zodiacFor(d('2027-01-20'))).toBe('goat');
    expect(zodiacFor(d('2028-02-01'))).toBe('monkey');
  });
});

describe('kinds and filters', () => {
  test('exclude by kind or key; include narrows', () => {
    expect(allowed('diwali', { exclude: ['religious'] })).toBe(false);
    expect(allowed('halloween', { exclude: ['halloween'] })).toBe(false);
    expect(allowed('halloween', { include: ['civic'] })).toBe(false);
    expect(allowed('july4', { include: ['civic'] })).toBe(true);
    expect(on('US', '2026-12-20', 7, { exclude: ['religious'] })?.key).not.toBe('christmas');
    expect(on('US', '2026-10-30', 7, { exclude: ['halloween'] })?.key).not.toBe('halloween');
  });
  test('the brief’s religious list is tagged religious (pending review)', () => {
    for (const k of ['diwali', 'holi', 'shivaratri', 'navratri', 'durga', 'dussehra', 'janmashtami', 'ganesh', 'mahavir', 'vaisakhi', 'gurpurab', 'buddha', 'eidfitr', 'eidadha',
      'easter', 'christmas', 'muertos', 'posadas', 'reyes', 'obon', 'brigid', 'patrick', 'lucia', 'martin', 'nikolaus']) expect(HOLIDAY[k].kind, k).toBe('religious');
  });
});

describe('props', () => {
  test('omitted: no costume; a key: that holiday; auto: by date', () => {
    expect(resolveHoliday({})).toBeNull();
    expect(resolveHoliday({ holiday: 'diwali', costume: 'dw-rangoli' })).toMatchObject({ key: 'diwali', costume: 'dw-rangoli', label: 'Diwali' });
    expect(HOLIDAY.diwali.costumes.map(c => c.key)).toContain(resolveHoliday({ holiday: 'diwali' })!.costume);
    expect(resolveHoliday({ holiday: 'auto', region: 'US', date: '2026-10-29' })).toMatchObject({ key: 'halloween' });
    expect(resolveHoliday({ holiday: 'auto', region: 'US', date: '2026-10-29', holidays: { exclude: ['cultural'] } })).toBeNull();
  });
  test('a pinned holiday keeps its costume across updates', () => {
    const a = resolveHoliday({ holiday: 'christmas' })!;
    expect(resolveHoliday({ holiday: 'christmas' }, a.costume)!.costume).toBe(a.costume);
  });
});

describe('region detection by time zone', () => {
  test.each([
    ['Europe/Dublin', 'IE'], ['Asia/Kolkata', 'IN'], ['Europe/London', 'GB'], ['Asia/Tokyo', 'JP'], ['Asia/Seoul', 'KR'], ['Asia/Singapore', 'CN'], ['Asia/Taipei', 'CN'],
    ['Europe/Berlin', 'DE'], ['Europe/Stockholm', 'SE'], ['Europe/Paris', 'FR'], ['Australia/Sydney', 'AU'], ['America/Mexico_City', 'MX'], ['America/Sao_Paulo', 'BR'],
    ['America/Toronto', 'CA'], ['America/New_York', 'US'], ['Africa/Lagos', 'US'], ['', 'US']
  ])('%s is %s', (tz, r) => { if (tz) expect(detectRegion(tz)).toBe(r); else expect(Object.keys(REGIONS)).toContain(detectRegion()); });
  test('ymd and dn agree', () => expect(ymd(dn(2030, 2, 28))).toEqual([2030, 2, 28]));
});
