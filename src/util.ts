export const r1 = (n: number) => Math.round(n * 10) / 10;
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const r3 = (n: number) => Math.round(n * 1000) / 1000;

export const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** FNV-1a over UTF-16 code units, as an unsigned 32-bit number. */
export function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- colour ----------
const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;
/** "#abc", "abc" or "#AABBCC" to "#AABBCC"; anything else to null. */
export function normHex(v: unknown): string | null {
  const m = HEX.exec(String(v ?? '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return '#' + h.toUpperCase();
}
export const rgbOf = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const hexOf = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => {
    v = Math.max(0, Math.min(255, Math.round(+v || 0)));
    return (v < 16 ? '0' : '') + v.toString(16);
  }).join('').toUpperCase();
export const lum = (hex: string) =>
  rgbOf(hex)
    .map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
export const contrastRatio = (a: string, b: string) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** The eye colour a pinned body colour gets: near-black or near-white, whichever reads better. */
export const autoEye = (head: string) =>
  contrastRatio(head, '#0A1018') >= contrastRatio(head, '#FBFAF7') ? '#0A1018' : '#FBFAF7';
export const mixHex = (a: string, b: string, t: number) => {
  const x = rgbOf(a), y = rgbOf(b);
  return hexOf(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
};
