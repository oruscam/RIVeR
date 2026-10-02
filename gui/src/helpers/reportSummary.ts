import { UNIT_CONVERSIONS } from '../constants/constants';
import type { Section } from '../store/section/types';

/**
 * What the Summary panel leads with. The total is the mean of the sections'
 * total_Q, exactly as the report header computes it, so the two always agree.
 */
export const summarizeReport = (
  sections: Pick<Section, 'data'>[],
  unitSistem: string
): { totalQ: number; sectionCount: number; techniqueCount: number } => {
  const valid = sections
    .map((section) => section.data?.total_Q)
    .filter((q): q is number => typeof q === 'number' && !Number.isNaN(q));
  const factor = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const totalQ = valid.length === 0 ? 0 : (valid.reduce((a, q) => a + q, 0) / valid.length) * factor;

  const hasStiv = sections.some((s) => !!s.data?.stiv_velocity_profile);
  const hasIwave = sections.some((s) => !!s.data?.iwave_velocity_profile);

  return {
    totalQ,
    sectionCount: sections.length,
    techniqueCount: 1 + (hasStiv ? 1 : 0) + (hasIwave ? 1 : 0),
  };
};
