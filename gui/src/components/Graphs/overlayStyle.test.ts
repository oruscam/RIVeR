import type * as d3 from 'd3';
import {
  OVERLAY_STYLE,
  OVERLAY_RATIOS,
  OVERLAY_HALO_COLOR,
  overlayLineParts,
  overlayEllipseParts,
  drawOverlayEllipse,
  drawOverlayLine,
} from './overlayStyle';
import { fakeSelection, allTags } from './testing/fakeSelection';

const seg = { from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, color: '#F5BF61' };

describe('overlay size table', () => {
  test('app and report values from the spec', () => {
    expect(OVERLAY_STYLE.app).toEqual({ LINE_WIDTH: 3, ELLIPSE_WIDTH: 1.5, RESIDUAL_WIDTH: 2.5, PIN_DIVISOR: 1 });
    expect(OVERLAY_STYLE.report).toEqual({
      LINE_WIDTH: 1.5,
      ELLIPSE_WIDTH: 0.75,
      RESIDUAL_WIDTH: 1.25,
      PIN_DIVISOR: 2,
    });
    expect(OVERLAY_RATIOS).toEqual({ HALO: 2, DASH_ON: 2.5, DASH_OFF: 3, TICK_HALF_LENGTH: 3, TICK_WIDTH: 0.6 });
    expect(OVERLAY_HALO_COLOR).toBe('rgba(0, 0, 0, 0.5)');
  });
});

describe('overlayLineParts', () => {
  test('solid app line: halo (6 px) painted before the 3 px stroke', () => {
    const parts = overlayLineParts({ ...seg, size: 'app' });
    expect(parts.map((p) => p.role)).toEqual(['halo', 'stroke']);
    expect(parts[0]).toMatchObject({ stroke: 'rgba(0, 0, 0, 0.5)', width: 6, dash: null, x1: 0, x2: 100 });
    expect(parts[1]).toMatchObject({ stroke: '#F5BF61', width: 3, dash: null });
  });

  test('dashed report line with ticks: halved sizes, dash on halo and stroke, ticks 4.5 px each side', () => {
    const parts = overlayLineParts({ ...seg, size: 'report', dashed: true, ticks: true });
    expect(parts.map((p) => p.role)).toEqual(['halo', 'stroke', 'tick', 'tick']);
    expect(parts[0]).toMatchObject({ width: 3, dash: '3.75,4.5' });
    expect(parts[1]).toMatchObject({ width: 1.5, dash: '3.75,4.5' });
    // horizontal line → vertical ticks at both ends
    expect(parts[2]).toMatchObject({ x1: 0, y1: -4.5, x2: 0, y2: 4.5, dash: null, stroke: '#F5BF61' });
    expect(parts[2].width).toBeCloseTo(0.9); // 1.5 × 0.6 is not exactly 0.9 in floating point
    expect(parts[3]).toMatchObject({ x1: 100, y1: -4.5, x2: 100, y2: 4.5 });
  });

  test('zoom divides every width, dash and tick length', () => {
    const parts = overlayLineParts({ ...seg, size: 'app', dashed: true, ticks: true, zoom: 2 });
    expect(parts[0].width).toBe(3);
    expect(parts[1].width).toBe(1.5);
    expect(parts[1].dash).toBe('3.75,4.5');
    expect(parts[2]).toMatchObject({ y1: -4.5, y2: 4.5 });
    expect(parts[2].width).toBeCloseTo(0.9);
  });

  test('a zero-length segment gives finite ticks', () => {
    const parts = overlayLineParts({
      from: { x: 5, y: 5 },
      to: { x: 5, y: 5 },
      color: 'red',
      size: 'app',
      ticks: true,
    });
    parts.forEach((p) => [p.x1, p.y1, p.x2, p.y2].forEach((v) => expect(Number.isFinite(v)).toBe(true)));
  });
});

describe('drawOverlayLine', () => {
  test('appends one group with the parts as round-capped lines, no pointer events', () => {
    const layer = fakeSelection();
    drawOverlayLine({
      layer: layer as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      ...seg,
      size: 'app',
      dashed: true,
      ticks: true,
      className: 'static-section-line section-a',
      nonScaling: true,
    });
    const group = layer.node().children[0];
    expect(group.tag).toBe('g');
    expect(group.attrs.class).toBe('static-section-line section-a');
    expect(group.attrs['pointer-events']).toBe('none');
    const lines = allTags(layer.node(), 'line');
    expect(lines).toHaveLength(4);
    expect(lines[0].attrs).toMatchObject({
      stroke: 'rgba(0, 0, 0, 0.5)',
      'stroke-width': 6,
      'stroke-linecap': 'round',
      'stroke-dasharray': '7.5,9',
      'vector-effect': 'non-scaling-stroke',
    });
    expect(lines[1].attrs).toMatchObject({ stroke: '#F5BF61', 'stroke-width': 3 });
    expect(lines[2].attrs['stroke-dasharray']).toBeNull();
  });
});

describe('line width override', () => {
  test('the residual keeps its halo at its own width', () => {
    const parts = overlayLineParts({ ...seg, size: 'app', width: OVERLAY_STYLE.app.RESIDUAL_WIDTH });
    expect(parts.map((p) => p.role)).toEqual(['halo', 'stroke']);
    expect(parts[0].width).toBe(5);
    expect(parts[1].width).toBe(2.5);
  });
  test('zoom divides the override too', () => {
    const parts = overlayLineParts({ ...seg, size: 'app', width: 2.5, zoom: 2 });
    expect(parts[1].width).toBe(1.25);
  });
});

describe('overlayEllipseParts', () => {
  const e = { cx: 100, cy: 50, width: 40, height: 20, angle: -12, color: '#FFFFFF' };
  test('axis lengths become radii; halo under the stroke', () => {
    const parts = overlayEllipseParts({ ...e, size: 'app' });
    expect(parts.map((p) => p.role)).toEqual(['halo', 'stroke']);
    expect(parts[1]).toMatchObject({ cx: 100, cy: 50, rx: 20, ry: 10, stroke: '#FFFFFF', width: 1.5 });
    expect(parts[1].rotate).toBe('rotate(-12, 100, 50)');
    expect(parts[0]).toMatchObject({ stroke: 'rgba(0, 0, 0, 0.5)', width: 3, rx: 20, ry: 10 });
  });
  test('report size halves the widths, zoom divides them', () => {
    expect(overlayEllipseParts({ ...e, size: 'report' })[1].width).toBe(0.75);
    expect(overlayEllipseParts({ ...e, size: 'app', zoom: 3 })[1].width).toBe(0.5);
  });
  test.each([
    ['zero width', { width: 0 }],
    ['NaN height', { height: NaN }],
    ['negative width', { width: -4 }],
  ])('a degenerate ellipse (%s) draws nothing', (_name, bad) => {
    expect(overlayEllipseParts({ ...e, ...bad, size: 'app' })).toEqual([]);
  });
  test('drawOverlayEllipse appends unfilled halo and stroke ellipses', () => {
    const layer = fakeSelection();
    drawOverlayEllipse({
      layer: layer as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      ...e,
      size: 'app',
      className: 'ipcam-ellipse',
    });
    const ellipses = allTags(layer.node(), 'ellipse');
    expect(ellipses).toHaveLength(2);
    expect(ellipses[1].attrs).toMatchObject({
      fill: 'none',
      stroke: '#FFFFFF',
      rx: 20,
      ry: 10,
      'stroke-width': 1.5,
    });
  });
});
