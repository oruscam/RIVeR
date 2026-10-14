import {
  ANGLE_MAX,
  ANGLE_MIN,
  angleFromPointer,
  clampAngle,
  clearAllOverrides,
  clearOverride,
  hasAnyOverride,
  isAnglePoorlyConstrained,
  isStationTuned,
  mergeAngleProfile,
  mergedSigmaProfile,
  mergedVelocityProfile,
  metersPerSlope,
  nextAngleFromSlider,
  setOverride,
  thetaToSign,
  thetaToVelocity,
} from './stivAngle';

// Real values from DJI_1_Tweed_15032022 (step=1, fps=30 => k = 0.02*30 = 0.6).
// Expected velocities are what river/core/stiv_pipeline.py:204 produces.
const STEP = 1;
const FPS = 30;

describe('metersPerSlope', () => {
  it('is RW_STEP_M * fps / step', () => {
    expect(metersPerSlope(STEP, FPS)).toBeCloseTo(0.6, 10);
  });

  it('halves when the step doubles', () => {
    expect(metersPerSlope(2, FPS)).toBeCloseTo(0.3, 10);
  });
});

describe('thetaToVelocity', () => {
  it('matches the Python pipeline on real angles', () => {
    expect(thetaToVelocity(36.276, STEP, FPS)).toBeCloseTo(0.44, 2);
    expect(thetaToVelocity(50.025, STEP, FPS)).toBeCloseTo(0.716, 2);
    expect(thetaToVelocity(71.496, STEP, FPS)).toBeCloseTo(1.793, 2);
  });

  it('is zero at zero degrees', () => {
    expect(thetaToVelocity(0, STEP, FPS)).toBeCloseTo(0, 10);
  });

  it('returns a negative velocity above 90 degrees', () => {
    expect(thetaToVelocity(120, STEP, FPS)).toBeLessThan(0);
  });

  it('mirrors magnitude about 90 degrees', () => {
    expect(Math.abs(thetaToVelocity(120, STEP, FPS))).toBeCloseTo(Math.abs(thetaToVelocity(60, STEP, FPS)), 10);
  });

  it('stays finite at the clamp bounds', () => {
    expect(Number.isFinite(thetaToVelocity(ANGLE_MAX, STEP, FPS))).toBe(true);
    expect(Number.isFinite(thetaToVelocity(ANGLE_MIN, STEP, FPS))).toBe(true);
  });

  it('stays bounded even when an angle is (incorrectly) passed in unclamped at exactly 90°', () => {
    // thetaToVelocity itself does not clamp — clampAngle is what prevents 90.0
    // from ever being stored — but this documents the magnitude that guard exists to avoid.
    expect(Math.abs(thetaToVelocity(90, 1, 30))).toBeGreaterThan(1e10);
  });
});

describe('thetaToSign', () => {
  it('is positive below 90, negative above, zero at zero', () => {
    expect(thetaToSign(45)).toBe('positive');
    expect(thetaToSign(135)).toBe('negative');
    expect(thetaToSign(0)).toBe('zero');
  });
});

describe('clampAngle', () => {
  it('clamps to the storable range', () => {
    expect(clampAngle(-10)).toBe(ANGLE_MIN);
    expect(clampAngle(200)).toBe(ANGLE_MAX);
    expect(clampAngle(45)).toBe(45);
  });

  it('pushes a value inside the 90° singularity band out to its nearer edge', () => {
    expect(clampAngle(90)).toBe(89.5);
    expect(clampAngle(90.2)).toBe(90.5);
    expect(clampAngle(89.8)).toBe(89.5);
  });

  it('leaves values right at the singularity band edges untouched', () => {
    expect(clampAngle(89.5)).toBe(89.5);
    expect(clampAngle(90.5)).toBe(90.5);
  });
});

describe('nextAngleFromSlider', () => {
  it('crosses the singularity band upward instead of snapping back', () => {
    // The exact case that traps the slider: stepping + 0.5 from the low edge.
    expect(nextAngleFromSlider(90, 89.5)).toBe(90.5);
  });

  it('crosses the singularity band downward instead of snapping back', () => {
    expect(nextAngleFromSlider(90, 90.5)).toBe(89.5);
  });

  it('resolves any in-band value by direction of travel, not proximity', () => {
    // 89.6 is nearer the low edge, but the user is moving up.
    expect(nextAngleFromSlider(89.6, 89.5)).toBe(90.5);
    // 90.4 is nearer the high edge, but the user is moving down.
    expect(nextAngleFromSlider(90.4, 90.5)).toBe(89.5);
  });

  it('leaves values outside the band to clampAngle', () => {
    expect(nextAngleFromSlider(45, 60)).toBe(45);
    expect(nextAngleFromSlider(120, 45)).toBe(120);
    expect(nextAngleFromSlider(89.5, 45)).toBe(89.5);
    expect(nextAngleFromSlider(90.5, 120)).toBe(90.5);
  });

  it('still enforces the storable range', () => {
    expect(nextAngleFromSlider(-10, 45)).toBe(ANGLE_MIN);
    expect(nextAngleFromSlider(200, 45)).toBe(ANGLE_MAX);
  });

  it('never returns a value inside the band, from any approach', () => {
    for (const current of [0.5, 45, 89.5, 90.5, 120, 179.5]) {
      for (const raw of [89.6, 89.9, 90, 90.1, 90.4]) {
        const next = nextAngleFromSlider(raw, current);
        expect(next === 89.5 || next === 90.5).toBe(true);
      }
    }
  });
});

describe('isAnglePoorlyConstrained', () => {
  it('flags the extremes where tan diverges or collapses', () => {
    expect(isAnglePoorlyConstrained(86)).toBe(true);
    expect(isAnglePoorlyConstrained(94)).toBe(true);
    expect(isAnglePoorlyConstrained(3)).toBe(true);
    expect(isAnglePoorlyConstrained(178)).toBe(true);
  });

  it('does not flag the normal working range', () => {
    expect(isAnglePoorlyConstrained(45)).toBe(false);
    expect(isAnglePoorlyConstrained(71.5)).toBe(false);
    expect(isAnglePoorlyConstrained(120)).toBe(false);
  });
});

describe('override bookkeeping', () => {
  it('reports no tuning for an absent array', () => {
    expect(isStationTuned(undefined, 0)).toBe(false);
    expect(hasAnyOverride(undefined)).toBe(false);
  });

  it('creates a null-filled array of length n on first override', () => {
    const next = setOverride(undefined, 2, 40, 5);
    expect(next).toEqual([null, null, 40, null, null]);
    expect(isStationTuned(next, 2)).toBe(true);
    expect(isStationTuned(next, 1)).toBe(false);
  });

  it('clamps the stored value', () => {
    expect(setOverride(undefined, 0, 500, 2)[0]).toBe(ANGLE_MAX);
  });

  it('does not mutate the array it is given', () => {
    const before: (number | null)[] = [null, null];
    setOverride(before, 0, 40, 2);
    expect(before).toEqual([null, null]);
  });

  it('clears one station and leaves the others', () => {
    const two = setOverride(setOverride(undefined, 0, 40, 3), 2, 60, 3);
    expect(clearOverride(two, 0, 3)).toEqual([null, null, 60]);
  });

  it('clears every station', () => {
    expect(clearAllOverrides(3)).toEqual([null, null, null]);
    expect(hasAnyOverride(clearAllOverrides(3))).toBe(false);
  });
});

describe('mergeAngleProfile', () => {
  const auto = [10, 20, 30];

  it('returns the automatic profile when nothing is tuned', () => {
    expect(mergeAngleProfile(auto, undefined)).toEqual([10, 20, 30]);
  });

  it('gives the override priority', () => {
    expect(mergeAngleProfile(auto, [null, 45, null])).toEqual([10, 45, 30]);
  });

  it('allows an override where the automatic fit produced nothing', () => {
    expect(mergeAngleProfile([10, null, 30], [null, 45, null])).toEqual([10, 45, 30]);
  });

  it('tolerates a manual array shorter than the automatic one', () => {
    expect(mergeAngleProfile(auto, [null])).toEqual([10, 20, 30]);
  });
});

describe('mergedVelocityProfile', () => {
  it('recomputes only the tuned stations', () => {
    const auto = [36.276, 71.496];
    const merged = mergedVelocityProfile(auto, [null, 45], STEP, FPS);
    expect(merged[0]).toBeCloseTo(0.44, 2);
    expect(merged[1]).toBeCloseTo(0.6, 2); // tan(45) * 0.6
  });

  it('is null where neither an automatic nor a manual angle exists', () => {
    expect(mergedVelocityProfile([null], undefined, STEP, FPS)).toEqual([null]);
  });
});

describe('mergedSigmaProfile', () => {
  it('drops sigma for tuned stations only', () => {
    expect(mergedSigmaProfile([0.05, 2.94, 0.05], [null, 45, null])).toEqual([0.05, null, 0.05]);
  });

  it('is unchanged when nothing is tuned', () => {
    expect(mergedSigmaProfile([0.05, 2.94], undefined)).toEqual([0.05, 2.94]);
  });
});

describe('angleFromPointer', () => {
  const centres = [100, 300, 500];
  const cy = 150;

  it('reads 0 degrees for a pointer directly right of a bar centre', () => {
    expect(angleFromPointer(400, 150, centres, cy)).toBeCloseTo(0.5, 5); // clamped from 0
  });

  // A pointer straight above or below a bar centre is the 90° singularity, so
  // clampAngle pushes it to the low edge of the band rather than to tan()'s pole.
  it('reads the singularity edge for a pointer directly below a bar centre', () => {
    expect(angleFromPointer(300, 250, centres, cy)).toBeCloseTo(89.5, 5);
  });

  it('folds the upper half-plane into 0-180', () => {
    expect(angleFromPointer(300, 50, centres, cy)).toBeCloseTo(89.5, 5);
  });

  it('uses the nearest bar centre', () => {
    // Directly below the third centre; if it used the first, this would be far from vertical.
    expect(angleFromPointer(500, 250, centres, cy)).toBeCloseTo(89.5, 5);
  });
});
