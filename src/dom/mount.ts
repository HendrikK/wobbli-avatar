// Wires the core to one element on a page: the web component and the React wrapper both use mount().
import { createController, type AvatarState, type Controller, type Fidgets, type StateChange, type StillWorking } from '../controller.js';
import { look, type Clothes, type FacialHair, type Glasses, type Hair, type Look, type Pins, type ShapeName, type TraitKey } from '../look.js';
import { isStateLoaded, loadState, preload as preloadGroups, STATE } from '../registry.js';
import { blinkDelayOf, describe, frame, lookTag, skeleton, type CustomLayers, type HolidayDress, type Motion, type RenderOptions, type ShadowMode, type Theme } from '../render.js';
import type { HolidayFilter } from '../holidays/calendar.js';
import type { StateGroup } from '../types.js';
import { fnv1a } from '../util.js';
import { hasDom, isDarkAt, prefersReducedMotion, register, unregister, type RuntimeView } from './runtime.js';

/** Every prop the avatar takes (docs/DESIGN.md, Defaults). Only `name` is required. */
export interface AvatarProps {
  name: string;
  /** Default idle. */
  state?: string;
  /** Pins one of the state's five ways of acting. Default: random each time. */
  variant?: string;
  shape?: ShapeName | null;
  traits?: Partial<Record<TraitKey, number>>;
  color?: string | null;
  eyeColor?: string | null;
  /** Default true. */
  mouth?: boolean;
  /** Default true. */
  hands?: boolean;
  /** Let the name pick hair, facial hair, clothes and glasses. Default false. */
  styleFromName?: boolean;
  hair?: Hair | null;
  hairColor?: string | null;
  facialHair?: FacialHair | null;
  eyebrows?: boolean | null;
  clothes?: Clothes | null;
  clothesColor?: string | null;
  glasses?: Glasses | null;
  /** Default auto: only while it hops or floats. */
  shadow?: ShadowMode;
  /** "body" or a hex colour. Default soft grey. */
  shadowColor?: string;
  /** 0.25 to 2. Default 1. */
  shadowStrength?: number;
  /** Default true. */
  shadowAnimation?: boolean;
  /** Default follow: plays, and the eyes follow the pointer. */
  motion?: Motion;
  /** 0.25 to 2. Default 1. */
  speed?: number;
  /** 0 to 2. Default 1. */
  intensity?: number;
  /** Default sometimes. */
  fidgets?: Fidgets;
  /** Seconds: 0 (never), 60, 300 or 600. Default 600. */
  dozeAfter?: number;
  /** Omitted: no costume. "auto": by date for `region`. A holiday key: always that holiday. */
  holiday?: string | null;
  /** Default: from the time zone (United States when unknown). Used with holiday="auto". */
  region?: string;
  /** 0, 3 or 7. Default 7. */
  leadDays?: number;
  /** One of the holiday's five costumes. Default random. */
  costume?: string;
  /** What holiday="auto" may show, by key or kind: { exclude: ["religious"] }. */
  holidays?: HolidayFilter;
  /** The day to dress for. Default today. */
  date?: Date | string;
  /** Event to state remaps. */
  events?: Record<string, string>;
  /** Default { after: 20, state: "still", variant: "random" }. */
  stillWorking?: StillWorking;
  /** Any CSS length; a number is pixels. Default 28. */
  size?: number | string;
  /** One still frame, no controller (chat history). */
  static?: boolean;
  /** Shows exactly `state`, `variant` and `progress`, animated, with no timers of its own (galleries, demos). */
  controlled?: boolean;
  /** Reported progress for a controlled avatar, 0 to 1. */
  progress?: number | null;
  /** A controller to follow instead of one of its own: several avatars can show one agent. */
  controller?: Controller;
  /** Load every state group up front (or the ones named) instead of on first use. */
  preload?: boolean | StateGroup[];
  /** Default auto: follows the page. */
  theme?: Theme;
  /** Speak state changes through a polite live region, at most one every 5 s. */
  announce?: boolean;
  /** Accessible name. Default "Avatar: <state>, <way of acting>". */
  label?: string;
  /** Hand-drawn layers on top of the look (personas). */
  layers?: CustomLayers;
  /** Blobatar's bare look: no mouth, hands, style, shadow or costume. */
  plain?: boolean;
  onStateChange?: (change: StateChange) => void;
}

export interface AvatarHandle {
  emit(event: string, value?: unknown): void;
  progress(value: number | null): void;
  setState(state: string, variant?: string): void;
  getState(): AvatarState;
  /** Applies new props. */
  update(props: AvatarProps): void;
  destroy(): void;
  readonly look: Look;
}

export function pinsOf(p: AvatarProps): Pins {
  return {
    shape: p.shape ?? null, traits: p.traits, color: p.color ?? null, eyeColor: p.eyeColor ?? null, styleFromName: !!p.styleFromName,
    hair: p.hair ?? null, hairColor: p.hairColor ?? null, facialHair: p.facialHair ?? null, eyebrows: p.eyebrows ?? null,
    clothes: p.clothes ?? null, clothesColor: p.clothesColor ?? null, glasses: p.glasses ?? null
  };
}
export const sizeOf = (s: number | string | undefined) => (s == null ? '28px' : typeof s === 'number' ? s + 'px' : s);

/** The options render() gets for a set of props (the parts that do not change with the state). */
export function renderOptions(p: AvatarProps, dress: HolidayDress | null): RenderOptions {
  const px = typeof p.size === 'number' ? p.size : p.size == null ? 28 : /^\d+(\.\d+)?px$/.test(p.size) ? parseFloat(p.size) : undefined;
  return {
    mouth: p.mouth, hands: p.hands, holiday: dress, motion: p.motion, shadow: p.shadow, shadowColor: p.shadowColor,
    shadowStrength: p.shadowStrength, shadowAnimation: p.shadowAnimation, intensity: p.intensity, small: px != null && px <= 40,
    theme: p.theme, label: p.label, layers: p.layers, plain: p.plain
  };
}

/** The first frame's state and variant: what the server draws, so the browser's first frame matches it. */
export function initialState(p: AvatarProps): { state: string; variant: string } {
  const state = p.state && STATE[p.state] ? p.state : 'idle';
  if (state === 'idle') return { state, variant: 'idle' };
  const vs = STATE[state].variants;
  return { state, variant: p.variant && vs.some(v => v.key === p.variant) ? p.variant : vs[0].key };
}


const HAS_T = typeof CSSTransition !== 'undefined';

export function mount(host: HTMLElement, initial: AvatarProps): AvatarHandle {
  let props = { ...initial };
  let L = look(props.name, pinsOf(props));
  let dress: HolidayDress | null = null;
  let holKey = '';
  let controller: Controller | null = null;
  let staticState = initialState(props);
  let root: HTMLElement | null = null;
  let zoneEls: Record<string, Element> = {};
  let eyeEls: [HTMLElement, HTMLElement] | null = null;
  let lastSig = '', lastLook = '', lastClass = '', lastLabel = '';
  let styleKeys: string[] = [];
  let hover = false, frozen = false, rated = false, onScreen = true, hidden = false, destroyed = false;
  let live: HTMLElement | null = null, lastSaid = 0, sayTimer: ReturnType<typeof setTimeout> | null = null;

  const reduced = () => prefersReducedMotion();
  const current = (): AvatarState => controller ? controller.getState() : { ...staticState, kind: 'answer', note: null, progress: props.controlled ? props.progress ?? null : null };
  let unfollow: (() => void) | null = null;
  // whether `controller` is this avatar's own (created here) or one it follows
  let owned = false;
  const own = () => !!controller && owned;
  const mode = (p: AvatarProps) => (p.controller ? 'shared' : p.static ? 'static' : p.controlled ? 'controlled' : 'own');

  function makeController() {
    if (own()) controller!.destroy();
    unfollow?.(); unfollow = null;
    controller = null;
    owned = false;
    if (props.controller) {
      controller = props.controller;
      unfollow = controller.subscribe(ch => { paint(); announce(ch); props.onStateChange?.(ch); });
      return;
    }
    if (props.static || props.controlled) return;
    owned = true;
    controller = createController({
      state: staticState.state, variant: staticState.variant,
      pins: props.variant && props.state ? { [props.state]: props.variant } : {},
      events: props.events, speed: props.speed, motion: props.motion, fidgets: props.fidgets, dozeAfter: props.dozeAfter,
      stillWorking: props.stillWorking, reducedMotion: reduced(),
      onStateChange: ch => { paint(); announce(ch); props.onStateChange?.(ch); }
    });
  }

  // ---------- painting ----------
  function adopt(): boolean {
    const el = host.firstElementChild as HTMLElement | null;
    if (!el || !el.classList.contains('aa-av') || el.getAttribute('data-look') !== lookTag(L)) return false;
    root = el;
    lastLook = L.key;
    lastSig = el.getAttribute('data-sig') || '';
    cacheZones();
    return true;
  }
  function cacheZones() {
    const q = (s: string) => root!.querySelector(s) as Element;
    zoneEls = { pre: q('.zp'), cosb: q('.cosb'), back: q('.zb'), mid: q('.zm'), glyph: q('.zg'), mouth: q('.zmo'), front: q('.zf'), hands: q('.hz'), fb: q('.zfb'), gnd: q('.gnd'), top: q('.cos'), fx: q('svg.fx') };
    eyeEls = [q('.el') as HTMLElement, q('.er') as HTMLElement];
  }
  function paint() {
    if (destroyed) return;
    const st = current();
    if (!isStateLoaded(st.state)) loadState(st.state).then(() => { lastSig = ''; paint(); }).catch(() => {});
    const opts = renderOptions(props, dress);
    const f = frame(L, st.state, st.variant, { ...opts, progress: st.progress });
    if (!root || lastLook !== L.key) {
      host.innerHTML = '<div class="aa-av" role="img"></div>';
      root = host.firstElementChild as HTMLElement;
      root.innerHTML = skeleton(L, blinkDelayOf(L));
      root.setAttribute('data-look', lookTag(L));
      cacheZones();
      lastLook = L.key; lastSig = ''; lastClass = ''; styleKeys = [];
      if (live) host.appendChild(live);
    }
    const dark = (props.theme ?? 'auto') === 'auto' && isDarkAt(host);
    const cls = f.className + (dark ? ' aa-dark' : '') + (!onScreen || hidden ? ' aa-paused' : '');
    if (cls !== lastClass) { root.className = cls; lastClass = cls; }
    // inline styles: set what the frame has, drop what it no longer has
    for (const k of styleKeys) if (!(k in f.style)) root.style.removeProperty(k);
    for (const k in f.style) root.style.setProperty(k, f.style[k]);
    styleKeys = Object.keys(f.style);
    eyeEls![0].style.transform = f.eyes[0];
    eyeEls![1].style.transform = f.eyes[1];
    const sig = fnv1a(f.sig).toString(36);
    if (sig !== lastSig) {
      for (const z in zoneEls) zoneEls[z].innerHTML = f.zones[z as keyof typeof f.zones];
      root.setAttribute('data-sig', sig);
      lastSig = sig;
    }
    if (f.label !== lastLabel) { root.setAttribute('aria-label', f.label); lastLabel = f.label; }
    settle();
  }
  function sizeHost() {
    const s = sizeOf(props.size);
    host.style.width = s;
    host.style.height = s;
  }

  // ---------- motion: none and hover hold each loop at a representative frame; speed is the playback rate ----------
  const anims = () => (root && root.getAnimations ? root.getAnimations({ subtree: true }) : []);
  const isTransition = (an: Animation) => HAS_T && an instanceof CSSTransition;
  function freeze() {
    anims().forEach(an => {
      try {
        if (isTransition(an)) { an.finish(); return; }
        const t = an.effect!.getComputedTiming(), dur = typeof t.duration === 'number' && isFinite(t.duration) ? t.duration : 0;
        const delay = (t.delay as number) || 0;
        // 40% in, counted from the start, so staggered parts keep their offsets. The eyes carry this avatar's own
        // blink phase as a negative delay: for them, 40% into the loop whatever the phase.
        const target = (an as CSSAnimation).effect && ((an.effect as KeyframeEffect).target as Element | null);
        let at = Math.max(0, delay) + dur * 0.4;
        if (target?.parentElement?.classList.contains('e') && delay < 0 && dur > 0) { at = delay + dur * 0.4; at += Math.ceil(Math.max(0, -at) / dur) * dur; }
        an.pause();
        an.currentTime = at;
      } catch { /* ignore one odd animation */ }
    });
    frozen = true;
  }
  function thaw() {
    if (frozen) anims().forEach(an => { try { if (an.playState === 'paused') an.play(); } catch { /* ignore */ } });
    frozen = false;
  }
  function rate() {
    const sp = props.speed ?? 1;
    if (sp === 1 && !rated) return;
    anims().forEach(an => { if (!isTransition(an) && an.playbackRate !== sp) an.playbackRate = sp; });
    rated = sp !== 1;
  }
  function settle() {
    const m = props.motion ?? 'follow';
    if (props.static || m === 'none' || (m === 'hover' && !hover)) freeze();
    else { thaw(); rate(); }
  }

  // ---------- the live region ----------
  function announce(ch: StateChange) {
    if (!props.announce || !live) return;
    const say = () => { lastSaid = Date.now(); sayTimer = null; live!.textContent = describe(controller!.getState().state, controller!.getState().variant); };
    if (ch.cause === 'fidget') return;
    if (Date.now() - lastSaid >= 5000) say();
    else if (!sayTimer) sayTimer = setTimeout(say, 5000 - (Date.now() - lastSaid));
  }
  const liveRegions = () => host.querySelectorAll<HTMLElement>(':scope > .aa-sr');
  function syncLive() {
    if (props.announce && !live) {
      // take over one an earlier mount on this host left (React StrictMode mounts twice)
      live = liveRegions()[0] ?? null;
      if (!live) {
        live = document.createElement('span');
        live.className = 'aa-sr';
        live.setAttribute('aria-live', 'polite');
        host.appendChild(live);
      }
    } else if (!props.announce) { liveRegions().forEach(el => el.remove()); live = null; }
  }

  // ---------- holidays: the module loads only when a holiday is set ----------
  function syncHoliday() {
    if (!props.holiday || props.plain) {
      if (dress) { dress = null; holKey = ''; paint(); }
      return;
    }
    const key = JSON.stringify([props.holiday, props.region, props.leadDays, props.costume, props.holidays, props.date && String(props.date)]);
    if (key === holKey) return;
    holKey = key;
    import('../holidays/index.js').then(H => H.dressFor({ holiday: props.holiday, region: props.region, leadDays: props.leadDays, costume: props.costume, holidays: props.holidays, date: props.date }, dress?.costume)).then(d => {
      if (destroyed || key !== holKey) return;
      dress = d;
      lastSig = '';
      paint();
    }).catch(() => {});
  }

  const view: RuntimeView = {
    host,
    get root() { return root; },
    follows: () => (props.motion ?? 'follow') === 'follow' && !props.static && !reduced(),
    // the runtime ticks, wakes and pauses a shared controller itself, once for all its avatars
    shared: () => (controller && !owned ? controller : null),
    tick: () => {
      if (own()) controller!.tick();
      // a holiday by date moves on at midnight
      if (props.holiday === 'auto' && !props.date) { const d = new Date().toDateString(); if (d !== dayStamp) { dayStamp = d; holKey = ''; syncHoliday(); } }
    },
    input: () => { if (own()) controller!.input(); },
    setHidden: h => { hidden = h; if (own()) controller!.setHidden(h); paint(); },
    setOnScreen: on => { if (on !== onScreen) { onScreen = on; paint(); } },
    themeChanged: () => paint(),
    reducedChanged: r => { if (own()) controller!.setOptions({ reducedMotion: r }); paint(); }
  };
  let dayStamp = new Date().toDateString();

  const onEnter = () => { hover = true; if ((props.motion ?? 'follow') === 'hover') { thaw(); rate(); } };
  const onLeave = () => { hover = false; if ((props.motion ?? 'follow') === 'hover') freeze(); };

  // ---------- start ----------
  sizeHost();
  makeController();
  syncLive();
  // a server-drawn avatar is taken over as it is; register only after, since registering repaints
  adopt();
  paint();
  if (hasDom()) {
    register(view);
    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointerleave', onLeave);
  }
  syncHoliday();
  if (props.preload) preloadGroups(props.preload === true ? undefined : props.preload).catch(() => {});

  const api: AvatarHandle = {
    emit: (e, v) => controller?.emit(e, v),
    progress: v => controller?.progress(v),
    setState: (s, v) => { if (controller) controller.setState(s, v); else if (STATE[s]) { staticState = initialState({ name: '', state: s, variant: v }); paint(); } },
    getState: current,
    get look() { return L; },
    update(next) {
      const prev = props;
      props = { ...next };
      const nl = look(props.name, pinsOf(props));
      if (nl !== L) L = nl;
      sizeHost();
      syncLive();
      if (mode(prev) !== mode(props) || prev.controller !== props.controller) { staticState = initialState(props); makeController(); }
      else if (own() && controller) {
        controller.setOptions({
          pins: props.variant && props.state ? { [props.state]: props.variant } : {},
          events: props.events, speed: props.speed, motion: props.motion, fidgets: props.fidgets, dozeAfter: props.dozeAfter, stillWorking: props.stillWorking
        });
        if ((props.state ?? 'idle') !== (prev.state ?? 'idle') || (props.variant !== prev.variant && props.variant)) controller.setState(props.state ?? 'idle', props.variant);
      } else if (!controller && (props.state !== prev.state || props.variant !== prev.variant)) staticState = initialState(props);
      syncHoliday();
      if (props.preload && !prev.preload) preloadGroups(props.preload === true ? undefined : props.preload).catch(() => {});
      paint();
    },
    destroy() {
      destroyed = true;
      if (own()) controller!.destroy();
      unfollow?.();
      if (sayTimer) clearTimeout(sayTimer);
      live?.remove(); live = null;
      if (hasDom()) { unregister(view); host.removeEventListener('pointerenter', onEnter); host.removeEventListener('pointerleave', onLeave); }
    }
  };
  return api;
}
