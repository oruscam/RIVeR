export interface SearchLineColors {
  /** Before any STIV run. */
  preview: string;
  /** Hover halo colour, and the badge's normal (non-warning) background is
   *  passed separately as `badge` — accent is used only for the halo. */
  accent: string;
  /** After a run, for a station with no resolved value. */
  muted: string;
  /** Uncertain/low-confidence badge background. */
  warning: string;
  /** The normal (non-warning) badge background — the dark chip every other
   *  overlay label already uses. */
  badge: string;
}

export interface SearchLineStateInput {
  /** True once STIV has produced velocities for the current station count —
   *  StationSearchLines.tsx's existing `hasAuthoritativeCenters` check. */
  hasRun: boolean;
  /** This station's colour from getStiColorScale, or null when hasRun is
   *  true but this particular station has no resolved value. Ignored
   *  (always treated as absent) when hasRun is false. */
  velocityColor: string | null;
  isHovered: boolean;
  /** effective.tunedFlags[i] / isStationTuned(...) for this station. */
  tuned: boolean;
  /** The Carousel.tsx "low confidence" check for this station:
   *  sigma !== null && sigma > |velocity|, velocity !== 0. */
  lowConfidence: boolean;
  colors: SearchLineColors;
}

export interface SearchLineVisual {
  strokeColor: string;
  haloColor: string;
  strokeWidth: number;
  haloWidth: number;
  dashed: boolean;
  /** Appended to the plain station number in the label, e.g. ' ✎' or ' !'. */
  labelSuffix: string;
  badgeBackground: string;
}

const BASE_STROKE_WIDTH = 1.5;
const BASE_HALO_WIDTH = 3.5;
const HOVER_STROKE_WIDTH = 2.5;
const HOVER_HALO_WIDTH = 5;
const BASE_HALO_COLOR = 'rgba(0, 0, 0, 0.45)';

/**
 * Derives a station's STIV search-line appearance from its run/hover/tuned/
 * low-confidence state — the audit's "STIV search lines never change state"
 * finding. Pure: every colour is passed in already resolved (from
 * getCSSVar/getStiColorScale), so this has no DOM dependency and is fully
 * unit-testable, the same split pinGeometry.ts uses for pins.
 */
export const getSearchLineVisual = ({
  hasRun,
  velocityColor,
  isHovered,
  tuned,
  lowConfidence,
  colors,
}: SearchLineStateInput): SearchLineVisual => {
  const hasValue = hasRun && velocityColor !== null;

  const strokeColor = hasValue ? (velocityColor as string) : hasRun ? colors.muted : colors.preview;
  const dashed = (hasRun && !hasValue) || lowConfidence;
  const labelSuffix = tuned ? ' ✎' : lowConfidence ? ' !' : '';
  const badgeBackground = !tuned && lowConfidence ? colors.warning : colors.badge;

  return {
    strokeColor,
    haloColor: isHovered ? colors.accent : BASE_HALO_COLOR,
    strokeWidth: isHovered ? HOVER_STROKE_WIDTH : BASE_STROKE_WIDTH,
    haloWidth: isHovered ? HOVER_HALO_WIDTH : BASE_HALO_WIDTH,
    dashed,
    labelSuffix,
    badgeBackground,
  };
};
