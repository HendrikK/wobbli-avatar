// <Wobbli> for React. Renders the still frame on the server (and in the browser's first render, so the two
// match), then starts the animation after hydration.
//
//   const avatar = useRef<WobbliHandle>(null);
//   <Wobbli ref={avatar} name="nova" />
//   avatar.current?.emit('tool.query');
'use client';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { AvatarState } from './controller.js';
import { initialState, mount, pinsOf, renderOptions, sizeOf, type AvatarHandle, type AvatarProps } from './dom/mount.js';
import { look } from './look.js';
import { render } from './render.js';

export type { AvatarProps } from './dom/mount.js';
export type { AvatarState, StateChange, Kind } from './controller.js';

export interface WobbliHandle {
  emit(event: string, value?: unknown): void;
  progress(value: number | null): void;
  setState(state: string, variant?: string): void;
  getState(): AvatarState;
}
export interface WobbliProps extends AvatarProps {
  className?: string;
  style?: CSSProperties;
  id?: string;
}

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** The markup the server draws for a set of props. */
export function renderStatic(p: AvatarProps): string {
  const s = initialState(p);
  return render(look(p.name, pinsOf(p)), s.state, s.variant, renderOptions(p, null));
}

export const Wobbli = forwardRef<WobbliHandle, WobbliProps>(function Wobbli(props, ref) {
  const { className, style, id, ...rest } = props;
  const host = useRef<HTMLSpanElement>(null);
  const handle = useRef<AvatarHandle | null>(null);
  const latest = useRef(rest);
  latest.current = rest;
  // drawn once: after hydration the runtime owns everything inside the host
  const [html] = useState(() => renderStatic(rest));

  useIso(() => {
    handle.current = mount(host.current!, { ...latest.current, onStateChange: ch => latest.current.onStateChange?.(ch) });
    return () => { handle.current?.destroy(); handle.current = null; };
  }, []);
  useEffect(() => {
    handle.current?.update({ ...rest, onStateChange: ch => latest.current.onStateChange?.(ch) });
  });

  useImperativeHandle(ref, () => ({
    emit: (e, v) => handle.current?.emit(e, v),
    progress: v => handle.current?.progress(v),
    setState: (s, v) => handle.current?.setState(s, v),
    getState: () => handle.current?.getState() ?? { ...initialState(latest.current), kind: 'answer', note: null, progress: null }
  }), []);

  const size = sizeOf(rest.size);
  return (
    <span
      ref={host}
      id={id}
      className={'aa-host' + (className ? ' ' + className : '')}
      style={{ width: size, height: size, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
      suppressHydrationWarning
    />
  );
});
