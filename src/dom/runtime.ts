// What every avatar on a page shares: one 400 ms ticker, one set of input listeners (for the doze clock and
// the eyes following the pointer), one style element, one IntersectionObserver, and the page's visibility.
// Starts on the first mount, never at import. It drives each avatar's own controller through its view, and each
// controller an app shares between avatars once, however many avatars follow it.
import type { Controller } from '../controller.js';
import { allCss, onPack } from '../registry.js';

export interface RuntimeView {
  root: HTMLElement | null;
  /** Eyes follow the pointer. */
  follows(): boolean;
  /** A controller the app passed in for this avatar to follow, or null when it has its own or none. */
  shared(): Controller | null;
  tick(): void;
  input(): void;
  setHidden(hidden: boolean): void;
  setOnScreen(on: boolean): void;
  themeChanged(): void;
  reducedChanged(reduced: boolean): void;
  host: HTMLElement;
}

const views = new Set<RuntimeView>();
let started = false;
let styleEl: HTMLStyleElement | null = null;
const injected = new Set<string>();
let io: IntersectionObserver | null = null;
let reducedMQ: MediaQueryList | null = null;
let darkMQ: MediaQueryList | null = null;

export const hasDom = () => typeof window !== 'undefined' && typeof document !== 'undefined';
export const prefersReducedMotion = () => !!reducedMQ?.matches;

function injectCss() {
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-wobbli', '');
    document.head.appendChild(styleEl);
  }
  // the package stylesheet (styles.css) already holds the base rules and the chat states
  const sheet = getComputedStyle(document.documentElement).getPropertyValue('--aa-css').trim() === '1' && !injected.has('base');
  let add = '';
  for (const c of allCss()) {
    if (injected.has(c.id)) continue;
    if (sheet && (c.id === 'base' || c.id === 'group:chat')) { injected.add(c.id); continue; }
    injected.add(c.id);
    add += '\n' + c.css;
  }
  if (add) styleEl.appendChild(document.createTextNode(add));
}

let gx: number | null = null, gy: number | null = null, raf = 0;
function track() {
  raf = 0;
  if (gx === null || gy === null) return;
  const vh = window.innerHeight;
  views.forEach(v => {
    const el = v.root;
    if (!el || !v.follows()) return;
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom < -40 || r.top > vh + 40) return;
    const dx = gx! - (r.left + r.width / 2), dy = gy! - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / Math.max(40, r.width * 1.2));
    el.style.setProperty('--gx', ((dx / d) * 6 * k).toFixed(2));
    el.style.setProperty('--gy', ((dy / d) * 4.5 * k).toFixed(2));
  });
}
function resetGaze() {
  gx = gy = null;
  views.forEach(v => { if (v.root) { v.root.style.setProperty('--gx', '0'); v.root.style.setProperty('--gy', '0'); } });
}

/** The app's controllers that mounted avatars follow, each once. */
function sharedControllers(): Set<Controller> {
  const s = new Set<Controller>();
  views.forEach(v => { const c = v.shared(); if (c) s.add(c); });
  return s;
}

function start() {
  if (started) return;
  started = true;
  injectCss();
  onPack(() => injectCss());
  setInterval(() => {
    if (document.hidden) return;
    views.forEach(v => v.tick());
    sharedControllers().forEach(c => c.tick());
  }, 400);
  document.addEventListener('visibilitychange', () => {
    views.forEach(v => v.setHidden(document.hidden));
    sharedControllers().forEach(c => c.setHidden(document.hidden));
  });
  const onInput = () => { views.forEach(v => v.input()); sharedControllers().forEach(c => c.input()); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, onInput, { passive: true }));
  window.addEventListener('pointermove', e => {
    onInput();
    gx = e.clientX; gy = e.clientY;
    if (!raf) raf = requestAnimationFrame(track);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', resetGaze);
  window.addEventListener('blur', resetGaze);
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(entries => entries.forEach(e => {
      views.forEach(v => { if (v.host === e.target) v.setOnScreen(e.isIntersecting); });
    }), { rootMargin: '64px' });
    views.forEach(v => io!.observe(v.host));
  }
  if (typeof window.matchMedia === "function") {
    reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
    darkMQ = matchMedia('(prefers-color-scheme: dark)');
    reducedMQ.addEventListener?.('change', () => views.forEach(v => v.reducedChanged(reducedMQ!.matches)));
    darkMQ.addEventListener?.('change', () => views.forEach(v => v.themeChanged()));
  }
  // a site's own theme switch: a class or data attribute on <html> or <body>
  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(() => views.forEach(v => v.themeChanged()));
    const opts = { attributes: true, attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'style'] };
    mo.observe(document.documentElement, opts);
    if (document.body) mo.observe(document.body, opts);
  }
}

export function register(v: RuntimeView) {
  start();
  views.add(v);
  io?.observe(v.host);
  v.setHidden(document.hidden);
  v.shared()?.setHidden(document.hidden);
  if (gx !== null && !raf) raf = requestAnimationFrame(track);
}
export function unregister(v: RuntimeView) {
  views.delete(v);
  io?.unobserve(v.host);
}

/**
 * Whether an element sits on a dark page: a .dark / [data-theme="dark"] ancestor, or a page that supports
 * dark mode (its color-scheme includes dark) while the viewer prefers dark.
 */
export function isDarkAt(el: Element): boolean {
  const flagged = el.closest('.dark, [data-theme="dark"], [data-color-scheme="dark"]');
  if (flagged) return true;
  if (el.closest('.light, [data-theme="light"], [data-color-scheme="light"]')) return false;
  if (!darkMQ?.matches) return false;
  const cs = getComputedStyle(el).colorScheme || '';
  return /\bdark\b/.test(cs);
}
