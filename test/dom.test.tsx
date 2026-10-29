// @vitest-environment jsdom
// The web component, the React wrapper and the runtime in a DOM.
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { act, createElement, createRef, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { createController, preload } from '../src/index';
import { mount } from '../src/dom/mount';
import '../src/element';
import { Wobbli, renderStatic, type WobbliHandle } from '../src/react';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
beforeAll(async () => {
  // jsdom has no matchMedia or IntersectionObserver
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  await preload();
});
afterEach(() => { document.body.innerHTML = ''; });
const tick = () => new Promise(r => setTimeout(r, 0));

describe('<wobbli-avatar>', () => {
  test('draws from attributes and takes events', async () => {
    const el = document.createElement('wobbli-avatar');
    el.setAttribute('name', 'nova');
    el.setAttribute('size', '40');
    document.body.appendChild(el);
    const root = el.querySelector('.aa-av')!;
    expect(root.getAttribute('role')).toBe('img');
    expect(root.className).toContain('st-idle');
    expect(el.style.width).toBe('40px');
    const seen: string[] = [];
    el.addEventListener('statechange', e => seen.push((e as CustomEvent).detail.state));
    el.emit('tool.search');
    expect(el.getState()?.state).toBe('search');
    expect(root.className).toContain('st-search');
    expect(seen).toEqual(['search']);
    el.setAttribute('mouth', 'false');
    await tick();
    expect(el.querySelector('.zmo')!.innerHTML).toBe('');
  });

  test('object props set as JSON strings act like objects (React 19 sets them as properties)', async () => {
    const values = {
      traits: { 'body.r': 0.3, 'eye.gap': 0.7 },
      events: { 'stream.end': 'excitement' },
      stillWorking: { after: 5, state: 'still' },
      holidays: { exclude: ['religious'] }
    } as const;
    const make = () => { const el = document.createElement('wobbli-avatar'); el.setAttribute('name', 'nova'); document.body.appendChild(el); return el; };
    const asString = make(), asObject = make();
    for (const [k, v] of Object.entries(values)) {
      (asString as unknown as Record<string, unknown>)[k] = JSON.stringify(v);
      (asObject as unknown as Record<string, unknown>)[k] = v;
    }
    await tick();
    for (const k of Object.keys(values)) expect((asString as unknown as Record<string, unknown>)[k]).toEqual(values[k as keyof typeof values]);
    expect(asString.config).toEqual(asObject.config);
    expect(asString.querySelector('.aa-av')!.outerHTML).toBe(asObject.querySelector('.aa-av')!.outerHTML);
    asString.emit('stream.end');
    expect(asString.getState()?.state).toBe('excitement');
  });

  test('an unreadable JSON string is ignored without throwing', async () => {
    const el = document.createElement('wobbli-avatar');
    el.setAttribute('name', 'nova');
    document.body.appendChild(el);
    el.events = { 'stream.end': 'excitement' };
    expect(() => { el.events = '{not json'; el.traits = 'nope'; }).not.toThrow();
    await tick();
    expect(el.events).toEqual({ 'stream.end': 'excitement' });
    expect(el.traits).toBeUndefined();
    el.emit('stream.end');
    expect(el.getState()?.state).toBe('excitement');
  });

  test('object props still read JSON attributes', async () => {
    const el = document.createElement('wobbli-avatar');
    el.setAttribute('name', 'nova');
    document.body.appendChild(el);
    el.setAttribute('events', JSON.stringify({ 'stream.end': 'excitement' }));
    await tick();
    el.emit('stream.end');
    expect(el.getState()?.state).toBe('excitement');
  });

  test('the runtime adds its styles once', () => {
    document.body.appendChild(Object.assign(document.createElement('wobbli-avatar'), {}));
    expect(document.querySelectorAll('style[data-wobbli]').length).toBe(1);
  });
});

describe('mount()', () => {
  test('several avatars can follow one controller, and a follower never destroys it', () => {
    const shared = createController();
    const a = document.createElement('div'), b = document.createElement('div');
    document.body.append(a, b);
    const ha = mount(a, { name: 'nova', controller: shared });
    const hb = mount(b, { name: 'nova', controller: shared });
    shared.emit('message.sent');
    expect(a.querySelector('.aa-av')!.className).toContain('st-busy');
    expect(b.querySelector('.aa-av')!.className).toContain('st-busy');
    // b stops following (it becomes a still frame of the chat history), then goes away
    hb.update({ name: 'nova', static: true, state: 'busy' });
    hb.destroy();
    shared.emit('tool.search');
    expect(a.querySelector('.aa-av')!.className).toContain('st-search');
    expect(shared.getState().state).toBe('search');
    ha.destroy();
  });

  test('destroy() takes its live region with it, so mounting again leaves one', () => {
    const host = document.createElement('div');
    document.body.append(host);
    mount(host, { name: 'nova', announce: true }).destroy();
    expect(host.querySelectorAll('.aa-sr')).toHaveLength(0);
    const h = mount(host, { name: 'nova', announce: true });
    expect(host.querySelectorAll('.aa-sr')).toHaveLength(1);
    h.update({ name: 'nova', announce: false });
    expect(host.querySelectorAll('.aa-sr')).toHaveLength(0);
    h.destroy();
  });

  test('a live region left on the host is taken over, not doubled', () => {
    const host = document.createElement('div');
    document.body.append(host);
    // a server-drawn avatar, plus the live region an earlier mount left
    host.innerHTML = renderStatic({ name: 'nova' }) + '<span class="aa-sr" aria-live="polite"></span>';
    const h = mount(host, { name: 'nova', announce: true });
    expect(host.querySelectorAll('.aa-sr')).toHaveLength(1);
    h.update({ name: 'nova', announce: false });
    expect(host.querySelectorAll('.aa-sr')).toHaveLength(0);
    h.update({ name: 'nova', announce: true });
    expect(host.querySelectorAll('.aa-sr')).toHaveLength(1);
    h.destroy();
  });

  test('controlled avatars show exactly what they are given, with no timers', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const h = mount(el, { name: 'nova', controlled: true, state: 'happy', variant: 'hop' });
    vi.advanceTimersByTime(10_000);
    expect(el.querySelector('.aa-av')!.className).toContain('st-happy v-hop');
    h.update({ name: 'nova', controlled: true, state: 'sad', variant: 'rain' });
    expect(el.querySelector('.aa-av')!.className).toContain('st-sad v-rain');
    h.destroy();
    vi.useRealTimers();
  });

  test('takes over a server-drawn avatar without redrawing it', () => {
    const el = document.createElement('span');
    el.innerHTML = renderStatic({ name: 'pip', state: 'busy', variant: 'dots' });
    document.body.append(el);
    const before = el.firstElementChild;
    const zone = el.querySelector('.zp');
    const h = mount(el, { name: 'pip', state: 'busy', variant: 'dots' });
    expect(el.firstElementChild).toBe(before);
    expect(el.querySelector('.zp')).toBe(zone);
    h.destroy();
  });

  test('announces state changes politely, at most one every 5 s', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const h = mount(el, { name: 'nova', announce: true });
    const live = el.querySelector('[aria-live="polite"]')!;
    h.emit('tool.search');
    expect(live.textContent).toMatch(/^Searching/);
    h.emit('tool.query');
    h.emit('stream.start');
    expect(live.textContent).toMatch(/^Searching/);
    vi.advanceTimersByTime(5000);
    expect(live.textContent).toMatch(/^Writing/);
    h.destroy();
    vi.useRealTimers();
  });
});

describe('<Wobbli>', () => {
  test('the server render equals the browser’s first frame', () => {
    const props = { name: 'atlas', state: 'busy', variant: 'juggle', size: 64 };
    const server = renderToString(createElement(Wobbli, props));
    expect(server).toContain(renderStatic(props));
    const host = document.createElement('div');
    document.body.append(host);
    host.innerHTML = server;
    const first = host.querySelector('.aa-av')!.outerHTML;
    const root = createRoot(document.createElement('div'));
    // a fresh client render of the same props draws the same first frame
    const probe = document.createElement('div');
    probe.innerHTML = renderStatic(props);
    expect(probe.firstElementChild!.outerHTML).toBe(first);
    root.unmount();
  });

  test('StrictMode leaves one live region', async () => {
    const div = document.createElement('div');
    document.body.append(div);
    const root = createRoot(div);
    await act(async () => { root.render(createElement(StrictMode, null, createElement(Wobbli, { name: 'nova', announce: true }))); });
    expect(div.querySelectorAll('.aa-sr')).toHaveLength(1);
    await act(async () => { root.render(createElement(StrictMode, null, createElement(Wobbli, { name: 'nova', announce: false }))); });
    expect(div.querySelectorAll('.aa-sr')).toHaveLength(0);
    await act(async () => { root.unmount(); });
  });

  test('ref.emit drives it after mount', async () => {
    const ref = createRef<WobbliHandle>();
    const div = document.createElement('div');
    document.body.append(div);
    const root = createRoot(div);
    const changes: string[] = [];
    await act(async () => { root.render(createElement(Wobbli, { ref, name: 'nova', onStateChange: c => changes.push(c.state) })); });
    act(() => { ref.current!.emit('tool.query'); });
    expect(ref.current!.getState().state).toBe('query');
    expect(div.querySelector('.aa-av')!.className).toContain('st-query');
    expect(changes).toEqual(['query']);
    await act(async () => { root.unmount(); });
  });
});
