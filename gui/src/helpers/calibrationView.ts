import type { CalibrationStatus } from '../store/calibration/types';

/** What Camera calibration's canvas is showing (spec amendment A12). */
export type CalibrationViewMode = 'original' | 'corrected' | 'heatmap';

/** Display order of the view switch's segments. */
export const CALIBRATION_VIEW_MODES: readonly CalibrationViewMode[] = ['original', 'corrected', 'heatmap'];

/** Why a view segment can't be selected, or null when it can. */
export type ViewBlocker = 'notSolved' | 'noHeatmap' | null;

/**
 * Before solving only the raw photo exists. After solving, Corrected is always
 * available (a photo the solver didn't use shows the canvas's "Not used"
 * placeholder, but other photos do have corrected views), and Heatmap only if
 * the solver actually produced one.
 */
export const viewAvailability = (
  status: CalibrationStatus,
  hasHeatmap: boolean
): Record<CalibrationViewMode, ViewBlocker> => ({
  original: null,
  corrected: status === 'solved' ? null : 'notSolved',
  heatmap: status !== 'solved' ? 'notSolved' : hasHeatmap ? null : 'noHeatmap',
});

/** The calibration screen's view shortcuts: 1, 2 and H (unchanged from before 6e). */
export const viewForKey = (key: string): CalibrationViewMode | null => {
  if (key === '1') return 'original';
  if (key === '2') return 'corrected';
  if (key === 'h' || key === 'H') return 'heatmap';
  return null;
};

export type BadgeGrade = 'good' | 'fair' | 'bad';

/** Only the solver's three known grades become a badge; anything else is "no rating". */
export const badgeGrade = (grade: string | null | undefined): BadgeGrade | null =>
  grade === 'good' || grade === 'fair' || grade === 'bad' ? grade : null;

export type FooterBlocker = 'noPhotos' | 'solving' | 'nameCameraAndLens' | 'nameCamera' | 'nameLens';

export interface FooterAction {
  /** The footer's right-hand button: Solve until solved, Save profile after, Done once saved. */
  kind: 'solve' | 'save' | 'done';
  /** Why the button can't act right now, or null when it can. */
  blocker: FooterBlocker | null;
  busy: boolean;
}

export const footerAction = ({
  status,
  imageCount,
  cameraName,
  lensName,
  saved = false,
}: {
  status: CalibrationStatus;
  imageCount: number;
  cameraName: string;
  lensName: string;
  saved?: boolean;
}): FooterAction => {
  if (saved && status === 'solved') return { kind: 'done', blocker: null, busy: false };
  if (status === 'solved') {
    const hasCamera = cameraName.trim().length > 0;
    const hasLens = lensName.trim().length > 0;
    const blocker: FooterBlocker | null =
      !hasCamera && !hasLens ? 'nameCameraAndLens' : !hasCamera ? 'nameCamera' : !hasLens ? 'nameLens' : null;
    return { kind: 'save', blocker, busy: false };
  }
  if (status === 'solving') return { kind: 'solve', blocker: 'solving', busy: true };
  return { kind: 'solve', blocker: imageCount === 0 ? 'noPhotos' : null, busy: false };
};

/** Below this many photos the Prepare screen warns (it never blocks Solve). */
export const MIN_RECOMMENDED_PHOTOS = 15;

export type PhotoCountAdvice = 'none' | 'tooFew' | 'ok';

export const photoCountAdvice = (count: number): PhotoCountAdvice =>
  count === 0 ? 'none' : count < MIN_RECOMMENDED_PHOTOS ? 'tooFew' : 'ok';

/** Prepare (show board, import photos) or the two-panel workspace. */
export type CalibrationStage = 'prepare' | 'workspace';

/** Reopening calibration lands on the workspace only if a solve is running or done. */
export const initialStage = (status: CalibrationStatus): CalibrationStage =>
  status === 'solving' || status === 'solved' ? 'workspace' : 'prepare';

const lastSeparator = (p: string): number => Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));

/** The folder a dropped file sits in, for macOS/Linux and Windows paths alike. */
export const parentDir = (filePath: string): string => filePath.slice(0, lastSeparator(filePath));

/** The folder's own name, shown in the Prepare drop box. */
export const folderName = (dir: string): string => {
  const trimmed = dir.replace(/[\\/]+$/, '');
  return trimmed.slice(lastSeparator(trimmed) + 1);
};

/** A saved profile's path from calibration_profiles on, short enough for the panel. */
export const profileDisplayPath = (filePath: string): string => {
  const at = filePath.search(/calibration_profiles[\\/]/);
  return at >= 0 ? filePath.slice(at) : filePath;
};
