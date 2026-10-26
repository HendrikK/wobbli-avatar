export type HolidayKind = 'civic' | 'cultural' | 'religious' | 'seasonal';
export interface CostumeMeta { key: string; name: string }
export interface HolidayMeta {
  key: string;
  label: string;
  /** Provisional until the cultural review; `reviewed` turns true once someone who celebrates it has checked it. */
  kind: HolidayKind;
  reviewed: boolean;
  costumes: CostumeMeta[];
  /** The data file it belongs to. */
  pack: string;
  /** Every data file holding its costume parts (a costume can be shared with another holiday). */
  packs: string[];
}
/**
 * A date rule: "MM-DD", { easter: n } (days after Easter Sunday), { nth: [month, weekday, k] },
 * { last: [month, weekday] }, { onOrAfter: ["MM-DD", weekday] }, { table: key } (the region's moon
 * table for that year) or { rule: name } for the few that need code. Weekdays: 0 is Sunday.
 */
export type DateRule =
  | string
  | { easter: number }
  | { nth: [number, number, number] }
  | { last: [number, number] }
  | { onOrAfter: [string, number] }
  | { table: string }
  | { rule: string; n?: number };
export interface DateSpec {
  on: DateRule;
  /** First day: days from the main day, or a rule. Default: the main day (or the table's first day). */
  from?: number | DateRule;
  /** Last day, likewise. */
  to?: number | DateRule;
  /** A fixed costume for this date (the bank holidays). */
  costume?: string;
}
export interface RegionData {
  name: string;
  pack: string;
  /** The shared holidays this region keeps. */
  shared: string[];
  overrides: Record<string, DateSpec>;
  dates: (DateSpec & { key: string })[];
  /** Moon-based dates by year: key -> ["MM-DD" main, first, last], or a list of those when it falls twice. */
  moon: Record<string, Record<string, string[] | string[][]>>;
  /** Data files to load for this region's costumes. */
  packs: string[];
}
