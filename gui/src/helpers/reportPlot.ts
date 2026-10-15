import { REPORT_FLOW } from '../constants/constants';
import { getEffectiveTechniqueData, type TechniqueOptions, type Technique } from './techniqueDischarge';
import { TECHNIQUE_ORDER } from './reportModel';
import type { SectionData } from '../store/section/types';

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
  /** STIV only: the station's angle was set by hand. */
  tuned: boolean;
}
/** A run of consecutive segments that are all solid (between measured stations) or all dashed. */
export interface PlotSegment {
  d: string;
  interp: boolean;
}
export interface PlotSeries {
  technique: Technique;
  active: boolean;
  segments: PlotSegment[];
  /** Measured stations only; interpolated stations carry no marker. */
  markers: PlotMarker[];
  /** iWave stations excluded as low quality, at their raw velocity. */
  rejected: { x: number; y: number }[];
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
  /** Which marks the velocity key needs to explain (measured is always shown). */
  marks: { interpolated: boolean; rejected: boolean; tuned: boolean };
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
  series: {
    technique: Technique;
    active: boolean;
    v: (number | null)[];
    interp: boolean[];
    tuned?: boolean[];
    /** Raw velocity of a station excluded as low quality, null otherwise. */
    rejected?: (number | null)[];
  }[];
  titles: { q: string; v: string; d: string };
}

const LEFT = 28;
const RIGHT = 6;
const PANEL = { q: { top: 10, height: 36 }, v: { top: 62, height: 58 }, d: { top: 136, height: 34 } };
const X_AXIS_Y = 179;
const r = (v: number) => Math.round(v * 100) / 100;
// Strip floating-point noise; Math.round avoids toFixed precision policy
const clean = (v: number) => Math.round(v * 1e10) / 1e10;

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
  // Plot-axis exception to the 2-decimal display rule (like the GSD exception): below 0.01 the
  // tick step needs its own significant digits or every label would read 0.00.
  if (step > 0 && step < 0.01) {
    // Fewest decimals that show the step exactly (0.004 -> 3, 0.0025 -> 4).
    let decimals = Math.ceil(-Math.log10(step));
    while (decimals < 8 && Math.abs(+step.toFixed(decimals) - step) > step * 1e-6) decimals++;
    return value.toFixed(decimals);
  }
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
    input.series.flatMap((s) => [...finite(s.v), ...finite(s.rejected ?? [])]),
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
  const marks = { interpolated: false, rejected: false, tuned: false };
  const series: PlotSeries[] = ordered.map((s) => {
    // A segment is solid only between two measured stations; any segment touching an
    // interpolated station is dashed. Consecutive segments of the same kind share a path.
    const segments: PlotSegment[] = [];
    let run: PlotSegment | null = null;
    let runEnd = -1;
    const at = (i: number) => `${sx(input.x[i])},${vAxis.sy(s.v[i] as number)}`;
    for (let i = 0; i < s.v.length - 1; i++) {
      if (typeof s.v[i] !== 'number' || typeof s.v[i + 1] !== 'number') continue;
      const interp = s.interp[i] === true || s.interp[i + 1] === true;
      if (interp) marks.interpolated = true;
      if (run && run.interp === interp && runEnd === i) run.d += `L${at(i + 1)}`;
      else {
        run = { d: `M${at(i)}L${at(i + 1)}`, interp };
        segments.push(run);
      }
      runEnd = i + 1;
    }

    const markers: PlotMarker[] = [];
    s.v.forEach((v, i) => {
      if (typeof v !== 'number' || s.interp[i] === true) return;
      const tuned = s.tuned?.[i] === true;
      if (tuned) marks.tuned = true;
      markers.push({ x: sx(input.x[i]), y: vAxis.sy(v), tuned });
    });

    const rejected: { x: number; y: number }[] = [];
    (s.rejected ?? []).forEach((v, i) => {
      if (typeof v !== 'number') return;
      marks.rejected = true;
      rejected.push({ x: sx(input.x[i]), y: vAxis.sy(v) });
    });

    return { technique: s.technique, active: s.active, segments, markers, rejected };
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
    marks,
    bed: { area, line },
    xTicks: xt.map((t) => ({ x: sx(t), label: formatTick(t, xStep) })),
    xAxisY: X_AXIS_Y,
    banks: { left: sx(xMin), right: sx(xMax) },
  };
}

/** Everything the plot draws, in display units. The Results-screen show/hide toggles are ignored on purpose. */
export function plotInputFromSection(
  data: SectionData,
  activeTechnique: Technique,
  options: TechniqueOptions,
  units: { length: number; flow: number },
  titles: { q: string; v: string; d: string }
): ProfilePlotInput | null {
  const active = getEffectiveTechniqueData(data, activeTechnique, options);
  if (!active) return null;
  const scale = (values: (number | null)[], f: number) =>
    values.map((v) => (typeof v === 'number' ? v * f : null));
  const series = TECHNIQUE_ORDER.flatMap((technique) => {
    const effective = technique === activeTechnique ? active : getEffectiveTechniqueData(data, technique, options);
    if (!effective) return [];
    return [
      {
        technique,
        active: technique === activeTechnique,
        v: scale(effective.resolved, units.length),
        interp: effective.interpFlags,
        tuned: effective.tunedFlags,
        rejected: scale(
          effective.profile.map((v, i) => (effective.lowQualityFlags[i] ? v : null)),
          units.length
        ),
      },
    ];
  });
  return {
    x: data.distance.map((v) => v * units.length),
    depth: data.depth.map((v) => v * units.length),
    q: active.Q.map((q, i) => (active.resolved[i] === null ? null : q * units.flow)),
    series,
    titles,
  };
}
