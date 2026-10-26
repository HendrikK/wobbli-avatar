// Behaviour suite: every rule in docs/DESIGN.md "Event to state rules", in order, on a fake clock.
import { describe, expect, test } from 'vitest';
import { EVENTS_DATA, STATE, kindOf } from '../src/index';
import { sim } from './helpers';

const HAPPY: Record<string, number> = { hop: 1600, spin: 1950, puff: 1950, tada: 2150, dance: 2450 };

describe('events and their default states', () => {
  test.each(EVENTS_DATA.events.map(e => [e.event, e.state]))('%s plays %s', (event, state) => {
    const s = sim();
    s.c.emit(event);
    expect(s.state().state).toBe(state);
    expect(s.log.at(-1)?.cause).toBe(event);
  });
  test('the table is the one in the brief', () => {
    expect(EVENTS_DATA.events).toHaveLength(26);
    expect(Object.fromEntries(EVENTS_DATA.events.map(e => [e.event, e.state]))).toMatchObject({
      'message.sent': 'busy', 'stream.start': 'write', 'stream.end': 'happy', 'input.unclear': 'curious', 'approval.needed': 'approval',
      'instruction.ack': 'gotit', 'session.start': 'greet', 'session.end': 'bye', 'error.network': 'offline', 'error.rate_limit': 'queued',
      'error.permission': 'sad', 'error.no_results': 'sad', 'error.unknown': 'error'
    });
  });
  test('apps can remap any event to any state', () => {
    const s = sim({ events: { 'stream.end': 'excitement', 'tool.search': 'monitor' } });
    s.c.emit('stream.end');
    expect(s.state().state).toBe('excitement');
    s.c.emit('tool.search');
    expect(s.state().state).toBe('monitor');
  });
});

describe('rule 1: last event wins', () => {
  test('an event replaces the state at once and cancels a pending back-to-idle', () => {
    const s = sim({ pins: { happy: 'tada' } });
    s.c.emit('stream.end');
    s.advance(1000);
    s.c.emit('message.sent');
    expect(s.state().state).toBe('busy');
    s.advance(5000);
    expect(s.state().state).toBe('busy');
  });
  test('unknown event names are ignored', () => {
    const s = sim();
    s.c.emit('tool.search');
    const before = s.log.length;
    s.c.emit('tool.teleport');
    s.c.emit('');
    expect(s.state().state).toBe('search');
    expect(s.log.length).toBe(before);
  });
  test('there is no queue: rapid events end on the last one', () => {
    const s = sim();
    ['message.sent', 'tool.search', 'tool.query', 'error.unknown', 'stream.start'].forEach(e => s.c.emit(e));
    expect(s.state().state).toBe('write');
  });
});

describe('rule 2: variants', () => {
  test('each start picks one of five, never the same one twice in a row', () => {
    const s = sim();
    const seen = new Set<string>();
    let prev = '';
    for (let i = 0; i < 60; i++) {
      s.c.emit('message.sent');
      const v = s.state().variant;
      expect(STATE.busy.variants.map(x => x.key)).toContain(v);
      expect(v).not.toBe(prev);
      seen.add(v); prev = v;
    }
    expect(seen.size).toBe(5);
  });
  test('a pinned variant always plays', () => {
    const s = sim({ pins: { busy: 'dots' } });
    for (let i = 0; i < 5; i++) { s.c.emit('message.sent'); expect(s.state().variant).toBe('dots'); }
  });
});

describe('rule 3: back to idle', () => {
  for (const speed of [1, 2]) {
    test.each(Object.entries(HAPPY))('happy %s returns after %i ms at speed ' + speed, (v, ms) => {
      const s = sim({ pins: { happy: v }, speed });
      s.c.emit('stream.end');
      s.advance(ms / speed - 20);
      expect(s.state().state).toBe('happy');
      s.advance(40);
      expect(s.state()).toMatchObject({ state: 'idle', variant: 'idle' });
      expect(s.log.at(-1)?.cause).toBe('back-to-idle');
    });
  }
  test.each([['session.start', 2800], ['session.end', 2800], ['instruction.ack', 2200]])('%s returns after %i ms', (e, ms) => {
    for (const speed of [1, 2]) {
      const s = sim({ speed, fidgets: 'off' });
      s.c.emit(e as string);
      s.advance((ms as number) / speed - 20);
      expect(s.state().state).not.toBe('idle');
      s.advance(40);
      expect(s.state().state).toBe('idle');
    }
  });
  test('every other state holds until the next event', () => {
    for (const e of ['input.unclear', 'approval.needed', 'error.network', 'error.permission', 'handoff']) {
      const s = sim({ dozeAfter: 0 });
      s.c.emit(e);
      const st = s.state().state;
      s.advance(10 * 60 * 1000);
      expect(s.state().state).toBe(st);
    }
  });
  test('setState follows the same rules', () => {
    const s = sim({ pins: { happy: 'hop' } });
    s.c.setState('happy');
    s.advance(1700);
    expect(s.state().state).toBe('idle');
  });
});

describe('rules 4 and 5: still working', () => {
  const working = [...EVENTS_DATA.events.filter(e => ['busy', 'write', 'search', 'query', 'analyze', 'build', 'export', 'import', 'download', 'upload', 'sync', 'connect'].includes(e.state))];
  test('the working states are busy, Moving data and Working', () => {
    const keys = Object.values(STATE).filter(s => kindOf(s.key) === 'pending').map(s => s.key).sort();
    expect(keys).toEqual(['analyze', 'build', 'busy', 'connect', 'download', 'export', 'import', 'query', 'search', 'still', 'sync', 'upload', 'write']);
  });
  test.each(working.map(e => [e.event]))('%s switches to still working after 20 s, once', e => {
    const s = sim();
    s.c.emit(e);
    s.advance(19_500);
    expect(s.state().state).not.toBe('still');
    s.advance(1000);
    expect(s.state().state).toBe('still');
    expect(s.log.at(-1)?.cause).toBe('still-working');
    const n = s.log.length;
    s.advance(120_000);
    expect(s.log.length).toBe(n);
  });
  test('not for states that are not working', () => {
    const s = sim({ dozeAfter: 0 });
    s.c.emit('approval.needed');
    s.advance(60_000);
    expect(s.state().state).toBe('approval');
  });
  test('never while progress shows; each value restarts the clock', () => {
    const s = sim();
    s.c.emit('tool.download');
    s.advance(15_000);
    s.c.progress(0.3);
    s.advance(60_000);
    expect(s.state().state).toBe('download');
    s.c.progress(null);
    s.advance(25_000);
    expect(s.state().state).toBe('still');
  });
  test('custom after, state and variant; the next event resets it', () => {
    const s = sim({ stillWorking: { after: 5, state: 'queued', variant: 'quhour' } });
    s.c.emit('tool.query');
    s.advance(5400);
    expect(s.state()).toMatchObject({ state: 'queued', variant: 'quhour' });
    s.c.emit('tool.query');
    expect(s.state().state).toBe('query');
    s.advance(5400);
    expect(s.state().state).toBe('queued');
  });
  test('after is kept within 3 to 120 s', () => {
    const s = sim({ stillWorking: { after: 1 } });
    s.c.emit('tool.build');
    s.advance(2000);
    expect(s.state().state).toBe('build');
    s.advance(1200);
    expect(s.state().state).toBe('still');
  });
});

describe('rule 6: progress', () => {
  test.each([['message.sent', 'busy', 'ring'], ['tool.download', 'download', 'dlbar'], ['tool.query', 'query', 'qubar']])('%s shows its progress variant', (e, st, v) => {
    const s = sim();
    s.c.emit(e);
    s.c.progress(0.5);
    expect(s.state()).toMatchObject({ state: st, variant: v, progress: 0.5 });
    expect(s.log.at(-1)?.cause).toBe('progress');
  });
  test('other states switch to busy with the ring; values clamp to 0 to 1', () => {
    const s = sim();
    s.c.emit('tool.search');
    s.c.emit('progress', 1.7);
    expect(s.state()).toMatchObject({ state: 'busy', variant: 'ring', progress: 1, kind: 'pending' });
    s.c.progress(-2);
    expect(s.state().progress).toBe(0);
  });
  test('null clears the value; the next event clears it too', () => {
    const s = sim();
    s.c.emit('tool.query');
    s.c.progress(0.4);
    s.c.progress(null);
    expect(s.state().progress).toBeNull();
    s.c.progress(0.4);
    s.c.emit('stream.end');
    expect(s.state().progress).toBeNull();
  });
});

describe('rule 7: message kind and notes', () => {
  test.each([
    ['message.sent', 'pending'], ['tool.sync', 'pending'], ['error.network', 'error'], ['error.rate_limit', 'error'], ['error.unknown', 'error'],
    ['error.permission', 'error'], ['input.unclear', 'question'], ['stream.end', 'answer'], ['approval.needed', 'answer']
  ])('%s is %s', (e, kind) => {
    const s = sim();
    s.c.emit(e);
    expect(s.state().kind).toBe(kind);
  });
  test('anger is an error kind', () => expect(kindOf('anger')).toBe('error'));
  test('error events carry a default note', () => {
    const s = sim();
    s.c.emit('error.network');
    expect(s.state().note).toBe('I lost the connection to the data source. Trying again…');
    s.c.emit('message.sent');
    expect(s.state().note).toBeNull();
  });
});

describe('rule 8: idle fidgets', () => {
  const fidgets = (s: ReturnType<typeof sim>) => s.log.filter(l => l.cause === 'fidget' && l.variant !== 'idle');
  test('sometimes: one every 12 to 26 s, never the same twice in a row', () => {
    const s = sim({ dozeAfter: 0 });
    s.advance(10 * 60 * 1000);
    const f = fidgets(s);
    expect(f.length).toBeGreaterThan(18);
    for (let i = 1; i < f.length; i++) {
      expect(f[i].variant).not.toBe(f[i - 1].variant);
      const ends = s.log.find(l => l.t > f[i - 1].t && l.cause === 'fidget' && l.variant === 'idle')!;
      const gap = f[i].t - ends.t;
      expect(gap).toBeGreaterThanOrEqual(12_000 - 400);
      expect(gap).toBeLessThanOrEqual(26_000 + 800);
    }
  });
  test('often: one every 4.5 to 9 s', () => {
    const s = sim({ dozeAfter: 0, fidgets: 'often' });
    s.advance(2 * 60 * 1000);
    const f = fidgets(s);
    for (let i = 1; i < f.length; i++) {
      const ends = s.log.find(l => l.t > f[i - 1].t && l.cause === 'fidget' && l.variant === 'idle')!;
      const gap = f[i].t - ends.t;
      expect(gap).toBeGreaterThanOrEqual(4500 - 400);
      expect(gap).toBeLessThanOrEqual(9000 + 800);
    }
  });
  test('each plays its length, then idle again', () => {
    const s = sim({ dozeAfter: 0, fidgets: 'often' });
    s.advance(3 * 60 * 1000);
    let checked = 0;
    const want: Record<string, number> = { fglance: 2800, fstretch: 2400, fblink: 900, flook: 2600, fshuffle: 2000, fyawn: 3600 };
    for (const f of fidgets(s)) {
      const end = s.log.find(l => l.t > f.t && l.variant === 'idle');
      if (!end) continue; // still playing when the run ended
      expect(end.t - f.t).toBeGreaterThanOrEqual(want[f.variant] - 1);
      expect(end.t - f.t).toBeLessThanOrEqual(want[f.variant] + 400);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });
  test('yawn joins only after 60 s of idle', () => {
    const s = sim({ dozeAfter: 0, fidgets: 'often' }, 3);
    s.advance(10 * 60 * 1000);
    const f = fidgets(s);
    expect(f.filter(x => x.variant === 'fyawn' && x.t < 60_000)).toHaveLength(0);
    expect(f.some(x => x.variant === 'fyawn')).toBe(true);
  });
  test.each([[{ fidgets: 'off' as const }], [{ motion: 'none' as const }], [{ motion: 'hover' as const }], [{ reducedMotion: true }]])('none with %j', o => {
    const s = sim({ dozeAfter: 0, ...o });
    s.advance(5 * 60 * 1000);
    expect(fidgets(s)).toHaveLength(0);
  });
  test('any other state ends a fidget', () => {
    const s = sim({ dozeAfter: 0, fidgets: 'often' });
    s.advance(9400);
    s.c.fidget('fglance');
    s.c.emit('message.sent');
    expect(s.state().state).toBe('busy');
    s.c.emit('session.start');
    s.advance(3000);
    expect(s.state().variant).toBe('idle');
  });
});

describe('rule 9: dozing off', () => {
  test('after 600 s idle with no input it sleeps, with one of four variants', () => {
    const s = sim({ fidgets: 'off' });
    s.advance(599_000);
    expect(s.state().state).toBe('idle');
    s.advance(1_200);
    expect(s.state().state).toBe('sleep');
    expect(['slcap', 'sldream', 'slloaf', 'slmoon']).toContain(s.state().variant);
    expect(s.log.at(-1)?.cause).toBe('doze');
  });
  test('input resets the clock; 60 and 300 work; 0 never dozes', () => {
    const s = sim({ fidgets: 'off', dozeAfter: 60 });
    s.advance(50_000); s.c.input(); s.advance(50_000);
    expect(s.state().state).toBe('idle');
    s.advance(11_000);
    expect(s.state().state).toBe('sleep');
    const t = sim({ fidgets: 'off', dozeAfter: 300 });
    t.advance(301_000);
    expect(t.state().state).toBe('sleep');
    const n = sim({ fidgets: 'off', dozeAfter: 0 });
    n.advance(3 * 3600 * 1000);
    expect(n.state().state).toBe('idle');
  });
  test('idle time counts from the last time it became idle', () => {
    const s = sim({ fidgets: 'off', dozeAfter: 60 });
    s.advance(100_000);
    expect(s.state().state).toBe('sleep');
    const t = sim({ fidgets: 'off', dozeAfter: 60 });
    t.advance(50_000);
    t.c.emit('session.start');
    t.advance(50_000);
    expect(t.state().state).toBe('idle');
  });
  test('not while a fidget plays', () => {
    const s = sim({ dozeAfter: 60, fidgets: 'often' });
    s.advance(59_000);
    s.c.fidget('fyawn');
    s.advance(2000);
    expect(s.state()).toMatchObject({ state: 'idle', variant: 'fyawn' });
  });
});

describe('rule 10: waking up', () => {
  test('input after the 0.8 s grace: wake-up 1.2 s, greet 2.8 s, then idle', () => {
    const s = sim({ fidgets: 'off', dozeAfter: 60 });
    s.advance(60_400);
    expect(s.state().state).toBe('sleep');
    s.c.input();
    expect(s.state().state).toBe('sleep');
    s.advance(900);
    s.c.input();
    expect(s.state()).toMatchObject({ state: 'idle', variant: 'fwake' });
    expect(s.log.at(-1)?.cause).toBe('wake');
    s.advance(1190);
    expect(s.state().variant).toBe('fwake');
    s.advance(20);
    expect(s.state().state).toBe('greet');
    s.advance(2780);
    expect(s.state().state).toBe('greet');
    s.advance(30);
    expect(s.state()).toMatchObject({ state: 'idle', variant: 'idle' });
  });
  test('an app event while asleep goes straight to its state, no greeting', () => {
    const s = sim({ fidgets: 'off', dozeAfter: 60 });
    s.advance(61_000);
    s.c.emit('message.sent');
    expect(s.state().state).toBe('busy');
    s.advance(5000);
    expect(s.log.some(l => l.state === 'greet')).toBe(false);
  });
});

describe('rule 11: hidden tab', () => {
  test('clocks pause while hidden and resume where they were', () => {
    const s = sim({ fidgets: 'off', dozeAfter: 60, pins: { happy: 'dance' } });
    s.advance(50_000);
    s.c.setHidden(true);
    s.advance(10 * 60 * 1000);
    s.c.setHidden(false);
    expect(s.state().state).toBe('idle');
    s.advance(9_000);
    expect(s.state().state).toBe('idle');
    s.advance(2_000);
    expect(s.state().state).toBe('sleep');

    const t = sim({ pins: { happy: 'dance' } });
    t.c.emit('stream.end');
    t.advance(1000);
    t.c.setHidden(true);
    t.advance(60_000);
    expect(t.state().state).toBe('happy');
    t.c.setHidden(false);
    t.advance(1400);
    expect(t.state().state).toBe('happy');
    t.advance(100);
    expect(t.state().state).toBe('idle');
  });
  test('still working does not fire in the background', () => {
    const s = sim();
    s.c.emit('tool.query');
    s.advance(10_000);
    s.c.setHidden(true);
    s.advance(60_000);
    s.c.setHidden(false);
    s.advance(9_000);
    expect(s.state().state).toBe('query');
    s.advance(1_600);
    expect(s.state().state).toBe('still');
  });
});

describe('rule 12: reduced motion', () => {
  test('no fidgets, but state changes and their timers still apply', () => {
    const s = sim({ reducedMotion: true, dozeAfter: 60, pins: { happy: 'hop' } });
    s.c.emit('stream.end');
    s.advance(1700);
    expect(s.state().state).toBe('idle');
    s.advance(61_000);
    expect(s.state().state).toBe('sleep');
    expect(s.log.filter(l => l.cause === 'fidget')).toHaveLength(0);
  });
});
