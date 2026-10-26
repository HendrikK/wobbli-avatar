import { createController, type Clock, type ControllerOptions, type StateChange } from '../src/index';

/** A clock the test moves by hand. */
export function fakeClock() {
  let now = 0, id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock: Clock = {
    now: () => now,
    setTimeout: (fn, ms) => { timers.set(++id, { at: now + ms, fn }); return id; },
    clearTimeout: h => { timers.delete(h as number); }
  };
  /** Moves time forward to `to`, firing timers in order. */
  const runTo = (to: number) => {
    for (;;) {
      let next: [number, { at: number; fn: () => void }] | null = null;
      for (const e of timers) if (e[1].at <= to && (!next || e[1].at < next[1].at)) next = e;
      if (!next) break;
      timers.delete(next[0]);
      now = Math.max(now, next[1].at);
      next[1].fn();
    }
    now = to;
  };
  return { clock, runTo, get now() { return now; } };
}

/** A seeded random source. */
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * A controller on a fake clock, ticked every 400 ms like the runtime does. advance(ms) moves time and
 * ticks; log holds every change.
 */
export function sim(opts: ControllerOptions = {}, seed = 7) {
  const fc = fakeClock();
  const log: (StateChange & { t: number })[] = [];
  const c = createController({ clock: fc.clock, random: seeded(seed), ...opts, onStateChange: ch => log.push({ ...ch, t: fc.now }) });
  let nextTick = 400;
  const advance = (ms: number) => {
    const end = fc.now + ms;
    while (nextTick <= end) { fc.runTo(nextTick); c.tick(); nextTick += 400; }
    fc.runTo(end);
  };
  return { c, log, advance, get now() { return fc.now; }, state: () => c.getState() };
}
