# Camera Calibration Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home → Camera calibration opens a quiet Prepare screen (show board, import photos); Solve opens the existing two-panel workspace and starts solving; saving a profile ends with the report's saved block.

**Architecture:** `CameraCalibration.tsx` gains a local `stage` (`'prepare' | 'workspace'`). A new `CalibrationPrepare` component renders the Prepare screen and owns the only drop target. `FormCalibration` loses its import/board controls and renders a new `CalibrationSavedBlock` after a save. Pure decisions (stage, photo-count advice, footer action, path display) live in `helpers/calibrationView.ts` with unit tests; layout rules are pinned by the existing source-assertion tests.

**Tech Stack:** React 18 + TypeScript, Redux Toolkit (`store/calibration`), react-i18next (fallbackLng `en`), react-icons/lu, Jest (ts-jest, node env, source-regex layout tests), Electron IPC.

**Spec:** `docs/superpowers/specs/2026-10-03-camera-calibration-flow-design.md` (approved preview: `docs/superpowers/previews/2026-10-03-camera-calibration-flow.html`)

All paths below are relative to `gui/` (the worktree's working directory). Commit with `git -c user.email=antoine.patalano@gmail.com commit`, imperative message, **no Co-Authored-By or any trailer**.

## Global Constraints

- No full-screen or canvas drop zone. The Prepare drop box is the only drop target in calibration.
- Solve on Prepare opens the workspace and starts the solve at once (no review step).
- Fewer than 15 photos (`MIN_RECOMMENDED_PHOTOS = 15`) warns; Solve stays enabled.
- After a save the footer primary is **Done** (reset store + close to Home); the block offers **Show in folder** and **Calibrate another**.
- Disabled buttons use `aria-disabled` plus an early-return guard plus a `title` saying why (never the `disabled` attribute). This is the app-wide pattern the tests check.
- CSS: every new `.cal-*` rule goes inside the `CAMERA CALIBRATION (Phase 6e` block of `src/pages/pages.css` (before `/* ── Lens correction settings rows`), each rule preceded by its own comment or continuing the previous rule's class; tokens only (`--space-*`, `--text-*`, `--radius-*`, `--text-subdued`, `--accent-color`, …), no raw colours.
- New strings go in `src/translations/en/global.json` only; other locales fall back to English.
- Displayed copy is exactly the spec's (lede, step texts, tips, warnings).
- All three themes (dark, light, dracula) must work; use theme tokens, never theme-specific values.

## Review Focus

1. **A folder dropped just outside the box** — Electron's default drop behaviour navigates the window to the file and blows the app away. Expected: nothing happens. Pinned in Task 3 (root swallows `dragover`/`drop`).
2. **A slow scan** (thumbnail generation on a large folder) — expected: the box says "Reading photos…", Solve is blocked, a second Open folder click is ignored. Pinned in Task 3 (`scan === 'scanning'` gates).
3. **Cancelling the folder dialog with photos already loaded** — expected: the loaded folder stays, no error. Pinned in Task 2 (hook returns `null`) and Task 3 (`null` → `'idle'`).
4. **Windows paths** — dropped single files on Windows have `\` separators; the old code took the parent with `lastIndexOf('/')` only. Expected: parent folder and folder name work with either separator. Pinned in Task 1 (`parentDir`, `folderName` tests).
5. **Esc or Back while a solve is running** — expected: nothing happens (no way to cancel a solve). Pinned in Task 4 (Back gated by `busy`) and Task 5 (Esc guarded by `status !== 'solving'`).

---

### Task 1: Pure helpers in `calibrationView.ts`

**Files:**
- Modify: `src/helpers/calibrationView.ts`
- Test: `src/helpers/calibrationView.test.ts`

**Interfaces:**
- Produces:
  - `export const MIN_RECOMMENDED_PHOTOS = 15;`
  - `export type PhotoCountAdvice = 'none' | 'tooFew' | 'ok';`
  - `export const photoCountAdvice = (count: number): PhotoCountAdvice`
  - `export type CalibrationStage = 'prepare' | 'workspace';`
  - `export const initialStage = (status: CalibrationStatus): CalibrationStage`
  - `FooterAction.kind` becomes `'solve' | 'save' | 'done'`; `footerAction` takes optional `saved?: boolean` (default `false`).
  - `export const parentDir = (filePath: string): string`
  - `export const folderName = (dir: string): string`
  - `export const profileDisplayPath = (filePath: string): string`

- [ ] **Step 1: Write the failing tests**

Append to `src/helpers/calibrationView.test.ts`, and extend its first import line to:

```ts
import {
  badgeGrade,
  CALIBRATION_VIEW_MODES,
  folderName,
  footerAction,
  initialStage,
  MIN_RECOMMENDED_PHOTOS,
  parentDir,
  photoCountAdvice,
  profileDisplayPath,
  viewAvailability,
  viewForKey,
} from './calibrationView';
```

```ts
describe('photoCountAdvice', () => {
  it('says nothing before any photo is loaded', () => {
    expect(photoCountAdvice(0)).toBe('none');
  });

  it('warns below the recommended minimum', () => {
    expect(MIN_RECOMMENDED_PHOTOS).toBe(15);
    expect(photoCountAdvice(1)).toBe('tooFew');
    expect(photoCountAdvice(14)).toBe('tooFew');
  });

  it('is satisfied from the minimum up', () => {
    expect(photoCountAdvice(15)).toBe('ok');
    expect(photoCountAdvice(30)).toBe('ok');
  });
});

describe('initialStage', () => {
  it('opens Prepare unless a solve is running or finished', () => {
    expect(initialStage('idle')).toBe('prepare');
    expect(initialStage('error')).toBe('prepare');
    expect(initialStage('solving')).toBe('workspace');
    expect(initialStage('solved')).toBe('workspace');
  });
});

describe('footerAction after a save', () => {
  it('becomes Done, with nothing blocking it, whatever the name fields hold', () => {
    expect(
      footerAction({ status: 'solved', imageCount: 20, cameraName: '', lensName: '', saved: true })
    ).toEqual({ kind: 'done', blocker: null, busy: false });
  });

  it('stays Save profile while not saved', () => {
    expect(
      footerAction({ status: 'solved', imageCount: 20, cameraName: 'A', lensName: 'B', saved: false }).kind
    ).toBe('save');
  });
});

describe('parentDir', () => {
  it('drops the file name with either separator', () => {
    expect(parentDir('/Users/a/calib/IMG_01.jpg')).toBe('/Users/a/calib');
    expect(parentDir('C:\\Users\\a\\calib\\IMG_01.jpg')).toBe('C:\\Users\\a\\calib');
  });
});

describe('folderName', () => {
  it('returns the last segment with either separator, ignoring a trailing one', () => {
    expect(folderName('/Users/a/gopro11_wide')).toBe('gopro11_wide');
    expect(folderName('/Users/a/gopro11_wide/')).toBe('gopro11_wide');
    expect(folderName('C:\\calib\\gopro11_wide')).toBe('gopro11_wide');
  });

  it('returns an empty string for no folder', () => {
    expect(folderName('')).toBe('');
  });
});

describe('profileDisplayPath', () => {
  it('starts the path at calibration_profiles', () => {
    expect(profileDisplayPath('/Users/a/RIVeR/calibration_profiles/GoPro/Wide/profile.json')).toBe(
      'calibration_profiles/GoPro/Wide/profile.json'
    );
    expect(profileDisplayPath('C:\\RIVeR\\calibration_profiles\\GoPro\\Wide\\profile.json')).toBe(
      'calibration_profiles\\GoPro\\Wide\\profile.json'
    );
  });

  it('keeps any other path whole', () => {
    expect(profileDisplayPath('/tmp/profile.json')).toBe('/tmp/profile.json');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/helpers/calibrationView.test.ts`
Expected: FAIL — TypeScript errors that `folderName`, `initialStage`, … are not exported.

- [ ] **Step 3: Implement**

In `src/helpers/calibrationView.ts`, change the footer types and function to:

```ts
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
  if (saved) return { kind: 'done', blocker: null, busy: false };
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
```

Then append:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/helpers/calibrationView.test.ts`
Expected: PASS (old and new cases).

- [ ] **Step 5: Commit**

```bash
git add src/helpers/calibrationView.ts src/helpers/calibrationView.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Add the calibration stage, photo-count and path helpers, and a Done footer action"
```

---

### Task 2: Folder loaders report how many photos they found

**Files:**
- Modify: `src/hooks/useCalibrationSlice.ts:20-51`
- Test: `src/helpers/calibrationLayout.test.ts`

**Interfaces:**
- Produces: `onOpenFolder: () => Promise<number | null>` (`null` = dialog cancelled, store untouched); `onDropFolder: (dir: string) => Promise<number>`.

- [ ] **Step 1: Write the failing test**

Add to `src/helpers/calibrationLayout.test.ts` (top level, after the last `describe`):

```ts
describe('useCalibrationSlice folder loaders', () => {
  const hook = read('hooks/useCalibrationSlice.ts');

  it('return the photo count so Prepare can report an empty folder', () => {
    expect(hook).toMatch(/const onOpenFolder = useCallback\(async \(\): Promise<number \| null> =>/);
    expect(hook).toMatch(/if \(!dir\) return null;/);
    expect(hook).toMatch(/const onDropFolder = useCallback\(\s*async \(dir: string\): Promise<number> =>/);
    expect(hook).toMatch(/return images\.length;/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/helpers/calibrationLayout.test.ts -t "folder loaders"`
Expected: FAIL on the first `toMatch`.

- [ ] **Step 3: Implement**

Replace `onOpenFolder` and `onDropFolder` in `src/hooks/useCalibrationSlice.ts` with one shared scan:

```ts
  // Scans a folder into the store and reports how many photos it held, so the
  // Prepare screen can say "No images found" instead of staying silent.
  const scanFolder = useCallback(
    async (dir: string): Promise<number> => {
      dispatch(setImageDir(dir));
      const result: { images: string[]; thumbs: string[]; imageSize: { width: number; height: number } | null } =
        await window.ipcRenderer.invoke('calibration-scan-images', { dir });
      const images = result?.images ?? [];
      dispatch(
        setImages({
          images,
          thumbs: result?.thumbs ?? [],
          imageResolution: result?.imageSize ?? null,
        })
      );
      return images.length;
    },
    [dispatch]
  );

  const onOpenFolder = useCallback(async (): Promise<number | null> => {
    const dir: string | null = await window.ipcRenderer.invoke('calibration-open-folder');
    if (!dir) return null;
    return scanFolder(dir);
  }, [scanFolder]);

  const onDropFolder = useCallback(
    async (dir: string): Promise<number> => scanFolder(dir),
    [scanFolder]
  );
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx jest src/helpers/calibrationLayout.test.ts -t "folder loaders" && npx tsc --noEmit`
Expected: PASS, no type errors (existing callers ignore the return value).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCalibrationSlice.ts src/helpers/calibrationLayout.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Return the photo count from the calibration folder loaders"
```

---

### Task 3: The Prepare screen component

**Files:**
- Create: `src/components/Calibration/CalibrationPrepare.tsx`
- Modify: `src/components/Calibration/index.ts`
- Modify: `src/pages/pages.css` (inside the Phase 6e block, after the `.cal-combo-list li:hover` rule, before `/* ── Lens correction settings rows`)
- Modify: `src/translations/en/global.json` (`Calibration` block)
- Test: `src/helpers/calibrationLayout.test.ts`, `src/helpers/canvasChrome.test.ts`

**Interfaces:**
- Consumes: `photoCountAdvice`, `MIN_RECOMMENDED_PHOTOS`, `parentDir`, `folderName` (Task 1); `onOpenFolder: () => Promise<number | null>`, `onDropFolder: (dir: string) => Promise<number>` (Task 2); `handleDragOver`, `handleDragLeave` from `src/helpers`.
- Produces: `CalibrationPrepare` with props
  ```ts
  interface CalibrationPrepareProps {
    imageDir: string;
    imageCount: number;
    imageResolution: { width: number; height: number } | null;
    onOpenBoard: () => void;
    onOpenFolder: () => Promise<number | null>;
    onDropFolder: (dir: string) => Promise<number>;
    onSolve: () => void;
    onClose: () => void;
  }
  ```

- [ ] **Step 1: Write the failing tests**

Add to `src/helpers/calibrationLayout.test.ts`:

```ts
describe('CalibrationPrepare', () => {
  const prepare = read('components/Calibration/CalibrationPrepare.tsx');

  it('sits on the footage screen frame with the standard Back/Solve row', () => {
    expect(prepare).toMatch(/className=["']default-app-container cal-prepare["']/);
    expect(prepare).toMatch(/className=["']wizard-container["']/);
  });

  it('gates Solve with aria-disabled, an early return and a reason', () => {
    expect(prepare).toMatch(/aria-disabled=\{!canSolve\}/);
    expect(prepare).toMatch(/if \(!canSolve\) return;/);
    expect(prepare).toMatch(/title=\{canSolve \? undefined : t\(['"]Calibration\.importFirst['"]/);
  });

  it('accepts drops only on the drop box, and swallows stray drops everywhere else', () => {
    expect((prepare.match(/onDrop=\{handleDrop\}/g) ?? []).length).toBe(1);
    expect(prepare).toMatch(/className=\{`cal-prepare-drop/);
    expect(prepare).toMatch(/onDragOver=\{swallow\}/);
    expect(prepare).toMatch(/onDrop=\{swallow\}/);
  });

  it('ignores a second load while a scan runs, and does not treat a cancelled dialog as empty', () => {
    expect(prepare).toMatch(/if \(scan === ['"]scanning['"]\) return;/);
    expect(prepare).toMatch(/setScan\(count === 0 \? ['"]empty['"] : ['"]idle['"]\)/);
  });

  it('warns about too few photos without blocking, and reports an empty folder', () => {
    expect(prepare).toMatch(/advice === ['"]tooFew['"]/);
    expect(prepare).toMatch(/Errors\.imagesFolderEmpty/);
    expect(prepare).not.toMatch(/canSolve = [^;]*tooFew/);
  });

  it('takes the parent folder through parentDir, not a slash-only lastIndexOf', () => {
    expect(prepare).toMatch(/parentDir\(/);
    expect(prepare).not.toMatch(/lastIndexOf\(['"]\/['"]\)/);
  });
});
```

In `src/helpers/canvasChrome.test.ts`, add `'components/Calibration/CalibrationPrepare.tsx',` to `FILES` right after `'components/Calibration/CalibrationCanvas.tsx',`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/helpers/calibrationLayout.test.ts src/helpers/canvasChrome.test.ts`
Expected: FAIL — `ENOENT` reading `CalibrationPrepare.tsx`, and canvasChrome's "every FILES entry exists" test fails.

- [ ] **Step 3: Add the strings**

In `src/translations/en/global.json`, inside `"Calibration"`: change `"board": "Show Board"` to `"board": "Show board"`, and add after `"title": "Camera Calibration",`:

```json
    "importFirst": "Import photos first",
    "prepare": {
      "lede": "Calibrate once per camera and lens. Every project filmed with them reuses the profile.",
      "boardTitle": "Show the board",
      "boardText": "Open the board full-screen and photograph it with the camera and lens you use in the field.",
      "tipFlat": "Keep the screen flat and still; avoid glare.",
      "tipAngles": "Take 15 to 30 photos from varied angles and distances.",
      "tipCorners": "In some photos, let the board reach the image corners.",
      "skip": "Already have photos? Go straight to step 2.",
      "photosTitle": "Import your photos",
      "photosText": "A folder of JPG or PNG photos of the board, all from the same camera.",
      "dropHint": "Drag a folder of photos here",
      "openFolder": "Open folder",
      "changeFolder": "Change folder",
      "reading": "Reading photos…",
      "photoCount_one": "{{count}} photo",
      "photoCount_other": "{{count}} photos",
      "tooFew_one": "Only {{count}} photo. {{min}} or more give a steadier calibration; you can still solve.",
      "tooFew_other": "Only {{count}} photos. {{min}} or more give a steadier calibration; you can still solve."
    },
```

- [ ] **Step 4: Create the component**

`src/components/Calibration/CalibrationPrepare.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuAlertTriangle, LuCheck, LuFolder, LuFrame, LuMonitor, LuScan } from 'react-icons/lu';
import { handleDragLeave, handleDragOver } from '../../helpers';
import { folderName, MIN_RECOMMENDED_PHOTOS, parentDir, photoCountAdvice } from '../../helpers/calibrationView';

type ScanState = 'idle' | 'scanning' | 'empty';

interface CalibrationPrepareProps {
  imageDir: string;
  imageCount: number;
  imageResolution: { width: number; height: number } | null;
  onOpenBoard: () => void;
  onOpenFolder: () => Promise<number | null>;
  onDropFolder: (dir: string) => Promise<number>;
  onSolve: () => void;
  onClose: () => void;
}

/** A dropped folder, or the folder of the first dropped photo; null if neither. */
const droppedFolder = (data: DataTransfer): string | null => {
  for (let i = 0; i < data.items.length; i++) {
    const entry = data.items[i].webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      const file = data.items[i].getAsFile();
      if (file) return window.webUtils.getPathForFile(file);
    }
  }
  const first = Array.from(data.files).find((f) => /\.(jpg|jpeg|png)$/i.test(f.name));
  return first ? parentDir(window.webUtils.getPathForFile(first)) : null;
};

/** Electron opens a file dropped on an unhandled area; outside the box a drop does nothing. */
const swallow = (e: React.DragEvent) => e.preventDefault();

/**
 * Camera calibration's first screen (spec 2026-10-03): two numbered steps,
 * Show the board and Import your photos, on the footage screen's frame. The
 * dashed box is the only drop target in calibration.
 */
export const CalibrationPrepare = ({
  imageDir,
  imageCount,
  imageResolution,
  onOpenBoard,
  onOpenFolder,
  onDropFolder,
  onSolve,
  onClose,
}: CalibrationPrepareProps) => {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [scan, setScan] = useState<ScanState>('idle');

  const hasPhotos = imageCount > 0;
  const advice = photoCountAdvice(imageCount);
  const canSolve = hasPhotos && scan !== 'scanning';

  // null means the dialog was cancelled: whatever was loaded stays, with no error.
  const load = async (run: () => Promise<number | null>) => {
    if (scan === 'scanning') return;
    setScan('scanning');
    try {
      const count = await run();
      setScan(count === 0 ? 'empty' : 'idle');
    } catch {
      setScan('idle');
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (scan === 'scanning') return;
    const dir = droppedFolder(e.dataTransfer);
    if (dir === null) {
      setScan('empty');
      return;
    }
    await load(() => onDropFolder(dir));
  };

  return (
    <div className="default-app-container cal-prepare" onDragOver={swallow} onDrop={swallow}>
      <h2 className="cal-prepare-title">{t('Calibration.title')}</h2>
      <p className="cal-prepare-lede">{t('Calibration.prepare.lede')}</p>

      <div className="cal-prepare-steps">
        <section>
          <h3 className="cal-prepare-step-head">
            <span className="cal-prepare-num" aria-hidden="true">
              1
            </span>
            {t('Calibration.prepare.boardTitle')}
          </h3>
          <p className="cal-prepare-text">{t('Calibration.prepare.boardText')}</p>
          <ul className="cal-prepare-tips">
            <li>
              <LuMonitor size={18} aria-hidden="true" />
              <span>{t('Calibration.prepare.tipFlat')}</span>
            </li>
            <li>
              <LuScan size={18} aria-hidden="true" />
              <span>{t('Calibration.prepare.tipAngles')}</span>
            </li>
            <li>
              <LuFrame size={18} aria-hidden="true" />
              <span>{t('Calibration.prepare.tipCorners')}</span>
            </li>
          </ul>
          <button type="button" className="btn btn-lg btn-secondary" onClick={onOpenBoard}>
            {t('Calibration.board')}
          </button>
          <p className="cal-prepare-skip">{t('Calibration.prepare.skip')}</p>
        </section>

        <section>
          <h3 className="cal-prepare-step-head">
            <span className={`cal-prepare-num${hasPhotos ? ' done' : ''}`} aria-hidden="true">
              {hasPhotos ? <LuCheck size={14} strokeWidth={3} /> : '2'}
            </span>
            {t('Calibration.prepare.photosTitle')}
          </h3>
          <p className="cal-prepare-text">{t('Calibration.prepare.photosText')}</p>
          <div
            className={`cal-prepare-drop${hasPhotos ? ' loaded' : ''}${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, setDragOver)}
            onDragLeave={(e) => handleDragLeave(e, setDragOver, false)}
            onDrop={handleDrop}
            aria-busy={scan === 'scanning' ? true : undefined}
          >
            {scan === 'scanning' ? (
              <p className="cal-prepare-hint">{t('Calibration.prepare.reading')}</p>
            ) : hasPhotos ? (
              <>
                <p className="cal-prepare-folder" title={imageDir}>
                  <LuFolder size={18} aria-hidden="true" />
                  <span>{folderName(imageDir)}</span>
                </p>
                <p className="cal-prepare-count">
                  {t('Calibration.prepare.photoCount', { count: imageCount })}
                  {imageResolution ? ` · ${imageResolution.width} × ${imageResolution.height} px` : ''}
                </p>
                <button type="button" className="btn btn-tertiary" onClick={() => void load(onOpenFolder)}>
                  {t('Calibration.prepare.changeFolder')}
                </button>
              </>
            ) : (
              <>
                <p className="cal-prepare-hint">{t('Calibration.prepare.dropHint')}</p>
                <button type="button" className="btn btn-lg btn-secondary" onClick={() => void load(onOpenFolder)}>
                  {t('Calibration.prepare.openFolder')}
                </button>
              </>
            )}
          </div>
          {advice === 'tooFew' && scan !== 'scanning' && (
            <p className="cal-prepare-note">
              <LuAlertTriangle size={16} className="cal-prepare-warn-icon" aria-hidden="true" />
              <span>{t('Calibration.prepare.tooFew', { count: imageCount, min: MIN_RECOMMENDED_PHOTOS })}</span>
            </p>
          )}
          {scan === 'empty' && !hasPhotos && (
            <p className="cal-prepare-note" role="alert">
              <LuAlertTriangle size={16} className="cal-prepare-error-icon" aria-hidden="true" />
              <span>{t('Errors.imagesFolderEmpty')}</span>
            </p>
          )}
        </section>
      </div>

      <div className="wizard-container">
        <button type="button" className="btn btn-lg btn-tertiary" onClick={onClose}>
          {t('Wizard.back')}
        </button>
        <button
          type="button"
          className="btn btn-lg btn-primary"
          aria-disabled={!canSolve}
          title={canSolve ? undefined : t('Calibration.importFirst')}
          onClick={() => {
            if (!canSolve) return;
            onSolve();
          }}
        >
          {t('Calibration.solve')}
        </button>
      </div>
    </div>
  );
};
```

Update `src/components/Calibration/index.ts`:

```ts
import { CalibrationCanvas } from './CalibrationCanvas';
import { CalibrationPrepare } from './CalibrationPrepare';
import { CalibrationStrip } from './CalibrationStrip';
import { CalibrationViewControl } from './CalibrationViewControl';

export { CalibrationCanvas, CalibrationPrepare, CalibrationStrip, CalibrationViewControl };
```

- [ ] **Step 5: Add the CSS**

In `src/pages/pages.css`, insert immediately before the line `/* ── Lens correction settings rows (VideoRange) ──────────────── */`:

```css
/* Prepare screen (spec 2026-10-03): the footage screen's frame, top-aligned
   so a warning appearing under the drop box moves nothing above it. */
.default-app-container.cal-prepare {
    justify-content: flex-start;
    padding-top: var(--space-7);
    overflow-y: auto;
}

/* Prepare's title: the footage screen's display size, at a fixed top margin. */
.cal-prepare-title {
    margin-top: var(--space-5);
    font-family: var(--font-display);
    font-size: var(--text-display);
    font-weight: 700;
    line-height: 1.1;
    text-wrap: balance;
}

/* One subdued line under the title saying what a profile is for. */
.cal-prepare-lede {
    max-width: 60ch;
    margin: var(--space-2) 0 var(--space-7);
    font-size: var(--text-section);
    color: var(--text-subdued);
    text-align: center;
    text-wrap: balance;
}

/* The two steps side by side, on the footage screen's 850px column. */
.cal-prepare-steps {
    width: 850px;
    max-width: calc(100% - 2 * var(--space-5));
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-7);
    align-items: start;
}

/* Step heading: numeral badge then the step name, at the browse header's size. */
.cal-prepare-step-head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: 0 0 var(--space-3);
    font-family: var(--font-display);
    font-size: var(--text-title);
    font-weight: 700;
}

/* The step numeral: outlined while pending; the order is the instruction. */
.cal-prepare-num {
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-full);
    display: grid;
    place-items: center;
    border: 1.5px solid var(--text-subdued);
    color: var(--text-subdued);
    font-family: Inter, system-ui, sans-serif;
    font-size: var(--text-meta);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.cal-prepare-num.done {
    border-color: var(--accent-color);
    background: var(--accent-color);
    color: var(--on-accent);
}

/* The sentence under each step heading. */
.cal-prepare-text {
    margin: 0 0 var(--space-3);
    font-size: var(--text-body);
    line-height: 1.55;
    color: var(--text-subdued);
}

/* Shooting tips: icon then text, the same things the solver later grades. */
.cal-prepare-tips {
    list-style: none;
    margin: 0 0 var(--space-5);
    padding: 0;
    display: grid;
    gap: var(--space-2);
}

.cal-prepare-tips li {
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: var(--space-2);
    align-items: start;
    font-size: var(--text-body);
    line-height: 1.45;
}

.cal-prepare-tips svg {
    margin-top: 1px;
    color: var(--text-subdued);
}

/* "Already have photos?" caption under Show board. */
.cal-prepare-skip {
    margin: var(--space-3) 0 0;
    font-size: var(--text-caption);
    color: var(--text-subdued);
}

/* The only drop target in calibration: the footage screen's dashed box,
   sized for a column. Solid on the panel surface once a folder is loaded. */
.cal-prepare-drop {
    height: 212px;
    border: 1px dashed color-mix(in srgb, var(--text-subdued) 60%, transparent);
    border-radius: var(--radius-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-4);
    text-align: center;
    transition: border-color 0.2s ease, background-color 0.2s ease;
}

.cal-prepare-drop.loaded {
    border-style: solid;
    border-color: var(--border-color);
    background: var(--surface-panel);
}

.cal-prepare-drop.drag-over {
    border-color: var(--text-primary);
}

/* "Drag a folder of photos here" / "Reading photos…" inside the box. */
.cal-prepare-hint {
    margin: 0;
    font-size: var(--text-body);
    color: var(--text-subdued);
}

/* The loaded folder's name, truncated; its full path is in the title. */
.cal-prepare-folder {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    max-width: 100%;
    margin: 0;
    font-size: var(--text-section);
    font-weight: 600;
}

.cal-prepare-folder span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal-prepare-folder svg {
    flex: none;
    color: var(--text-subdued);
}

/* "24 photos · 5312 × 2988 px" under the folder name. */
.cal-prepare-count {
    margin: calc(-1 * var(--space-2)) 0 0;
    font-size: var(--text-meta);
    color: var(--text-subdued);
    font-variant-numeric: tabular-nums;
}

/* Too-few warning or empty-folder error under the box: icon then text. */
.cal-prepare-note {
    display: grid;
    grid-template-columns: 16px 1fr;
    gap: var(--space-2);
    margin: var(--space-3) 0 0;
    font-size: var(--text-meta);
    line-height: 1.45;
}

/* The too-few icon takes the fair grade's colour; the text stays primary. */
.cal-prepare-warn-icon {
    margin-top: 1px;
    color: var(--status-fair);
}

/* The empty-folder icon takes the bad grade's colour. */
.cal-prepare-error-icon {
    margin-top: 1px;
    color: var(--status-bad);
}

/* Back/Solve sit a fixed step under the columns, not pushed to the window edge. */
.cal-prepare .wizard-container {
    margin-top: var(--space-6);
}
```

- [ ] **Step 6: Run the tests and the type check**

Run: `npx jest src/helpers/calibrationLayout.test.ts src/helpers/canvasChrome.test.ts && npx tsc --noEmit`
Expected: PASS. If the Phase 6e block test reports a bare selector, the rule above it is missing its comment or does not continue the previous rule's first class — fix the CSS, not the test.

- [ ] **Step 7: Commit**

```bash
git add src/components/Calibration/CalibrationPrepare.tsx src/components/Calibration/index.ts src/pages/pages.css src/translations/en/global.json src/helpers/calibrationLayout.test.ts src/helpers/canvasChrome.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Add the camera calibration Prepare screen"
```

---

### Task 4: Slim the calibration panel and end with the saved block

**Files:**
- Create: `src/components/Forms/Components/CalibrationSavedBlock.tsx`
- Modify: `src/components/Forms/FormCalibration.tsx`
- Modify: `src/pages/CameraCalibration.tsx:174-189` (props only)
- Modify: `src/pages/pages.css` (Phase 6e block, before `/* ── Lens correction settings rows`)
- Modify: `src/translations/en/global.json`
- Test: `src/helpers/calibrationLayout.test.ts`

**Interfaces:**
- Consumes: `footerAction({ …, saved })` returning `kind: 'done'`, `profileDisplayPath` (Task 1).
- Produces:
  - `CalibrationSavedBlock({ filePath: string; camera: string; lens: string; onShowInFolder: () => void; onCalibrateAnother: () => void })`
  - `FormCalibration` props become: `status, imageCount, summary, csvRows, imageResolution, progressPercentage, progressTime, errorMsg, onSolve, onSaveProfile, onRevealPath, onBack: () => void, onDone: () => void, onCalibrateAnother: () => void` (removed: `onOpenBoard`, `onOpenFolder`, `onClose`).

- [ ] **Step 1: Write the failing tests**

In `src/helpers/calibrationLayout.test.ts`, inside `describe('FormCalibration', …)`, add:

```ts
  it('leaves importing and the board to the Prepare screen', () => {
    expect(form).not.toMatch(/onOpenBoard|onOpenFolder|DropHereText/);
  });

  it('ends with the saved block instead of the green banner', () => {
    expect(form).not.toMatch(/SuccessBanner/);
    expect(form).toMatch(/<CalibrationSavedBlock\b/);
    expect(form).toMatch(/footerAction\(\{[^}]*saved: saved !== null/s);
    expect(form).toMatch(/action\.kind === ['"]done['"]/);
  });

  it('blocks Back while a solve runs', () => {
    expect(form).toMatch(/aria-disabled=\{busy\}[\s\S]*?if \(busy\) return;\s*onBack\(\);/);
  });
```

and a new top-level block:

```ts
describe('CalibrationSavedBlock', () => {
  const block = read('components/Forms/Components/CalibrationSavedBlock.tsx');

  it("uses the report's saved-block classes and two real buttons", () => {
    expect(block).toMatch(/className=["']summary-saved["']/);
    expect(block).toMatch(/className=["']summary-saved-check["']/);
    expect(block).toMatch(/className=["']panel-actions["']/);
    expect((block.match(/btn btn-secondary panel-action/g) ?? []).length).toBe(2);
    expect(block).toMatch(/profileDisplayPath\(filePath\)/);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/helpers/calibrationLayout.test.ts`
Expected: FAIL — `FormCalibration` still mentions `onOpenBoard`; `CalibrationSavedBlock.tsx` missing.

- [ ] **Step 3: Add the strings**

In `src/translations/en/global.json`, inside `"Calibration"`, after the `"prepare": { … },` object:

```json
    "saved": {
      "title": "Camera profile saved",
      "showInFolder": "Show in folder",
      "calibrateAnother": "Calibrate another",
      "done": "Done"
    },
```

- [ ] **Step 4: Create the saved block**

`src/components/Forms/Components/CalibrationSavedBlock.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { LuCheck } from 'react-icons/lu';
import { profileDisplayPath } from '../../../helpers/calibrationView';

/**
 * What the calibration panel shows once a profile is really on disk: the
 * report's saved block (accent check, what was saved, two real buttons).
 */
export const CalibrationSavedBlock = ({
  filePath,
  camera,
  lens,
  onShowInFolder,
  onCalibrateAnother,
}: {
  filePath: string;
  camera: string;
  lens: string;
  onShowInFolder: () => void;
  onCalibrateAnother: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="summary-saved" role="status">
      <p className="summary-saved-head">
        <span className="summary-saved-check">
          <LuCheck size={13} strokeWidth={3} aria-hidden="true" />
        </span>
        {t('Calibration.saved.title')}
      </p>
      <p className="cal-saved-names">
        {camera} · {lens}
        <small title={filePath}>{profileDisplayPath(filePath)}</small>
      </p>
      <div className="panel-actions">
        <button type="button" className="btn btn-secondary panel-action" onClick={onShowInFolder}>
          {t('Calibration.saved.showInFolder')}
        </button>
        <button type="button" className="btn btn-secondary panel-action" onClick={onCalibrateAnother}>
          {t('Calibration.saved.calibrateAnother')}
        </button>
      </div>
    </div>
  );
};
```

CSS, in `src/pages/pages.css` right after the Task 3 rules (still before `/* ── Lens correction settings rows`):

```css
/* Saved profile: "Camera · Lens" and the profile path, indented to the
   saved block's text (past the 22px check and its gap). */
.cal-saved-names {
    margin: 0 0 var(--space-3);
    padding: 0 var(--space-2) 0 calc(22px + var(--space-2) * 2);
    font-size: var(--text-body);
}

.cal-saved-names small {
    display: block;
    margin-top: 2px;
    font-size: var(--text-caption);
    color: var(--text-subdued);
    overflow-wrap: anywhere;
}
```

- [ ] **Step 5: Rewrite `FormCalibration`**

In `src/components/Forms/FormCalibration.tsx`:

1. Imports — replace the first five import lines with:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { FormHeader } from './Components';
import { CalibrationSavedBlock } from './Components/CalibrationSavedBlock';
```

2. Props interface — replace `onOpenBoard`, `onOpenFolder` and `onClose` with:

```ts
  /** Back to the Prepare screen. */
  onBack: () => void;
  /** Saved: reset and close to Home. */
  onDone: () => void;
  /** Saved: reset and start over on an empty Prepare screen. */
  onCalibrateAnother: () => void;
```

and update the destructuring to match (`onSolve, onSaveProfile, onRevealPath, onBack, onDone, onCalibrateAnother`).

3. Update the component's doc comment to: `Camera calibration's panel: header, scrolling body, and the standard footer whose right-hand button is Solve until solved, Save profile after, and Done once saved.`

4. Replace `const [savedPath, setSavedPath] = useState<string | null>(null);` with:

```ts
  const [saved, setSaved] = useState<{ path: string; camera: string; lens: string } | null>(null);
```

In the "fresh solve clears the previous save" effect, replace `setSavedPath(null);` with `setSaved(null);`.

5. Footer action:

```ts
  const action = footerAction({ status, imageCount, cameraName, lensName, saved: saved !== null });
```

6. `handleSave`:

```ts
  const handleSave = async () => {
    setSaveError(null);
    const camera = cameraName.trim();
    const lens = lensName.trim();
    const result = await onSaveProfile(cameraName, lensName);
    if (result) {
      setSaved({ path: result, camera, lens });
      setCameraName('');
      setLensName('');
    } else {
      setSaveError(t('Calibration.errorGeneric'));
    }
  };
```

7. In the body: delete the whole `<div className="input-container-2 mt-1">` holding the board/import buttons, the `{imageCount === 0 && (<DropHereText … />)}` block, and the `{imageCount > 0 && status === 'idle' && ( … Photos … )}` block. The body now starts with the `status === 'solving'` loader.

8. In the solved branch, replace everything from `<span className="divider-line mt-2 mb-1" />` through the closing of the `{savedPath && ( … SuccessBanner … )}` block with:

```tsx
            {saved ? (
              <CalibrationSavedBlock
                filePath={saved.path}
                camera={saved.camera}
                lens={saved.lens}
                onShowInFolder={() => onRevealPath(saved.path)}
                onCalibrateAnother={onCalibrateAnother}
              />
            ) : (
              <>
                <span className="divider-line mt-2 mb-1" />
                <h3 className="cal-section-title">
                  {t('Calibration.saveSection', { defaultValue: 'Save as camera profile' })}
                </h3>
                <div className="input-container-2 mt-1">
                  <label className="read-only me-1" htmlFor="cal-camera-name">
                    {t('Calibration.cameraName')}
                  </label>
                  <div className="input-field-container cal-combo">
                    <input
                      id="cal-camera-name"
                      type="text"
                      className="input-field"
                      value={cameraName}
                      onChange={(e) => {
                        setCameraName(e.target.value);
                        setComboOpen(true);
                      }}
                      onFocus={() => setComboOpen(true)}
                      onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                    />
                    {comboOpen && cameraSuggestions.length > 0 && (
                      <ul className="cal-combo-list">
                        {cameraSuggestions.map((c) => (
                          <li
                            key={c}
                            onMouseDown={() => {
                              setCameraName(c);
                              setComboOpen(false);
                            }}
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="input-container-2 mt-1">
                  <label className="read-only me-1" htmlFor="cal-lens-name">
                    {t('Calibration.lensName')}
                  </label>
                  <div className="input-field-container">
                    <input
                      id="cal-lens-name"
                      type="text"
                      className="input-field"
                      value={lensName}
                      onChange={(e) => setLensName(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
```

These are the two existing rows, unchanged, now inside the fragment (delete them from their old place). Keep the existing `{saveError && ( … )}` alert right after the ternary.

9. Footer — replace the two buttons with:

```tsx
          <button
            type="button"
            className="btn btn-lg btn-tertiary"
            aria-disabled={busy}
            title={busy ? t('Calibration.solving') : undefined}
            onClick={() => {
              if (busy) return;
              onBack();
            }}
          >
            {t('Wizard.back')}
          </button>
          <button
            type="button"
            className="btn btn-lg btn-primary"
            aria-disabled={action.blocker !== null}
            aria-busy={action.busy ? true : undefined}
            title={blockerText(action.blocker)}
            onClick={() => {
              if (action.blocker !== null) return;
              if (action.kind === 'solve') onSolve();
              else if (action.kind === 'save') void handleSave();
              else onDone();
            }}
          >
            {action.kind === 'solve'
              ? t('Calibration.solve')
              : action.kind === 'save'
                ? t('Calibration.saveProfile')
                : t('Calibration.saved.done')}
          </button>
```

- [ ] **Step 6: Keep the page compiling**

In `src/pages/CameraCalibration.tsx`, add `onReset` to the `useCalibrationSlice()` destructuring, and change the `<FormCalibration … />` props: remove `onOpenBoard`, `onOpenFolder` and `onClose`, add

```tsx
            onBack={onClose}
            onDone={() => {
              onReset();
              onClose();
            }}
            onCalibrateAnother={onReset}
```

(Task 5 points `onBack` and `onCalibrateAnother` at the Prepare screen.)

- [ ] **Step 7: Run tests, type check and lint**

Run: `npx jest src/helpers && npx tsc --noEmit && npm run lint`
Expected: all PASS. `loaderRetirement.test.ts` still finds `<ProgressReadout` in FormCalibration; the `.cal-*` unused-rule sweep finds `cal-saved-names` in the new block.

- [ ] **Step 8: Commit**

```bash
git add src/components/Forms/Components/CalibrationSavedBlock.tsx src/components/Forms/FormCalibration.tsx src/pages/CameraCalibration.tsx src/pages/pages.css src/translations/en/global.json src/helpers/calibrationLayout.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "End camera calibration with the report's saved block and drop import controls from the panel"
```

---

### Task 5: Wire the stages in the calibration page

**Files:**
- Modify: `src/pages/CameraCalibration.tsx`
- Test: `src/helpers/calibrationLayout.test.ts`

**Interfaces:**
- Consumes: `initialStage`, `CalibrationStage` (Task 1); `CalibrationPrepare` (Task 3); `FormCalibration`'s `onBack`, `onDone`, `onCalibrateAnother` (Task 4); `onReset`, `imageDir`, `onOpenFolder`, `onDropFolder`, `onOpenBoard` from `useCalibrationSlice`.

- [ ] **Step 1: Write the failing tests**

In `describe('the calibration page', …)` of `src/helpers/calibrationLayout.test.ts`, replace the `'is built on the standard workspace'` test with:

```ts
  it('opens on Prepare and shows the standard workspace only after Solve', () => {
    expect(page).toMatch(/useState<CalibrationStage>\(\(\) => initialStage\(status\)\)/);
    expect(page).toMatch(/if \(stage === ['"]prepare['"]\)/);
    expect(page).toMatch(/<CalibrationPrepare\b/);
    expect(page).toMatch(/setStage\(['"]workspace['"]\);\s*void onSolve\(\);/);
    expect(page).toMatch(/className=["']regular-page["']/);
    expect(page).toMatch(/className=["']media-container["']/);
    expect(page).toMatch(/className=["']form-container["']/);
    expect(page).toMatch(/<FormCalibration\b/);
  });

  it('has no drop target outside Prepare', () => {
    expect(page).not.toMatch(/onDrop=|onDragOver=|drag-over/);
  });

  it('sends Esc back to Prepare, never while a solve runs', () => {
    expect(page).toMatch(/else if \(status !== ['"]solving['"]\) setStage\(['"]prepare['"]\)/);
  });

  it('starts over on Prepare from the saved block, and closes from Done', () => {
    expect(page).toMatch(/onCalibrateAnother=\{\(\) => \{\s*onReset\(\);\s*setStage\(['"]prepare['"]\);/);
    expect(page).toMatch(/onDone=\{\(\) => \{\s*onReset\(\);\s*onClose\(\);/);
    expect(page).toMatch(/onBack=\{\(\) => setStage\(['"]prepare['"]\)\}/);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/helpers/calibrationLayout.test.ts -t "the calibration page"`
Expected: FAIL on `initialStage`.

- [ ] **Step 3: Implement**

In `src/pages/CameraCalibration.tsx`:

1. Imports:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useCalibrationSlice } from '../hooks';
import { FormCalibration } from '../components/Forms';
import {
  CalibrationCanvas,
  CalibrationPrepare,
  CalibrationStrip,
  CalibrationViewControl,
} from '../components/Calibration';
import { toCalFileUrl } from '../helpers/calFileUrl';
import {
  initialStage,
  viewAvailability,
  viewForKey,
  type CalibrationStage,
  type CalibrationViewMode,
} from '../helpers/calibrationView';
```

2. Doc comment: `Camera calibration, a full-screen overlay launched from Home. It opens on the Prepare screen (show the board, import photos); Solve moves to the standard workspace (canvas and strip left, FormCalibration right). This page owns the stage, selection, view mode and keyboard.`

3. Add `imageDir` and `onReset` to the `useCalibrationSlice()` destructuring (keep `onOpenFolder`, `onDropFolder`, `onOpenBoard`, `onSolve`).

4. Replace `const [dragOver, setDragOver] = useState(false);` with:

```ts
  const [stage, setStage] = useState<CalibrationStage>(() => initialStage(status));
```

5. Replace the keyboard effect's handler body with:

```ts
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (stage === 'prepare') {
        if (e.key === 'Escape') onClose();
        return;
      }
      if (e.key === 'Escape') {
        if (viewMode === 'heatmap') setViewMode('original');
        else if (status !== 'solving') setStage('prepare');
        return;
      }
      if (e.key === 'ArrowLeft') {
        setSelectedIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        setSelectedIdx((i) => Math.min(images.length - 1, i + 1));
        return;
      }
      const mode = viewForKey(e.key);
      if (mode && availability[mode] === null) setViewMode(mode);
    };
```

and its dependency list with `[stage, status, images.length, viewMode, availability, onClose]`.

6. Delete the whole `handleDrop` `useCallback` (it now lives in `CalibrationPrepare`), and drop `useCallback` from the React import (done in 1).

7. Before the workspace `return`, add:

```tsx
  if (stage === 'prepare') {
    return (
      <div className="cal-overlay">
        <CalibrationPrepare
          imageDir={imageDir}
          imageCount={images.length}
          imageResolution={imageResolution}
          onOpenBoard={() => void onOpenBoard()}
          onOpenFolder={onOpenFolder}
          onDropFolder={onDropFolder}
          onSolve={() => {
            setStage('workspace');
            void onSolve();
          }}
          onClose={onClose}
        />
      </div>
    );
  }
```

8. In the workspace JSX, replace the `<div className={`form-container…`} onDragOver=… onDrop={handleDrop}>` opening tag with `<div className="form-container">`, and set the `FormCalibration` callbacks to:

```tsx
            onBack={() => setStage('prepare')}
            onDone={() => {
              onReset();
              onClose();
            }}
            onCalibrateAnother={() => {
              onReset();
              setStage('prepare');
            }}
```

- [ ] **Step 4: Run the full suite, type check and lint**

Run: `npx jest && npx tsc --noEmit && npm run lint`
Expected: all PASS, including `canvasChrome.test.ts` and `homeRecentsLayout.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CameraCalibration.tsx src/helpers/calibrationLayout.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Open camera calibration on the Prepare screen and move to the workspace on Solve"
```

---

### Task 6: In-app check in three themes

**Files:** none unless a defect is found (fix in the owning file, re-run Task 5 Step 4, commit `Fix <what> in the calibration flow`).

- [ ] **Step 1: Launch the app**

Use the `run` skill (or `npm run dev` from `gui/`). Open Home → toolbar **Camera Calibration**.

- [ ] **Step 2: Walk every state, in dark, light and dracula** (switch with the Home theme toggle; reopen calibration each time)

- Prepare empty: two steps, Solve dimmed with tooltip "Import photos first".
- Show board opens the full-screen board window.
- Open folder → cancel the dialog: nothing changes, no error.
- Open folder → a folder with ≥15 photos: "Reading photos…", then folder name, "N photos · W × H px", step 2 badge becomes the check, Solve enabled.
- A folder with 1–14 photos: warning under the box, Solve still enabled.
- A folder with no images: "No images found in the selected folder", box back to empty.
- Drag a folder onto the box (border highlights, loads); drag one onto the title area (nothing happens, app does not navigate).
- Solve: workspace opens, progress readout runs; Back and Esc do nothing while solving.
- Solved: grades, tips, histogram; Esc (not in Heatmap) and Back return to Prepare with the folder kept; Solve again from Prepare works.
- Save profile: saved block with "Camera · Lens" and `calibration_profiles/…/profile.json`; Show in folder reveals it; footer says Done.
- Calibrate another → empty Prepare. Done → Home; reopening shows empty Prepare.
- Close from Prepare with photos loaded, reopen: Prepare shows the same folder loaded.

- [ ] **Step 3: Run the design detector once over the changed UI**

Run: `"/Users/antoine/.claude/plugins/cache/impeccable/impeccable/4.3.1/skills/impeccable/scripts/impeccable" detect --json src/components/Calibration/CalibrationPrepare.tsx src/components/Forms/Components/CalibrationSavedBlock.tsx src/components/Forms/FormCalibration.tsx src/pages/pages.css`
Expected: no new findings in the new code; triage any that appear.

- [ ] **Step 4: Report** what was checked per theme, with screenshots of Prepare (empty, loaded, too few) and the saved block in each theme.
