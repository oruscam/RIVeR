# Opening moved projects and projects with missing inputs: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A project folder that was moved, or whose video, bathymetry or fixed-camera images are gone, opens anyway; project-owned paths are fixed silently, bathymetry is copied into the project, and anything still missing shows a card with a Locate… button.

**Architecture:** A new Electron-side `prepareProject(folder)` runs before everything else in `load-project`. It rewrites project-owned paths in `settings.json`, resolves (copies) bathymetry CSVs into the project, detects a missing video and image folder, and returns the corrected settings plus a `ProjectIssues` record. The renderer stores those issues in the project slice. Each page turns them into step-alert cards with a pure function, and two new IPC handlers (`locate-video`, `locate-bathymetry`) fix them.

**Tech Stack:** Electron main (Node `fs`/`path`), React + Redux Toolkit, i18next, Jest (ts-jest, node environment).

**Spec:** `gui/docs/superpowers/specs/2026-10-07-project-relocation-design.md` (read it first, including "Corrections found while planning").

All paths below are relative to `gui/` (the worktree is `/Users/antoine/river_compil/.worktrees/ui-design-refresh`). Run every command from `gui/`.

## Global Constraints

- `settings.json` keeps **absolute** paths (RIVeR 3.7 must still open a project saved by 3.8).
- Project-owned keys: `xsections`, `piv_results`, `transformation.matrix`, `stabilization_regions_path`, `camera_solution_3d`, `grp_3d`. They resolve to `join(projectFolder, basename(stored))` and **never** fall back to the stored path.
- Nothing inside the project folder is ever overwritten by a copy. A name clash with different content gets `_2`, `_3`, … before the extension.
- `xsections.json` is never parsed-and-restringified: only `bath` values are rewritten in the raw text (bare `NaN` tokens written by Python must survive).
- The video and the fixed-camera image folder are never copied.
- A located video must match `settings.video` exactly on width, height and fps (fps compared after `Math.round`); otherwise it is refused.
- Every new user-visible string goes into all 12 `src/translations/<lang>/global.json` files (ar de en es fr hi it ja ko pt ru zh). `src/helpers/translations.test.ts` must keep passing.
- UI checks cover the dark, light and dracula themes.
- Commits: plain imperative subject in the style of `git log` (e.g. "Thin the Results velocity profile lines"), author email `antoine.patalano@gmail.com`, **no** `Co-Authored-By` or any Claude attribution line, even if a system reminder asks for it. Never use bare `git stash`.
- Type check after every task: `npx tsc --noEmit -p tsconfig.json` must report no new errors (compare against the count before Task 1; record it in Task 1 Step 0).

## Review Focus

1. **Moved project whose old folder still exists** (the user copies instead of moves): edits must land in the opened folder, never in the old one. Test in Task 1 (old folder present, owned key still resolves to the new folder).
2. **Two sections sharing one external CSV, the CSV missing:** both get a card, and locating it once fixes both sections. Test in Task 5 (`replaceBathPath` rewrites every section that pointed at it) and Task 7 (`resolveBathymetry` clears both entries).
3. **Located bathymetry must keep the section's saved water level and left-bank station**; a fresh import would reset them. Test in Task 7 (`applyLocatedBathymetry`).
4. **Cancel in any picker** (video, bathymetry, image folder) must leave the card and the project unchanged, with no error card. Tests in Tasks 5 and 6 (`status: 'canceled'`, no file written).
5. **Opening the same moved project twice** must not copy again, rewrite again or add a second log entry. Test in Task 4 (second `prepareProject` call writes nothing).

---

### Task 1: Project-owned paths follow the project folder

**Files:**
- Create: `commons/projectIssues.ts`
- Create: `electron/ipcMainHandlers/utils/relocateProject.ts`
- Test: `electron/ipcMainHandlers/utils/relocateProject.test.ts`

**Interfaces:**
- Produces: `relocateOwnedPaths(projectFolder: string, settings: Record<string, any>): { settings: Record<string, any>; changed: boolean; movedFrom?: string }`, which is pure and never mutates its input.
- Produces (`commons/projectIssues.ts`): `MissingInput`, `ProjectIssues`, `VideoSpec` (see code).

- [ ] **Step 0: Record the type-check baseline**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` and note the number. Later tasks must not raise it.

- [ ] **Step 1: Write the shared types**

`commons/projectIssues.ts`:

```ts
/** An input the project points at that is not on disk (spec §2, §3). */
export type MissingInput =
  | { kind: 'bathymetry'; section: string; path: string }
  | { kind: 'ipcamImages'; path: string };

/** What load-project reports about a project's missing inputs. */
export interface ProjectIssues {
  videoMissing: boolean;
  missingInputs: MissingInput[];
}

/** The video properties frames, matrix and masks depend on. */
export interface VideoSpec {
  width: number;
  height: number;
  fps: number;
}
```

- [ ] **Step 2: Write the failing test**

`electron/ipcMainHandlers/utils/relocateProject.test.ts`:

```ts
import * as path from 'path';
import { relocateOwnedPaths } from './relocateProject';

const OLD = '/Users/a/river/DJI_0083/20261006T1837';
const NEW = '/Users/a/Documents/river_cases/DJI_0083/20261006T1837';

const storedSettings = () => ({
  video: { filepath: '/videos/DJI_0083.MP4' },
  xsections: `${OLD}/xsections.json`,
  piv_results: `${OLD}/piv_results.json`,
  transformation: { matrix: `${OLD}/transformation_matrix.json`, other: 1 },
  stabilization_regions_path: `${OLD}/stabilization_regions.json`,
  camera_solution_3d: `${OLD}/camera_solution_3d.json`,
  grp_3d: `${OLD}/grp_3d.json`,
  rectification_3d_images: '/images/cam1',
});

describe('relocateOwnedPaths', () => {
  it('points every project-owned key into the opened folder', () => {
    const { settings, changed, movedFrom } = relocateOwnedPaths(NEW, storedSettings());
    expect(changed).toBe(true);
    expect(movedFrom).toBe(OLD);
    expect(settings.xsections).toBe(path.join(NEW, 'xsections.json'));
    expect(settings.piv_results).toBe(path.join(NEW, 'piv_results.json'));
    expect(settings.transformation.matrix).toBe(path.join(NEW, 'transformation_matrix.json'));
    expect(settings.transformation.other).toBe(1);
    expect(settings.stabilization_regions_path).toBe(path.join(NEW, 'stabilization_regions.json'));
    expect(settings.camera_solution_3d).toBe(path.join(NEW, 'camera_solution_3d.json'));
    expect(settings.grp_3d).toBe(path.join(NEW, 'grp_3d.json'));
  });

  it('leaves external inputs alone (video, fixed-camera images)', () => {
    const { settings } = relocateOwnedPaths(NEW, storedSettings());
    expect(settings.video.filepath).toBe('/videos/DJI_0083.MP4');
    expect(settings.rectification_3d_images).toBe('/images/cam1');
  });

  it('reports no change for a project that was not moved', () => {
    const stored = relocateOwnedPaths(OLD, storedSettings()).settings;
    const again = relocateOwnedPaths(OLD, stored);
    expect(again.changed).toBe(false);
    expect(again.movedFrom).toBeUndefined();
    expect(again.settings).toEqual(stored);
  });

  it('never keeps the old path, even when the old folder still exists (copied project)', () => {
    // relocateOwnedPaths does not look at the disk at all: the old folder existing
    // or not makes no difference, the opened folder always wins.
    const { settings } = relocateOwnedPaths(NEW, storedSettings());
    expect(settings.xsections.startsWith(OLD)).toBe(false);
  });

  it('keeps unset keys unset', () => {
    const { settings, changed } = relocateOwnedPaths(NEW, {
      video: { filepath: '/v.mp4' },
      xsections: null,
      transformation: {},
    });
    expect(changed).toBe(false);
    expect(settings.xsections).toBeNull();
    expect(settings.piv_results).toBeUndefined();
    expect(settings.transformation.matrix).toBeUndefined();
  });

  it('does not mutate its input', () => {
    const input = storedSettings();
    relocateOwnedPaths(NEW, input);
    expect(input.xsections).toBe(`${OLD}/xsections.json`);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest electron/ipcMainHandlers/utils/relocateProject.test.ts`
Expected: FAIL, "Cannot find module './relocateProject'".

- [ ] **Step 4: Implement**

`electron/ipcMainHandlers/utils/relocateProject.ts`:

```ts
import * as path from 'path';

/** settings.json keys whose file always lives in the project folder (spec §1). Order
 *  matters: the first changed key names the folder the project was moved from. */
const OWNED_KEYS: string[][] = [
  ['xsections'],
  ['piv_results'],
  ['transformation', 'matrix'],
  ['stabilization_regions_path'],
  ['camera_solution_3d'],
  ['grp_3d'],
];

/**
 * Points every project-owned path in settings.json into `projectFolder`, whatever
 * folder it was saved from. Never falls back to the stored path, so a project copied
 * elsewhere edits its own files, not the original's. Pure: returns a new object.
 */
export function relocateOwnedPaths(
  projectFolder: string,
  settings: Record<string, any>
): { settings: Record<string, any>; changed: boolean; movedFrom?: string } {
  const next = structuredClone(settings);
  let changed = false;
  let movedFrom: string | undefined;

  for (const keyPath of OWNED_KEYS) {
    const parent = keyPath.slice(0, -1).reduce<any>((obj, key) => obj?.[key], next);
    const key = keyPath[keyPath.length - 1];
    const stored = parent?.[key];
    if (typeof stored !== 'string' || stored === '') continue;

    const resolved = path.join(projectFolder, path.basename(stored));
    if (resolved !== stored) {
      parent[key] = resolved;
      changed = true;
      movedFrom ??= path.dirname(stored);
    }
  }

  return { settings: next, changed, movedFrom };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest electron/ipcMainHandlers/utils/relocateProject.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add commons/projectIssues.ts electron/ipcMainHandlers/utils/relocateProject.ts electron/ipcMainHandlers/utils/relocateProject.test.ts
git commit -m "Point project-owned paths at the opened folder"
```

---

### Task 2: Copy external files into the project without overwriting

**Files:**
- Create: `electron/ipcMainHandlers/utils/copyIntoProject.ts`
- Test: `electron/ipcMainHandlers/utils/copyIntoProject.test.ts`

**Interfaces:**
- Produces: `copyIntoProject(source: string, projectFolder: string): Promise<string>`, which returns the path inside the project.
- Produces: `resolveExternalFile(stored: string, projectFolder: string): Promise<{ status: 'inProject' | 'copied'; path: string } | { status: 'missing' }>`

- [ ] **Step 1: Write the failing test**

`electron/ipcMainHandlers/utils/copyIntoProject.test.ts` (real files in a temp dir):

```ts
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { copyIntoProject, resolveExternalFile } from './copyIntoProject';

let root: string;
let project: string;
let outside: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'river-copy-'));
  project = path.join(root, 'project');
  outside = path.join(root, 'outside');
  fs.mkdirSync(project);
  fs.mkdirSync(outside);
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('copyIntoProject', () => {
  it('copies a file from outside into the project', async () => {
    const src = path.join(outside, 'bathy.csv');
    fs.writeFileSync(src, 'station,stage\n0,1');
    const copied = await copyIntoProject(src, project);
    expect(copied).toBe(path.join(project, 'bathy.csv'));
    expect(fs.readFileSync(copied, 'utf-8')).toBe('station,stage\n0,1');
  });

  it('returns a file already inside the project untouched', async () => {
    const inside = path.join(project, 'bathy.csv');
    fs.writeFileSync(inside, 'x');
    expect(await copyIntoProject(inside, project)).toBe(inside);
  });

  it('reuses an identical copy instead of making a second one', async () => {
    const src = path.join(outside, 'bathy.csv');
    fs.writeFileSync(src, 'same');
    fs.writeFileSync(path.join(project, 'bathy.csv'), 'same');
    expect(await copyIntoProject(src, project)).toBe(path.join(project, 'bathy.csv'));
    expect(fs.readdirSync(project)).toEqual(['bathy.csv']);
  });

  it('adds a suffix when the name is taken by different content, never overwriting', async () => {
    const src = path.join(outside, 'bathy.csv');
    fs.writeFileSync(src, 'new');
    fs.writeFileSync(path.join(project, 'bathy.csv'), 'old');
    fs.writeFileSync(path.join(project, 'bathy_2.csv'), 'older');
    const copied = await copyIntoProject(src, project);
    expect(copied).toBe(path.join(project, 'bathy_3.csv'));
    expect(fs.readFileSync(path.join(project, 'bathy.csv'), 'utf-8')).toBe('old');
    expect(fs.readFileSync(path.join(project, 'bathy_2.csv'), 'utf-8')).toBe('older');
    expect(fs.readFileSync(copied, 'utf-8')).toBe('new');
  });
});

describe('resolveExternalFile', () => {
  it('prefers a file with the same name already in the project', async () => {
    fs.writeFileSync(path.join(project, 'bathy.csv'), 'in project');
    fs.writeFileSync(path.join(outside, 'bathy.csv'), 'outside');
    expect(await resolveExternalFile(path.join(outside, 'bathy.csv'), project)).toEqual({
      status: 'inProject',
      path: path.join(project, 'bathy.csv'),
    });
  });

  it('copies the stored file when the project has none', async () => {
    fs.writeFileSync(path.join(outside, 'bathy.csv'), 'outside');
    expect(await resolveExternalFile(path.join(outside, 'bathy.csv'), project)).toEqual({
      status: 'copied',
      path: path.join(project, 'bathy.csv'),
    });
  });

  it('reports missing when neither exists', async () => {
    expect(await resolveExternalFile(path.join(outside, 'gone.csv'), project)).toEqual({ status: 'missing' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest electron/ipcMainHandlers/utils/copyIntoProject.test.ts`
Expected: FAIL, "Cannot find module './copyIntoProject'".

- [ ] **Step 3: Implement**

`electron/ipcMainHandlers/utils/copyIntoProject.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';

/**
 * Copies `source` into `projectFolder` and returns the copy's path. A file already in
 * the project is returned as is; an identical file with the same name is reused; a
 * different file with the same name is never overwritten, the copy gets `_2`, `_3`, …
 */
export async function copyIntoProject(source: string, projectFolder: string): Promise<string> {
  if (path.resolve(path.dirname(source)) === path.resolve(projectFolder)) return source;

  const ext = path.extname(source);
  const stem = path.basename(source, ext);
  const content = await fs.promises.readFile(source);

  for (let n = 1; ; n++) {
    const target = path.join(projectFolder, n === 1 ? `${stem}${ext}` : `${stem}_${n}${ext}`);
    if (!fs.existsSync(target)) {
      await fs.promises.copyFile(source, target);
      return target;
    }
    if ((await fs.promises.readFile(target)).equals(content)) return target;
  }
}

/** Spec §2 resolution order: same name in the project, else copy the stored file, else missing. */
export async function resolveExternalFile(
  stored: string,
  projectFolder: string
): Promise<{ status: 'inProject' | 'copied'; path: string } | { status: 'missing' }> {
  const candidate = path.join(projectFolder, path.basename(stored));
  if (fs.existsSync(candidate)) return { status: 'inProject', path: candidate };
  if (fs.existsSync(stored)) return { status: 'copied', path: await copyIntoProject(stored, projectFolder) };
  return { status: 'missing' };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest electron/ipcMainHandlers/utils/copyIntoProject.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add electron/ipcMainHandlers/utils/copyIntoProject.ts electron/ipcMainHandlers/utils/copyIntoProject.test.ts
git commit -m "Copy external inputs into the project without overwriting"
```

---

### Task 3: Bathymetry paths in xsections.json and the video fallback

**Files:**
- Create: `electron/ipcMainHandlers/utils/resolveBathymetry.ts`
- Test: `electron/ipcMainHandlers/utils/resolveBathymetry.test.ts`
- Create: `electron/ipcMainHandlers/utils/videoFallback.ts`
- Test: `electron/ipcMainHandlers/utils/videoFallback.test.ts`

**Interfaces:**
- Consumes: `resolveExternalFile` (Task 2), `MissingInput`, `VideoSpec` (Task 1), `sanitizeNonStandardJsonTokens` (`./sanitizeJson`).
- Produces: `replaceBathPath(raw: string, oldPath: string, newPath: string): string`
- Produces: `sectionBath(raw: string, section: string): string | undefined`
- Produces: `resolveBathymetryPaths(projectFolder: string, raw: string): Promise<{ raw: string; missing: MissingInput[]; copied: string[] }>`
- Produces: `videoMetadataFromSettings(video: SettingsVideo): { width: number; height: number; fps: number; duration: string; creation: string; name: string; path: string }`, the same shape `getVideoMetadata` returns.
- Produces: `videoMismatch(expected: VideoSpec, found: VideoSpec): boolean`
- Produces: `settingsVideoSpec(video: SettingsVideo): VideoSpec`

- [ ] **Step 1: Write the failing tests**

`electron/ipcMainHandlers/utils/resolveBathymetry.test.ts`:

```ts
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { replaceBathPath, resolveBathymetryPaths, sectionBath } from './resolveBathymetry';

let root: string;
let project: string;
let outside: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'river-bath-'));
  project = path.join(root, 'project');
  outside = path.join(root, 'outside');
  fs.mkdirSync(project);
  fs.mkdirSync(outside);
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

// Python's json.dump writes bare NaN; the rewrite must keep it.
const xsections = (bathA: string, bathB: string) => `{
    "CS_default_1": {
        "bath": ${JSON.stringify(bathA)},
        "level": 1.5,
        "displacement": [NaN, 0.2]
    },
    "CS_default_2": {
        "bath": ${JSON.stringify(bathB)},
        "level": 2.0
    },
    "summary": { "total_q": NaN }
}`;

describe('replaceBathPath', () => {
  it('rewrites every section that pointed at the old file and keeps NaN tokens', () => {
    const raw = xsections('/old/bathy.csv', '/old/bathy.csv');
    const out = replaceBathPath(raw, '/old/bathy.csv', '/new/bathy.csv');
    expect(out).not.toContain('/old/bathy.csv');
    expect(out.match(/\/new\/bathy\.csv/g)).toHaveLength(2);
    expect(out).toContain('[NaN, 0.2]');
    expect(out).toContain('"total_q": NaN');
  });

  it('handles paths with escaped characters', () => {
    const raw = xsections('C:\\data\\bathy "v2".csv', '/other.csv');
    const out = replaceBathPath(raw, 'C:\\data\\bathy "v2".csv', '/new/b.csv');
    expect(sectionBath(out, 'CS_default_1')).toBe('/new/b.csv');
    expect(sectionBath(out, 'CS_default_2')).toBe('/other.csv');
  });
});

describe('resolveBathymetryPaths', () => {
  it('copies an outside CSV once, even when two sections share it', async () => {
    const shared = path.join(outside, 'bathy.csv');
    fs.writeFileSync(shared, 'station,stage\n0,1');
    const { raw, missing, copied } = await resolveBathymetryPaths(project, xsections(shared, shared));
    expect(missing).toEqual([]);
    expect(copied).toEqual([path.join(project, 'bathy.csv')]);
    expect(sectionBath(raw, 'CS_default_1')).toBe(path.join(project, 'bathy.csv'));
    expect(sectionBath(raw, 'CS_default_2')).toBe(path.join(project, 'bathy.csv'));
    expect(fs.readdirSync(project)).toEqual(['bathy.csv']);
  });

  it('uses the project copy of a moved project without copying', async () => {
    fs.writeFileSync(path.join(project, 'bathy_modified.csv'), 'x');
    const { raw, copied } = await resolveBathymetryPaths(
      project,
      xsections('/gone/old-project/bathy_modified.csv', '/gone/old-project/bathy_modified.csv')
    );
    expect(copied).toEqual([]);
    expect(sectionBath(raw, 'CS_default_1')).toBe(path.join(project, 'bathy_modified.csv'));
  });

  it('reports each section whose bathymetry is nowhere, and leaves its path alone', async () => {
    const gone = '/gone/bathy.csv';
    const original = xsections(gone, gone);
    const { raw, missing } = await resolveBathymetryPaths(project, original);
    expect(missing).toEqual([
      { kind: 'bathymetry', section: 'CS_default_1', path: gone },
      { kind: 'bathymetry', section: 'CS_default_2', path: gone },
    ]);
    expect(raw).toBe(original);
  });

  it('returns the text unchanged when nothing needs fixing', async () => {
    const inside = path.join(project, 'bathy.csv');
    fs.writeFileSync(inside, 'x');
    const original = xsections(inside, inside);
    expect((await resolveBathymetryPaths(project, original)).raw).toBe(original);
  });
});
```

`electron/ipcMainHandlers/utils/videoFallback.test.ts`:

```ts
import { settingsVideoSpec, videoMetadataFromSettings, videoMismatch } from './videoFallback';

const settingsVideo = {
  filepath: '/Users/a/Dropbox/Video_4/DJI_0083.MP4',
  name: 'DJI_0083.MP4',
  total_length: 21.5215,
  time_between_frames: 0.03,
  fps: 30,
  resolution: { width: 4096, height: 2160 },
};

describe('videoMetadataFromSettings', () => {
  it('builds the same shape getVideoMetadata returns, from settings.video', () => {
    expect(videoMetadataFromSettings(settingsVideo)).toEqual({
      width: 4096,
      height: 2160,
      fps: 30,
      duration: '21.5215',
      creation: '',
      name: 'DJI_0083.MP4',
      path: '/Users/a/Dropbox/Video_4/DJI_0083.MP4',
    });
  });
});

describe('videoMismatch', () => {
  const expected = settingsVideoSpec(settingsVideo);

  it('accepts the same resolution and fps', () => {
    expect(videoMismatch(expected, { width: 4096, height: 2160, fps: 30 })).toBe(false);
  });

  it('compares fps after rounding (29.97 vs 30)', () => {
    expect(videoMismatch({ width: 1920, height: 1080, fps: 29.97 }, { width: 1920, height: 1080, fps: 30 })).toBe(
      false
    );
  });

  it('refuses another resolution', () => {
    expect(videoMismatch(expected, { width: 1920, height: 1080, fps: 30 })).toBe(true);
  });

  it('refuses another fps', () => {
    expect(videoMismatch(expected, { width: 4096, height: 2160, fps: 25 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest electron/ipcMainHandlers/utils/resolveBathymetry.test.ts electron/ipcMainHandlers/utils/videoFallback.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`electron/ipcMainHandlers/utils/resolveBathymetry.ts`:

```ts
import { MissingInput } from '../../../commons/projectIssues';
import { resolveExternalFile } from './copyIntoProject';
import { sanitizeNonStandardJsonTokens } from './sanitizeJson';

// A "bath" key and its JSON string value. Rewriting only these tokens keeps the rest
// of xsections.json byte-for-byte, including the bare NaN tokens Python writes.
const BATH_TOKEN = /("bath"\s*:\s*)("(?:[^"\\]|\\.)*")/g;

/** Replaces every `bath` value equal to `oldPath` with `newPath`, in place in the raw text. */
export function replaceBathPath(raw: string, oldPath: string, newPath: string): string {
  return raw.replace(BATH_TOKEN, (match, prefix: string, token: string) =>
    JSON.parse(token) === oldPath ? prefix + JSON.stringify(newPath) : match
  );
}

/** The `bath` value of one section, or undefined. */
export function sectionBath(raw: string, section: string): string | undefined {
  const bath = JSON.parse(sanitizeNonStandardJsonTokens(raw))?.[section]?.bath;
  return typeof bath === 'string' ? bath : undefined;
}

/**
 * Spec §2: every section's bathymetry ends up inside the project folder when it can
 * be found (same name in the project, else copied from the stored path). Sections
 * whose file is nowhere are reported and keep their stored path.
 */
export async function resolveBathymetryPaths(
  projectFolder: string,
  raw: string
): Promise<{ raw: string; missing: MissingInput[]; copied: string[] }> {
  const parsed = JSON.parse(sanitizeNonStandardJsonTokens(raw)) as Record<string, { bath?: unknown }>;
  const seen = new Map<string, Awaited<ReturnType<typeof resolveExternalFile>>>();
  const missing: MissingInput[] = [];
  const copied: string[] = [];
  let next = raw;

  for (const [section, value] of Object.entries(parsed)) {
    if (section === 'summary') continue;
    const bath = value?.bath;
    if (typeof bath !== 'string' || bath === '') continue;

    let resolved = seen.get(bath);
    if (resolved === undefined) {
      resolved = await resolveExternalFile(bath, projectFolder);
      seen.set(bath, resolved);
      if (resolved.status === 'copied') copied.push(resolved.path);
      if (resolved.status !== 'missing' && resolved.path !== bath) next = replaceBathPath(next, bath, resolved.path);
    }
    if (resolved.status === 'missing') missing.push({ kind: 'bathymetry', section, path: bath });
  }

  return { raw: next, missing, copied };
}
```

`electron/ipcMainHandlers/utils/videoFallback.ts`:

```ts
import * as path from 'path';
import { VideoSpec } from '../../../commons/projectIssues';

/** The `video` block createFolderStructure writes into settings.json. */
export interface SettingsVideo {
  filepath?: string;
  name?: string;
  total_length?: number;
  fps?: number;
  resolution?: { width?: number; height?: number };
}

/** Spec §3: stands in for ffprobe when the video file is gone. Same shape as getVideoMetadata. */
export function videoMetadataFromSettings(video: SettingsVideo) {
  const filepath = video.filepath ?? '';
  return {
    width: video.resolution?.width ?? 0,
    height: video.resolution?.height ?? 0,
    fps: video.fps ?? 0,
    duration: String(video.total_length ?? 0),
    creation: '',
    name: video.name ?? path.basename(filepath),
    path: filepath,
  };
}

export function settingsVideoSpec(video: SettingsVideo): VideoSpec {
  return { width: video.resolution?.width ?? 0, height: video.resolution?.height ?? 0, fps: video.fps ?? 0 };
}

/** Frames, matrix and masks depend on these, so a located video must match them. */
export function videoMismatch(expected: VideoSpec, found: VideoSpec): boolean {
  return (
    expected.width !== found.width ||
    expected.height !== found.height ||
    Math.round(expected.fps) !== Math.round(found.fps)
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest electron/ipcMainHandlers/utils/resolveBathymetry.test.ts electron/ipcMainHandlers/utils/videoFallback.test.ts`
Expected: PASS (6 + 5 tests).

- [ ] **Step 5: Commit**

```bash
git add electron/ipcMainHandlers/utils/resolveBathymetry.ts electron/ipcMainHandlers/utils/resolveBathymetry.test.ts electron/ipcMainHandlers/utils/videoFallback.ts electron/ipcMainHandlers/utils/videoFallback.test.ts
git commit -m "Resolve bathymetry paths in place and build video metadata from settings"
```

---

### Task 4: prepareProject, wired into load-project

**Files:**
- Create: `electron/ipcMainHandlers/utils/prepareProject.ts`
- Test: `electron/ipcMainHandlers/utils/prepareProject.test.ts`
- Modify: `electron/ipcMainHandlers/loadProject.ts`

**Interfaces:**
- Consumes: `relocateOwnedPaths` (Task 1), `resolveBathymetryPaths` (Task 3), `ProjectIssues`, `MissingInput` (Task 1).
- Produces: `prepareProject(projectFolder: string): Promise<{ settings: Record<string, any> } & ProjectIssues>`
- Produces: the `load-project` result `message` gains `videoMissing: boolean` and `missingInputs: MissingInput[]`.

- [ ] **Step 1: Write the failing test**

`electron/ipcMainHandlers/utils/prepareProject.test.ts`:

```ts
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { prepareProject } from './prepareProject';

let root: string;
let oldFolder: string;
let project: string;
let outside: string;

const write = (file: string, content: string) => fs.writeFileSync(file, content);

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'river-prepare-'));
  oldFolder = path.join(root, 'river', 'DJI_0083', '20261006T1837'); // never created: the project was moved
  project = path.join(root, 'cases', 'DJI_0083', '20261006T1837');
  outside = path.join(root, 'videos');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(outside);

  write(path.join(outside, 'DJI_0083.MP4'), 'video');
  write(path.join(outside, 'bathy.csv'), 'station,stage\n0,1');
  write(
    path.join(project, 'xsections.json'),
    `{"CS_default_1": {"bath": ${JSON.stringify(path.join(outside, 'bathy.csv'))}, "q": NaN}}`
  );
  write(
    path.join(project, 'settings.json'),
    JSON.stringify(
      {
        video: { filepath: path.join(outside, 'DJI_0083.MP4'), name: 'DJI_0083.MP4', fps: 30 },
        xsections: path.join(oldFolder, 'xsections.json'),
        piv_results: path.join(oldFolder, 'piv_results.json'),
      },
      null,
      4
    )
  );
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const settingsOnDisk = () => JSON.parse(fs.readFileSync(path.join(project, 'settings.json'), 'utf-8'));
const logOnDisk = () =>
  fs.existsSync(path.join(project, 'river.log')) ? fs.readFileSync(path.join(project, 'river.log'), 'utf-8') : '';

describe('prepareProject', () => {
  it('fixes a moved project, copies its bathymetry and logs it once', async () => {
    const result = await prepareProject(project);

    expect(result.settings.xsections).toBe(path.join(project, 'xsections.json'));
    expect(settingsOnDisk().xsections).toBe(path.join(project, 'xsections.json'));
    expect(fs.existsSync(path.join(project, 'bathy.csv'))).toBe(true);
    const xs = fs.readFileSync(path.join(project, 'xsections.json'), 'utf-8');
    expect(xs).toContain(JSON.stringify(path.join(project, 'bathy.csv')));
    expect(xs).toContain('"q": NaN');
    expect(result.videoMissing).toBe(false);
    expect(result.missingInputs).toEqual([]);
    expect(logOnDisk()).toContain(`project moved from ${oldFolder} to ${project}`);
  });

  it('writes, copies and logs nothing the second time', async () => {
    await prepareProject(project);
    const settingsBefore = fs.readFileSync(path.join(project, 'settings.json'), 'utf-8');
    const logBefore = logOnDisk();

    await prepareProject(project);

    expect(fs.readFileSync(path.join(project, 'settings.json'), 'utf-8')).toBe(settingsBefore);
    expect(logOnDisk()).toBe(logBefore);
    expect(fs.readdirSync(project).filter((f) => f.startsWith('bathy'))).toEqual(['bathy.csv']);
  });

  it('reports a missing video, bathymetry and image folder without failing', async () => {
    fs.rmSync(path.join(outside, 'DJI_0083.MP4'));
    fs.rmSync(path.join(outside, 'bathy.csv'));
    const settings = settingsOnDisk();
    settings.rectification_3d_images = path.join(root, 'gone-images');
    write(path.join(project, 'settings.json'), JSON.stringify(settings, null, 4));

    const result = await prepareProject(project);

    expect(result.videoMissing).toBe(true);
    expect(result.missingInputs).toEqual([
      { kind: 'bathymetry', section: 'CS_default_1', path: path.join(outside, 'bathy.csv') },
      { kind: 'ipcamImages', path: path.join(root, 'gone-images') },
    ]);
  });

  it('leaves settings.json untouched and writes no log for a project that never moved', async () => {
    const settings = settingsOnDisk();
    settings.xsections = path.join(project, 'xsections.json');
    settings.piv_results = path.join(project, 'piv_results.json');
    write(path.join(project, 'settings.json'), JSON.stringify(settings, null, 4));
    write(path.join(project, 'bathy.csv'), 'station,stage\n0,1');
    write(
      path.join(project, 'xsections.json'),
      `{"CS_default_1": {"bath": ${JSON.stringify(path.join(project, 'bathy.csv'))}}}`
    );
    const before = fs.readFileSync(path.join(project, 'settings.json'), 'utf-8');

    await prepareProject(project);

    expect(fs.readFileSync(path.join(project, 'settings.json'), 'utf-8')).toBe(before);
    expect(logOnDisk()).toBe('');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest electron/ipcMainHandlers/utils/prepareProject.test.ts`
Expected: FAIL, "Cannot find module './prepareProject'".

- [ ] **Step 3: Implement**

`electron/ipcMainHandlers/utils/prepareProject.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { MissingInput, ProjectIssues } from '../../../commons/projectIssues';
import { relocateOwnedPaths } from './relocateProject';
import { resolveBathymetryPaths } from './resolveBathymetry';

/**
 * Runs first on load-project (spec §1–§3): points project-owned paths at the opened
 * folder, brings bathymetry CSVs into it, and reports what is still missing. Writes
 * settings.json / xsections.json only when something changed, and logs it once in
 * river.log, in the same JSON-block shape executeRiverCli appends.
 */
export async function prepareProject(projectFolder: string): Promise<{ settings: Record<string, any> } & ProjectIssues> {
  const settingsPath = path.join(projectFolder, 'settings.json');
  const stored = JSON.parse(await fs.promises.readFile(settingsPath, 'utf-8'));
  const { settings, changed, movedFrom } = relocateOwnedPaths(projectFolder, stored);

  const missingInputs: MissingInput[] = [];
  let copied: string[] = [];

  if (typeof settings.xsections === 'string' && fs.existsSync(settings.xsections)) {
    const raw = await fs.promises.readFile(settings.xsections, 'utf-8');
    const resolved = await resolveBathymetryPaths(projectFolder, raw);
    missingInputs.push(...resolved.missing);
    copied = resolved.copied;
    if (resolved.raw !== raw) await fs.promises.writeFile(settings.xsections, resolved.raw, 'utf-8');
  }

  const images = settings.rectification_3d_images;
  if (typeof images === 'string' && images !== '' && !fs.existsSync(images)) {
    missingInputs.push({ kind: 'ipcamImages', path: images });
  }

  if (changed) await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 4), 'utf-8');

  if (changed || copied.length > 0) {
    const notes = [
      changed ? `project moved from ${movedFrom} to ${projectFolder}` : undefined,
      copied.length > 0 ? `copied into the project: ${copied.join(', ')}` : undefined,
    ].filter(Boolean);
    const entry = { options: ['relocate-project'], output: notes.join('; '), error: '' };
    await fs.promises.appendFile(path.join(projectFolder, 'river.log'), JSON.stringify(entry, null, 4) + '\n', 'utf-8');
  }

  const videoPath = settings.video?.filepath;
  const videoMissing = typeof videoPath !== 'string' || videoPath === '' || !fs.existsSync(videoPath);

  return { settings, videoMissing, missingInputs };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest electron/ipcMainHandlers/utils/prepareProject.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire it into `loadProject.ts`**

In `electron/ipcMainHandlers/loadProject.ts`:

1. Imports: add
   ```ts
   import { prepareProject } from './utils/prepareProject';
   import { videoMetadataFromSettings } from './utils/videoFallback';
   ```
   and delete the `loadSettings` function (lines 15–19), which nothing else uses.
2. `loadRectification3D`: a missing folder must not fail the load. Replace `if (rectificationPath) {` with `if (rectificationPath && fs.existsSync(rectificationPath)) {`.
3. In `handleLoadProject`, replace
   ```ts
   const settingsParsed = await loadSettings(settingsPath);
   ```
   with
   ```ts
   // Fix a moved project and bring its bathymetry in before anything reads a path.
   const { settings: settingsParsed, videoMissing, missingInputs } = await prepareProject(folderPath);
   ```
4. Replace
   ```ts
   const videoMetadata = await getVideoMetadata(settingsParsed.video.filepath);
   ```
   with
   ```ts
   // A missing video no longer fails the load: the extracted frames are enough for
   // everything except playback and re-extraction (spec §3).
   const videoMetadata = videoMissing
     ? videoMetadataFromSettings(settingsParsed.video)
     : await getVideoMetadata(settingsParsed.video.filepath);
   ```
5. In the returned `message`, add `videoMissing,` and `missingInputs,` after `videoMetadata,`.

`populateProjectConfig` needs no change: it already receives the corrected `settingsParsed`, so `PROJECT_CONFIG.xsectionsPath` is the opened folder's file.

- [ ] **Step 6: Run the electron tests and the type check**

Run: `npx jest electron && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: all tests PASS; error count equal to the Step 0 baseline of Task 1.

- [ ] **Step 7: Commit**

```bash
git add electron/ipcMainHandlers/utils/prepareProject.ts electron/ipcMainHandlers/utils/prepareProject.test.ts electron/ipcMainHandlers/loadProject.ts
git commit -m "Open moved projects and projects whose video is missing"
```

---

### Task 5: Bathymetry import always copies; locate-bathymetry

**Files:**
- Modify: `electron/ipcMainHandlers/getBathimetry.ts`
- Modify: `electron/ipcMainHandlers/getBathimetry.test.ts`
- Create: `electron/ipcMainHandlers/locateBathymetry.ts`
- Test: `electron/ipcMainHandlers/locateBathymetry.test.ts`
- Modify: `electron/ipcMainHandlers/index.ts`, `electron/main.ts`

**Interfaces:**
- Consumes: `copyIntoProject` (Task 2), `replaceBathPath`, `sectionBath` (Task 3).
- Produces: `importBathymetry(bathPath: string, options: { zLimits?: { min: number; max: number }; unitSistem?: string }): Promise<{ path: string; name: string; line: { x: number; y: number }[]; changed: boolean }>`, exported from `getBathimetry.ts`. It throws on a bad file.
- Produces: IPC `locate-bathymetry`, args `{ section: string; zLimits?: { min: number; max: number }; unitSistem?: string }`, result
  `{ status: 'ok'; path: string; name: string; line: {x,y}[]; replaced: string } | { status: 'canceled' } | { status: 'error'; message: string }`.
  `replaced` is the old `bath` value. Every section that pointed at it now points at `path`.

- [ ] **Step 1: Update the get-bathimetry tests (failing)**

In `electron/ipcMainHandlers/getBathimetry.test.ts`:

1. Next to the other `jest.mock` calls at the top, add:
   ```ts
   jest.mock('./utils/copyIntoProject', () => ({
     copyIntoProject: jest.fn(async (source: string, folder: string) => `${folder}/${source.split('/').pop()}`),
   }));
   ```
   and import it after the other imports: `import { copyIntoProject } from './utils/copyIntoProject';`
2. Replace the test `'does not rewrite an already-clean CSV that needs no changes'` with:
   ```ts
   it('copies an already-clean CSV into the project instead of rewriting it', async () => {
     // Must carry a header row: the Python backend always skips the first row.
     (fs.readFileSync as jest.Mock).mockReturnValue('station,stage\n0,10\n5,4\n10,1\n15,4\n20,10');
     (copyIntoProject as jest.Mock).mockClear();

     const response = await trigger({ path: 'valid.csv', unitSistem: 'metric' });

     expect(response.error).toBeUndefined();
     expect(response.changed).toBe(false);
     expect(fs.promises.writeFile).not.toHaveBeenCalled();
     expect(copyIntoProject).toHaveBeenCalledWith('valid.csv', '/default/path');
     expect(response.path).toBe('/default/path/valid.csv');
   });
   ```

Run: `npx jest electron/ipcMainHandlers/getBathimetry.test.ts`
Expected: FAIL on the new test (`response.path` is `'valid.csv'`).

- [ ] **Step 2: Extract `importBathymetry` and copy clean files**

In `electron/ipcMainHandlers/getBathimetry.ts`:

1. Add `import { copyIntoProject } from './utils/copyIntoProject';`.
2. Move everything inside the handler's `try`, from `// Get the name of the bathymetry file and extension` down to the `return { path: newFilePath, … }`, into a new exported function placed above `getBathimetry`:
   ```ts
   /**
    * Reads, normalizes and stores a bathymetry file for the open project. Throws on a
    * bad file. Shared by get-bathimetry and locate-bathymetry.
    */
   async function importBathymetry(
     bathPath: string,
     { zLimits, unitSistem }: { zLimits?: { min: number; max: number }; unitSistem?: string }
   ) {
     const FT_TO_M = 0.3048;
     const isImperial = unitSistem === 'imperial';
     // …moved body, unchanged except the block below…
   }
   ```
   (`FT_TO_M` and `isImperial` move from the handler into this function.)
3. In the moved body, after the `if (changed || needsNormalization || … ) { … }` block, add an `else` branch:
   ```ts
   } else {
     // From 3.8 every bathymetry lives in the project, so moving the folder keeps it (spec §2).
     newFilePath = await copyIntoProject(bathPath, PROJECT_CONFIG.projectDirectory);
   }
   ```
4. The handler's `try` becomes:
   ```ts
   try {
     let bathPath: string = path;
     if (bathPath === undefined) {
       const result = await dialog.showOpenDialog(options);
       bathPath = result.filePaths[0];
       if (bathPath === undefined) {
         return { path: '' };
       }
     }
     return await importBathymetry(bathPath, { zLimits, unitSistem });
   } catch (error) {
     console.log(error);
     return { error };
   }
   ```
   and the destructuring at the top of the handler becomes `const { path, zLimits, unitSistem } = args;`.
5. Export it: `export { getBathimetry, importBathymetry, analyzeLine, transformLine };`

Run: `npx jest electron/ipcMainHandlers/getBathimetry.test.ts`
Expected: PASS (all tests, including the untouched header-row and ODS tests).

- [ ] **Step 3: Write the failing locate-bathymetry test**

`electron/ipcMainHandlers/locateBathymetry.test.ts`:

```ts
const mockHandlers: Record<string, (...args: any[]) => any> = {};
const mockShowOpenDialog = jest.fn();

jest.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: any[]) => any) => (mockHandlers[channel] = fn) },
  dialog: { showOpenDialog: (...args: any[]) => mockShowOpenDialog(...args) },
}));

const mockImport = jest.fn();
jest.mock('./getBathimetry', () => ({ importBathymetry: (...args: any[]) => mockImport(...args) }));

jest.mock('./utils/validateFile', () => ({ EXTENSIONS: ['csv'] }));

const mockConfig = { projectDirectory: '', xsectionsPath: '' };
jest.mock('../main', () => ({ PROJECT_CONFIG: mockConfig }));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { locateBathymetry } from './locateBathymetry';

let project: string;

beforeAll(() => locateBathymetry());

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'river-locate-bath-'));
  mockConfig.projectDirectory = project;
  mockConfig.xsectionsPath = path.join(project, 'xsections.json');
  fs.writeFileSync(
    mockConfig.xsectionsPath,
    '{"CS_default_1": {"bath": "/gone/bathy.csv", "q": NaN}, "CS_default_2": {"bath": "/gone/bathy.csv"}}'
  );
  mockShowOpenDialog.mockReset();
  mockImport.mockReset();
});

afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

const locate = (args: object) => mockHandlers['locate-bathymetry']({}, args);
const xsections = () => fs.readFileSync(mockConfig.xsectionsPath, 'utf-8');

describe('locate-bathymetry', () => {
  it('imports the picked file and points every section that shared the old one at it', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/new/place/bathy.csv'] });
    const newPath = path.join(project, 'bathy.csv');
    mockImport.mockResolvedValue({ path: newPath, name: 'bathy.csv', line: [{ x: 0, y: 1 }], changed: false });

    const result = await locate({ section: 'CS_default_1', unitSistem: 'si' });

    expect(mockImport).toHaveBeenCalledWith('/new/place/bathy.csv', { zLimits: undefined, unitSistem: 'si' });
    expect(result).toEqual({
      status: 'ok',
      path: newPath,
      name: 'bathy.csv',
      line: [{ x: 0, y: 1 }],
      replaced: '/gone/bathy.csv',
    });
    expect(xsections()).not.toContain('/gone/bathy.csv');
    expect(xsections()).toContain('"q": NaN');
  });

  it('changes nothing when the picker is canceled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    const before = xsections();
    expect(await locate({ section: 'CS_default_1' })).toEqual({ status: 'canceled' });
    expect(mockImport).not.toHaveBeenCalled();
    expect(xsections()).toBe(before);
  });

  it('returns the import error and changes nothing', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/bad.csv'] });
    mockImport.mockRejectedValue(new Error('invalidBathimetryFileFormat'));
    const before = xsections();
    expect(await locate({ section: 'CS_default_1' })).toEqual({
      status: 'error',
      message: 'invalidBathimetryFileFormat',
    });
    expect(xsections()).toBe(before);
  });
});
```

Run: `npx jest electron/ipcMainHandlers/locateBathymetry.test.ts`
Expected: FAIL, "Cannot find module './locateBathymetry'".

- [ ] **Step 4: Implement the handler**

`electron/ipcMainHandlers/locateBathymetry.ts`:

```ts
import { dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import { PROJECT_CONFIG } from '../main';
import { importBathymetry } from './getBathimetry';
import { EXTENSIONS } from './utils/validateFile';
import { replaceBathPath, sectionBath } from './utils/resolveBathymetry';

interface LocateBathymetryArgs {
  section: string;
  zLimits?: { min: number; max: number };
  unitSistem?: string;
}

/**
 * Locate… on a missing-bathymetry card (spec §4): pick a file, import it like
 * get-bathimetry (normalized, copied into the project), and point every section that
 * used the missing file at the new one in xsections.json.
 */
function locateBathymetry() {
  ipcMain.handle('locate-bathymetry', async (_event, args: LocateBathymetryArgs) => {
    const { section, zLimits, unitSistem } = args;
    const picked = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Documents', extensions: EXTENSIONS }],
      defaultPath: PROJECT_CONFIG.projectDirectory,
    });
    const filePath = picked.filePaths[0];
    if (picked.canceled || filePath === undefined) return { status: 'canceled' };

    try {
      const raw = await fs.promises.readFile(PROJECT_CONFIG.xsectionsPath, 'utf-8');
      const replaced = sectionBath(raw, section);
      if (replaced === undefined) throw new Error('sectionNotFound');

      const imported = await importBathymetry(filePath, { zLimits, unitSistem });
      await fs.promises.writeFile(
        PROJECT_CONFIG.xsectionsPath,
        replaceBathPath(raw, replaced, imported.path),
        'utf-8'
      );
      return { status: 'ok', path: imported.path, name: imported.name, line: imported.line, replaced };
    } catch (error) {
      return { status: 'error', message: (error as Error).message };
    }
  });
}

export { locateBathymetry };
```

Register it: in `electron/ipcMainHandlers/index.ts` add `import { locateBathymetry } from './locateBathymetry';` and `locateBathymetry,` to the export list (alphabetical, after `loadResults`). In `electron/main.ts`, import `locateBathymetry` from `./ipcMainHandlers` where the other handlers are imported, and call `locateBathymetry();` on the line after `getBathimetry();`.

- [ ] **Step 5: Run the tests**

Run: `npx jest electron/ipcMainHandlers/getBathimetry.test.ts electron/ipcMainHandlers/locateBathymetry.test.ts && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: PASS; error count at baseline.

- [ ] **Step 6: Commit**

```bash
git add electron/ipcMainHandlers/getBathimetry.ts electron/ipcMainHandlers/getBathimetry.test.ts electron/ipcMainHandlers/locateBathymetry.ts electron/ipcMainHandlers/locateBathymetry.test.ts electron/ipcMainHandlers/index.ts electron/main.ts
git commit -m "Keep every imported bathymetry in the project and add locate-bathymetry"
```

---

### Task 6: locate-video

**Files:**
- Create: `electron/ipcMainHandlers/locateVideo.ts`
- Test: `electron/ipcMainHandlers/locateVideo.test.ts`
- Modify: `electron/ipcMainHandlers/index.ts`, `electron/main.ts`

**Interfaces:**
- Consumes: `getVideoMetadata` (`./utils/getVideoMetadata`), `settingsVideoSpec`, `videoMismatch` (Task 3).
- Produces: IPC `locate-video`, no args, result
  `{ status: 'ok'; metadata: { width; height; fps; duration: string; creation: string; name: string; path: string } } | { status: 'mismatch'; expected: VideoSpec; found: VideoSpec } | { status: 'canceled' }`.

- [ ] **Step 1: Write the failing test**

`electron/ipcMainHandlers/locateVideo.test.ts`:

```ts
const mockHandlers: Record<string, (...args: any[]) => any> = {};
const mockShowOpenDialog = jest.fn();
const mockGetVideoMetadata = jest.fn();

jest.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: any[]) => any) => (mockHandlers[channel] = fn) },
  dialog: { showOpenDialog: (...args: any[]) => mockShowOpenDialog(...args) },
}));
jest.mock('./utils/getVideoMetadata', () => ({ getVideoMetadata: (p: string) => mockGetVideoMetadata(p) }));

const mockConfig = { settingsPath: '', videoPath: '', defaultFilesPath: '' };
jest.mock('../main', () => ({ PROJECT_CONFIG: mockConfig }));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { locateVideo } from './locateVideo';

let project: string;

beforeAll(() => locateVideo());

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'river-locate-video-'));
  mockConfig.settingsPath = path.join(project, 'settings.json');
  mockConfig.videoPath = '/gone/DJI_0083.MP4';
  fs.writeFileSync(
    mockConfig.settingsPath,
    JSON.stringify({ video: { filepath: '/gone/DJI_0083.MP4', fps: 30, resolution: { width: 4096, height: 2160 } } })
  );
  mockShowOpenDialog.mockReset();
  mockGetVideoMetadata.mockReset();
});

afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

const settings = () => JSON.parse(fs.readFileSync(mockConfig.settingsPath, 'utf-8'));
const meta = (width: number, height: number, fps: number) => ({
  width,
  height,
  fps,
  duration: '21.5',
  creation: '',
  name: 'DJI_0083.MP4',
  path: '/found/DJI_0083.MP4',
});

describe('locate-video', () => {
  it('accepts a video with the same resolution and fps and saves its path', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/found/DJI_0083.MP4'] });
    mockGetVideoMetadata.mockResolvedValue(meta(4096, 2160, 30));

    const result = await mockHandlers['locate-video']({});

    expect(result).toEqual({ status: 'ok', metadata: meta(4096, 2160, 30) });
    expect(settings().video.filepath).toBe('/found/DJI_0083.MP4');
    expect(mockConfig.videoPath).toBe('/found/DJI_0083.MP4');
    expect(mockConfig.defaultFilesPath).toBe('/found');
  });

  it('refuses a different video and changes nothing', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/found/other.MP4'] });
    mockGetVideoMetadata.mockResolvedValue(meta(1920, 1080, 25));

    const result = await mockHandlers['locate-video']({});

    expect(result).toEqual({
      status: 'mismatch',
      expected: { width: 4096, height: 2160, fps: 30 },
      found: { width: 1920, height: 1080, fps: 25 },
    });
    expect(settings().video.filepath).toBe('/gone/DJI_0083.MP4');
    expect(mockConfig.videoPath).toBe('/gone/DJI_0083.MP4');
  });

  it('changes nothing when the picker is canceled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    expect(await mockHandlers['locate-video']({})).toEqual({ status: 'canceled' });
    expect(mockGetVideoMetadata).not.toHaveBeenCalled();
  });
});
```

Run: `npx jest electron/ipcMainHandlers/locateVideo.test.ts`
Expected: FAIL, "Cannot find module './locateVideo'".

- [ ] **Step 2: Implement**

`electron/ipcMainHandlers/locateVideo.ts`:

```ts
import { dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';
import { getVideoMetadata } from './utils/getVideoMetadata';
import { settingsVideoSpec, videoMismatch } from './utils/videoFallback';

/**
 * Locate… on the missing-video card (spec §3). Only a video with the project's
 * resolution and fps is accepted: frames, matrix and masks all depend on them.
 */
function locateVideo() {
  ipcMain.handle('locate-video', async () => {
    const picked = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
      defaultPath: PROJECT_CONFIG.defaultFilesPath,
    });
    const filePath = picked.filePaths[0];
    if (picked.canceled || filePath === undefined) return { status: 'canceled' };

    const settings = JSON.parse(await fs.promises.readFile(PROJECT_CONFIG.settingsPath, 'utf-8'));
    const metadata = await getVideoMetadata(filePath);
    const expected = settingsVideoSpec(settings.video);
    const found = { width: metadata.width, height: metadata.height, fps: metadata.fps };
    if (videoMismatch(expected, found)) return { status: 'mismatch', expected, found };

    settings.video.filepath = metadata.path;
    await fs.promises.writeFile(PROJECT_CONFIG.settingsPath, JSON.stringify(settings, null, 4), 'utf-8');
    PROJECT_CONFIG.videoPath = metadata.path;
    PROJECT_CONFIG.defaultFilesPath = path.dirname(metadata.path);
    return { status: 'ok', metadata };
  });
}

export { locateVideo };
```

Register it like Task 5: export from `electron/ipcMainHandlers/index.ts` (after `locateBathymetry`), and in `electron/main.ts` import it and call `locateVideo();` right after `locateBathymetry();`.

- [ ] **Step 3: Run the tests**

Run: `npx jest electron/ipcMainHandlers/locateVideo.test.ts && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: PASS (3 tests); error count at baseline.

- [ ] **Step 4: Commit**

```bash
git add electron/ipcMainHandlers/locateVideo.ts electron/ipcMainHandlers/locateVideo.test.ts electron/ipcMainHandlers/index.ts electron/main.ts
git commit -m "Add locate-video, refusing a video that does not match the project"
```

---

### Task 7: Project issues in the store, and the load flow

**Files:**
- Modify: `src/store/project/types.ts`, `src/store/project/projectSlice.ts`
- Modify: `src/store/project/projectSlice.test.ts`
- Create: `src/helpers/locatedBathymetry.ts`
- Test: `src/helpers/locatedBathymetry.test.ts`
- Modify: `src/hooks/useProjectSlice.ts`
- Modify: `src/helpers/loadProjectHelpers.ts` (`onLoadCrossSections`)

**Interfaces:**
- Consumes: `MissingInput`, `ProjectIssues`, `VideoSpec` (`commons/projectIssues.ts`); the `load-project` fields `videoMissing`, `missingInputs` (Task 4).
- Produces (project slice):
  - `ProjectState.issues: ProjectIssuesState`, where `ProjectIssuesState = ProjectIssues & { videoMismatch: { expected: VideoSpec; found: VideoSpec } | null }`.
  - Actions: `setProjectIssues(ProjectIssues)`, `setVideoMismatch({ expected, found } | null)`, `resolveVideoMissing()`, `resolveBathymetry(oldPath: string)`, `resolveIpcamImages()`.
  - `useProjectSlice()` returns `issues`.
- Produces (`src/helpers/locatedBathymetry.ts`):
  - `loadedBathymetry(response: unknown, bath: string): { line: Point[]; name: string }`
  - `applyLocatedBathymetry(previous: Bathimetry, located: { path: string; name: string; line: Point[] }): { bathimetry: Bathimetry } | { error: { message: string; value?: number } }`
  - `hasMissingBathymetry(issues: ProjectIssues): boolean`

- [ ] **Step 1: Write the failing tests**

Append to `src/store/project/projectSlice.test.ts` (and add `issues: { videoMissing: false, missingInputs: [], videoMismatch: null },` to `baseState` right before `...overrides`):

```ts
import {
  setProjectIssues,
  setVideoMismatch,
  resolveVideoMissing,
  resolveBathymetry,
  resolveIpcamImages,
} from './projectSlice';

describe('project issues', () => {
  const issues = {
    videoMissing: true,
    missingInputs: [
      { kind: 'bathymetry' as const, section: 'CS_default_1', path: '/gone/bathy.csv' },
      { kind: 'bathymetry' as const, section: 'CS_default_2', path: '/gone/bathy.csv' },
      { kind: 'bathymetry' as const, section: 'CS_default_3', path: '/gone/other.csv' },
      { kind: 'ipcamImages' as const, path: '/gone/images' },
    ],
  };

  it('stores what load-project reported and clears an old mismatch', () => {
    const withMismatch = baseState({
      issues: {
        videoMissing: true,
        missingInputs: [],
        videoMismatch: { expected: { width: 1, height: 1, fps: 1 }, found: { width: 2, height: 2, fps: 2 } },
      },
    });
    const state = reducer(withMismatch, setProjectIssues(issues));
    expect(state.issues).toEqual({ ...issues, videoMismatch: null });
  });

  it('clears the video issue and its mismatch once located', () => {
    let state = reducer(baseState(), setProjectIssues(issues));
    state = reducer(
      state,
      setVideoMismatch({ expected: { width: 4096, height: 2160, fps: 30 }, found: { width: 1920, height: 1080, fps: 25 } })
    );
    state = reducer(state, resolveVideoMissing());
    expect(state.issues.videoMissing).toBe(false);
    expect(state.issues.videoMismatch).toBeNull();
  });

  it('clears every section that shared the located bathymetry, and only those', () => {
    const state = reducer(reducer(baseState(), setProjectIssues(issues)), resolveBathymetry('/gone/bathy.csv'));
    expect(state.issues.missingInputs).toEqual([
      { kind: 'bathymetry', section: 'CS_default_3', path: '/gone/other.csv' },
      { kind: 'ipcamImages', path: '/gone/images' },
    ]);
  });

  it('clears the image-folder issue', () => {
    const state = reducer(reducer(baseState(), setProjectIssues(issues)), resolveIpcamImages());
    expect(state.issues.missingInputs.some((input) => input.kind === 'ipcamImages')).toBe(false);
  });

  it('starts with no issues after setDefaultProjectState', () => {
    const state = reducer(reducer(baseState(), setProjectIssues(issues)), setDefaultProjectState());
    expect(state.issues).toEqual({ videoMissing: false, missingInputs: [], videoMismatch: null });
  });
});
```

`src/helpers/locatedBathymetry.test.ts`:

```ts
import { applyLocatedBathymetry, hasMissingBathymetry, loadedBathymetry } from './locatedBathymetry';
import { getBathimetryValues } from './getBathimetryValues';

const valley = [
  { x: 0, y: 10 },
  { x: 5, y: 4 },
  { x: 10, y: 1 },
  { x: 15, y: 4 },
  { x: 20, y: 10 },
];

describe('loadedBathymetry', () => {
  it('passes a found profile through', () => {
    expect(loadedBathymetry({ line: valley, name: 'bathy.csv' }, '/p/bathy.csv')).toEqual({
      line: valley,
      name: 'bathy.csv',
    });
  });

  it('gives a missing file an empty profile and its file name, so the section still loads', () => {
    expect(loadedBathymetry({ error: new Error('ENOENT') }, '/gone/dir/bathy.csv')).toEqual({
      line: [],
      name: 'bathy.csv',
    });
    expect(loadedBathymetry(undefined, 'C:\\gone\\bathy.csv')).toEqual({ line: [], name: 'bathy.csv' });
  });

  it('does not throw when the loader computes values from an empty profile', () => {
    expect(() => getBathimetryValues([], 5)).not.toThrow();
  });
});

describe('applyLocatedBathymetry', () => {
  const previous = {
    path: '/gone/bathy.csv',
    name: 'bathy.csv',
    level: 6,
    leftBank: 2.5,
    line: [],
  };

  it("keeps the section's saved water level and left-bank station", () => {
    const result = applyLocatedBathymetry(previous, { path: '/p/bathy.csv', name: 'bathy.csv', line: valley });
    if (!('bathimetry' in result)) throw new Error('expected a bathymetry');
    expect(result.bathimetry.level).toBe(6);
    expect(result.bathimetry.leftBank).toBe(2.5);
    expect(result.bathimetry.path).toBe('/p/bathy.csv');
    expect(result.bathimetry.line).toEqual(valley);
    expect(result.bathimetry.width).toBeGreaterThan(0);
  });

  it('reports a profile that the saved level does not cross', () => {
    const result = applyLocatedBathymetry({ ...previous, level: 50 }, { path: '/p/b.csv', name: 'b.csv', line: valley });
    expect(result).toEqual({ error: { message: 'bathimetryNotValid', value: 50 } });
  });
});

describe('hasMissingBathymetry', () => {
  it('is true only when a bathymetry is missing', () => {
    expect(hasMissingBathymetry({ videoMissing: true, missingInputs: [{ kind: 'ipcamImages', path: '/x' }] })).toBe(
      false
    );
    expect(
      hasMissingBathymetry({
        videoMissing: false,
        missingInputs: [{ kind: 'bathymetry', section: 'CS_default_1', path: '/x' }],
      })
    ).toBe(true);
  });
});
```

Run: `npx jest src/store/project/projectSlice.test.ts src/helpers/locatedBathymetry.test.ts`
Expected: FAIL (missing exports / module).

- [ ] **Step 2: Implement the slice changes**

`src/store/project/types.ts`: add at the top
```ts
import type { ProjectIssues, VideoSpec } from '../../../commons/projectIssues';

/** Missing inputs reported on load (spec §3–§4), plus the last refused video. */
interface ProjectIssuesState extends ProjectIssues {
  videoMismatch: { expected: VideoSpec; found: VideoSpec } | null;
}
```
add `issues: ProjectIssuesState;` to `ProjectState`, and `ProjectIssuesState` to the type export list.

`src/store/project/projectSlice.ts`:
```ts
import type { ProjectIssues, VideoSpec } from '../../../commons/projectIssues';

const noIssues = () => ({ videoMissing: false, missingInputs: [], videoMismatch: null });
```
Add `issues: noIssues(),` to `initialState`, `state.issues = noIssues();` inside `setDefaultProjectState`, and these reducers:
```ts
    setProjectIssues: (state, action: PayloadAction<ProjectIssues>) => {
      state.issues = { ...action.payload, videoMismatch: null };
    },
    setVideoMismatch: (state, action: PayloadAction<{ expected: VideoSpec; found: VideoSpec } | null>) => {
      state.issues.videoMismatch = action.payload;
    },
    resolveVideoMissing: (state) => {
      state.issues.videoMissing = false;
      state.issues.videoMismatch = null;
    },
    /** Locating one file fixes every section that pointed at it. */
    resolveBathymetry: (state, action: PayloadAction<string>) => {
      state.issues.missingInputs = state.issues.missingInputs.filter(
        (input) => !(input.kind === 'bathymetry' && input.path === action.payload)
      );
    },
    resolveIpcamImages: (state) => {
      state.issues.missingInputs = state.issues.missingInputs.filter((input) => input.kind !== 'ipcamImages');
    },
```
and export the five new actions next to the existing ones.

- [ ] **Step 3: Implement the helpers**

`src/helpers/locatedBathymetry.ts`:

```ts
import type { ProjectIssues } from '../../commons/projectIssues';
import type { Bathimetry } from '../store/section/types';
import type { Point } from '../types';
import { getBathimetryValues } from './getBathimetryValues';

const fileName = (filePath: string) => filePath.split(/[\\/]/).pop() ?? filePath;

/**
 * What onLoadCrossSections draws for a section. A missing file used to throw and drop
 * the whole section; now the section loads with an empty profile (spec §4).
 */
export function loadedBathymetry(response: unknown, bath: string): { line: Point[]; name: string } {
  const result = response as { line?: Point[]; name?: string } | undefined;
  return {
    line: Array.isArray(result?.line) ? result.line : [],
    name: result?.name ?? fileName(bath),
  };
}

/** A located bathymetry replaces the profile but keeps the section's water level and left bank. */
export function applyLocatedBathymetry(
  previous: Bathimetry,
  located: { path: string; name: string; line: Point[] }
): { bathimetry: Bathimetry } | { error: { message: string; value?: number } } {
  const { data, error } = getBathimetryValues(located.line, previous.level);
  if (error || !data) return { error: error ?? { message: 'bathimetryNotValid', value: previous.level } };
  return {
    bathimetry: {
      ...previous,
      ...data,
      leftBank: previous.leftBank ?? data.leftBank,
      path: located.path,
      name: located.name,
      line: located.line,
    },
  };
}

export const hasMissingBathymetry = (issues: ProjectIssues) =>
  issues.missingInputs.some((input) => input.kind === 'bathymetry');
```

If `Point` is not exported from `src/types`, import it from wherever `useSectionSlice.ts` imports it (`import { …, Point } from '../types'`); it is.

- [ ] **Step 4: Wire the load flow**

`src/hooks/useProjectSlice.ts`, in `onLoadProject`:

1. Add `videoMissing,` and `missingInputs,` to the `result.message` destructuring.
2. Right after `dispatch(setProjectType(settings.footage));` add:
   ```ts
   dispatch(setProjectIssues({ videoMissing: videoMissing ?? false, missingInputs: missingInputs ?? [] }));
   ```
3. In `setVideoData({...})`, change `path: filePrefix + settings.video.filepath,` to
   ```ts
   // No player for a missing video: VideoRange shows the first frame instead.
   path: videoMissing ? '' : filePrefix + settings.video.filepath,
   ```
4. Import `setProjectIssues` from `../store/project/projectSlice`, read `issues` with the existing `useSelector` on `state.project` (add `issues` to its destructuring), and add `issues,` to the returned ATRIBUTES block (alphabetical, after `firstFramePath`).

`src/helpers/loadProjectHelpers.ts`, in `onLoadCrossSections`, replace
```ts
      const { line, name } = await ipcRenderer.invoke('get-bathimetry', {
        path: bath,
      });
```
with
```ts
      // A missing bathymetry used to throw here and drop the whole section.
      const { line, name } = loadedBathymetry(await ipcRenderer.invoke('get-bathimetry', { path: bath }), bath);
```
and import `loadedBathymetry` from `./locatedBathymetry`.

- [ ] **Step 5: Run the tests and the type check**

Run: `npx jest src/store/project src/helpers/locatedBathymetry.test.ts src/hooks && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: PASS; error count at baseline. If another test builds a full `ProjectState` and now fails type-checking for the missing `issues`, add `issues: { videoMissing: false, missingInputs: [], videoMismatch: null }` to that fixture.

- [ ] **Step 6: Commit**

```bash
git add src/store/project src/helpers/locatedBathymetry.ts src/helpers/locatedBathymetry.test.ts src/hooks/useProjectSlice.ts src/helpers/loadProjectHelpers.ts
git commit -m "Keep load-time project issues in the store and load sections without their bathymetry"
```

---

### Task 8: Issue cards with a Locate… action

**Files:**
- Modify: `src/store/ui/types.ts`
- Modify: `src/components/Messages/StepAlert.tsx`, `src/components/Messages/messages.css`
- Create: `src/helpers/projectIssueAlerts.ts`
- Test: `src/helpers/projectIssueAlerts.test.ts`
- Create: `src/hooks/useProjectIssues.ts` (and export it from `src/hooks/index.ts`)
- Modify: `src/hooks/useIpcamSlice.ts` (`onGetImages` returns `true` on success)
- Modify: `src/translations/*/global.json` (12 files)

**Interfaces:**
- Consumes: `ProjectIssuesState` and its actions (Task 7), `applyLocatedBathymetry` (Task 7), IPC `locate-video` (Task 6), IPC `locate-bathymetry` (Task 5).
- Produces:
  - `StepAlert.action?: { label: string; action: string }`
  - `StepAlertList({ extra?: StepAlert[]; onAction?: (action: string) => void })`
  - `type IssueStep = 'video' | 'sections' | 'processing' | 'ipcam'`
  - `projectIssueAlerts(issues: ProjectIssuesState, step: IssueStep, t: TFunction, videoName: string): StepAlert[]`
  - `useProjectIssues(step: IssueStep): { alerts: StepAlert[]; onAction: (action: string) => Promise<void>; videoMissing: boolean; bathymetryMissing: boolean }`

- [ ] **Step 1: Add the translations**

Add a top-level `"ProjectIssues"` block to each of the 12 `src/translations/<lang>/global.json` files. English:

```json
"ProjectIssues": {
  "locate": "Locate…",
  "videoMissing": "Video {{name}} not found. The extracted frames are still available.",
  "videoMismatch": "This video is {{foundWidth}}×{{foundHeight}} at {{foundFps}} fps; the project was made with {{width}}×{{height}} at {{fps}} fps.",
  "videoLocked": "The video is missing: locate it to change the range, step or stabilization.",
  "bathymetryMissing": "Bathymetry for {{section}} ({{file}}) is missing.",
  "bathymetryBlocksProcessing": "Locate the missing bathymetry before running the analysis.",
  "ipcamImagesMissing": "Image folder {{folder}} not found."
}
```

Spanish:

```json
"ProjectIssues": {
  "locate": "Buscar…",
  "videoMissing": "No se encuentra el video {{name}}. Los fotogramas extraídos siguen disponibles.",
  "videoMismatch": "Este video es de {{foundWidth}}×{{foundHeight}} a {{foundFps}} fps; el proyecto se hizo con {{width}}×{{height}} a {{fps}} fps.",
  "videoLocked": "Falta el video: búscalo para cambiar el rango, el paso o la estabilización.",
  "bathymetryMissing": "Falta la batimetría de {{section}} ({{file}}).",
  "bathymetryBlocksProcessing": "Busca la batimetría que falta antes de ejecutar el análisis.",
  "ipcamImagesMissing": "No se encuentra la carpeta de imágenes {{folder}}."
}
```

Translate the same seven keys into ar de fr hi it ja ko pt ru zh, keeping every `{{placeholder}}` and the `×` sign. Run `npx jest src/helpers/translations.test.ts`. Expected: PASS.

- [ ] **Step 2: Write the failing test for the card builder**

`src/helpers/projectIssueAlerts.test.ts`:

```ts
import { projectIssueAlerts } from './projectIssueAlerts';

// Echoes the key and its values so the test reads what each card says.
const t = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key} ${JSON.stringify(values)}` : key) as any;

const issues = {
  videoMissing: true,
  videoMismatch: null,
  missingInputs: [
    { kind: 'bathymetry' as const, section: 'CS_default_1', path: '/gone/dir/bathy.csv' },
    { kind: 'bathymetry' as const, section: 'CS_default_2', path: '/gone/dir/bathy.csv' },
    { kind: 'ipcamImages' as const, path: '/gone/cam1' },
  ],
};

describe('projectIssueAlerts', () => {
  it('shows the missing video only on the video step, with a Locate action', () => {
    expect(projectIssueAlerts(issues, 'video', t, 'DJI_0083.MP4')).toEqual([
      {
        id: 'issue-video-missing',
        level: 'warning',
        text: 'ProjectIssues.videoMissing {"name":"DJI_0083.MP4"}',
        action: { label: 'ProjectIssues.locate', action: 'locate-video' },
      },
    ]);
    expect(projectIssueAlerts(issues, 'processing', t, 'DJI_0083.MP4').some((a) => a.id === 'issue-video-missing')).toBe(
      false
    );
  });

  it('adds the refused-video card under the video card', () => {
    const withMismatch = {
      ...issues,
      videoMismatch: { expected: { width: 4096, height: 2160, fps: 30 }, found: { width: 1920, height: 1080, fps: 25 } },
    };
    const alerts = projectIssueAlerts(withMismatch, 'video', t, 'DJI_0083.MP4');
    expect(alerts[1]).toEqual({
      id: 'issue-video-mismatch',
      level: 'error',
      text: 'ProjectIssues.videoMismatch {"foundWidth":1920,"foundHeight":1080,"foundFps":25,"width":4096,"height":2160,"fps":30}',
    });
  });

  it('shows one bathymetry card per section on the sections and processing steps', () => {
    for (const step of ['sections', 'processing'] as const) {
      expect(projectIssueAlerts(issues, step, t, '')).toEqual([
        {
          id: 'issue-bathymetry-CS_default_1',
          level: 'warning',
          text: 'ProjectIssues.bathymetryMissing {"section":"CS_default_1","file":"bathy.csv"}',
          action: { label: 'ProjectIssues.locate', action: 'locate-bathymetry:CS_default_1' },
        },
        {
          id: 'issue-bathymetry-CS_default_2',
          level: 'warning',
          text: 'ProjectIssues.bathymetryMissing {"section":"CS_default_2","file":"bathy.csv"}',
          action: { label: 'ProjectIssues.locate', action: 'locate-bathymetry:CS_default_2' },
        },
      ]);
    }
  });

  it('shows the missing image folder on the 3D step only', () => {
    expect(projectIssueAlerts(issues, 'ipcam', t, '')).toEqual([
      {
        id: 'issue-ipcam-images',
        level: 'warning',
        text: 'ProjectIssues.ipcamImagesMissing {"folder":"/gone/cam1"}',
        action: { label: 'ProjectIssues.locate', action: 'locate-ipcam-images' },
      },
    ]);
  });

  it('shows nothing for a healthy project', () => {
    const healthy = { videoMissing: false, videoMismatch: null, missingInputs: [] };
    for (const step of ['video', 'sections', 'processing', 'ipcam'] as const) {
      expect(projectIssueAlerts(healthy, step, t, 'x.mp4')).toEqual([]);
    }
  });
});
```

Run: `npx jest src/helpers/projectIssueAlerts.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the builder and the StepAlert action**

`src/store/ui/types.ts`, in `interface StepAlert`, add:
```ts
  /** Optional button on the card. `action` is a serializable id the page's onAction
   *  maps to a call, e.g. `'locate-video'` or `'locate-bathymetry:CS_default_1'`. */
  action?: { label: string; action: string };
```

`src/helpers/projectIssueAlerts.ts`:

```ts
import type { TFunction } from 'i18next';
import type { ProjectIssuesState } from '../store/project/types';
import type { StepAlert } from '../store/ui/types';

export type IssueStep = 'video' | 'sections' | 'processing' | 'ipcam';

const fileName = (filePath: string) => filePath.split(/[\\/]/).pop() ?? filePath;

/**
 * The cards a step shows for the project's missing inputs (spec §4). Derived, never
 * stored: the global step-alert list is not cleared on navigation, these must only
 * appear on their own steps.
 */
export function projectIssueAlerts(
  issues: ProjectIssuesState,
  step: IssueStep,
  t: TFunction,
  videoName: string
): StepAlert[] {
  const locate = t('ProjectIssues.locate');
  const alerts: StepAlert[] = [];

  if (step === 'video' && issues.videoMissing) {
    alerts.push({
      id: 'issue-video-missing',
      level: 'warning',
      text: t('ProjectIssues.videoMissing', { name: videoName }),
      action: { label: locate, action: 'locate-video' },
    });
    if (issues.videoMismatch) {
      const { expected, found } = issues.videoMismatch;
      alerts.push({
        id: 'issue-video-mismatch',
        level: 'error',
        text: t('ProjectIssues.videoMismatch', {
          foundWidth: found.width,
          foundHeight: found.height,
          foundFps: found.fps,
          width: expected.width,
          height: expected.height,
          fps: expected.fps,
        }),
      });
    }
  }

  for (const input of issues.missingInputs) {
    if (input.kind === 'bathymetry' && (step === 'sections' || step === 'processing')) {
      alerts.push({
        id: `issue-bathymetry-${input.section}`,
        level: 'warning',
        text: t('ProjectIssues.bathymetryMissing', { section: input.section, file: fileName(input.path) }),
        action: { label: locate, action: `locate-bathymetry:${input.section}` },
      });
    }
    if (input.kind === 'ipcamImages' && step === 'ipcam') {
      alerts.push({
        id: 'issue-ipcam-images',
        level: 'warning',
        text: t('ProjectIssues.ipcamImagesMissing', { folder: input.path }),
        action: { label: locate, action: 'locate-ipcam-images' },
      });
    }
  }

  return alerts;
}
```

`src/components/Messages/StepAlert.tsx`: change `StepAlertList` to:

```tsx
/**
 * Every current step alert, stacked in the panel. `extra` holds cards derived for this
 * step only (project issues); a card with an `action` gets a button that calls `onAction`.
 */
export const StepAlertList = ({
  extra = [],
  onAction,
}: {
  extra?: StepAlert[];
  onAction?: (action: string) => void;
} = {}) => {
  const { stepAlerts } = useUiSlice();
  const alerts = [...extra, ...stepAlerts];

  if (alerts.length === 0) return null;

  return (
    <div className="step-alert-list" aria-live="assertive">
      {alerts.map((alert) => (
        <div key={alert.id} className={stepAlertClassName(alert.level)} role="alert">
          <span className="step-alert-text">{linkify(alert.text)}</span>
          {alert.action && onAction && (
            <button
              type="button"
              className="btn btn-tertiary btn-sm step-alert-action"
              onClick={() => onAction(alert.action!.action)}
            >
              {alert.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
```
with `import type { StepAlert } from '../../store/ui/types';` at the top.

`src/components/Messages/messages.css`, after the `.step-alert-error::before` rule:

```css
/* Project-issue cards (Locate…): text takes the room, the button sits at the end. */
.step-alert-text {
    flex: 1;
    min-width: 0;
}

.step-alert-action {
    flex: none;
    align-self: center;
}
```

- [ ] **Step 4: Implement `useProjectIssues`**

First, in `src/hooks/useIpcamSlice.ts` `onGetImages`, add `return true;` right after the `dispatch(setImages({ … }))` call, so a caller knows whether the folder was set.

`src/hooks/useProjectIssues.ts`:

```ts
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../store/store';
import {
  resolveBathymetry,
  resolveIpcamImages,
  resolveVideoMissing,
  setVideoData,
  setVideoMismatch,
} from '../store/project/projectSlice';
import { setBathimetry } from '../store/section/sectionSlice';
import { addStepAlert, clearStepAlert } from '../store/ui/uiSlice';
import { IssueStep, projectIssueAlerts } from '../helpers/projectIssueAlerts';
import { applyLocatedBathymetry, hasMissingBathymetry } from '../helpers/locatedBathymetry';
import { useIpcamSlice } from './useIpcamSlice';

/** The project-issue cards for one step, and what their Locate… buttons do (spec §4). */
export const useProjectIssues = (step: IssueStep) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { issues, video, type, projectDetails } = useSelector((state: RootState) => state.project);
  const { sections } = useSelector((state: RootState) => state.section);
  const { onGetImages } = useIpcamSlice();
  const filePrefix = import.meta.env.VITE_FILE_PREFIX ?? '';

  const alerts = useMemo(
    () => projectIssueAlerts(issues, step, t, video.data.name ?? ''),
    [issues, step, t, video.data.name]
  );

  const locateVideo = async () => {
    const result = await window.ipcRenderer.invoke('locate-video');
    if (result.status === 'mismatch') {
      dispatch(setVideoMismatch({ expected: result.expected, found: result.found }));
    } else if (result.status === 'ok') {
      const { metadata } = result;
      dispatch(
        setVideoData({ ...video.data, path: filePrefix + metadata.path, name: metadata.name, creation: metadata.creation })
      );
      dispatch(resolveVideoMissing());
    }
  };

  const locateBathymetry = async (section: string) => {
    dispatch(clearStepAlert('bathymetry-import-error'));
    const result = await window.ipcRenderer.invoke('locate-bathymetry', {
      section,
      unitSistem: projectDetails.unitSistem,
      // IPCam bathymetry must be elevation, not depth; any zLimits turns on that check.
      zLimits: type === 'ipcam' ? { min: 0, max: 0 } : undefined,
    });
    if (result.status === 'error') {
      dispatch(
        addStepAlert({ id: 'bathymetry-import-error', level: 'error', text: t('CrossSections.Errors.' + result.message) })
      );
      return;
    }
    if (result.status !== 'ok') return;

    // Every section that used the missing file now points at the located one.
    const affected = issues.missingInputs.filter(
      (input) => input.kind === 'bathymetry' && input.path === result.replaced
    );
    for (const input of affected) {
      if (input.kind !== 'bathymetry') continue;
      const index = sections.findIndex((s) => s.name === input.section);
      if (index === -1) continue;
      const applied = applyLocatedBathymetry(sections[index].bathimetry, result);
      if ('error' in applied) {
        dispatch(
          addStepAlert({
            id: 'bathymetry-import-error',
            level: 'error',
            text: t('CrossSections.Errors.' + applied.error.message, { level: applied.error.value }),
          })
        );
        continue;
      }
      dispatch(setBathimetry({ bathimetry: applied.bathimetry, index }));
    }
    dispatch(resolveBathymetry(result.replaced));
  };

  const locateIpcamImages = async () => {
    dispatch(clearStepAlert('ipcam-import-images'));
    try {
      if (await onGetImages(undefined)) dispatch(resolveIpcamImages());
    } catch (error) {
      dispatch(addStepAlert({ id: 'ipcam-import-images', level: 'error', text: (error as Error).message }));
    }
  };

  const onAction = async (action: string) => {
    if (action === 'locate-video') return locateVideo();
    if (action === 'locate-ipcam-images') return locateIpcamImages();
    if (action.startsWith('locate-bathymetry:')) return locateBathymetry(action.slice('locate-bathymetry:'.length));
  };

  return {
    alerts,
    onAction,
    videoMissing: issues.videoMissing,
    bathymetryMissing: hasMissingBathymetry(issues),
  };
};
```

Export it from `src/hooks/index.ts`: `export { useProjectIssues } from './useProjectIssues';` (match the file's existing export style). If `setVideoData` or `setBathimetry` is not exported from its slice under that name, use the exported name the existing hooks use (`useProjectSlice.ts` imports `setVideoData`; `useSectionSlice.ts` dispatches `setBathimetry`).

- [ ] **Step 5: Run the tests and the type check**

Run: `npx jest src/helpers/projectIssueAlerts.test.ts src/helpers/translations.test.ts src/store/ui src/components && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: PASS; error count at baseline.

- [ ] **Step 6: Commit**

```bash
git add src/store/ui/types.ts src/components/Messages/StepAlert.tsx src/components/Messages/messages.css src/helpers/projectIssueAlerts.ts src/helpers/projectIssueAlerts.test.ts src/hooks/useProjectIssues.ts src/hooks/index.ts src/hooks/useIpcamSlice.ts src/translations
git commit -m "Show missing project inputs as step cards with a Locate button"
```

---

### Task 9: Pages: cards, the video lock, and no backend run without a bathymetry

**Files:**
- Modify: `src/pages/VideoRange.tsx`, `src/components/Forms/FormVideo.tsx`, `src/pages/pages.css`
- Modify: `src/pages/CrossSections.tsx`, `src/components/CrossSections/CrossSections.tsx`
- Modify: `src/pages/Processing.tsx`, `src/hooks/useDataSlice.ts`
- Modify: `src/pages/Ipcam.tsx`

**Interfaces:**
- Consumes: `useProjectIssues` (Task 8), `hasMissingBathymetry` (Task 7), `firstFramePath` and `issues` from `useProjectSlice` (Task 7).

- [ ] **Step 1: Video step**

`src/pages/VideoRange.tsx`:

1. `import { useProjectIssues } from '../hooks';` and, in the component, `const { alerts, onAction, videoMissing } = useProjectIssues('video');`. Also take `firstFramePath` from `useProjectSlice()`.
2. Replace `{path && <VideoPlayer … />}` with:
   ```tsx
   {path ? (
     <VideoPlayer ref={videoRef} fileURL={path} duration={duration} overlay={stabilizationOverlay} />
   ) : (
     videoMissing && firstFramePath && <img className="video-missing-still" src={firstFramePath} alt="" />
   )}
   ```
3. Replace `<StepAlertList />` with `<StepAlertList extra={alerts} onAction={onAction} />`.

`src/components/Forms/FormVideo.tsx`:

1. Read `const { videoMissing } = useProjectIssues('video');` (import from `'../../hooks'`).
2. At the very top of `onSubmit`, before the lens-correction check:
   ```ts
   // Frames can't be re-extracted without the video; keep the ones on disk (spec §3).
   if (videoMissing) {
     nextStep();
     return;
   }
   ```
3. Wrap everything inside `<form …>` in
   ```tsx
   <fieldset className="fieldset-plain" disabled={videoMissing} title={videoMissing ? t('ProjectIssues.videoLocked') : undefined}>
     …existing form children…
   </fieldset>
   ```

`src/pages/pages.css`, append:
```css
/* Missing video: the first extracted frame stands in for the player (spec §3). */
.video-missing-still {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: var(--radius-md);
}

.fieldset-plain {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
}
```
If `.fieldset-plain` already exists in the CSS (`grep -rn "fieldset-plain" src`), skip that rule.

- [ ] **Step 2: Cross-sections step**

`src/pages/CrossSections.tsx`: `const { alerts, onAction } = useProjectIssues('sections');` and replace `<StepAlertList />` with `<StepAlertList extra={alerts} onAction={onAction} />`.

`src/components/CrossSections/CrossSections.tsx`, in the submit handler that calls `onSetSections(data, type)`: read `const { issues } = useProjectSlice();` (it already uses `useProjectSlice` or add it), and before `onSetSections(data, type);` add
```ts
// The mask and the discharge need every bathymetry; its card is already on screen.
if (hasMissingBathymetry(issues)) return;
```
importing `hasMissingBathymetry` from `'../../helpers/locatedBathymetry'`.

- [ ] **Step 3: Processing step and the backend guard**

`src/pages/Processing.tsx`: `const { alerts, onAction } = useProjectIssues('processing');` and replace `<StepAlertList />` with `<StepAlertList extra={alerts} onAction={onAction} />`.

`src/hooks/useDataSlice.ts`:

1. Read `issues` from the existing `useSelector((state: RootState) => state.project)` (it already takes `video`).
2. Import `hasMissingBathymetry` from `'../helpers/locatedBathymetry'`.
3. Add this helper inside the hook, after `const { t } = useTranslation();`:
   ```ts
   // Python reads every section's bath file; a missing one fails deep in the backend.
   const assertBathymetryPresent = () => {
     if (hasMissingBathymetry(issues)) throw new Error(t('ProjectIssues.bathymetryBlocksProcessing'));
   };
   ```
4. Call `assertBathymetryPresent();` as the **first** line of `onSetQuiverTest`, `onSetQuiverAll`, `onGetResultData` and `onReCalculateMask`, before any `dispatch(setBackendWorking(true))`, so a refusal never leaves the backend flag stuck. Their callers (`FormProcessing.tsx` Test/Analyze, `RoiHeightRow.tsx`) already catch and show the message as a step alert.

- [ ] **Step 4: 3D step**

`src/pages/Ipcam.tsx`: `const { alerts, onAction } = useProjectIssues('ipcam');` and replace `<StepAlertList />` with `<StepAlertList extra={alerts} onAction={onAction} />`.

- [ ] **Step 5: Run the whole suite and the type check**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: all PASS; error count at baseline.

- [ ] **Step 6: Commit**

```bash
git add src/pages/VideoRange.tsx src/components/Forms/FormVideo.tsx src/pages/pages.css src/pages/CrossSections.tsx src/components/CrossSections/CrossSections.tsx src/pages/Processing.tsx src/hooks/useDataSlice.ts src/pages/Ipcam.tsx
git commit -m "Show project-issue cards on their steps and lock what needs the missing input"
```

---

### Task 10: In-app check with a moved copy of DJI_0083

**Files:** none in the repo. Evidence goes to `~/Library/Caches/river-relocation-check/`.

- [ ] **Step 1: Make the test copy**

```bash
SRC=~/Documents/river_cases/River/DJI_0083/20261006T1837
DST=~/Documents/river_cases/relocation-check/DJI_0083/20261006T1837
mkdir -p "$(dirname "$DST")" ~/Library/Caches/river-relocation-check
cp -R "$SRC" "$DST"
# Point the copy at a video and a bathymetry that don't exist, as an old ~/river case would.
python3 - "$DST" <<'EOF'
import json, sys, pathlib
d = pathlib.Path(sys.argv[1])
s = json.loads((d / 'settings.json').read_text())
s['video']['filepath'] = '/Users/antoine/gone/DJI_0083.MP4'
(d / 'settings.json').write_text(json.dumps(s, indent=4))
x = (d / 'xsections.json').read_text()
import re
x = re.sub(r'("bath"\s*:\s*)"[^"]*"', r'\1"/Users/antoine/gone/bathy.csv"', x)
(d / 'xsections.json').write_text(x)
EOF
rm -f "$DST"/bathy*.csv
```

The copy's `settings.json` still names `$SRC` for `xsections`, `piv_results` and the rest, so it also exercises "moved project, old folder still there".

- [ ] **Step 2: Run the app on the worktree backend**

From `gui/`: `npm run dev`. The editable install already points at this worktree (memory: GUI dev Python env), so no `PYTHONPATH` is needed. Launch from `gui/`, not from `~`.

- [ ] **Step 3: Check, in dark, light and dracula**

Open `$DST` through Load Project, then check each of the following and screenshot every step in each theme:

1. The project opens. `settings.json` in `$DST` now names `$DST/...` for every project-owned key, and `river.log` ends with one `relocate-project` entry saying "project moved from …/River/DJI_0083/20261006T1837 to …/relocation-check/…".
2. Video step: the first frame shows in place of the player, plus the "Video DJI_0083.MP4 not found" card with Locate…. Range, step and stabilization are disabled. Next goes on without re-extracting.
3. Pick a video with another resolution: the mismatch card appears and `settings.json` is unchanged. Pick the real `DJI_0083.MP4` (in the Dropbox Video_4 folder): both cards go, the player is back, and `settings.json` has the real path.
4. Cross-sections and Processing: one bathymetry card per section. Analyze shows "Locate the missing bathymetry…" and nothing runs. Locate the real `bathy.csv`: the card goes on both steps, `$DST/bathy.csv` exists, `xsections.json` names it, and the section keeps its water level.
5. Analyze runs, and stations 6–10 are computed as in the original project.
6. Open `$SRC` again and confirm it is untouched (its `settings.json` still names `$SRC`).
7. Close and reopen `$DST`: no new `river.log` entry, no second copy of the bathymetry.

- [ ] **Step 4: Clean up and record**

Delete `$DST` once the user has seen the evidence. Then update the memory with a new `project_project_relocation.md`: what was done, the commit range, that it is unmerged on ui/design-refresh, and the evidence folder. Add its index line to `MEMORY.md`.
