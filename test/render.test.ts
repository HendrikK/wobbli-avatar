// Render: every state and way of acting draws in Node with no DOM; parts, mouth, hands, style and costumes land
// in the right zones; the accessible name reads well.
import { describe, expect, test } from 'vitest';
import { STATES, frame, look, preload, render, STATE } from '../src/index';
import { loadHoliday } from '../src/holidays/index';

describe('in Node, with no DOM', () => {
  test('nothing touches window or document', () => {
    expect(typeof (globalThis as Record<string, unknown>).window).toBe('undefined');
    expect(typeof (globalThis as Record<string, unknown>).document).toBe('undefined');
  });

  test('all 191 variants render once their groups are loaded', async () => {
    await preload();
    const L = look('agent-39');
    let n = 0;
    for (const s of STATES) for (const v of s.variants) {
      const html = render(L, s.key, v.key);
      expect(html).toMatch(/^<div class="aa-av st-/);
      expect(html).toContain('role="img"');
      expect(html).toContain('class="aa-av st-' + s.key + ' v-' + v.key);
      n++;
    }
    expect(n).toBe(191);
  });

  test('state parts are drawn for their variant only', async () => {
    await preload();
    const f = frame(look('nova'), 'busy', 'read');
    expect(f.zones.fx).toContain('fx-book');
    expect(frame(look('nova'), 'busy', 'ring').zones.fx).not.toContain('fx-book');
  });

  test('accessible name', () => {
    expect(frame(look('nova'), 'busy', 'read').label).toBe('Avatar: Busy, read');
    expect(frame(look('nova'), 'idle', 'idle').label).toBe('Avatar: Idle');
    expect(frame(look('nova'), 'happy', 'hop', { label: 'Nova' }).label).toBe('Nova');
  });

  test('mouth and hands are on by default and can be turned off', () => {
    const on = frame(look('nova'), 'happy', 'hop');
    expect(on.zones.mouth).toContain('ma-grin');
    expect(on.zones.hands).toContain('class="hd"');
    const off = frame(look('nova'), 'happy', 'hop', { mouth: false, hands: false });
    expect(off.zones.mouth).toBe('');
    expect(off.zones.hands).toBe('');
  });

  test('ways of acting that open their own mouth draw none', () => {
    expect(frame(look('nova'), 'waiting', 'wayawn').zones.mouth).toBe('');
  });

  test('style layers go to their zones', () => {
    const f = frame(look('nova', { hair: 'long', clothes: 'suit', glasses: 'round', facialHair: 'moustache' }), 'idle', 'idle');
    expect(f.zones.pre).toMatch(/^<path/); // clothes behind everything
    expect(f.zones.cosb).not.toBe(''); // long hair behind the body
    expect(f.zones.glyph).toContain('<ellipse'); // round lenses with the eyes
    expect(f.zones.fb).toContain('<path'); // moustache with the mouth
  });

  test('a costume shows once its region is loaded', async () => {
    const before = frame(look('nova'), 'idle', 'idle', { holiday: { key: 'diwali', costume: 'dw-diyas', label: 'Diwali' } });
    await loadHoliday('diwali');
    const after = frame(look('nova'), 'idle', 'idle', { holiday: { key: 'diwali', costume: 'dw-diyas', label: 'Diwali' } });
    expect(after.className).toContain('hol-diwali cos-dw-diyas');
    expect(after.label).toBe('Avatar: Idle, dressed for Diwali');
    const size = (f: typeof after) => Object.values(f.zones).join('').length;
    expect(size(after)).toBeGreaterThan(size(before));
  });

  test('progress shows on the ring, the bar and the segments', () => {
    const f = frame(look('nova'), 'busy', 'ring', { progress: 0.25 });
    expect(f.className).toContain('has-p');
    expect(f.style['--p']).toBe('0.25');
    expect(frame(look('nova'), 'busy', 'read', { progress: 0.25 }).className).not.toContain('has-p');
  });

  test('shadow, theme and small size', () => {
    const f = frame(look('nova'), 'idle', 'idle', { shadow: 'always', shadowColor: '#4b4a9e', shadowStrength: 1.5, theme: 'dark', size: 28 });
    expect(f.className).toMatch(/ sm .*sh-always sh-tint aa-theme-dark/);
    expect(f.zones.gnd).toContain('class="gsh"');
    expect(f.style['--aa-shadow-color']).toBe('#4B4A9E');
    expect(f.style.width).toBe('28px');
  });

  test('unknown states and variants fall back instead of throwing', () => {
    expect(frame(look('nova'), 'teleport', 'x').className).toContain('st-idle v-idle');
    expect(frame(look('nova'), 'busy', 'x').className).toContain('st-busy v-' + STATE.busy.variants[0].key);
  });

  test('the same input gives the same markup', () => {
    expect(render(look('pip'), 'search', 'seradar')).toBe(render(look('pip'), 'search', 'seradar'));
  });
});

describe('costumes shared between holidays', () => {
  test('Dia dos Namorados loads the Valentine’s costume parts it wears', async () => {
    const { HOLIDAY } = await import('../src/holidays/index');
    expect(HOLIDAY.namorados.packs).toEqual(expect.arrayContaining(['br', 'shared']));
    await loadHoliday('namorados');
    const f = frame(look('nova'), 'idle', 'idle', { holiday: { key: 'namorados', costume: 'va-boppers' } });
    expect(Object.values(f.zones).join('')).toMatch(/class="[^"]*va|bop/);
  });
});
