import { useMemo } from 'react';
import { useDataSlice } from './useDataSlice';
import { useProjectSlice } from './useProjectSlice';
import { useSectionSlice } from './useSectionSlice';
import { Section } from '../store/section/types';
import { getEffectiveTechniqueData } from '../helpers';
import { getGlobalMagnitudes } from '../helpers/drawArrows';

/**
 * Single source of truth for the velocity colour scale shared by the Results
 * colour bar (`ColorBar`) and the chevron overlay (`VelocityVector`).
 *
 * With `seeAll` the default, glyphs from every section are drawn over the
 * same image at once, so one colour has to mean the same speed everywhere —
 * the range is always the cross-section aggregate, never just the active
 * section, even for the bar. A manually locked range (`colorbarLimits.default
 * === false`) overrides that aggregate for both consumers identically.
 *
 * Deriving this in one hook rather than in each component is what makes it
 * structurally impossible for the bar and the glyphs to disagree in the
 * unlocked state — there is only one computation to read.
 */
export const useVelocityColorRange = (): { min: number; max: number } => {
  const { sections } = useSectionSlice();
  const { colorbarLimits } = useDataSlice();
  const { video } = useProjectSlice();

  // The same live resolution the velocity chart and the chevrons use (active
  // technique + interpolate + artificial seeding + per-station checks). One
  // entry per section, index-aligned with `sections`.
  const resolvedPerSection = useMemo(
    () =>
      sections.map((section: Section) => {
        if (!section.data) return null;
        const effective = getEffectiveTechniqueData(section.data, section.activeTechnique, {
          interpolated: section.interpolated,
          artificialSeeding: section.artificialSeeding,
          alpha: section.alpha,
          step: video.parameters.step,
          fps: video.data.fps,
        });
        return effective ? effective.resolved : null;
      }),
    [sections, video]
  );

  const { max: dataMax, min: dataMin } = useMemo(() => {
    return getGlobalMagnitudes(resolvedPerSection);
  }, [resolvedPerSection]);

  return useMemo(() => {
    if (colorbarLimits.default === false) {
      return { min: colorbarLimits.min as number, max: colorbarLimits.max as number };
    }
    return { min: dataMin, max: dataMax };
  }, [colorbarLimits.default, colorbarLimits.min, colorbarLimits.max, dataMin, dataMax]);
};
