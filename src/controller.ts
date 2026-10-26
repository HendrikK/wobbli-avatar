// The event-to-state machine (docs/DESIGN.md, "Event to state rules"). Pure: time comes from an injectable clock,
// randomness from an injectable source, and nothing touches a browser. The DOM runtime drives tick() from
// one shared 400 ms ticker, feeds input() from one shared listener and pauses it while the page is hidden.
import { EVENTS_DATA, STATE } from './registry.js';
import type { Motion } from './render.js';

export type Kind = 'pending' | 'error' | 'question' | 'answer';
export type Cause = string; // an event name, 'progress', 'still-working', 'back-to-idle', 'fidget', 'doze', 'wake', 'setState'
export type Fidgets = 'off' | 'sometimes' | 'often';

export interface AvatarState {
  state: string;
  variant: string;
  kind: Kind;
  /** The default note for error events (for the host chat to show), else null. */
  note: string | null;
  /** Reported progress (0 to 1) or null. */
  progress: number | null;
}
export interface StateChange extends AvatarState { cause: Cause }

export interface StillWorking { after?: number; state?: string; variant?: string }

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
export const systemClock: Clock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: h => clearTimeout(h as ReturnType<typeof setTimeout>)
};

export interface ControllerOptions {
  /** Starting state. Default idle. */
  state?: string;
  /** Starting variant (one of the state's). Default: picked at random. */
  variant?: string;
  /** Pinned variants by state: a pinned state always plays that way of acting. */
  pins?: Record<string, string>;
  /** Remaps events to states, e.g. { "stream.end": "excitement" }. */
  events?: Record<string, string>;
  /** Playback speed, 0.25 to 2: every duration divides by it. Default 1. */
  speed?: number;
  /** Fidgets only run with motion "always" or "follow". Default "follow". */
  motion?: Motion;
  fidgets?: Fidgets;
  /** Seconds idle with no input before it dozes off: 0 (never), 60, 300 or 600. Default 600. */
  dozeAfter?: number;
  stillWorking?: StillWorking;
  /** The viewer asks for reduced motion: no fidgets (states and timers still apply). */
  reducedMotion?: boolean;
  clock?: Clock;
  random?: () => number;
  onStateChange?: (change: StateChange) => void;
}

export interface Controller {
  /** Sends an app event. Unknown names do nothing. */
  emit(event: string, value?: unknown): void;
  /** Reported progress, 0 to 1, or null to clear. */
  progress(value: number | null): void;
  /** Shows a state directly, skipping the event map. Rules 3 to 5 still apply. */
  setState(state: string, variant?: string): void;
  getState(): AvatarState;
  /** The user did something (pointer, key, wheel, touch): resets the doze clock, wakes it up. */
  input(): void;
  /** Pauses every clock while the page is hidden, and resumes them where they were. */
  setHidden(hidden: boolean): void;
  setOptions(options: Partial<Omit<ControllerOptions, 'clock' | 'random'>>): void;
  /** Checks the clocks (still working, fidgets, dozing). The runtime calls it every 400 ms. */
  tick(): void;
  /** Plays one idle fidget now (studio preview). */
  fidget(key: string): void;
  /** Dozes off now, ignoring input for `graceMs` (studio preview). */
  doze(graceMs?: number): void;
  subscribe(fn: (change: StateChange) => void): () => void;
  destroy(): void;
}

const D = EVENTS_DATA;
export const EVENT_MAP: Record<string, string> = Object.fromEntries(D.events.map(e => [e.event, e.state]));
export const EVENT_NAMES = D.events.map(e => e.event);
export const NOTES = D.notes;
const ONE_SHOT = D.oneShotMs;
const PROG = D.progressVariants;
const ERRORISH = new Set(D.errorKinds);
export const WORKING = new Set(Object.values(STATE).filter(s => s.key === 'busy' || s.group === 'data' || s.group === 'work').map(s => s.key));
const FIDGET_POOL = ['fglance', 'fstretch', 'fblink', 'flook', 'fshuffle'];
export const DEFAULT_STILL_WORKING = { after: D.stillWorking.after, state: D.stillWorking.state, variant: D.stillWorking.variant };

export const kindOf = (state: string): Kind => (WORKING.has(state) ? 'pending' : ERRORISH.has(state) ? 'error' : state === 'curious' ? 'question' : 'answer');
const clampAfter = (n: number) => Math.max(D.stillWorking.range[0], Math.min(D.stillWorking.range[1], Math.round(n)));

export function createController(options: ControllerOptions = {}): Controller {
  const clock = options.clock || systemClock;
  const random = options.random || Math.random;
  let o = { ...options };
  const listeners = new Set<(c: StateChange) => void>();
  if (o.onStateChange) listeners.add(o.onStateChange);

  // virtual time: real time minus the time spent hidden
  let pausedTotal = 0, pausedAt: number | null = null;
  const vnow = () => clock.now() - pausedTotal - (pausedAt != null ? clock.now() - pausedAt : 0);
  const speed = () => Math.max(0.25, Math.min(2, o.speed ?? 1));

  // one-shot timers on virtual time, backed by a single real timeout for the earliest
  let timers: { at: number; fn: () => void }[] = [];
  let handle: unknown = null;
  const arm = () => {
    if (handle != null) { clock.clearTimeout(handle); handle = null; }
    if (pausedAt != null || !timers.length) return;
    const next = Math.min(...timers.map(t => t.at));
    handle = clock.setTimeout(() => { handle = null; runDue(); }, Math.max(0, next - vnow()));
  };
  const runDue = () => {
    const now = vnow();
    const due = timers.filter(t => t.at <= now + 0.5).sort((a, b) => a.at - b.at);
    timers = timers.filter(t => !due.includes(t));
    due.forEach(t => t.fn());
    arm();
  };
  const later = (ms: number, fn: () => void) => { timers.push({ at: vnow() + ms, fn }); arm(); };
  const clearTimers = () => { timers = []; arm(); };

  const last: Record<string, string> = {};
  let cur: AvatarState = { state: 'idle', variant: 'idle', kind: 'answer', note: null, progress: null };
  let workSince: number | null = null, escalated = false;
  let sleeping = false, sleepSince = 0, graceMs: number = D.doze.graceMs, waking = false;
  let fidget: { key: string; until: number } | null = null, nextFidget = 0, lastFidget = '';
  let idleSince = vnow(), lastInput = vnow();

  const validVariant = (st: string, v?: string) => !!v && !!STATE[st] && STATE[st].variants.some(x => x.key === v);
  function choose(st: string): string {
    if (st === 'idle') return 'idle';
    const pin = o.pins?.[st];
    if (pin && validVariant(st, pin)) return pin;
    const list = STATE[st].variants, prev = last[st];
    let pool = list.filter(x => x.key !== prev);
    if (!pool.length) pool = list;
    const v = pool[Math.floor(random() * pool.length) % pool.length].key;
    last[st] = v;
    return v;
  }
  function notify(cause: Cause) {
    const c: StateChange = { ...cur, cause };
    listeners.forEach(fn => fn(c));
  }
  function set(state: string, variant: string, cause: Cause, note: string | null = null, silent = false) {
    if (state !== cur.state || cause !== 'fidget') fidget = null;
    if (state === 'idle' && cur.state !== 'idle') { idleSince = vnow(); nextFidget = 0; }
    cur = { state, variant, kind: kindOf(state), note, progress: cur.progress };
    if (!silent) notify(cause);
  }
  // an event, setState or the starting state: rules 1, 3, 4 and 5
  function enter(state: string, variant: string, cause: Cause, note: string | null, silent = false) {
    clearTimers();
    sleeping = false; waking = false;
    cur.progress = null; escalated = false;
    workSince = WORKING.has(state) ? vnow() : null;
    set(state, variant, cause, note, silent);
    const vm = STATE[state].variants.find(x => x.key === variant);
    const back = state === 'happy' ? (vm?.ms || 1800) : ONE_SHOT[state];
    if (back) later(back / speed(), () => set('idle', 'idle', 'back-to-idle'));
  }
  function escalate() {
    escalated = true;
    const sw = { ...DEFAULT_STILL_WORKING, ...o.stillWorking };
    const st = STATE[sw.state] && sw.state !== 'idle' ? sw.state : DEFAULT_STILL_WORKING.state;
    set(st, validVariant(st, sw.variant) ? sw.variant : choose(st), 'still-working');
  }
  const fidgetsOn = () => (o.fidgets ?? 'sometimes') !== 'off' && ['always', 'follow'].includes(o.motion ?? 'follow') && !o.reducedMotion;
  const fidgetMs = (key: string) => (STATE.idle.fidgets?.find(f => f.key === key)?.ms ?? 2000) / speed();
  function startFidget(key: string) {
    lastFidget = key;
    fidget = { key, until: vnow() + fidgetMs(key) };
    nextFidget = 0;
    set('idle', key, 'fidget');
  }
  function doze(grace = D.doze.graceMs) {
    clearTimers();
    cur.progress = null; workSince = null; escalated = false; waking = false;
    sleeping = true; sleepSince = vnow(); graceMs = grace;
    const vs = D.doze.variants;
    set('sleep', vs[Math.floor(random() * vs.length) % vs.length], 'doze');
  }
  function wake() {
    sleeping = false; waking = true;
    clearTimers();
    set('idle', 'fwake', 'wake');
    later(fidgetMs('fwake'), () => {
      set('greet', choose('greet'), 'wake');
      later((ONE_SHOT.greet ?? 2800) / speed(), () => { waking = false; set('idle', 'idle', 'back-to-idle'); });
    });
  }

  // starting state
  {
    const st = o.state && STATE[o.state] ? o.state : 'idle';
    const v = validVariant(st, o.variant) ? (o.variant as string) : choose(st);
    if (st !== 'idle') last[st] = v;
    enter(st, v, 'setState', null, true);
  }

  const api: Controller = {
    emit(name, value) {
      if (name === 'progress') { api.progress(value as number | null); return; }
      const st = o.events?.[name] || EVENT_MAP[name];
      if (!st || !STATE[st]) return;
      enter(st, choose(st), name, NOTES[name] || null);
    },
    progress(value) {
      if (value == null || typeof value !== 'number' || !isFinite(value)) {
        if (cur.progress == null) return;
        cur.progress = null;
        notify('progress');
        return;
      }
      const p = Math.max(0, Math.min(1, value));
      workSince = vnow(); escalated = false; sleeping = false; waking = false;
      const pv = PROG[cur.state];
      if (pv) { cur.progress = p; set(cur.state, pv, 'progress', cur.note); }
      else { clearTimers(); cur.progress = p; set('busy', PROG.busy || 'ring', 'progress'); }
    },
    setState(state, variant) {
      if (!STATE[state]) return;
      enter(state, validVariant(state, variant) ? (variant as string) : choose(state), 'setState', null);
    },
    getState: () => ({ ...cur }),
    input() {
      lastInput = vnow();
      if (sleeping && vnow() - sleepSince > graceMs) wake();
    },
    setHidden(hidden) {
      if (hidden && pausedAt == null) { pausedAt = clock.now(); arm(); }
      else if (!hidden && pausedAt != null) { pausedTotal += clock.now() - pausedAt; pausedAt = null; arm(); }
    },
    setOptions(next) {
      if (next.onStateChange && next.onStateChange !== o.onStateChange) {
        if (o.onStateChange) listeners.delete(o.onStateChange);
        listeners.add(next.onStateChange);
      }
      o = { ...o, ...next };
      if (next.fidgets !== undefined) nextFidget = 0;
    },
    tick() {
      if (pausedAt != null) return;
      runDue();
      const now = vnow();
      const sw = { ...DEFAULT_STILL_WORKING, ...o.stillWorking };
      if (workSince != null && !escalated && cur.progress == null && now - workSince >= clampAfter(sw.after) * 1000) escalate();
      if (cur.state !== 'idle' || sleeping || waking) return;
      const doze = o.dozeAfter ?? D.doze.default;
      if (doze > 0 && !fidget && now - Math.max(lastInput, idleSince) >= doze * 1000) { api.doze(); return; }
      if (fidget) {
        if (now >= fidget.until) { fidget = null; nextFidget = 0; set('idle', 'idle', 'fidget'); }
        return;
      }
      if (!fidgetsOn()) { nextFidget = 0; return; }
      const range = (o.fidgets ?? 'sometimes') === 'often' ? D.fidgets.often : D.fidgets.sometimes;
      if (!nextFidget) nextFidget = now + range[0] + random() * (range[1] - range[0]);
      else if (now >= nextFidget) {
        const pool = FIDGET_POOL.slice();
        if (now - idleSince > D.fidgets.yawnAfterIdleMs) pool.push('fyawn', 'fyawn');
        const pick = pool.filter(x => x !== lastFidget);
        startFidget(pick[Math.floor(random() * pick.length) % pick.length]);
      }
    },
    fidget(key) {
      if (!STATE.idle.fidgets?.some(f => f.key === key)) return;
      if (cur.state !== 'idle' || sleeping) enter('idle', 'idle', 'setState', null);
      startFidget(key);
    },
    doze(grace) { doze(grace); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    destroy() { clearTimers(); listeners.clear(); }
  };
  return api;
}
