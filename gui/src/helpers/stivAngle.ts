/**
 * Pure arithmetic for the STIV manual angle override.
 *
 * Every number the user's correction produces is derived here, so the whole
 * feature's maths is testable without React, Redux or Electron.
 */

/** The STI's real-world metres per pixel. Mirrors RW_STEP_M in
 *  river/core/stiv_pipeline.py:20 — keep the two in step. */
const RW_STEP_M = 0.02;

/** tan() diverges at 90 degrees and the profile is meaningless at exactly 0,
 *  so the storable range stops just short of both ends. */
export const ANGLE_MIN = 0.5;
export const ANGLE_MAX = 179.5;

/** Outside this band a small angle change swings the velocity wildly, so the UI
 *  warns. Not a limit — some rivers really are that fast. */
export const ANGLE_WARN_LOW = 5;
export const ANGLE_WARN_HIGH = 85;

export type StivSign = 'positive' | 'negative' | 'zero';

/** tan() diverges at exactly 90°. The margin equals the UI's own slider step
 *  (0.5°), so the two boundary values below are exactly reachable — nothing
 *  about the "warn, don't block" policy changes: 89.5°/90.5° already trip
 *  isAnglePoorlyConstrained and already read tens of m/s. This only removes
 *  the single point where the formula itself breaks, not the extreme range
 *  around it. */
const ANGLE_SINGULARITY_MARGIN = 0.5;
const ANGLE_SINGULARITY_LOW = 90 - ANGLE_SINGULARITY_MARGIN; // 89.5
const ANGLE_SINGULARITY_HIGH = 90 + ANGLE_SINGULARITY_MARGIN; // 90.5

/**
 * Clamps to the storable range and pushes anything inside the 90° singularity
 * band out to the nearer edge. Exactly 90 ties to the low (positive-velocity)
 * edge: 90 is the tuner's neutral fallback for a station STIV never fitted, and
 * a first grab landing on it should not silently mean "flow runs backwards".
 *
 * Every storable angle funnels through here — drag (angleFromPointer), slider
 * and keyboard nudge (setAngle -> setOverride) — so a 90.0 can never reach
 * thetaToVelocity, be persisted to xsections.json, or be re-derived into the
 * colour bar, the chevrons or the total Q.
 */
export const clampAngle = (deg: number): number => {
  const clamped = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, deg));
  if (clamped > ANGLE_SINGULARITY_LOW && clamped < ANGLE_SINGULARITY_HIGH) {
    return clamped <= 90 ? ANGLE_SINGULARITY_LOW : ANGLE_SINGULARITY_HIGH;
  }
  return clamped;
};

/** Velocity per unit slope: metres_per_pix / seconds_per_pix, where
 *  seconds_per_pix = step / fps. */
export const metersPerSlope = (step: number, fps: number): number => (RW_STEP_M * fps) / step;

/**
 * STI angle (degrees) to streamwise velocity (m/s).
 * Direct port of theta_to_velocity() in river/core/stiv_pipeline.py:204.
 */
export const thetaToVelocity = (deg: number, step: number, fps: number): number => {
  const slope = Math.tan((deg * Math.PI) / 180);
  const v = slope * metersPerSlope(step, fps);
  return deg > 90 ? -Math.abs(v) : Math.abs(v);
};

export const thetaToSign = (deg: number): StivSign => {
  if (deg === 0) return 'zero';
  return deg > 90 ? 'negative' : 'positive';
};

export const isAnglePoorlyConstrained = (deg: number): boolean =>
  deg < ANGLE_WARN_LOW || deg > 180 - ANGLE_WARN_LOW || (deg > ANGLE_WARN_HIGH && deg < 180 - ANGLE_WARN_HIGH);

export const isStationTuned = (manual: (number | null)[] | undefined, i: number): boolean =>
  manual !== undefined && manual[i] !== null && manual[i] !== undefined;

export const hasAnyOverride = (manual: (number | null)[] | undefined): boolean =>
  manual !== undefined && manual.some((v) => v !== null && v !== undefined);

const sized = (manual: (number | null)[] | undefined, n: number): (number | null)[] => {
  const next: (number | null)[] = new Array(n).fill(null);
  if (manual)
    manual.forEach((v, i) => {
      if (i < n) next[i] = v ?? null;
    });
  return next;
};

export const setOverride = (
  manual: (number | null)[] | undefined,
  i: number,
  deg: number,
  n: number
): (number | null)[] => {
  const next = sized(manual, n);
  next[i] = clampAngle(deg);
  return next;
};

export const clearOverride = (manual: (number | null)[] | undefined, i: number, n: number): (number | null)[] => {
  const next = sized(manual, n);
  next[i] = null;
  return next;
};

export const clearAllOverrides = (n: number): (number | null)[] => new Array(n).fill(null);

/** The effective angle per station: the override where one exists, else the fit. */
export const mergeAngleProfile = (
  auto: (number | null)[],
  manual: (number | null)[] | undefined
): (number | null)[] => auto.map((a, i) => (isStationTuned(manual, i) ? (manual as number[])[i] : a));

export const mergedVelocityProfile = (
  auto: (number | null)[],
  manual: (number | null)[] | undefined,
  step: number,
  fps: number
): (number | null)[] =>
  mergeAngleProfile(auto, manual).map((deg) => (deg === null ? null : thetaToVelocity(deg, step, fps)));

/** Sigma came from the model ensemble, which did not produce a hand-placed
 *  angle — so a tuned station reports no uncertainty rather than a borrowed one. */
export const mergedSigmaProfile = (
  autoSigma: (number | null)[],
  manual: (number | null)[] | undefined
): (number | null)[] => autoSigma.map((s, i) => (isStationTuned(manual, i) ? null : s));

/**
 * Pointer position to angle, measured from the nearest bar's centre. Folded into
 * [0,180): a bar is a line, so pointing up-left and down-right mean the same angle.
 */
export const angleFromPointer = (px: number, py: number, barCentresX: number[], cy: number): number => {
  const cx = barCentresX.reduce((best, c) => (Math.abs(c - px) < Math.abs(best - px) ? c : best), barCentresX[0]);
  const deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
  return clampAngle(((deg % 180) + 180) % 180);
};
