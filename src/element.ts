// <wobbli-avatar name="nova"> for plain HTML and any framework. Importing this module registers the element.
//
//   <wobbli-avatar name="nova" state="busy" size="40"></wobbli-avatar>
//   el.emit('tool.query'); el.progress(0.4); el.addEventListener('statechange', e => e.detail.kind)
//
// Attributes are the props in kebab case (eye-color, doze-after, lead-days ...). Booleans take "true" or
// "false"; objects (traits, events, still-working, holidays) take JSON or can be set as properties.
import type { AvatarState, StateChange } from './controller.js';
import { mount, type AvatarHandle, type AvatarProps } from './dom/mount.js';

const STRING = ['name', 'state', 'variant', 'shape', 'color', 'eye-color', 'hair', 'hair-color', 'facial-hair', 'clothes', 'clothes-color', 'glasses', 'shadow', 'shadow-color',
  'motion', 'fidgets', 'holiday', 'region', 'costume', 'theme', 'label', 'size', 'date'] as const;
const NUMBER = ['shadow-strength', 'speed', 'intensity', 'doze-after', 'lead-days'] as const;
const BOOL = ['mouth', 'hands', 'style-from-name', 'eyebrows', 'shadow-animation', 'static', 'announce', 'preload', 'plain'] as const;
const JSONS = ['traits', 'events', 'still-working', 'holidays'] as const;
const camel = (s: string) => s.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase());

export class WobbliElement extends HTMLElement {
  static get observedAttributes() { return [...STRING, ...NUMBER, ...BOOL, ...JSONS]; }
  private handle: AvatarHandle | null = null;
  private extra: Partial<AvatarProps> = {};
  private queued = false;

  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'presentation');
    if (!this.handle) this.handle = mount(this, this.props());
  }
  disconnectedCallback() {
    // a move within the page reconnects at once; only tear down when it stays out
    queueMicrotask(() => { if (!this.isConnected && this.handle) { this.handle.destroy(); this.handle = null; } });
  }
  attributeChangedCallback() { this.schedule(); }

  private schedule() {
    if (!this.handle || this.queued) return;
    this.queued = true;
    queueMicrotask(() => { this.queued = false; this.handle?.update(this.props()); });
  }
  private props(): AvatarProps {
    const p: Record<string, unknown> = { ...this.extra };
    for (const a of STRING) { const v = this.getAttribute(a); if (v != null) p[camel(a)] = a === 'size' && /^\d+(\.\d+)?$/.test(v) ? +v : v; }
    for (const a of NUMBER) { const v = this.getAttribute(a); if (v != null && v !== '' && isFinite(+v)) p[camel(a)] = +v; }
    for (const a of BOOL) { const v = this.getAttribute(a); if (v != null) p[camel(a)] = v !== 'false'; }
    for (const a of JSONS) { const v = this.getAttribute(a); if (v) { try { p[camel(a)] = JSON.parse(v); } catch { /* keep the property value */ } } }
    p.name = p.name ?? '';
    p.onStateChange = (ch: StateChange) => this.dispatchEvent(new CustomEvent('statechange', { detail: ch }));
    return p as unknown as AvatarProps;
  }

  /** Props that are not attributes (or objects set directly). */
  set config(v: Partial<AvatarProps>) { this.extra = { ...v }; this.schedule(); }
  get config(): Partial<AvatarProps> { return this.extra; }
  set traits(v: AvatarProps['traits']) { this.config = { ...this.extra, traits: v }; }
  set events(v: AvatarProps['events']) { this.config = { ...this.extra, events: v }; }
  set stillWorking(v: AvatarProps['stillWorking']) { this.config = { ...this.extra, stillWorking: v }; }
  set holidays(v: AvatarProps['holidays']) { this.config = { ...this.extra, holidays: v }; }

  emit(event: string, value?: unknown) { this.handle?.emit(event, value); }
  progress(value: number | null) { this.handle?.progress(value); }
  setState(state: string, variant?: string) { this.handle?.setState(state, variant); }
  getState(): AvatarState | null { return this.handle ? this.handle.getState() : null; }
}

export function defineWobbli(tag = 'wobbli-avatar') {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) customElements.define(tag, class extends WobbliElement {});
}
defineWobbli();

declare global {
  interface HTMLElementTagNameMap { 'wobbli-avatar': WobbliElement }
}
