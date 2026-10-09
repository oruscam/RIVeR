/** Reprojection error limits in px: under GOOD is good, up to FAIR is fair, over it is bad. */
export const IPCAM_ERROR_LIMITS = { GOOD: 5, FAIR: 10 };

export type ErrorGrade = 'good' | 'fair' | 'bad';

/** One grading rule for the mean error, each point's error, and the residual drawn on the frame. */
export const ipcamErrorGrade = (errorPx: number | null | undefined): ErrorGrade | null => {
  if (errorPx === null || errorPx === undefined || Number.isNaN(errorPx)) return null;
  if (errorPx < IPCAM_ERROR_LIMITS.GOOD) return 'good';
  if (errorPx <= IPCAM_ERROR_LIMITS.FAIR) return 'fair';
  return 'bad';
};
