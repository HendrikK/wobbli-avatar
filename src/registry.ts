// What the avatar knows how to draw. The five chat states ship in the main entry; the other state groups
// load on first use (or with preload), and holiday costumes register themselves when a holiday is set.
import chat from './generated/group-chat.js';
import { BASE_CSS } from './generated/base-css.js';
import { EVENTS_DATA, GROUPS, GROUP_NAMES, STATES } from './generated/meta.js';
import type { Part, PartsPack, StateGroup, StateMeta, Zone } from './types.js';

export { EVENTS_DATA, GROUPS, GROUP_NAMES, STATES };
export const STATE: Record<string, StateMeta> = Object.fromEntries(STATES.map(s => [s.key, s]));
export const STATE_KEYS = STATES.map(s => s.key);
export type StateKey = string;

const GROUP_LOADERS: Record<StateGroup, () => Promise<PartsPack>> = {
  chat: () => Promise.resolve(chat),
  feelings: () => import('./generated/group-feelings.js').then(m => m.default),
  data: () => import('./generated/group-data.js').then(m => m.default),
  work: () => import('./generated/group-work.js').then(m => m.default),
  talk: () => import('./generated/group-talk.js').then(m => m.default),
  status: () => import('./generated/group-status.js').then(m => m.default)
};

const loaded = new Map<string, PartsPack>();
const pending = new Map<string, Promise<void>>();
const byTrigger = new Map<string, Part[]>();
const listeners = new Set<(pack: PartsPack) => void>();
/** CSS in load order: the base rules first, then each pack as it arrives. */
const cssChunks: { id: string; css: string }[] = [{ id: 'base', css: BASE_CSS }];

/** Adds a pack of parts and CSS (a state group or a holiday region). Safe to call twice. */
export function registerPack(pack: PartsPack): void {
  if (loaded.has(pack.id)) return;
  loaded.set(pack.id, pack);
  for (const p of pack.parts) for (const t of p[3]) {
    const list = byTrigger.get(t) || [];
    if (!list.some(q => q[0] === p[0] && q[2] === p[2])) list.push(p);
    byTrigger.set(t, list);
  }
  if (pack.css) cssChunks.push({ id: pack.id, css: pack.css });
  listeners.forEach(fn => fn(pack));
}
registerPack(chat);

/** Called with each pack as it registers (the DOM runtime adds its CSS to the page). */
export function onPack(fn: (pack: PartsPack) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const allCss = () => cssChunks.slice();
export const isPackLoaded = (id: string) => loaded.has(id);

/** Whether a state's parts and CSS are here. Unknown states count as loaded (there is nothing to load). */
export const isStateLoaded = (state: string) => !STATE[state] || loaded.has('group:' + STATE[state].group);

/** Loads the group a state belongs to. Resolves at once when it is already here. */
export function loadState(state: string): Promise<void> {
  const s = STATE[state];
  return s ? loadGroup(s.group) : Promise.resolve();
}
export function loadGroup(group: StateGroup): Promise<void> {
  const id = 'group:' + group;
  if (loaded.has(id)) return Promise.resolve();
  let p = pending.get(id);
  if (!p) {
    p = GROUP_LOADERS[group]().then(registerPack).finally(() => pending.delete(id));
    pending.set(id, p);
  }
  return p;
}
/** Loads state groups up front: all of them, or the ones named. */
export function preload(groups: StateGroup[] = GROUPS.slice() as StateGroup[]): Promise<void> {
  return Promise.all(groups.map(loadGroup)).then(() => undefined);
}

/** The parts a set of trigger classes shows, in paint order, by zone. */
export function partsFor(triggers: string[]): Record<Zone, Part[]> {
  const out: Record<Zone, Part[]> = { pre: [], cosb: [], back: [], mid: [], glyph: [], front: [], top: [], fx: [] };
  // a part can ship in two packs (a state's and a costume's): draw it once
  const seen = new Set<string>();
  for (const t of triggers) for (const p of byTrigger.get(t) || []) {
    const id = p[0] + ':' + p[2];
    if (!seen.has(id)) { seen.add(id); out[p[0]].push(p); }
  }
  (Object.keys(out) as Zone[]).forEach(z => out[z].sort((a, b) => a[1] - b[1]));
  return out;
}
