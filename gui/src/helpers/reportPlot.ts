import { REPORT_FLOW } from '../constants/constants';
import type { Technique } from './techniqueDischarge';

export interface PlotTick {
  y: number;
  label: string;
  zero: boolean;
}
export interface PlotPanel {
  title: string;
  top: number;
  height: number;
  ticks: PlotTick[];
}
export interface PlotMarker {
  x: number;
  y: number;
  hollow: boolean;
}
export interface PlotSeries {
  technique: Technique;
  active: boolean;
  path: string;
  markers: PlotMarker[];
}
export interface PlotBar {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ProfilePlotGeometry {
  width: number;
  height: number;
  left: number;
  right: number;
  panels: { q: PlotPanel; v: PlotPanel; d: PlotPanel };
  bars: PlotBar[];
  series: PlotSeries[];
  bed: { area: string; line: string };
  xTicks: { x: number; label: string }[];
  xAxisY: number;
  banks: { left: number; right: number };
}
export interface ProfilePlotInput {
  /** Display units (already converted for imperial). */
  x: number[];
  depth: number[];
  q: (number | null)[];
  series: { technique: Technique; active: boolean; v: (number | null)[]; interp: boolean[] }[];
  titles: { q: string; v: string; d: string };
}

const LEFT = 28;
const RIGHT = 6;
const PANEL = { q: { top: 10, height: 36 }, v: { top: 62, height: 58 }, d: { top: 136, height: 34 } };
const X_AXIS_Y = 179;
const r = (v: number) => Math.round(v * 100) / 100;
const clean = (v: number) => +v.toFixed(10);

const niceStep = (raw: number) => {
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
};

export function niceTicks(min: number, max: number, target = 4): number[] {
  let lo = min;
  let hi = max;
  if (hi - lo === 0) {
    if (lo === 0) hi = 1;
    else {
      lo -= 1;
      hi += 1;
    }
  }
  const step = niceStep((hi - lo) / target);
  const start = Math.floor(clean(lo / step)) * step;
  const end = Math.ceil(clean(hi / step)) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(clean(v));
  return ticks;
}

export function formatTick(value: number, step: number): string {
  const decimals = Math.min(2, (String(+step.toFixed(2)).split('.')[1] ?? '').length);
  return value.toFixed(decimals);
}

const finite = (values: (number | null)[]) =>
  values.filter((v): v is number => typeof v === 'number' && isFinite(v));

export function buildProfilePlot(input: ProfilePlotInput): ProfilePlotGeometry {
  const width = REPORT_FLOW.PLOT_WIDTH;
  const height = REPORT_FLOW.PLOT_HEIGHT;
  const plotW = width - LEFT - RIGHT;
  const xMin = Math.min(...input.x);
  const xMax = Math.max(...input.x);
  const xSpan = xMax - xMin || 1;
  const sx = (v: number) => r(LEFT + ((v - xMin) / xSpan) * plotW);

  const axis = (values: number[], panel: { top: number; height: number }, down = false) => {
    const lo = down ? 0 : Math.min(0, ...values);
    const hi = Math.max(0, ...values);
    const ticks = niceTicks(lo, hi, down ? 2 : 3);
    const t0 = ticks[0];
    const t1 = ticks[ticks.length - 1];
    const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
    const sy = (v: number) =>
      r(
        down
          ? panel.top + ((v - t0) / (t1 - t0)) * panel.height
          : panel.top + panel.height - ((v - t0) / (t1 - t0)) * panel.height
      );
    return { sy, ticks: ticks.map((t) => ({ y: sy(t), label: formatTick(t, step), zero: t === 0 })) };
  };

  const qAxis = axis(finite(input.q), PANEL.q);
  const vAxis = axis(
    input.series.flatMap((s) => finite(s.v)),
    PANEL.v
  );
  const dAxis = axis(finite(input.depth), PANEL.d, true);

  const spacing = input.x.length > 1 ? plotW / (input.x.length - 1) : plotW;
  const barW = r(spacing * 0.6);
  const bars: PlotBar[] = [];
  input.q.forEach((q, i) => {
    if (typeof q !== 'number' || q === 0) return;
    const y0 = qAxis.sy(0);
    const y1 = qAxis.sy(q);
    bars.push({ x: r(sx(input.x[i]) - barW / 2), y: Math.min(y0, y1), width: barW, height: r(Math.abs(y0 - y1)) });
  });

  const ordered = [...input.series.filter((s) => !s.active), ...input.series.filter((s) => s.active)];
  const series: PlotSeries[] = ordered.map((s) => {
    let path = '';
    let pen = false;
    const markers: PlotMarker[] = [];
    s.v.forEach((v, i) => {
      if (typeof v !== 'number') {
        pen = false;
        return;
      }
      const x = sx(input.x[i]);
      const y = vAxis.sy(v);
      path += `${pen ? 'L' : 'M'}${x},${y}`;
      pen = true;
      markers.push({ x, y, hollow: s.interp[i] === true });
    });
    return { technique: s.technique, active: s.active, path, markers };
  });

  const bedPoints = input.x.map((x, i) => `${sx(x)},${dAxis.sy(input.depth[i] ?? 0)}`);
  const line = bedPoints.length ? `M${bedPoints.join('L')}` : '';
  const area = bedPoints.length
    ? `M${sx(input.x[0])},${dAxis.sy(0)}L${bedPoints.join('L')}L${sx(input.x[input.x.length - 1])},${dAxis.sy(0)}Z`
    : '';

  const xt = niceTicks(xMin, xMax, 5).filter((t) => t >= xMin && t <= xMax);
  const xStep = xt.length > 1 ? xt[1] - xt[0] : 1;

  return {
    width,
    height,
    left: LEFT,
    right: RIGHT,
    panels: {
      q: { title: input.titles.q, ...PANEL.q, ticks: qAxis.ticks },
      v: { title: input.titles.v, ...PANEL.v, ticks: vAxis.ticks },
      d: { title: input.titles.d, ...PANEL.d, ticks: dAxis.ticks },
    },
    bars,
    series,
    bed: { area, line },
    xTicks: xt.map((t) => ({ x: sx(t), label: formatTick(t, xStep) })),
    xAxisY: X_AXIS_Y,
    banks: { left: sx(xMin), right: sx(xMax) },
  };
}
