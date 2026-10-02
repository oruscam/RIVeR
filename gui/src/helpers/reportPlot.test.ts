import { buildProfilePlot, formatTick, niceTicks } from './reportPlot';

describe('niceTicks', () => {
  test('rounds the domain out to a 1-2-2.5-5 step', () => {
    expect(niceTicks(0, 0.23, 3)).toEqual([0, 0.1, 0.2, 0.3]);
    expect(niceTicks(-0.33, 1.03, 4)).toEqual([-0.5, 0, 0.5, 1, 1.5]);
  });
  test('no float noise in the ticks', () => {
    expect(niceTicks(0, 0.7, 3)).toEqual([0, 0.25, 0.5, 0.75]);
  });
  test('a flat domain still gets a usable axis', () => {
    expect(niceTicks(0, 0, 3)).toEqual([0, 0.5, 1]);
    expect(niceTicks(2, 2, 3)).toEqual([1, 2, 3]);
  });
});

describe('formatTick', () => {
  test('as many decimals as the step needs, never more than 2', () => {
    expect(formatTick(1, 1)).toBe('1');
    expect(formatTick(0.5, 0.5)).toBe('0.5');
    expect(formatTick(0.25, 0.25)).toBe('0.25');
    expect(formatTick(0.125, 0.125)).toBe('0.13');
  });
});

const input = {
  x: [0, 1, 2, 3],
  depth: [0, 1, 1.2, 0],
  q: [0, 0.2, 0.3, 0],
  series: [
    { technique: 'stiv' as const, active: false, v: [0.1, 0.8, null, 0.2], interp: [false, false, false, false] },
    { technique: 'lspiv' as const, active: true, v: [null, 0.4, 0.5, null], interp: [false, false, true, false] },
  ],
  titles: { q: 'Q (m³/s)', v: 'Vs (m/s)', d: 'd (m)' },
};

describe('buildProfilePlot', () => {
  const g = buildProfilePlot(input);

  test('fixed frame from the approved mockup', () => {
    expect([g.width, g.height, g.left, g.right]).toEqual([380, 196, 28, 6]);
    expect(g.panels.q).toMatchObject({ top: 10, height: 36, title: 'Q (m³/s)' });
    expect(g.panels.v).toMatchObject({ top: 62, height: 58 });
    expect(g.panels.d).toMatchObject({ top: 136, height: 34 });
  });

  test('x maps the first and last station to the plot edges; banks sit there', () => {
    expect(g.banks).toEqual({ left: 28, right: 374 });
  });

  test('a null velocity breaks the line into separate segments', () => {
    const stiv = g.series.find((s) => s.technique === 'stiv')!;
    expect(stiv.path.match(/M/g)).toHaveLength(2);
    expect(stiv.markers).toHaveLength(3);
  });

  test('the active technique is drawn last so it sits on top', () => {
    expect(g.series[g.series.length - 1].technique).toBe('lspiv');
    // Verify reordering works when active comes first in input
    const reversed = buildProfilePlot({ ...input, series: [...input.series].reverse() });
    expect(reversed.series[reversed.series.length - 1].active).toBe(true);
    expect(reversed.series[reversed.series.length - 1].technique).toBe('lspiv');
  });

  test('interpolated stations are hollow markers', () => {
    const lspiv = g.series.find((s) => s.technique === 'lspiv')!;
    expect(lspiv.markers.map((m) => m.hollow)).toEqual([false, true]);
  });

  test('one bar per station with a non-zero discharge, rising from the zero line', () => {
    expect(g.bars).toHaveLength(2);
    const zeroY = g.panels.q.ticks.find((t) => t.zero)!.y;
    g.bars.forEach((bar) => expect(bar.y + bar.height).toBeCloseTo(zeroY));
  });

  test('depth grows downward from 0 at the panel top', () => {
    const zero = g.panels.d.ticks.find((t) => t.label === '0')!;
    expect(zero.y).toBeCloseTo(g.panels.d.top);
    expect(g.bed.line.startsWith('M')).toBe(true);
    expect(g.bed.area.endsWith('Z')).toBe(true);
  });

  test('every tick label has at most 2 decimals', () => {
    const labels = [...g.panels.q.ticks, ...g.panels.v.ticks, ...g.panels.d.ticks].map((t) => t.label);
    labels.forEach((l) => expect(l).toMatch(/^-?\d+(\.\d{1,2})?$/));
  });
});

import { plotInputFromSection } from './reportPlot';
import type { SectionData } from '../store/section/types';

const data = {
  num_stations: 4,
  id: [1, 2, 3, 4],
  distance: [0, 1, 2, 3],
  depth: [0, 1, 1, 0],
  check: [true, true, true, true],
  activeCheck: [true, true, true, true],
  streamwise_velocity_magnitude: [null, 0.5, 0.5, null],
  stiv_velocity_profile: [0.2, 0.8, 0.8, 0.2],
  total_Q: 999,
} as unknown as SectionData;
const options = { interpolated: false, artificialSeeding: false, alpha: 1, step: 1, fps: 30 };
const titles = { q: 'Q', v: 'Vs', d: 'd' };

describe('plotInputFromSection', () => {
  test('one series per computed technique, active flagged; q from the active technique', () => {
    const p = plotInputFromSection(data, 'stiv', options, { length: 1, flow: 1 }, titles)!;
    expect(p.series.map((s) => [s.technique, s.active])).toEqual([
      ['lspiv', false],
      ['stiv', true],
    ]);
    expect(p.q[1]).toBeGreaterThan(0);
  });

  test('imperial: lengths and velocities by the length factor, discharge by the flow factor', () => {
    const si = plotInputFromSection(data, 'lspiv', options, { length: 1, flow: 1 }, titles)!;
    const imp = plotInputFromSection(data, 'lspiv', options, { length: 2, flow: 3 }, titles)!;
    expect(imp.x[3]).toBeCloseTo(si.x[3] * 2);
    expect(imp.depth[1]).toBeCloseTo(si.depth[1] * 2);
    expect(imp.series[0].v[1]!).toBeCloseTo(si.series[0].v[1]! * 2);
    expect(imp.q[1]!).toBeCloseTo(si.q[1]! * 3);
  });

  test('a station whose active velocity is null has no discharge bar', () => {
    const p = plotInputFromSection(data, 'lspiv', options, { length: 1, flow: 1 }, titles)!;
    expect(p.q[0]).toBeNull();
  });

  test('null when the active technique has no result', () => {
    expect(plotInputFromSection(data, 'iwave', options, { length: 1, flow: 1 }, titles)).toBeNull();
  });
});
