import { UNIT_CONVERSIONS, UNITS } from '../constants/constants';

export interface Vec {
  x: number;
  y: number;
}

/** Chevron pitch as a fraction of the glyph width. Back-derived from the count
 *  of 5 chosen at the longest arrow, so the fastest station is unchanged and
 *  only slow stations stop being crowded. */
export const PITCH_FRACTION = 0.8;
export const MAX_CHEVRON_COUNT = 6;
/** Chevron thickness = width * 0.16 * THICKNESS_FACTOR, in metres. */
export const THICKNESS_FACTOR = 3.3;
/** Wing half-span as a fraction of the glyph width. */
export const WING_SPAN = 0.7;
/** One period for every station, so apparent speed is proportional to velocity
 *  (a chevron crosses its arrow, whose length is proportional to v, in T). */
export const DEFAULT_PERIOD_S = 1.7;

const unit = (x: number, y: number): Vec => {
  const l = Math.hypot(x, y);
  return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
};

/**
 * Real-world flow direction at station `i`, as a unit vector.
 *
 * Prefers RIVeR's own streamwise vector. The tempting alternative — the
 * section's perpendicular, oriented so it points "up" the image — was measured
 * to agree on the available test projects only because both cameras look
 * downstream; a camera looking upstream would silently reverse every glyph.
 * The perpendicular is used solely as a fallback when the streamwise vector is
 * missing or degenerate.
 *
 * A negative velocity flips the direction: reverse flow points upstream.
 */
export function flowDirection(
  i: number,
  velocity: number,
  east: number[],
  north: number[],
  streamwiseEast?: number[],
  streamwiseNorth?: number[]
): Vec {
  let dir: Vec = { x: 0, y: 0 };

  const se = streamwiseEast?.[i];
  const sn = streamwiseNorth?.[i];
  if (typeof se === 'number' && typeof sn === 'number' && !isNaN(se) && !isNaN(sn)) {
    dir = unit(se, sn);
  }

  if (dir.x === 0 && dir.y === 0) {
    const a = Math.max(0, i - 1);
    const b = Math.min(east.length - 1, i + 1);
    const tangent = unit(east[b] - east[a], north[b] - north[a]);
    dir = { x: -tangent.y, y: tangent.x };
  }

  return velocity < 0 ? { x: -dir.x, y: -dir.y } : dir;
}

/**
 * Chevrons for one station, holding the PITCH constant rather than the count.
 * Arrow length is proportional to velocity, so a fixed count would cram N
 * chevrons into a short slow arrow and spread the same N thinly over a long
 * fast one; constant pitch keeps the ridge density identical everywhere.
 */
export function chevronCount(lengthM: number, widthM: number): number {
  const pitch = widthM * PITCH_FRACTION;
  if (!(pitch > 0)) return 1;
  return Math.max(1, Math.min(MAX_CHEVRON_COUNT, Math.round(lengthM / pitch)));
}

/** e.g. "+1.92 m/s" / "−1.25 m/s". Uses U+2212, matching the STI badge. */
export function formatSignedVelocity(v: number, isImperial: boolean): string {
  const value = isImperial ? v * UNIT_CONVERSIONS.M_TO_FT : v;
  const unitLabel = isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY;
  const sign = value < 0 ? '−' : '+';
  return `${sign}${Math.abs(value).toFixed(2)} ${unitLabel}`;
}
