import { SectionData, Technique } from '../store/section/types';

export type { Technique };

/**
 * Fills gaps in a velocity profile via the Froude-number method: convert velocity to
 * Fr = v / sqrt(9.81 * depth), linearly interpolate Fr across invalid stations (index-based,
 * matching np.interp semantics — not distance-weighted), convert back to velocity, then
 * force both banks to 0.
 *
 * Direct port of add_interpolated_velocity() in river/core/compute_section.py:857-908.
 * Computed live client-side for all three techniques (see getEffectiveTechniqueData below) —
 * every ingredient it needs (distance, depth, the raw profile, activeCheck) is already
 * present in SectionData, so there's no need to wait on a backend round-trip.
 */
export function froudeFilledProfile(profile: (number | null)[], depth: number[], check: boolean[]): number[] {
  const g = 9.81;
  const n = profile.length;
  const safeDepth = depth.map((d) => Math.max(d, 1e-6));
  const invalid = profile.map((v, i) => v === null || !check[i]);
  if (invalid.every(Boolean)) return profile.map(() => 0);

  const froude = profile.map((v, i) => (v === null ? null : v / Math.sqrt(g * safeDepth[i])));
  const validIdx: number[] = [];
  const validFr: number[] = [];
  froude.forEach((f, i) => {
    if (!invalid[i] && f !== null) {
      validIdx.push(i);
      validFr.push(f);
    }
  });

  const interpAt = (i: number): number => {
    if (i <= validIdx[0]) return validFr[0];
    if (i >= validIdx[validIdx.length - 1]) return validFr[validFr.length - 1];
    for (let k = 0; k < validIdx.length - 1; k++) {
      if (validIdx[k] <= i && i <= validIdx[k + 1]) {
        const t = (i - validIdx[k]) / (validIdx[k + 1] - validIdx[k]);
        return validFr[k] + t * (validFr[k + 1] - validFr[k]);
      }
    }
    return validFr[validFr.length - 1];
  };

  const filledFroude = froude.map((f, i) => (invalid[i] ? interpAt(i) : (f as number)));
  const filled = filledFroude.map((fr, i) => fr * Math.sqrt(g * safeDepth[i]));
  filled[0] = 0;
  filled[n - 1] = 0;
  return filled;
}

export interface DischargeResult {
  W: number[];
  A: number[];
  Q: number[];
  Q_portion: number[];
  total_Q: number;
}

/**
 * Width/area/discharge from a velocity profile. Direct port of add_w_a_q() in
 * river/core/compute_section.py:911-983. Pass alpha=1 for any technique other than LSPIV —
 * the backend's own docstring is explicit that alpha is specifically LSPIV's
 * superficial-to-mean velocity correction, not a general coefficient.
 */
export function computeDischarge(
  profile: (number | null)[],
  depth: number[],
  distance: number[],
  alpha: number
): DischargeResult {
  const n = distance.length;
  const W = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    W[i] = (distance[i + 1] - distance[i - 1]) / 2;
  }
  W[0] = distance[1] - distance[0];
  W[n - 1] = distance[n - 1] - distance[n - 2];

  const A = W.map((width: number, i: number) => width * depth[i]);
  const Q = A.map((a: number, i: number) => {
    const v = profile[i];
    return v === null ? 0 : a * v * alpha;
  });
  const total_Q = Q.reduce((a: number, b: number) => a + b, 0);
  const Q_portion = total_Q !== 0 ? Q.map((q: number) => q / total_Q) : Q.map(() => 0);

  return { W, A, Q, Q_portion, total_Q };
}

export interface TechniqueOptions {
  /** Section.interpolated — whether to fill gaps/exclusions or show them blank. */
  interpolated: boolean;
  /** Section.artificialSeeding — LSPIV-only: picks seeded_vel_profile as the base profile. */
  artificialSeeding: boolean;
  /** Section.alpha — LSPIV-only; ignored for STIV/iWave. */
  alpha: number;
}

export interface TechniqueDischargeData {
  /** Raw base profile for this technique/mode, before exclusion/interpolation resolution. */
  profile: (number | null)[];
  /** What should actually be DISPLAYED per station — already resolved against
   *  activeCheck + interpolated, so consumers don't need to re-derive this. */
  resolved: (number | null)[];
  /** Per-station: is resolved[i] coming from the Froude-filled estimate. */
  interpFlags: boolean[];
  Q: number[];
  A: number[];
  W: number[];
  Q_portion: number[];
  total_Q: number;
  measured_Q: number;
  interpolated_Q: number;
  hasGaps: boolean;
}

/**
 * Resolves everything the UI needs for a given technique, LIVE — no "Apply Changes" round
 * trip. Every ingredient (distance, depth, activeCheck, each technique's raw profile,
 * seeded_vel_profile) is already present in SectionData once a project is loaded, so
 * toggling Interpolate Profile / checking-unchecking a station / editing alpha / toggling
 * Artificial Seeding all recompute instantly from here, for all three techniques uniformly.
 *
 * Returns null if the technique was never run for this project (no data available).
 */
export function getEffectiveTechniqueData(
  data: SectionData,
  technique: Technique,
  options: TechniqueOptions
): TechniqueDischargeData | null {
  const baseProfile: (number | null)[] | undefined =
    technique === 'lspiv'
      ? options.artificialSeeding && data.seeded_vel_profile
        ? data.seeded_vel_profile
        : data.streamwise_velocity_magnitude
      : technique === 'stiv'
        ? data.stiv_velocity_profile
        : data.iwave_velocity_profile;

  if (!baseProfile) return null;

  const activeCheck = data.activeCheck ?? data.check;
  const filled = froudeFilledProfile(baseProfile, data.depth, activeCheck);

  const resolved: (number | null)[] = [];
  const interpFlags: boolean[] = [];
  baseProfile.forEach((v, i) => {
    const isReal = v !== null && activeCheck[i];
    if (isReal) {
      resolved.push(v);
      interpFlags.push(false);
    } else if (options.interpolated) {
      resolved.push(filled[i]);
      interpFlags.push(true);
    } else {
      resolved.push(null);
      interpFlags.push(false);
    }
  });

  const alpha = technique === 'lspiv' ? options.alpha : 1;
  const { A, W, Q, Q_portion, total_Q } = computeDischarge(resolved, data.depth, data.distance, alpha);

  const consideredCount = resolved.filter((v) => v !== null).length;
  const interpCount = interpFlags.filter(Boolean).length;
  const measuredCount = consideredCount - interpCount;
  const measured_Q = consideredCount ? measuredCount / consideredCount : 0;
  const interpolated_Q = consideredCount ? interpCount / consideredCount : 0;

  const hasGaps = baseProfile.some((v, i) => v === null || !activeCheck[i]);

  return {
    profile: baseProfile,
    resolved,
    interpFlags,
    Q,
    A,
    W,
    Q_portion,
    total_Q,
    measured_Q,
    interpolated_Q,
    hasGaps,
  };
}
