// src/helpers/reportModel.ts
import type { Section, Summary, SummaryStatistics } from '../store/section/types';
import { getEffectiveTechniqueData, type Technique } from './techniqueDischarge';

export const TECHNIQUE_ORDER: Technique[] = ['lspiv', 'stiv', 'iwave'];
export const TECHNIQUE_LABEL: Record<Technique, string> = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

export interface TechniqueQ {
  technique: Technique;
  totalQ: number;
  active: boolean;
}

export interface SectionResult {
  index: number;
  name: string;
  technique: Technique;
  /** m³/s, the active technique's live total. */
  totalQ: number;
  /** m³/s; LSPIV only, from the backend's total_q_std. */
  qStd: number | null;
  /** 0-100 */
  measuredPct: number;
  interpolatedPct: number;
  seeded: boolean;
  /** LSPIV only: alpha does not apply to STIV or IWaVE. */
  alpha: number | null;
  numStations: number;
  comparison: TechniqueQ[];
}

export interface AppliedCorrections {
  lensCorrection: string | null;
  /** Number of regions, or null when stabilization was not applied. */
  stabilizationRegions: number | null;
  step: number;
  resizeFactor: number;
}

export interface ReportModel {
  sections: SectionResult[];
  skipped: string[];
  /** Mean of the sections' active totals, m³/s. */
  totalQ: number;
  /** Population std across sections (np.std); null with fewer than 2 sections. */
  qStdBetween: number | null;
  cov: number | null;
  techniquesUsed: Technique[];
  /** Stations STIV/iWave skipped because they were entirely under the mask, from the run's skip profiles. */
  maskedStations: Partial<Record<'stiv' | 'iwave', { section: string; stations: number[] }[]>>;
}

export interface ReportModelInput {
  sections: Pick<Section, 'name' | 'data' | 'activeTechnique' | 'interpolated' | 'artificialSeeding' | 'alpha'>[];
  step: number;
  fps: number;
}

export function buildReportModel({ sections, step, fps }: ReportModelInput): ReportModel {
  const results: SectionResult[] = [];
  const skipped: string[] = [];
  const maskedStations: ReportModel['maskedStations'] = {};

  sections.forEach((section, index) => {
    const { data, activeTechnique, interpolated, artificialSeeding, alpha } = section;
    if (!data) {
      skipped.push(section.name);
      return;
    }
    (['stiv', 'iwave'] as const).forEach((technique) => {
      const profile = technique === 'stiv' ? data.stiv_skip_profile : data.iwave_skip_profile;
      const stations = (profile ?? []).flatMap((reason, i) => (reason === 'masked' ? [i + 1] : []));
      if (stations.length) (maskedStations[technique] ??= []).push({ section: section.name, stations });
    });
    const options = { interpolated, artificialSeeding, alpha, step, fps };
    const comparison: TechniqueQ[] = [];
    let active: ReturnType<typeof getEffectiveTechniqueData> = null;
    TECHNIQUE_ORDER.forEach((technique) => {
      const effective = getEffectiveTechniqueData(data, technique, options);
      if (!effective) return;
      if (technique === activeTechnique) active = effective;
      comparison.push({ technique, totalQ: effective.total_Q, active: technique === activeTechnique });
    });
    if (!active) {
      skipped.push(section.name);
      return;
    }
    const isLspiv = activeTechnique === 'lspiv';
    const { total_Q, measured_Q, interpolated_Q } = active;
    results.push({
      index,
      name: section.name,
      technique: activeTechnique,
      totalQ: total_Q,
      qStd: isLspiv && typeof data.total_q_std === 'number' ? data.total_q_std : null,
      measuredPct: measured_Q * 100,
      interpolatedPct: interpolated_Q * 100,
      seeded: isLspiv && artificialSeeding,
      alpha: isLspiv ? alpha : null,
      numStations: data.num_stations,
      comparison,
    });
  });

  const qs = results.map((r) => r.totalQ);
  const totalQ = qs.length ? qs.reduce((a, q) => a + q, 0) / qs.length : 0;
  const qStdBetween =
    qs.length > 1 ? Math.sqrt(qs.reduce((a, q) => a + (q - totalQ) ** 2, 0) / qs.length) : null;
  const cov = qStdBetween !== null && totalQ !== 0 ? qStdBetween / totalQ : null;
  const techniquesUsed = TECHNIQUE_ORDER.filter((t) => results.some((r) => r.technique === t));

  return { sections: results, skipped, totalQ, qStdBetween, cov, techniquesUsed, maskedStations };
}

export function lensLabel(path: string | null): string | null {
  if (!path) return null;
  const base = path.split(/[\\/]/).pop() ?? path;
  return base.replace(/\.[^.]+$/, '');
}

export function appliedCorrections(p: {
  committedLensCorrection: string | null;
  committedStabilization: boolean;
  committedStabilizationRegions: unknown[];
  step: number;
  committedFactor: number;
}): AppliedCorrections {
  return {
    lensCorrection: lensLabel(p.committedLensCorrection),
    stabilizationRegions: p.committedStabilization ? p.committedStabilizationRegions.length : null,
    step: p.step,
    resizeFactor: p.committedFactor,
  };
}

export type SummaryKey = 'W' | 'A' | 'Q' | 'meanV' | 'alpha' | 'meanVs' | 'maxD' | 'meanD' | 'measured';
export type SummaryUnit = 'longitude' | 'area' | 'flow' | 'velocity' | 'percent' | 'none';

export interface SummaryRow {
  key: SummaryKey;
  unit: SummaryUnit;
  /** The backend computes this from LSPIV whatever technique is active. */
  lspivOnly: boolean;
  mean: number | null;
  std: number | null;
  cov: number | null;
}

/** Same as the backend's summary: np.mean, np.std (ddof=0), std / mean. */
const populationStats = (values: number[]) => {
  if (values.length === 0) return { mean: null, std: null, cov: null };
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
  return { mean, std, cov: mean !== 0 ? std / mean : null };
};

const BACKEND_ROWS: { key: SummaryKey; field: keyof SummaryStatistics; unit: SummaryUnit; lspivOnly: boolean }[] = [
  { key: 'W', field: 'total_W', unit: 'longitude', lspivOnly: false },
  { key: 'A', field: 'total_A', unit: 'area', lspivOnly: false },
  { key: 'meanV', field: 'mean_V', unit: 'velocity', lspivOnly: true },
  { key: 'alpha', field: 'alpha', unit: 'none', lspivOnly: true },
  { key: 'meanVs', field: 'mean_Vs', unit: 'velocity', lspivOnly: true },
  { key: 'maxD', field: 'max_depth', unit: 'longitude', lspivOnly: false },
  { key: 'meanD', field: 'average_depth', unit: 'longitude', lspivOnly: false },
];

export function summaryRows(summary: Summary | undefined, model: ReportModel): SummaryRow[] | null {
  if (!summary || model.sections.length < 2) return null;
  const backend = (key: SummaryKey): SummaryRow => {
    const row = BACKEND_ROWS.find((r) => r.key === key)!;
    return {
      key,
      unit: row.unit,
      lspivOnly: row.lspivOnly,
      mean: summary.mean?.[row.field] ?? null,
      std: summary.std?.[row.field] ?? null,
      cov: summary.cov?.[row.field] ?? null,
    };
  };
  const q = populationStats(model.sections.map((s) => s.totalQ));
  const measured = populationStats(model.sections.map((s) => s.measuredPct));
  return [
    backend('W'),
    backend('A'),
    { key: 'Q', unit: 'flow', lspivOnly: false, ...q },
    backend('meanV'),
    backend('alpha'),
    backend('meanVs'),
    backend('maxD'),
    backend('meanD'),
    { key: 'measured', unit: 'percent', lspivOnly: false, ...measured },
  ];
}
