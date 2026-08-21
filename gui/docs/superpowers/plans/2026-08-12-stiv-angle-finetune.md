# STIV Angle Fine-Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user correct a STIV station's angle by eye in the Processing STI viewer, and have that corrected angle take priority over the automatic one everywhere, including discharge.

**Architecture:** One new per-station array `stiv_angle_manual_profile` is stored in `xsections.json`. Velocity, sign and σ are derived from it in the renderer — never stored — and merged over the automatic profile inside `getEffectiveTechniqueData`, which already computes discharge live for all three techniques. The backend's only role is storage plus two staleness guards.

**Tech Stack:** TypeScript, React 18, Redux Toolkit, Electron IPC, Jest (ts-jest, `testEnvironment: 'node'`), Python 3 + pytest.

**Spec:** `gui/docs/superpowers/specs/2026-08-12-stiv-angle-finetune-design.md`

**Visual reference:** run `npx vite --port 5199` in `gui/` plus `python3 -m http.server 5198` in `DJI_1_Tweed_15032022/20260714T2031/stis/`, then open `http://localhost:5199/angle.html`. Variant B is the chosen drag behaviour; variant A is the chosen slider.

## Global Constraints

- **Station ids are 1-based; arrays are 0-indexed.** Station id 9 is index 8. `stiStations[activeStation]` gives the id; `activeStation` is the index. Never use one where the other belongs.
- **Angle unit is degrees throughout**, range clamped to `[0.5, 179.5]`.
- **`RW_STEP_M = 0.02`** — the STI's metres-per-pixel, from `river/core/stiv_pipeline.py:20`.
- **Never store a derived value.** Velocity, sign and σ are computed from the angle at read time.
- **i18n:** `fallbackLng` is `'en'` (`src/translations/i18n.js:20`), so only `src/translations/en/global.json` needs new keys. Do **NOT** edit the other 12 locale files — commit `b7bdbfa` set this precedent and touched `en` alone.
- **Run `npm run lint` before every commit.** The repo enforces `--max-warnings 0`, and prettier print-width has caused a lint-only regression before (commit `62f6998`).
- **TYPECHECKING — `npx tsc --noEmit -p .` DOES NOT WORK in this repo.** It emits 59 `TS6305` "output not built from source" errors from an unbuilt project reference. Use the reference-free config instead, from `/Users/antoine/river/gui`:

  1. Ensure `gui/tsconfig.check.json` exists (untracked local tool; create it if missing) — same options as `tsconfig.json` with the `"references"` key removed and `"include": ["src", "electron"]`.
  2. Run: `npx tsc --noEmit -p tsconfig.check.json`
  3. **The repo has 152 pre-existing type errors in other files (measured 2026-08-12). Do not try to fix them.** The gate is only that *your* files are clean:
     `npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^(src/your/file1|src/your/file2)"` → expect **no output**.

  Every "typecheck" step below means this grep-gated form, never a bare "expect no errors".
- **Test baseline (measured 2026-08-12):** `npx jest` in `gui/` is **17 suites, 169 tests, all passing**. Any failure you see is yours. This plan adds roughly 40 tests across Tasks 1–3.
- **Python indentation:** `river/core/stiv_pipeline.py` uses **tabs**. Match the file you are editing.
- **Commit messages: no `Co-Authored-By` trailer. Do not push.**

---

### Task 1: Pure angle helpers

**Files:**
- Create: `gui/src/helpers/stivAngle.ts`
- Create: `gui/src/helpers/stivAngle.test.ts`
- Modify: `gui/src/helpers/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ANGLE_MIN = 0.5`, `ANGLE_MAX = 179.5`, `ANGLE_WARN_LOW = 5`, `ANGLE_WARN_HIGH = 85`
  - `clampAngle(deg: number): number`
  - `metersPerSlope(step: number, fps: number): number`
  - `thetaToVelocity(deg: number, step: number, fps: number): number`
  - `thetaToSign(deg: number): 'positive' | 'negative' | 'zero'`
  - `isAnglePoorlyConstrained(deg: number): boolean`
  - `isStationTuned(manual: (number | null)[] | undefined, i: number): boolean`
  - `setOverride(manual: (number|null)[] | undefined, i: number, deg: number, n: number): (number|null)[]`
  - `clearOverride(manual: (number|null)[] | undefined, i: number, n: number): (number|null)[]`
  - `clearAllOverrides(n: number): (number | null)[]`
  - `hasAnyOverride(manual: (number | null)[] | undefined): boolean`
  - `mergeAngleProfile(auto, manual): (number | null)[]`
  - `mergedVelocityProfile(auto, manual, step, fps): (number | null)[]`
  - `mergedSigmaProfile(autoSigma, manual): (number | null)[]`
  - `angleFromPointer(px, py, barCentresX, cy): number`

- [ ] **Step 1: Write the failing test**

Create `gui/src/helpers/stivAngle.test.ts`:

```ts
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
    expect(Math.abs(thetaToVelocity(120, STEP, FPS))).toBeCloseTo(
      Math.abs(thetaToVelocity(60, STEP, FPS)),
      10
    );
  });

  it('stays finite at the clamp bounds', () => {
    expect(Number.isFinite(thetaToVelocity(ANGLE_MAX, STEP, FPS))).toBe(true);
    expect(Number.isFinite(thetaToVelocity(ANGLE_MIN, STEP, FPS))).toBe(true);
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
    expect(clampAngle(90)).toBe(90);
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

  it('reads 90 degrees for a pointer directly below a bar centre', () => {
    expect(angleFromPointer(300, 250, centres, cy)).toBeCloseTo(90, 5);
  });

  it('folds the upper half-plane into 0-180', () => {
    expect(angleFromPointer(300, 50, centres, cy)).toBeCloseTo(90, 5);
  });

  it('uses the nearest bar centre', () => {
    // Directly below the third centre; if it used the first, this would not be 90.
    expect(angleFromPointer(500, 250, centres, cy)).toBeCloseTo(90, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gui && npx jest src/helpers/stivAngle.test.ts`
Expected: FAIL — `Cannot find module './stivAngle'`.

- [ ] **Step 3: Write the implementation**

Create `gui/src/helpers/stivAngle.ts`:

```ts
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

export const clampAngle = (deg: number): number => Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, deg));

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
  if (manual) manual.forEach((v, i) => { if (i < n) next[i] = v ?? null; });
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

export const clearOverride = (
  manual: (number | null)[] | undefined,
  i: number,
  n: number
): (number | null)[] => {
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
export const angleFromPointer = (
  px: number,
  py: number,
  barCentresX: number[],
  cy: number
): number => {
  const cx = barCentresX.reduce((best, c) => (Math.abs(c - px) < Math.abs(best - px) ? c : best), barCentresX[0]);
  const deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
  return clampAngle(((deg % 180) + 180) % 180);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gui && npx jest src/helpers/stivAngle.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Re-export from the helpers barrel**

In `gui/src/helpers/index.ts`, follow the existing import/export pattern (see how `stiColorScale` is handled) and add:

```ts
import {
  ANGLE_MAX,
  ANGLE_MIN,
  ANGLE_WARN_HIGH,
  ANGLE_WARN_LOW,
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
  setOverride,
  thetaToSign,
  thetaToVelocity,
} from './stivAngle';
```

and add each name to the existing `export { ... }` block.

- [ ] **Step 6: Lint and commit**

```bash
cd gui && npm run lint
git add src/helpers/stivAngle.ts src/helpers/stivAngle.test.ts src/helpers/index.ts
git commit -m "Add pure helpers for the STIV manual angle override"
```

---

### Task 2: Merge the override into discharge

**Files:**
- Modify: `gui/src/store/section/types.ts:84`
- Modify: `gui/src/helpers/techniqueDischarge.ts:91-141`
- Test: `gui/src/helpers/techniqueDischarge.test.ts` (create if absent)

**Interfaces:**
- Consumes: `mergedVelocityProfile` from Task 1.
- Produces: `TechniqueOptions` gains `step: number` and `fps: number`; `SectionData` gains `stiv_angle_manual_profile?: (number | null)[]`.

**Why `TechniqueOptions` grows:** velocity now has to be derived from an angle, which needs `step` and `fps`. Every existing caller of `getEffectiveTechniqueData` must pass them — there are six, listed in Step 5.

- [ ] **Step 1: Write the failing test**

Create or extend `gui/src/helpers/techniqueDischarge.test.ts`:

```ts
import { getEffectiveTechniqueData } from './techniqueDischarge';
import type { SectionData } from '../store/section/types';

const STEP = 1;
const FPS = 30;

/** Three stations, flat 1 m depth, 10 m apart. Angles chosen so tan is exact-ish. */
const baseData = (over?: (number | null)[]): SectionData =>
  ({
    distance: [0, 10, 20],
    depth: [1, 1, 1],
    check: [true, true, true],
    activeCheck: [true, true, true],
    stiv_angle_profile: [45, 45, 45],
    stiv_velocity_profile: [0.6, 0.6, 0.6],
    stiv_sigma_profile: [0.05, 2.94, 0.05],
    stiv_angle_manual_profile: over,
  }) as unknown as SectionData;

const opts = { interpolated: false, artificialSeeding: false, alpha: 1, step: STEP, fps: FPS };

describe('getEffectiveTechniqueData with a manual STIV angle', () => {
  it('matches the automatic profile when nothing is tuned', () => {
    const r = getEffectiveTechniqueData(baseData(), 'stiv', opts)!;
    expect(r.resolved).toEqual([0.6, 0.6, 0.6]);
  });

  it('gives the override priority in the resolved profile', () => {
    const r = getEffectiveTechniqueData(baseData([null, 60, null]), 'stiv', opts)!;
    expect(r.resolved[0]).toBeCloseTo(0.6, 5);
    expect(r.resolved[1]).toBeCloseTo(Math.tan(Math.PI / 3) * 0.6, 5);
  });

  it('changes total discharge when a station is tuned', () => {
    const auto = getEffectiveTechniqueData(baseData(), 'stiv', opts)!;
    const tuned = getEffectiveTechniqueData(baseData([null, 60, null]), 'stiv', opts)!;
    expect(tuned.total_Q).toBeGreaterThan(auto.total_Q);
  });

  it('restores the automatic discharge exactly when the override is cleared', () => {
    const auto = getEffectiveTechniqueData(baseData(), 'stiv', opts)!;
    const cleared = getEffectiveTechniqueData(baseData([null, null, null]), 'stiv', opts)!;
    expect(cleared.total_Q).toBeCloseTo(auto.total_Q, 10);
  });

  it('drops sigma for the tuned station only', () => {
    const r = getEffectiveTechniqueData(baseData([null, 60, null]), 'stiv', opts)!;
    expect(r.sigma).toEqual([0.05, null, 0.05]);
  });

  it('exposes which stations are tuned', () => {
    const r = getEffectiveTechniqueData(baseData([null, 60, null]), 'stiv', opts)!;
    expect(r.tunedFlags).toEqual([false, true, false]);
  });

  it('leaves LSPIV untouched by a STIV override', () => {
    const data = {
      ...baseData([null, 60, null]),
      streamwise_velocity_magnitude: [1, 1, 1],
    } as unknown as SectionData;
    const r = getEffectiveTechniqueData(data, 'lspiv', opts)!;
    expect(r.resolved).toEqual([1, 1, 1]);
    expect(r.tunedFlags).toEqual([false, false, false]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gui && npx jest src/helpers/techniqueDischarge.test.ts`
Expected: FAIL — `tunedFlags`/`sigma` undefined and the override ignored.

- [ ] **Step 3: Add the field to SectionData**

In `gui/src/store/section/types.ts`, directly after line 84 (`stiv_sign_profile?: string[];`):

```ts
  /** Per-station angle set by the user in the STI viewer, in degrees. null = use
   *  the automatic fit. Written only by the GUI; never produced by the pipeline. */
  stiv_angle_manual_profile?: (number | null)[];
```

- [ ] **Step 4: Merge in getEffectiveTechniqueData**

In `gui/src/helpers/techniqueDischarge.ts`:

Add to the imports at the top:

```ts
import { isStationTuned, mergedSigmaProfile, mergedVelocityProfile } from './stivAngle';
```

Extend `TechniqueOptions` (currently lines 91-98) with:

```ts
  /** Frame step and video fps — needed to turn a manual STIV angle into a velocity. */
  step: number;
  fps: number;
```

Extend `TechniqueDischargeData` (lines 100-116) with:

```ts
  /** Per-station: was this velocity derived from a user-set angle rather than the fit. */
  tunedFlags: boolean[];
  /** Per-station uncertainty, null where the station was tuned by hand. */
  sigma: (number | null)[];
```

Replace the `baseProfile` derivation (lines 132-141) with:

```ts
  const manualAngles = data.stiv_angle_manual_profile;

  const baseProfile: (number | null)[] | undefined =
    technique === 'lspiv'
      ? options.artificialSeeding && data.seeded_vel_profile
        ? data.seeded_vel_profile
        : data.streamwise_velocity_magnitude
      : technique === 'stiv'
        ? // A manual angle overrides the fitted one, so STIV's profile is rebuilt from
          // the merged angles rather than read straight from stiv_velocity_profile.
          data.stiv_angle_profile
          ? mergedVelocityProfile(data.stiv_angle_profile, manualAngles, options.step, options.fps)
          : data.stiv_velocity_profile
        : data.iwave_velocity_profile;

  if (!baseProfile) return null;

  const tunedFlags =
    technique === 'stiv' ? baseProfile.map((_, i) => isStationTuned(manualAngles, i)) : baseProfile.map(() => false);

  const sigma =
    technique === 'stiv' && data.stiv_sigma_profile
      ? mergedSigmaProfile(data.stiv_sigma_profile, manualAngles)
      : baseProfile.map(() => null);
```

Add `tunedFlags` and `sigma` to the returned object at the end of the function.

- [ ] **Step 5: Pass step/fps at every call site**

`getEffectiveTechniqueData` is called in six places. Each already has access to `video.parameters.step` and `video.data.fps` via `useProjectSlice()` — add the hook where it is not already present, and add `step` and `fps` to the options object:

- `gui/src/components/Forms/FormResults.tsx:46`
- `gui/src/components/Grid.tsx:60`
- `gui/src/components/Grid.tsx:166`
- `gui/src/hooks/useVelocityColorRange.ts:33`
- `gui/src/components/Graphs/VelocityVector.tsx:44`
- `gui/src/components/Graphs/AllInOne.tsx:125`

Verify none were missed:

```bash
cd gui && grep -rn "getEffectiveTechniqueData(" src | grep -v "helpers/techniqueDischarge"
```

- [ ] **Step 6: Run the tests and typecheck**

```bash
cd gui && npx jest src/helpers/
npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^(src/helpers/techniqueDischarge|src/store/section/types|src/components/Forms/FormResults|src/components/Grid|src/hooks/useVelocityColorRange|src/components/Graphs/VelocityVector|src/components/Graphs/AllInOne)"
```
Expected: tests PASS; the grep prints **nothing**. (Errors from other files are the 152-error pre-existing baseline — ignore them.)

- [ ] **Step 7: Lint and commit**

```bash
cd gui && npm run lint
git add src/store/section/types.ts src/helpers/techniqueDischarge.ts src/helpers/techniqueDischarge.test.ts src/components src/hooks
git commit -m "Give a manual STIV angle priority in the discharge calculation"
```

---

### Task 3: Persist overrides to xsections.json

**Files:**
- Create: `gui/electron/ipcMainHandlers/setStivManualAngles.ts`
- Create: `gui/electron/ipcMainHandlers/setStivManualAngles.test.ts`
- Modify: `gui/electron/ipcMainHandlers/index.ts`
- Modify: `gui/electron/main.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: IPC channel `set-stiv-manual-angles`, args `{ sectionName: string; angles: (number | null)[] }`, plus the exported pure function `applyManualAngles(parsed, sectionName, angles)` that the test drives.

**Why not `set-sections`:** its adapter (`adapterCrossSections.ts`) serialises geometry only, so routing through it would drop everything in `data`.

- [ ] **Step 1: Write the failing test**

Create `gui/electron/ipcMainHandlers/setStivManualAngles.test.ts` (mirror the structure of the existing `getStis.test.ts`):

```ts
import { applyManualAngles } from './setStivManualAngles';

describe('applyManualAngles', () => {
  const parsed = () => ({
    CS_default_1: { num_stations: 3, stiv_angle_profile: [10, 20, 30] },
    CS_default_2: { num_stations: 3 },
    summary: { mean: {} },
  });

  it('writes the array onto the named section only', () => {
    const out = applyManualAngles(parsed(), 'CS_default_1', [null, 45, null]);
    expect(out.CS_default_1.stiv_angle_manual_profile).toEqual([null, 45, null]);
    expect(out.CS_default_2.stiv_angle_manual_profile).toBeUndefined();
  });

  it('leaves every other key on the section untouched', () => {
    const out = applyManualAngles(parsed(), 'CS_default_1', [null, 45, null]);
    expect(out.CS_default_1.stiv_angle_profile).toEqual([10, 20, 30]);
    expect(out.CS_default_1.num_stations).toBe(3);
  });

  it('removes the key entirely when no station is tuned', () => {
    const withOverride = applyManualAngles(parsed(), 'CS_default_1', [null, 45, null]);
    const cleared = applyManualAngles(withOverride, 'CS_default_1', [null, null, null]);
    expect('stiv_angle_manual_profile' in cleared.CS_default_1).toBe(false);
  });

  it('is a no-op for an unknown section name', () => {
    const out = applyManualAngles(parsed(), 'nope', [null, 45, null]);
    expect(out.CS_default_1.stiv_angle_manual_profile).toBeUndefined();
  });

  it('never touches summary', () => {
    const out = applyManualAngles(parsed(), 'summary', [null, 45, null]);
    expect((out.summary as Record<string, unknown>).stiv_angle_manual_profile).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gui && npx jest electron/ipcMainHandlers/setStivManualAngles.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `gui/electron/ipcMainHandlers/setStivManualAngles.ts`:

```ts
import { ipcMain } from 'electron';
import * as fs from 'fs';
import { platform } from 'os';
import { PROJECT_CONFIG } from '../main';

// xsections.json is written with latin1 on Windows elsewhere in this folder
// (see getResultData.ts); match it so a round-trip cannot corrupt section names.
const encoding: BufferEncoding = platform() === 'win32' ? 'latin1' : 'utf-8';

/**
 * Patch one section's manual-angle array, leaving every other key and every
 * other section untouched. Exported separately from the IPC wiring so the
 * merge rule can be tested without Electron.
 *
 * An all-null array means "nothing is tuned", and is stored as an absent key
 * rather than an array of nulls — that keeps xsections.json free of a row of
 * nulls for the overwhelmingly common untouched case.
 */
export function applyManualAngles(
  parsed: Record<string, any>,
  sectionName: string,
  angles: (number | null)[]
): Record<string, any> {
  if (sectionName === 'summary' || !(sectionName in parsed)) return parsed;

  const section = parsed[sectionName];
  if (angles.some((a) => a !== null && a !== undefined)) {
    section.stiv_angle_manual_profile = angles;
  } else {
    delete section.stiv_angle_manual_profile;
  }
  return parsed;
}

function setStivManualAngles() {
  ipcMain.handle('set-stiv-manual-angles', async (_event, args) => {
    const { sectionName, angles } = args as { sectionName: string; angles: (number | null)[] };
    const xSections = PROJECT_CONFIG.xsectionsPath;

    const raw = await fs.promises.readFile(xSections, { encoding });
    const parsed = applyManualAngles(JSON.parse(raw), sectionName, angles);

    await fs.promises.writeFile(xSections, JSON.stringify(parsed, null, 2), { encoding });
    return;
  });
}

export { setStivManualAngles };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gui && npx jest electron/ipcMainHandlers/setStivManualAngles.test.ts`
Expected: PASS.

- [ ] **Step 5: Register the handler**

In `gui/electron/ipcMainHandlers/index.ts`, add the import alongside the others and add `setStivManualAngles` to the `export { ... }` block (keep alphabetical order — it goes after `setProjectMetadata`).

In `gui/electron/main.ts`, add `setStivManualAngles` to the import list from `./ipcMainHandlers` (around line 36) and call `setStivManualAngles();` next to `setColorbarLimits();` (around line 236).

- [ ] **Step 6: Lint and commit**

```bash
cd gui && npm run lint && npx jest electron/
git add electron/ipcMainHandlers/setStivManualAngles.ts electron/ipcMainHandlers/setStivManualAngles.test.ts electron/ipcMainHandlers/index.ts electron/main.ts
git commit -m "Add set-stiv-manual-angles IPC handler"
```

---

### Task 4: Backend staleness guards

**Files:**
- Modify: `river/core/stiv_pipeline.py:24-29` and `run_stiv_analysis` (ends ~line 619)
- Modify: `tests/test_compute_section_cache.py`
- Modify: `tests/test_stiv_pipeline.py`

**Interfaces:**
- Consumes: the key name `stiv_angle_manual_profile` from Task 3.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing tests**

In `tests/test_compute_section_cache.py`, alongside the three tests commit `003fee9` added, add:

```python
def test_manual_angles_stripped_when_num_stations_changes(tmp_path):
    """A manual angle is pinned to a station position; rebuilding the geometry at a
    different station count moves that position, so the override must not survive."""
    xsections, piv, matrix = _minimal_project(tmp_path)  # reuse this file's existing helper
    name = next(k for k in xsections if k != "summary")
    xsections[name]["num_stations"] = 15
    xsections[name]["stiv_angle_manual_profile"] = [None] * 14 + [45.0]

    result = update_current_x_section(xsections, piv, matrix, step=1, fps=30.0, id_section=0, num_stations=20)

    assert "stiv_angle_manual_profile" not in result[name]


def test_manual_angles_survive_recompute_at_the_same_num_stations(tmp_path):
    """An ordinary Results recompute is not a re-run and must preserve the user's work."""
    xsections, piv, matrix = _minimal_project(tmp_path)
    name = next(k for k in xsections if k != "summary")
    xsections[name]["num_stations"] = 15
    xsections[name]["stiv_angle_manual_profile"] = [None] * 14 + [45.0]

    result = update_current_x_section(xsections, piv, matrix, step=1, fps=30.0, id_section=0, num_stations=15)

    assert result[name]["stiv_angle_manual_profile"][14] == 45.0
```

Match the existing helper/fixture names in that file — read the three `003fee9` tests first and follow their exact setup rather than inventing `_minimal_project` if it is named otherwise.

In `tests/test_stiv_pipeline.py`, add:

```python
def test_run_stiv_analysis_clears_manual_angles(monkeypatch, tmp_path):
    """Re-running STIV rebuilds the STIs, so a by-eye angle set against the previous
    image must not carry over onto the new one."""
    xsections = _stub_xsections()  # follow this file's existing fixture pattern
    name = next(k for k in xsections if k != "summary")
    xsections[name]["stiv_angle_manual_profile"] = [45.0, None, None]

    result = run_stiv_analysis(xsections, _identity_matrix(), str(tmp_path), step=1, fps=30.0, id_section=0)

    assert result[name]["stiv_angle_manual_profile"] == [None, None, None]
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /Users/antoine/river && python -m pytest tests/test_compute_section_cache.py -k manual_angles -v
python -m pytest tests/test_stiv_pipeline.py -k manual_angles -v
```
Expected: FAIL — the key survives the station-count change, and is not cleared by the re-run.

- [ ] **Step 3: Add the key to STIV_COLUMNS**

In `river/core/stiv_pipeline.py`, extend the list at lines 24-29:

```python
STIV_COLUMNS = [
	"stiv_velocity_profile",
	"stiv_sigma_profile",
	"stiv_angle_profile",
	"stiv_sign_profile",
	# Written by the GUI, not this pipeline — but it is pinned to station positions
	# exactly like the arrays above, so it must be stripped with them when the
	# geometry is rebuilt (see update_current_x_section in compute_section.py).
	"stiv_angle_manual_profile",
]
```

This alone makes the first two tests pass — `update_current_x_section` already strips everything in `STIV_COLUMNS` on a station-count change, and already preserves unlisted keys otherwise.

- [ ] **Step 4: Clear overrides on a real re-run**

In `river/core/stiv_pipeline.py`, in `run_stiv_analysis`, alongside the other four assignments (~line 618):

```python
	# A manual angle was judged by eye against the STIs this run has just replaced,
	# so it does not describe the new ones. Clearing is the honest default: silently
	# keeping it would apply the previous run's judgement to different images with
	# no indication that it had.
	xsections[current_key]["stiv_angle_manual_profile"] = [None] * n
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd /Users/antoine/river && python -m pytest tests/test_compute_section_cache.py tests/test_stiv_pipeline.py -v
```
Expected: PASS, including the pre-existing tests in both files.

- [ ] **Step 6: Commit**

```bash
cd /Users/antoine/river
git add river/core/stiv_pipeline.py tests/test_compute_section_cache.py tests/test_stiv_pipeline.py
git commit -m "Drop manual STIV angles when they would go stale"
```

---

### Task 5: The override hook

**Files:**
- Create: `gui/src/hooks/useStivAngleOverride.ts`
- Modify: `gui/src/hooks/index.ts`

**Interfaces:**
- Consumes: `setOverride`, `clearOverride`, `clearAllOverrides`, `isStationTuned`, `hasAnyOverride` (Task 1); the `set-stiv-manual-angles` channel (Task 3); `changeSectionData` from `useSectionSlice`.
- Produces:

```ts
interface StivAngleOverride {
  manual: (number | null)[] | undefined;
  autoAngle: number | null;
  angle: number | null;
  isTuned: boolean;
  hasAny: boolean;
  setAngle: (deg: number) => void;
  reset: () => void;
  resetAll: () => void;
}
useStivAngleOverride(stationIndex: number): StivAngleOverride
```

- [ ] **Step 1: Write the implementation**

There is no unit test for this task: it is Redux and IPC wiring over functions Task 1 already tested, and the repo has no jsdom environment for hook tests. Its correctness is covered by Task 1's helper tests plus the manual verification in Task 8.

Create `gui/src/hooks/useStivAngleOverride.ts`:

```ts
import { useCallback } from 'react';
import { useSectionSlice } from './useSectionSlice';
import { clearAllOverrides, clearOverride, hasAnyOverride, isStationTuned, setOverride } from '../helpers';

/**
 * Reads and writes one station's manual STIV angle.
 *
 * Writes go to Redux first so the UI (and the live discharge that follows from
 * it) updates on the same frame as the drag, then to disk. A failed write leaves
 * the session correct and only loses persistence, which is the right way round:
 * blocking the drag on a file write would make rotation feel broken.
 */
export const useStivAngleOverride = (stationIndex: number) => {
  const { sections, activeSection, onChangeSectionData } = useSectionSlice();
  const section = sections[activeSection];
  const data = section?.data;

  const manual = data?.stiv_angle_manual_profile;
  const n = data?.stiv_angle_profile?.length ?? 0;
  const autoAngle = data?.stiv_angle_profile?.[stationIndex] ?? null;
  const isTuned = isStationTuned(manual, stationIndex);
  const angle = isTuned ? (manual as number[])[stationIndex] : autoAngle;

  const persist = useCallback(
    (angles: (number | null)[]) => {
      if (!data || !section) return;
      onChangeSectionData({ ...data, stiv_angle_manual_profile: angles });
      window.ipcRenderer
        .invoke('set-stiv-manual-angles', { sectionName: section.name, angles })
        .catch(() => {});
    },
    [data, section, onChangeSectionData]
  );

  return {
    manual,
    autoAngle,
    angle,
    isTuned,
    hasAny: hasAnyOverride(manual),
    setAngle: (deg: number) => persist(setOverride(manual, stationIndex, deg, n)),
    reset: () => persist(clearOverride(manual, stationIndex, n)),
    resetAll: () => persist(clearAllOverrides(n)),
  };
};
```

- [ ] **Step 2: Add onChangeSectionData to useSectionSlice**

Verified absent: `useSectionSlice` dispatches `changeSectionData` only from inside `onChangeDataValues` (line 641), which is a switch on `object.type` and has no branch for this. Add a direct setter beside it (~line 690, after the switch) and include it in the hook's returned object (~line 837, next to `onChangeDataValues`):

```ts
  /** Replace section.data wholesale. onChangeDataValues covers the fixed set of
   *  toggles it knows about; this is for callers that compute the next data
   *  themselves, like the STIV angle override. */
  const onChangeSectionData = (data: SectionData) => {
    dispatch(changeSectionData(data));
  };
```

`SectionData` is already imported in that file; `changeSectionData` is already imported at line 17.

- [ ] **Step 3: Export from the hooks barrel**

Add to `gui/src/hooks/index.ts`, following the existing pattern:

```ts
export { useStivAngleOverride } from './useStivAngleOverride';
```

- [ ] **Step 4: Typecheck, lint and commit**

```bash
cd gui && npm run lint
npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^(src/hooks/useStivAngleOverride|src/hooks/useSectionSlice)"
```
Expected: lint clean; the grep prints **nothing**.

```bash
git add src/hooks/useStivAngleOverride.ts src/hooks/index.ts src/hooks/useSectionSlice.ts
git commit -m "Add useStivAngleOverride hook"
```

---

### Task 6: Translation keys

**Files:**
- Modify: `gui/src/translations/en/global.json` — **this file only**

**Interfaces:**
- Consumes: nothing.
- Produces: the `Processing.*` keys used in Task 7.

- [ ] **Step 1: Add the keys**

Add these to the `Processing` object in `en/global.json`. `fallbackLng` is `'en'`, so the other 12 locales resolve through it; commit `b7bdbfa` added the iWave keys to `en` alone and that is the convention to follow.

```json
"stiAngleTuned": "tuned",
"stiAngleAuto": "auto {{angle}}°",
"stiAngleReset": "Reset to automatic",
"stiAngleResetAll": "Reset all angles",
"stiAngleResetAllTitle": "Discard every manual angle in this cross-section",
"stiAngleWarnExtreme": "Velocity is poorly constrained at this angle",
"stiAngleDragHint": "Drag to rotate · Shift+drag to pan",
"stiAngleLowConfidence": "The automatic fit is uncertain here (σ > velocity)"
```

- [ ] **Step 2: Verify the file still parses and has every key**

```bash
cd gui && python3 -c "
import json
d = json.load(open('src/translations/en/global.json'))
keys = ['stiAngleTuned','stiAngleAuto','stiAngleReset','stiAngleResetAll',
        'stiAngleResetAllTitle','stiAngleWarnExtreme','stiAngleDragHint','stiAngleLowConfidence']
missing = [k for k in keys if k not in d.get('Processing', {})]
print('OK' if not missing else 'MISSING ' + ','.join(missing))
"
```
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
cd gui && git add src/translations/en/global.json
git commit -m "Add STIV angle fine-tuning translation keys"
```

---

### Task 7: The tuner UI

**Files:**
- Create: `gui/src/components/StiAngleTuner.tsx`
- Modify: `gui/src/components/StiViewer.tsx`
- Modify: `gui/src/components/components.css`
- Modify: `gui/src/components/index.ts`

**Interfaces:**
- Consumes: everything from Tasks 1, 5 and 6.
- Produces:

```ts
interface StiAngleTunerProps {
  stationIndex: number;
  stationId: number;
  viewW: number;
  viewH: number;
  /** Velocity colour for the current angle, from getStiColorScale. */
  color: string;
  velocity: number | null;
  isImperial: boolean;
}
```

**Design reference:** `gui/src/devPreview/angleTuner.tsx`, variants A + B combined. Read it before starting — the bar geometry, the ghost line, the handles and the readout layout are all worked out there against real STIs.

- [ ] **Step 1: Build the tuner component**

Create `gui/src/components/StiAngleTuner.tsx`. It owns:

- the SVG overlay: three bars at `[0.25, 0.5, 0.75] * viewW`, half-length `min(viewW, viewH) * 0.8 / 2`, each drawn twice (a `rgba(0,0,0,0.55)` width-6 casing under a width-3 coloured line) so they stay legible over any STI — this is what `StiViewer.tsx:141-156` does today, plus the casing
- circular handles at both ends of each bar, shown on hover
- the dashed ghost of `autoAngle`, rendered only when `isTuned`
- pointer handlers calling `angleFromPointer(...)` then `setAngle(...)`, **skipping** the event when `event.shiftKey` is true so Shift+drag falls through to the viewer's pan
- the slider row below the frame: `<input type="range" min={ANGLE_MIN} max={ANGLE_MAX} step={0.5}>`, the numeric readout, and the reset button `disabled={!isTuned}`
- the warning state when `isAnglePoorlyConstrained(angle)`: bars and readout take `var(--warning-color)` and the readout shows `t('Processing.stiAngleWarnExtreme')`
- `keydown` on ←/→ for ±0.5°, with `shiftKey` for ±0.1°, registered on the frame element (not `window`) so it does not fire while the user is typing elsewhere

Colour comes in as a prop rather than being derived here, so the tuner does not need to know about `colorbarLimits`.

- [ ] **Step 2: Wire it into StiViewer**

In `gui/src/components/StiViewer.tsx`:

- call `useStivAngleOverride(activeStation)` and use its `angle` in place of the current `data?.stiv_angle_profile?.[activeStation]` (line 52)
- derive velocity from that angle with `thetaToVelocity(angle, parameters.step, videoData.fps)` instead of reading `stiv_velocity_profile` (line 53), so the badge tracks the drag; take `step`/`fps` from `useProjectSlice()`
- derive the sign with `thetaToSign(angle)` instead of reading `stiv_sign_profile` (line 54)
- guard the existing drag handlers so they only pan when `event.shiftKey` is true
- replace the inline `<svg className="sti-overlay">` block (lines 135-158) with `<StiAngleTuner ... />`

- [ ] **Step 3: Add the styles**

In `gui/src/components/components.css`, add classes for the slider row, the reset button and the handles, matching the existing `.sti-*` block. Note that `.sti-frame` has `overflow: hidden` — commit `192f3e1` fixed a clipping bug caused by exactly this, so put the slider row **outside** `.sti-frame`, as a sibling under `.sti-viewer`.

- [ ] **Step 4: Export the component**

Add `StiAngleTuner` to `gui/src/components/index.ts` following the existing pattern.

- [ ] **Step 5: Typecheck, lint and commit**

```bash
cd gui && npm run lint && npx jest
npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^(src/components/StiAngleTuner|src/components/StiViewer)"
```
Expected: lint clean, tests PASS, the grep prints **nothing**.

```bash
git add src/components/StiAngleTuner.tsx src/components/StiViewer.tsx src/components/components.css src/components/index.ts
git commit -m "Add the STIV angle tuner to the STI viewer"
```

---

### Task 8: Results markers, Reset all, and low-confidence hints

**Files:**
- Modify: `gui/src/components/Graphs/AllInOne.tsx`
- Modify: `gui/src/components/Forms/FormProcessing.tsx`
- Modify: `gui/src/components/Carousel.tsx` (the station strip in `mode="processing"`)

**Interfaces:**
- Consumes: `tunedFlags` and `sigma` from Task 2; `resetAll`/`hasAny` from Task 5; the keys from Task 6.
- Produces: nothing.

- [ ] **Step 1: Mark tuned stations on the STIV series**

In `AllInOne.tsx`, where the STIV series is drawn from `getEffectiveTechniqueData`, use `tunedFlags[i]` to render a filled marker for tuned stations and the existing hollow marker otherwise, and use `sigma[i]` for the error bar — skipping the bar where `sigma[i] === null`. Read how the existing `showStivStd` branch draws error bars and follow it rather than adding a parallel path.

- [ ] **Step 2: Add Reset all to the Processing form**

In `FormProcessing.tsx`, in the STIV row (around lines 200-220, next to the eye button), render a reset-all button shown only when `hasAny` is true, titled `t('Processing.stiAngleResetAllTitle')`. Get `hasAny`/`resetAll` from `useStivAngleOverride(0)` — the station index is irrelevant for those two fields.

- [ ] **Step 3: Mark low-confidence stations in the station strip**

Where the carousel renders station thumbnails in `mode="processing"`, add a marker for stations satisfying:

```ts
const v = data?.stiv_velocity_profile?.[i];
const s = data?.stiv_sigma_profile?.[i];
const lowConfidence = v !== null && v !== undefined && v !== 0 && s !== null && s !== undefined && s > Math.abs(v);
```

The `v !== 0` guard matters: a dry bank station has `v = 0` and σ at its 0.05 floor, which satisfies `σ > |v|` while meaning nothing. Title the marker with `t('Processing.stiAngleLowConfidence')`.

Also mark tuned stations here, using `isStationTuned(data?.stiv_angle_manual_profile, i)`.

- [ ] **Step 4: Typecheck, lint, test**

```bash
cd gui && npm run lint && npx jest
npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^(src/components/Graphs/AllInOne|src/components/Forms/FormProcessing|src/components/Carousel)"
```
Expected: lint clean, tests PASS, the grep prints **nothing**.

- [ ] **Step 5: Verify in the real app**

Run the app, load `DJI_1_Tweed_15032022/20260714T2031`, go to Processing and switch the STIV preview to the STI view. Confirm:

1. Stations 8, 9, 10 and 13 are marked low-confidence in the strip (and station 15 is **not**).
2. Dragging on the STI rotates all three bars together and they change colour as they rotate.
3. Shift+drag still pans the STI.
4. The badge velocity tracks the drag live.
5. Rotating past 85° turns the readout to the warning colour and shows the warning text.
6. `Reset to automatic` returns the bars to the dashed ghost's angle and then disappears the ghost.
7. Advancing to Results shows a changed total Q, with the tuned station drawn as a filled marker and no error bar.
8. Reloading the project restores the override.
9. Changing Station Number in Results and recomputing drops the override, and the STIV profile disappears until Analize reruns.

- [ ] **Step 6: Commit**

```bash
cd gui && git add src/components
git commit -m "Mark tuned and low-confidence STIV stations, add Reset all"
```

---

### Task 9: Remove the prototype

**Files:**
- Delete: `gui/angle.html`, `gui/src/devPreview/angleMain.tsx`, `gui/src/devPreview/angleTuner.tsx`, `gui/src/devPreview/angleSample.json`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

These four files are untracked design artefacts kept as the visual reference during implementation. They are not in git, so this is a filesystem delete with nothing to commit.

- [ ] **Step 1: Confirm they are untracked**

```bash
cd /Users/antoine/river && git status --short -- gui/angle.html gui/src/devPreview/angle*
```
Expected: each line starts with `??`. If any is tracked, `git rm` it instead and commit.

- [ ] **Step 2: Delete**

```bash
cd /Users/antoine/river && rm gui/angle.html gui/src/devPreview/angleMain.tsx gui/src/devPreview/angleTuner.tsx gui/src/devPreview/angleSample.json
```

- [ ] **Step 3: Full verification**

```bash
cd gui && npm run lint && npx jest
npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^(src/helpers/stivAngle|src/helpers/techniqueDischarge|src/hooks/useStivAngleOverride|src/components/StiAngleTuner|src/components/StiViewer|electron/ipcMainHandlers/setStivManualAngles)"
cd /Users/antoine/river && python -m pytest tests/test_stiv_pipeline.py tests/test_compute_section_cache.py -v
```
Expected: lint clean, all Jest tests PASS, the grep prints **nothing**, all pytest green.

---

## Self-Review

**Spec coverage.** Storage → Task 3. Derivation → Tasks 1, 2. Persistence → Tasks 3, 5. Staleness (both kinds) → Task 4. Component split → Tasks 1, 5, 7. Drag + Shift-pan + slider + keyboard → Task 7. Colour and the ghost → Task 7. 90° warning → Tasks 1, 7. Reset and Reset all → Tasks 5, 7, 8. Low-confidence hint → Task 8. Results markers and dropped σ → Tasks 2, 8. Testing → Tasks 1, 2, 3, 4. Prototype cleanup → Task 9.

**Known risks for the implementer.**

- Task 2 Step 5 changes six call sites. The `grep` is there because `TechniqueOptions` is a structural type: omitting `step`/`fps` at a call site *is* caught by `tsc`, but the ~133-error baseline makes a new error easy to miss in the noise. Run the grep gate.
- Task 4's test helper names (`_minimal_project`, `_stub_xsections`, `_identity_matrix`) are **guesses**. Read the three tests commit `003fee9` added to `tests/test_compute_section_cache.py` and follow their real fixtures instead of inventing these.
- Task 8 Step 1 depends on how `AllInOne.tsx` currently draws the STIV series and its error bars; read it before editing rather than assuming a shape.
- Task 7 is the largest task and the only one with no automated test. Its gate is the manual checklist in Task 8 Step 5. If it starts sprawling, the natural split is "bars + drag" and "slider + reset + warning".
