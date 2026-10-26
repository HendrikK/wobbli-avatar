// Types for the parts of Blobatar 2.7.0's internal build that the core uses.
export interface TraitFn {
  (key: string): number;
  num(key: string, lo: number, hi: number): number;
  int(key: string, lo: number, hi: number): number;
  pick<T>(key: string, list: T[]): T;
  bool(key: string, p?: number): boolean;
  jitter(key: string, amp: number): number;
}
export interface Mark { kind: 'circle' | 'path'; cx?: number; cy?: number; r?: number; d?: string; fill: string }
export interface EyeFrame { cx: number; cy: number; rx: number; ry: number; rot: number }
export interface Posed {
  marks: Mark[];
  eyes: Mark[];
  eyeFrames: EyeFrame[];
  fill: { head: string; eye: string };
}
export interface Layout {
  shape: string;
  body: { cx: number; cy: number; rx: number; ry: number };
  palette: { head: string; eye: string; bg: string };
}
export interface BlobOptions { traits?: Record<string, number>; palette?: { head?: string; eye?: string } }
export function _posed(name: string, opts?: BlobOptions): Posed;
export function _layout(name: string, opts?: BlobOptions): Layout;
export function _traits(name: string, normalize?: boolean, pins?: Record<string, number>): TraitFn;
export function _normalizeSeed(name: string): string;
