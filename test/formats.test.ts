// Formats suite: share links round-trip (including format 1 links from before today), stored settings migrate,
// and the generated React and JSON code for a set of looks.
import { describe, expect, test, vi } from 'vitest';
import fx from './fixtures/formats.json';
import {
  DEFAULT_SETTINGS, SETTINGS_VERSION, codeFor, decodeShare, encodeShare, readSettings, sanitizeSettings, settingsToProps, shareUrl, writeSettings, type StudioSettings
} from '../src/formats';

const base = { ...DEFAULT_SETTINGS, region: 'US' };

describe('share links', () => {
  test.each(fx.links.map(l => [l.why, l] as const))('%s', (_why, l) => {
    const d = decodeShare(l.hash, base)!;
    expect(d).not.toBeNull();
    expect(d.settings).toMatchObject(l.expect);
    // region is left out where the link has none: it then comes from the viewer's time zone (here: base)
    if (!('region' in l.expect)) expect(d.settings.region).toBe('US');
  });

  test('format 2 always writes $, g, n, m and h, and the rest only when it differs from the defaults', () => {
    const tok = encodeShare({ ...base, name: 'nova' });
    const o = JSON.parse(Buffer.from(tok, 'base64url').toString());
    expect(o).toEqual({ $: 2, g: 1, n: 'nova', m: 'f', h: '-' });
  });

  const looks: StudioSettings[] = [
    { ...base, name: 'pip' },
    { ...base, name: 'Zoë 🤖', shape: 'hexagon', pins: { 'eye.rx': 0.25, 'gaze.y': 0.8 }, colorMode: 'custom', color: '#FF8F66', eyeAuto: false, eyeColor: '#112233' },
    { ...base, name: 'atlas', mouth: false, hands: false, shadow: 'always', shadowColor: 'custom', shadowHex: '#4B4A9E', shadowK: 1.5, shadowAnim: false },
    { ...base, name: 'miso', dress: 'name', hair: 'bun', hairColor: '#E07BAF', beard: 'goatee', brows: false, clothes: 'suit', clothesColor: '#2F4A7A', glasses: 'shades' },
    { ...base, name: 'orbit', colorMode: 'skin', color: '#A86B47', motion: 'hover', speed: 1.5, intensity: 0.5, chatSize: 36 },
    { ...base, name: 'juniper', holMode: 'auto', region: 'IN', lead: 3 },
    { ...base, name: 'fern', holMode: 'pick', pickHol: 'diwali', cosPin: 'dw-rangoli', fidgets: 'often', dozeAfter: 60 },
    { ...base, name: 'echo', events: { 'stream.end': 'excitement', 'tool.search': 'monitor' }, waitAfter: 8, waitState: 'queued', waitVar: 'quhour' }
  ];
  test.each(looks.map(l => [l.name, l] as const))('%s round-trips', (_n, s) => {
    const live = { state: 'search', variant: 'seradar' };
    const d = decodeShare(shareUrl('https://example.com/', s, live), base)!;
    expect(d.settings).toEqual(s);
    expect(d.live).toEqual(live);
    expect(d.format).toBe(2);
    expect(d.generator).toBe(1);
  });

  test('garbage is rejected, not thrown', () => {
    expect(decodeShare('#studio~not-base64!!', base)).toBeNull();
    expect(decodeShare('#studio~' + Buffer.from('"just a string"').toString('base64url'), base)).toBeNull();
  });

  test('a newer format or an unknown generator is read with a console warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tok = Buffer.from(JSON.stringify({ $: 9, g: 7, n: 'nova', m: 'a', h: '-', zz: 1 })).toString('base64url');
    const d = decodeShare('#studio~' + tok, base)!;
    expect(d.settings.name).toBe('nova');
    expect(d.settings.motion).toBe('always');
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls.map(c => String(c[0])).join(' ')).toMatch(/format 9.*generator 7|generator 7.*format 9/s);
    warn.mockRestore();
  });
});

describe('stored settings', () => {
  test.each(fx.stored.map(c => [c.why, c] as const))('%s', (_why, c) => {
    const s = readSettings(c.stored, base);
    expect(s.mouth).toBe(c.shows.mouth);
    expect(s.hands).toBe(c.shows.hands);
    expect(s.holMode !== 'off').toBe(c.shows.costume);
  });
  test('writes ver 3 and generator 1', () => {
    expect(writeSettings(base)).toMatchObject({ ver: SETTINGS_VERSION, generator: 1, name: 'agent-39' });
    expect(SETTINGS_VERSION).toBe(3);
  });
  test('the old long-wait default moves to still working', () => {
    expect(readSettings({ name: 'x', waitState: 'queued', waitVar: 'quhour' }, base)).toMatchObject({ waitState: 'still', waitVar: 'random' });
  });
  test('looks saved before "style from the name" stored every style value; their defaults mean not picked', () => {
    const s = readSettings({ name: 'x', hair: 'none', hairColor: '#1F1A19', brows: false, clothes: 'tee' }, base);
    expect(s).toMatchObject({ hair: null, hairColor: null, brows: null, clothes: 'tee' });
  });
  test('loosely trusted input is cleaned', () => {
    const s = sanitizeSettings({ name: '   ' + 'y'.repeat(60), speed: 9, region: 'XX', events: { 'stream.end': 'nonsense', 'tool.query': 'busy' }, pins: { 'eye.rx': 2, 'gaze.x': 0.3 } }, base);
    expect(s.name).toBe('y'.repeat(40));
    expect(s.speed).toBe(1);
    expect(s.region).toBe('US');
    expect(s.events).toEqual({ 'tool.query': 'busy' });
    expect(s.pins).toEqual({ 'gaze.x': 0.3 });
  });
});

describe('generated code', () => {
  test('defaults list only name, state and motion', () => {
    expect(settingsToProps({ ...base, name: 'nova' })).toEqual({ name: 'nova', state: 'idle', motion: 'follow' });
  });
  test('React, events and JSON for a full look', () => {
    const s: StudioSettings = { ...base, name: 'miso', shape: 'cloud', pins: { 'eye.rx': 0.25 }, colorMode: 'custom', color: '#FF8F66', mouth: false, dress: 'name', hair: 'bun',
      holMode: 'pick', pickHol: 'diwali', cosPin: 'dw-rangoli', speed: 1.5, events: { 'stream.end': 'excitement' }, waitAfter: 8, shadow: 'always', shadowColor: 'body' };
    const props = settingsToProps(s, { state: 'busy', variant: 'dots' }, true);
    expect(codeFor('react', props)).toMatchInlineSnapshot(`
      "import { Wobbli } from "wobbli/react";
      import "wobbli/styles.css";

      <Wobbli
        name="miso"
        state="busy"
        variant="dots"
        holiday="diwali"
        costume="dw-rangoli"
        motion="follow"
        speed={1.5}
        color="#FF8F66"
        mouth={false}
        shadow="always"
        shadowColor="body"
        styleFromName
        hair="bun"
        events={{
          "stream.end": "excitement",
        }}
        stillWorking={{
          after: 8,
          state: "still",
          variant: "random",
        }}
        traits={{
          "eye.rx": 0.25,
          shape: 0.825,
        }}
      />"
    `);
    expect(JSON.parse(codeFor('json', props))).toEqual(props);
    expect(codeFor('react', props, 'shadcn')).toContain('import { Wobbli } from "@/components/wobbli";');
    expect(codeFor('events', props)).toContain('avatar.current.emit("tool.query");');
  });
});
