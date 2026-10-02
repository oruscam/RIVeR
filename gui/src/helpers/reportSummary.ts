import { UNIT_CONVERSIONS } from '../constants/constants';
import { buildReportModel, type ReportModelInput } from './reportModel';

/**
 * What the Summary panel leads with. Built from the same model as the
 * exported report, so the two always agree.
 */
export const summarizeReport = (
  input: ReportModelInput,
  unitSistem: string
): { totalQ: number; sectionCount: number; techniqueCount: number } => {
  const model = buildReportModel(input);
  const factor = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const techniques = new Set(model.sections.flatMap((s) => s.comparison.map((c) => c.technique)));
  return {
    totalQ: model.totalQ * factor,
    sectionCount: input.sections.length,
    techniqueCount: Math.max(1, techniques.size),
  };
};
