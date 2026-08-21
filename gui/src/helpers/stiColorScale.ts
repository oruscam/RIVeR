import { createColorMap, Normalize } from '../../commons/vectors';
import type { ColorbarLimits } from '../store/data/types';

export interface StiColorScale {
  /** Lower bound of the colour scale in SI (m/s); null when no scale can be derived. */
  min: number | null;
  /** Upper bound of the colour scale in SI (m/s); null when no scale can be derived. */
  max: number | null;
  /** One colour per station, index-aligned with the profile. Stations with no value
   *  are 'transparent' — appropriate for the context ticks, which should show a gap.
   *  Consumers that must stay visible (lines, badge text) use STI_FALLBACK_COLOR. */
  colors: string[];
}

/** Colour for elements that must remain visible when a station has no STIV value.
 *  'transparent' would render them invisible rather than merely uncoloured. */
export const STI_FALLBACK_COLOR = 'var(--accent-color)';

/**
 * Derive the velocity colour scale for the STI view.
 *
 * Bounds follow the rule the context ticks already used: when the colorbar limits are
 * locked (`default === false`) they are shared across LSPIV and STIV, because both
 * views read the same store field. When automatic, each view uses its own range — for
 * STIV, that is the min/max of `stiv_velocity_profile`.
 */
export const getStiColorScale = (
  profile: (number | null)[] | undefined,
  colorbarLimits: ColorbarLimits
): StiColorScale => {
  if (!profile) return { min: null, max: null, colors: [] };

  const values = profile.filter((v): v is number => v !== null);
  if (values.length === 0) return { min: null, max: null, colors: [] };

  const isManual = colorbarLimits.default === false && colorbarLimits.min !== null && colorbarLimits.max !== null;
  const min = isManual ? (colorbarLimits.min as number) : Math.min(...values);
  const max = isManual ? (colorbarLimits.max as number) : Math.max(...values);

  const colorMap = createColorMap();
  const norm = new Normalize(min, max);
  // Normalize divides by (max - min). A uniform profile makes that zero, which would
  // index the colour map with NaN and yield undefined; pin those to the low end.
  const isDegenerate = max === min;

  const colors = profile.map((v) => {
    if (v === null) return 'transparent';
    if (isDegenerate) return colorMap[0];
    const clamped = Math.max(min, Math.min(max, v));
    const index = Math.max(
      0,
      Math.min(Math.floor(norm.normalize(clamped) * (colorMap.length - 1)), colorMap.length - 1)
    );
    return colorMap[index];
  });

  return { min, max, colors };
};
