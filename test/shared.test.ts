// @vitest-environment jsdom
// A controller the app shares between avatars runs on the runtime's ticker: still working, dozing and pausing
// while the page is hidden. Fake timers are on before the first mount, so they drive the runtime's interval.
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import { createController, preload, type StateChange } from '../src/index';
import { mount } from '../src/dom/mount';

let hidden = false;
beforeAll(async () => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  await preload();
  vi.useFakeTimers();
});
afterEach(() => { document.body.innerHTML = ''; setHidden(false); });
afterAll(() => { vi.useRealTimers(); });

function setHidden(h: boolean) {
  hidden = h;
  document.dispatchEvent(new Event('visibilitychange'));
}
function two(ctl: ReturnType<typeof createController>) {
  const a = document.createElement('div'), b = document.createElement('div');
  document.body.append(a, b);
  const handles = [mount(a, { name: 'a', controller: ctl }), mount(b, { name: 'b', controller: ctl })];
  const classes = () => [a, b].map(el => el.querySelector('.aa-av')!.className);
  return { classes, destroy: () => handles.forEach(h => h.destroy()) };
}

test('a shared controller turns to still working once, for every avatar following it', () => {
  const causes: string[] = [];
  const ctl = createController({ stillWorking: { after: 5 }, fidgets: 'off', onStateChange: (c: StateChange) => causes.push(c.cause) });
  const { classes, destroy } = two(ctl);
  ctl.emit('tool.search');
  vi.advanceTimersByTime(6000);
  expect(ctl.getState().state).toBe('still');
  for (const c of classes()) expect(c).toContain('st-still');
  expect(causes.filter(c => c === 'still-working')).toHaveLength(1);
  destroy();
  ctl.destroy();
});

test('a shared controller dozes off', () => {
  const ctl = createController({ dozeAfter: 60, fidgets: 'off' });
  const { classes, destroy } = two(ctl);
  vi.advanceTimersByTime(61_000);
  expect(ctl.getState().state).toBe('sleep');
  for (const c of classes()) expect(c).toContain('st-sleep');
  destroy();
  ctl.destroy();
});

test('a shared controller wakes on input', () => {
  const ctl = createController({ dozeAfter: 60, fidgets: 'off' });
  const { destroy } = two(ctl);
  vi.advanceTimersByTime(61_000);
  expect(ctl.getState().state).toBe('sleep');
  vi.advanceTimersByTime(1000);
  window.dispatchEvent(new Event('keydown'));
  expect(ctl.getState().variant).toBe('fwake');
  destroy();
  ctl.destroy();
});

test('a shared controller’s clocks stop while the page is hidden', () => {
  const ctl = createController({ stillWorking: { after: 5 }, fidgets: 'off' });
  const { destroy } = two(ctl);
  ctl.emit('tool.search');
  setHidden(true);
  vi.advanceTimersByTime(30_000);
  setHidden(false);
  expect(ctl.getState().state).toBe('search');
  vi.advanceTimersByTime(6000);
  expect(ctl.getState().state).toBe('still');
  destroy();
  ctl.destroy();
});

test('an avatar going away leaves the shared controller running for the others', () => {
  const ctl = createController({ stillWorking: { after: 5 }, fidgets: 'off' });
  const a = document.createElement('div'), b = document.createElement('div');
  document.body.append(a, b);
  const ha = mount(a, { name: 'a', controller: ctl });
  mount(b, { name: 'b', controller: ctl }).destroy();
  ctl.emit('tool.search');
  vi.advanceTimersByTime(6000);
  expect(a.querySelector('.aa-av')!.className).toContain('st-still');
  ha.destroy();
  ctl.destroy();
});
