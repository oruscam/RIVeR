import { SectionData, Technique } from '../../store/section/types';
import { getEffectiveTechniqueData } from '../../helpers/techniqueDischarge';
import { isLowConfidence } from '../../helpers/lowConfidence';
import { isStationTuned } from '../../helpers/stivAngle';
import { UNIT_CONVERSIONS, UNITS } from '../../constants/constants';

const TECHNIQUE_ORDER: Technique[] = ['lspiv', 'stiv', 'iwave'];
const TECHNIQUE_LABEL: Record<Technique, string> = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

const visibilityField = (key: Technique): 'showLspiv' | 'showStiv' | 'showIwave' =>
  key === 'lspiv' ? 'showLspiv' : key === 'stiv' ? 'showStiv' : 'showIwave';

const hasTechniqueData = (data: SectionData, key: Technique): boolean =>
  key === 'lspiv' ? true : key === 'stiv' ? !!data.stiv_velocity_profile : !!data.iwave_velocity_profile;

export interface StationTagRow {
  key: Technique;
  label: string;
  velocityText: string;
  /** Uncertainty for this station: LSPIV's ± std plus its P5–95 range, STIV's
   *  ± sigma, or '—' for iWave (no per-station uncertainty measure exists). */
  spreadText: string;
  /** LSPIV: 'seeded'/'unseeded'. STIV: 'low confidence' or '—'. iWave: the
   *  quality score, or '—'. */
  qualityText: string;
  qualityWarn: boolean;
}

export interface StationTagContent {
  stationNumber: number;
  distanceText: string;
  dischargeText: string;
  depthAreaText: string;
  stageText: string;
  rows: StationTagRow[];
}

export interface StationTagParams {
  data: SectionData;
  stationIndex: number;
  activeTechnique: Technique;
  interpolated: boolean;
  artificialSeeding: boolean;
  alpha: number;
  step: number;
  fps: number;
  level?: number;
  unitSistem?: string;
}

/**
 * Builds every value the docked station tag shows for one station: today's
 * combined discharge/velocity/stage readout, plus depth/area, and — the
 * audit's own finding — spread (sigma / P5–95) and quality (seeded/unseeded,
 * STIV low confidence, iWave quality score) per technique. Pure: every value
 * is either already on SectionData or produced by getEffectiveTechniqueData,
 * so this has no DOM/D3 dependency and is fully unit-testable.
 */
export const buildStationTagContent = ({
  data,
  stationIndex,
  activeTechnique,
  interpolated,
  artificialSeeding,
  alpha,
  step,
  fps,
  level = 0,
  unitSistem = 'si',
}: StationTagParams): StationTagContent | null => {
  if (stationIndex < 0 || stationIndex >= data.distance.length) return null;

  const isImperial = unitSistem === 'imperial';
  const lengthFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const areaFactor = lengthFactor * lengthFactor;
  const flowFactor = isImperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const lengthUnit = isImperial ? UNITS.IMPERIAL.LONGITUDE : UNITS.SI.LONGITUDE;
  const areaUnit = isImperial ? UNITS.IMPERIAL.AREA : UNITS.SI.AREA;
  const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;
  const velocityUnit = isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY;

  const techOptions = { interpolated, artificialSeeding, alpha, step, fps };
  const activeEffective = getEffectiveTechniqueData(data, activeTechnique, techOptions);

  const qVal = activeEffective?.Q[stationIndex];
  const qShare = activeEffective?.Q_portion[stationIndex];
  const dischargeText =
    qVal !== undefined && qVal !== null
      ? `${(qVal * flowFactor).toFixed(3)} ${flowUnit}${
          qShare !== undefined && qShare !== null && isFinite(qShare) ? `  ·  ${(qShare * 100).toFixed(1)}%` : ''
        }`
      : '—';

  const depth = data.depth[stationIndex];
  const area = activeEffective?.A[stationIndex];
  const depthAreaText =
    typeof depth === 'number'
      ? `${(depth * lengthFactor).toFixed(2)} ${lengthUnit} · ${
          area !== undefined ? (area * areaFactor).toFixed(2) : '—'
        } ${areaUnit}`
      : '—';

  const stageText =
    typeof depth === 'number' ? `${((level - depth) * lengthFactor).toFixed(2)} ${lengthUnit}` : '—';

  const distanceText = `x ${(data.distance[stationIndex] * lengthFactor).toFixed(2)} ${lengthUnit}`;

  const rows: StationTagRow[] = TECHNIQUE_ORDER.filter(
    (key) => hasTechniqueData(data, key) && data[visibilityField(key)] !== false
  )
    .map((key): StationTagRow | null => {
      const effective = getEffectiveTechniqueData(data, key, techOptions);
      if (!effective) return null;
      const v = effective.resolved[stationIndex];
      const velocityText = v === null ? '—' : `${(v * lengthFactor).toFixed(3)} ${velocityUnit}`;

      if (key === 'lspiv') {
        const minus = data.minus_std[stationIndex];
        const plus = data.plus_std[stationIndex];
        const p5 = data.percentile_5th[stationIndex];
        const p95 = data.percentile_95th[stationIndex];
        const stdText =
          typeof minus === 'number' && typeof plus === 'number'
            ? `±${(((plus - minus) / 2) * lengthFactor).toFixed(3)}`
            : null;
        const pText =
          typeof p5 === 'number' && typeof p95 === 'number'
            ? `P5–95 ${(p5 * lengthFactor).toFixed(3)}–${(p95 * lengthFactor).toFixed(3)}`
            : null;
        return {
          key,
          label: TECHNIQUE_LABEL[key],
          velocityText,
          spreadText: [stdText, pText].filter(Boolean).join(' · ') || '—',
          qualityText: artificialSeeding ? 'seeded' : 'unseeded',
          qualityWarn: false,
        };
      }

      if (key === 'stiv') {
        const sigma = effective.sigma[stationIndex];
        const tuned = isStationTuned(data.stiv_angle_manual_profile, stationIndex);
        const lowConf =
          !tuned &&
          isLowConfidence(data.stiv_velocity_profile?.[stationIndex], data.stiv_sigma_profile?.[stationIndex]);
        return {
          key,
          label: TECHNIQUE_LABEL[key],
          velocityText,
          spreadText: typeof sigma === 'number' ? `±${(sigma * lengthFactor).toFixed(3)}` : '—',
          qualityText: lowConf ? 'low confidence' : '—',
          qualityWarn: lowConf,
        };
      }

      const quality = data.iwave_quality_profile?.[stationIndex];
      return {
        key,
        label: TECHNIQUE_LABEL[key],
        velocityText,
        spreadText: '—',
        qualityText: typeof quality === 'number' ? quality.toFixed(2) : '—',
        qualityWarn: false,
      };
    })
    .filter((r): r is StationTagRow => r !== null);

  return {
    stationNumber: stationIndex + 1,
    distanceText,
    dischargeText,
    depthAreaText,
    stageText,
    rows,
  };
};
