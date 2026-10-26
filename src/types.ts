export interface Pose { sx: number; sy: number; ex: number; ey: number; rot: number; lock: number; sx2?: number; sy2?: number; rt2?: number }

export interface VariantMeta {
  key: string;
  name: string;
  desc: string;
  pose?: Pose;
  /** Mouth expression for this way of acting ('own' when it opens its own mouth). */
  mouth?: string;
  /** Hand gesture for this way of acting. */
  hands?: string;
  /** How long it plays before going back to idle (happy only). */
  ms?: number;
}
export interface FidgetMeta { key: string; name: string; ms: number; pose?: Pose; mouth?: string; hands?: string }

export type StateGroup = 'chat' | 'feelings' | 'data' | 'work' | 'talk' | 'status';
export interface StateMeta {
  key: string;
  name: string;
  when: string;
  group: StateGroup;
  verb: string;
  mouth: string;
  hands: string;
  pose: Pose | null;
  variants: VariantMeta[];
  fidgets?: FidgetMeta[];
}

export interface EventRow { group: string; event: string; means: string; state: string }
export interface EventsData {
  events: EventRow[];
  notes: Record<string, string>;
  oneShotMs: Record<string, number>;
  progressVariants: Record<string, string>;
  errorKinds: string[];
  stillWorking: { after: number; state: string; variant: string; range: [number, number] };
  fidgets: { sometimes: [number, number]; often: [number, number]; durationsMs: Record<string, number>; yawnAfterIdleMs: number };
  doze: { afterSeconds: number[]; default: number; variants: string[]; graceMs: number };
  tickMs: number;
}

/** Zones of the drawing, back to front. */
export type Zone = 'pre' | 'cosb' | 'back' | 'mid' | 'glyph' | 'front' | 'top' | 'fx';
/** A part: [zone, paint order in zone, key, triggers (st-, v-, cos-, hol-), template]. */
export type Part = [zone: Zone, order: number, key: string, on: string[], template: string];
export interface PartsPack { id: string; states: string[]; parts: Part[]; css: string }
