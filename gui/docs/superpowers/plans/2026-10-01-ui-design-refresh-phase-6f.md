# Phase 6f — Home: Recent Projects & Halo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Home a "Recent projects" row (three tiles, click to reopen without a folder picker) and the audit's theme wash: a radial bloom on Home and a linear band at the top of the Results panel.

**Architecture:** All recents logic (parse, record, dedupe, cap, drop-missing, name and date formatting) lives in one pure helper, `src/helpers/recentProjects.ts`, which takes a `Storage`-shaped object so Jest can test it without a DOM. The main process gains one read-only channel, `projects-exist`, and `load-project` gains an optional `{ directory }` argument, resolved by a small pure util so the dialog-skipping branch is unit-testable. `useProjectSlice` records a project on create (`onInitProject`) and on load (`onLoadProject`). A new `RecentProjects` component validates the stored list on mount and renders the tiles, and `HomePage` wires it to the same open flow the Load button uses. CSS lives in a commented Phase 6f block in `src/pages/pages.css`, plus one rule in `form.css` for the Results panel.

**Tech Stack:** Electron, React 18.3.1, TypeScript, Redux Toolkit, Jest 29 + ts-jest (`testEnvironment: "node"`, **no DOM**), i18next.

**Spec:** `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md`: §4/6f and **amendment A14** (§9, "2026-10-01 — 6f design and preview"). Read A14 before starting. Where it disagrees with §4/6f, A14 wins.

**Approved preview:** `docs/superpowers/previews/2026-10-01-phase-6f-home-recents-halo.html`, approved by the product owner on 2026-10-01. It is the binding visual reference. Its `NEW, PROPOSED` CSS block is the source the CSS in Tasks 4–6 is ported from.

---

## Global Constraints

Every task's requirements implicitly include this section.

- Git author must be `antoine.patalano@gmail.com`. Never commit to `main` or `river-labs`. The branch `ui/design-refresh` stays unmerged.
- All work happens in the worktree `/Users/antoine/river_compil/.worktrees/ui-design-refresh/gui`. **Never `cd` to the original repository root.**
- **Never edit `src/translations/*/global.json`.** New copy uses `t(key, { defaultValue })` only. The footage-type labels reuse the existing `Step-2.footageType.<id>` keys (same `defaultValue`s `FootageMode.tsx` uses).
- **Never use bare `git stash` / `git stash pop`**, because the stash stack is shared with other worktrees. Prefer a temporary WIP commit.
- **Never run `git checkout -- <file>`** to undo an experiment. Undo with an editor.
- Contrast floors in `src/helpers/themeStateContrast.test.ts` **may never be lowered**, and no existing assertion in any test file may be weakened, deleted or have its threshold reduced. Adding new pairs is expected (Task 4).
- The lint command is **`npm run lint`** exactly.
- Baseline at the start of 6f (measured 2026-10-01 against `192e0a3`): **70 suites / 743 tests passing**, `npx tsc --noEmit` **64 errors**, `npm run lint` **20 problems (17 errors, 3 warnings)**. None may regress. Each task states its expected new counts.
- **Commit trailers:** follow the project owner's standing rule, which is no `Co-Authored-By` line (`.claude/skills/river-git`). If the executing session's system prompt explicitly overrides that rule, follow the session and say so in the task report. Never copy a model name from this plan.
- Existing copy stays: the start buttons keep `MainPage.start` / `MainPage.loadProject`. The preview's "New project" label was illustrative.

### Carried-over contracts from 6a–6e. Read before writing any state

1. **Token collapse.** `--surface-raised` ≡ `--surface-panel` exactly in all three themes, and Home has no panel at all: it paints `--background-color`. Tile surfaces are a `color-mix()` of `--primary-text-color` over transparent. **Never** use a swapped surface token for a tile state.
2. **A guard can fail green.** Every source-text sweep this plan adds has a canary asserting it still sees something known to be present.
3. **No DOM in Jest.** Layout, spacing and cascade are verified by the approved preview and the manual three-theme walkthrough (Task 7), not by Jest.
4. **React renders `aria-x={false}` as the string `"false"`.** This plan adds no `aria-*` booleans. If you find yourself adding one, pass `undefined` to omit it.
5. `.default-app-container` is shared by `App.tsx`, `FootageMode.tsx` and `HomePage.tsx`. **Only Home gets the halo**, through a `home-halo` modifier selected as `.default-app-container.home-halo`. That gives specificity 0,2,0, so the halo wins regardless of whether `index.css` or `pages.css` loads last.

---

## Review Focus

- **The `projects-exist` call rejects** (main process error, or a dev build without the handler). Home must still show the stored recents, unvalidated, and must **not** write the list back. Erasing everyone's recents because one IPC failed would be the worst outcome. Pinned by Task 4's source-text test on the `.catch` branch, and by Task 1's `keepExisting` tests on the write path.
- **Corrupt or foreign `localStorage` content** (non-JSON, a non-array, entries with a missing directory, an unknown footage type or a non-numeric date). Home must render as on first launch, never throw. Pinned by Task 1's `parseRecentProjects` tests.
- **The same project opened twice, or created over an existing folder.** It appears once, moved to the front with the new date, never as a duplicate tile. Pinned by Task 1's `withRecentProject` dedupe test.
- **A folder deleted between Home mounting and the click.** `load-project` with a `directory` must take the same `noSettingsFile` error path as the picker, so the user sees the existing translated alert rather than a crash or a silent no-op. Pinned by Task 2's `resolveProjectFolder` tests (the directory is returned as-is and the existing `settings.json` check runs on it) and by Task 3's test that the hook passes the directory through.
- **Windows paths and trailing separators** (`C:\Users\x\River\Station_04\`). The tile name must be `Station_04`, not empty. Pinned by Task 1's `projectName` tests.

---

## File Structure

**Created**

- `src/helpers/recentProjects.ts`: pure recents logic and the footage label map.
- `src/helpers/recentProjects.test.ts`
- `electron/ipcMainHandlers/utils/resolveProjectFolder.ts`: picks the folder from `{ directory }` or the dialog callback.
- `electron/ipcMainHandlers/utils/resolveProjectFolder.test.ts`
- `electron/ipcMainHandlers/projectsExist.ts`: the `projects-exist` handler and its pure core.
- `electron/ipcMainHandlers/projectsExist.test.ts`
- `src/components/RecentProjects.tsx`: validates on mount, renders up to three tiles.
- `src/helpers/homeRecentsLayout.test.ts`: source-text guards for the hook, component, Home and CSS. Created in Task 3 and extended through Task 6.

**Modified**

- `electron/ipcMainHandlers/loadProject.ts`: optional `directory` argument.
- `electron/ipcMainHandlers/index.ts`, `electron/main.ts`: register `projectsExist`.
- `src/hooks/useProjectSlice.ts`: `onLoadProject(directory?)`, recording in both paths.
- `src/components/index.ts`: export `RecentProjects`.
- `src/pages/HomePage.tsx`: `home-halo`, the open flow and `<RecentProjects>`.
- `src/pages/pages.css`: Home rules updated, plus a new commented `HOME — RECENT PROJECTS & HALO (Phase 6f)` block.
- `src/components/Forms/form.css`: `.form-container.results-wash`.
- `src/pages/Results.tsx`: adds `results-wash` to its `.form-container`.
- `src/helpers/themeStateContrast.test.ts`: six new floor pairs.

---

### Task 1: Pure recents helper

**Files:**
- Create: `src/helpers/recentProjects.ts`
- Test: `src/helpers/recentProjects.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (later tasks import exactly these names):
  - `type FootageType = 'uav' | 'oblique' | 'ipcam'`
  - `interface RecentProject { directory: string; type: FootageType; openedAt: number }` (`openedAt` is epoch milliseconds)
  - `RECENT_PROJECTS_KEY = 'river-recent-projects'`, `MAX_STORED_RECENT_PROJECTS = 6`, `SHOWN_RECENT_PROJECTS = 3`
  - `FOOTAGE_LABELS: Record<FootageType, string>`
  - `type StorageLike = Pick<Storage, 'getItem' | 'setItem'>`
  - `parseRecentProjects(raw: string | null): RecentProject[]`
  - `readRecentProjects(storage: StorageLike): RecentProject[]`
  - `writeRecentProjects(storage: StorageLike, list: readonly RecentProject[]): void`
  - `withRecentProject(list: readonly RecentProject[], entry: RecentProject): RecentProject[]`
  - `recordRecentProject(storage: StorageLike, directory: string, type: string, now: number): void`
  - `keepExisting(list: readonly RecentProject[], existing: readonly string[]): RecentProject[]`
  - `projectName(directory: string): string`
  - `formatOpenedDate(openedAt: number, now: number, locale: string): string`

Six are stored but three are shown, so that dropping a moved project still leaves three tiles when the user has more history.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/recentProjects.test.ts`:

```ts
import {
  FOOTAGE_LABELS,
  MAX_STORED_RECENT_PROJECTS,
  RECENT_PROJECTS_KEY,
  type RecentProject,
  formatOpenedDate,
  keepExisting,
  parseRecentProjects,
  projectName,
  readRecentProjects,
  recordRecentProject,
  withRecentProject,
  writeRecentProjects,
} from './recentProjects';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};

const p = (directory: string, openedAt: number, type: RecentProject['type'] = 'uav'): RecentProject => ({
  directory,
  type,
  openedAt,
});

describe('parseRecentProjects', () => {
  it('returns [] for null, empty, non-JSON and non-array input', () => {
    expect(parseRecentProjects(null)).toEqual([]);
    expect(parseRecentProjects('')).toEqual([]);
    expect(parseRecentProjects('{not json')).toEqual([]);
    expect(parseRecentProjects('{"directory":"/a"}')).toEqual([]);
  });

  it('drops entries with a missing directory, unknown type or non-numeric date', () => {
    const raw = JSON.stringify([
      p('/ok', 3),
      { directory: '', type: 'uav', openedAt: 1 },
      { directory: '/t', type: 'satellite', openedAt: 1 },
      { directory: '/d', type: 'uav', openedAt: 'yesterday' },
      { directory: '/n', type: 'uav', openedAt: null },
      null,
      'string',
    ]);
    expect(parseRecentProjects(raw)).toEqual([p('/ok', 3)]);
  });

  it('sorts newest first and caps at MAX_STORED_RECENT_PROJECTS', () => {
    const many = Array.from({ length: 9 }, (_, i) => p(`/p${i}`, i));
    const out = parseRecentProjects(JSON.stringify(many));
    expect(out).toHaveLength(MAX_STORED_RECENT_PROJECTS);
    expect(out[0].directory).toBe('/p8');
  });
});

describe('withRecentProject', () => {
  it('puts the entry first and removes an older copy of the same directory', () => {
    const list = [p('/a', 2), p('/b', 1)];
    expect(withRecentProject(list, p('/b', 9, 'ipcam'))).toEqual([p('/b', 9, 'ipcam'), p('/a', 2)]);
  });

  it('caps the list', () => {
    const list = Array.from({ length: MAX_STORED_RECENT_PROJECTS }, (_, i) => p(`/p${i}`, 10 - i));
    const out = withRecentProject(list, p('/new', 99));
    expect(out).toHaveLength(MAX_STORED_RECENT_PROJECTS);
    expect(out[0].directory).toBe('/new');
  });
});

describe('storage round trip', () => {
  it('recordRecentProject writes under RECENT_PROJECTS_KEY and readRecentProjects reads it back', () => {
    const s = fakeStorage();
    recordRecentProject(s, '/x/Station_04', 'ipcam', 100);
    expect(JSON.parse(s.data[RECENT_PROJECTS_KEY])).toEqual([p('/x/Station_04', 100, 'ipcam')]);
    expect(readRecentProjects(s)).toEqual([p('/x/Station_04', 100, 'ipcam')]);
  });

  it('recordRecentProject ignores an empty directory or an unknown footage type', () => {
    const s = fakeStorage();
    recordRecentProject(s, '', 'uav', 1);
    recordRecentProject(s, '/a', 'satellite', 1);
    expect(s.data[RECENT_PROJECTS_KEY]).toBeUndefined();
  });

  it('readRecentProjects survives a storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readRecentProjects(throwing)).toEqual([]);
    expect(() => writeRecentProjects(throwing, [p('/a', 1)])).not.toThrow();
  });
});

describe('keepExisting', () => {
  it('keeps only directories reported as existing, in their original order', () => {
    const list = [p('/a', 3), p('/b', 2), p('/c', 1)];
    expect(keepExisting(list, ['/c', '/a'])).toEqual([p('/a', 3), p('/c', 1)]);
  });

  it('keeps nothing when nothing exists', () => {
    expect(keepExisting([p('/a', 1)], [])).toEqual([]);
  });
});

describe('projectName', () => {
  it.each([
    ['/Users/antoine/River/Yanuncay_CS1', 'Yanuncay_CS1'],
    ['/Users/antoine/River/Yanuncay_CS1/', 'Yanuncay_CS1'],
    ['C:\\Users\\x\\River\\Station_04', 'Station_04'],
    ['C:\\Users\\x\\River\\Station_04\\', 'Station_04'],
    ['Solo', 'Solo'],
  ])('%s -> %s', (dir, name) => {
    expect(projectName(dir)).toBe(name);
  });
});

describe('formatOpenedDate', () => {
  const now = Date.UTC(2026, 9, 1, 12);

  it('omits the year inside the current year', () => {
    expect(formatOpenedDate(Date.UTC(2026, 5, 28, 12), now, 'en-GB')).toBe('28 Jun');
  });

  it('adds the year for an earlier year', () => {
    expect(formatOpenedDate(Date.UTC(2025, 2, 3, 12), now, 'en-GB')).toBe('3 Mar 2025');
  });

  it('localises', () => {
    expect(formatOpenedDate(Date.UTC(2026, 5, 28, 12), now, 'en-US')).toBe('Jun 28');
  });

  it('falls back to English for an invalid locale tag', () => {
    expect(() => formatOpenedDate(Date.UTC(2026, 5, 28, 12), now, '!!')).not.toThrow();
    expect(formatOpenedDate(Date.UTC(2026, 5, 28, 12), now, '!!')).toMatch(/28/);
  });
});

it('labels every footage type with the copy FootageMode uses', () => {
  expect(FOOTAGE_LABELS).toEqual({ uav: 'Drone', oblique: 'Oblique', ipcam: 'Fixed camera' });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/recentProjects.test.ts`
Expected: FAIL with "Cannot find module './recentProjects'".

- [ ] **Step 3: Write the implementation**

Create `src/helpers/recentProjects.ts`:

```ts
/**
 * Recent projects on Home (spec §4/6f, amendment A14).
 *
 * Stored in renderer localStorage, like `language` and `unitSystem`. Every
 * function here is pure apart from the Storage it is handed, so Jest can test
 * it without a DOM. Storage failures (private mode, quota) are swallowed:
 * recents are a convenience and must never break opening a project.
 */
export type FootageType = 'uav' | 'oblique' | 'ipcam';

export interface RecentProject {
  directory: string;
  type: FootageType;
  /** Epoch milliseconds of the last create or load. */
  openedAt: number;
}

export const RECENT_PROJECTS_KEY = 'river-recent-projects';
/** More are kept than shown, so dropping a moved project still leaves three. */
export const MAX_STORED_RECENT_PROJECTS = 6;
export const SHOWN_RECENT_PROJECTS = 3;

/** Same English copy as FootageMode's tiles; used as the t() defaultValue. */
export const FOOTAGE_LABELS: Record<FootageType, string> = {
  uav: 'Drone',
  oblique: 'Oblique',
  ipcam: 'Fixed camera',
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const isFootageType = (v: unknown): v is FootageType => v === 'uav' || v === 'oblique' || v === 'ipcam';

const isRecentProject = (v: unknown): v is RecentProject => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.directory === 'string' &&
    r.directory !== '' &&
    isFootageType(r.type) &&
    typeof r.openedAt === 'number' &&
    Number.isFinite(r.openedAt)
  );
};

export const parseRecentProjects = (raw: string | null): RecentProject[] => {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter(isRecentProject)
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, MAX_STORED_RECENT_PROJECTS);
};

export const readRecentProjects = (storage: StorageLike): RecentProject[] => {
  try {
    return parseRecentProjects(storage.getItem(RECENT_PROJECTS_KEY));
  } catch {
    return [];
  }
};

export const writeRecentProjects = (storage: StorageLike, list: readonly RecentProject[]): void => {
  try {
    storage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(list.slice(0, MAX_STORED_RECENT_PROJECTS)));
  } catch {
    // Storage full or blocked: recents are a convenience, not a requirement.
  }
};

export const withRecentProject = (list: readonly RecentProject[], entry: RecentProject): RecentProject[] =>
  [entry, ...list.filter((r) => r.directory !== entry.directory)].slice(0, MAX_STORED_RECENT_PROJECTS);

export const recordRecentProject = (storage: StorageLike, directory: string, type: string, now: number): void => {
  if (!directory || !isFootageType(type)) return;
  writeRecentProjects(storage, withRecentProject(readRecentProjects(storage), { directory, type, openedAt: now }));
};

export const keepExisting = (list: readonly RecentProject[], existing: readonly string[]): RecentProject[] => {
  const present = new Set(existing);
  return list.filter((r) => present.has(r.directory));
};

/** The folder name, for POSIX and Windows paths, ignoring a trailing separator. */
export const projectName = (directory: string): string => {
  const parts = directory.split(/[\\/]+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : directory;
};

/** "28 Jun" inside the current year, "3 Mar 2025" otherwise, in the UI language. */
export const formatOpenedDate = (openedAt: number, now: number, locale: string): string => {
  const sameYear = new Date(openedAt).getFullYear() === new Date(now).getFullYear();
  const options: Intl.DateTimeFormatOptions = sameYear
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  try {
    return new Intl.DateTimeFormat(locale, options).format(openedAt);
  } catch {
    return new Intl.DateTimeFormat('en', options).format(openedAt);
  }
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/helpers/recentProjects.test.ts`
Expected: PASS, 20 tests. If the `en-GB` expectations fail with text like `Jun 28`, Node is running without full ICU. Report it; do not change the expectations.

- [ ] **Step 5: Full verification and commit**

Run: `npx jest 2>&1 | tail -4`. Expected: **71 suites / 763 tests** passing. `npx tsc --noEmit 2>&1 | grep -c "error TS"` → 64. `npm run lint` → 20 problems.

```bash
git add src/helpers/recentProjects.ts src/helpers/recentProjects.test.ts
git commit -m "Task 1: Add the pure recent-projects helper"
```

---

### Task 2: Main process: `projects-exist`, and `load-project` with an optional directory

**Files:**
- Create: `electron/ipcMainHandlers/utils/resolveProjectFolder.ts`, `electron/ipcMainHandlers/utils/resolveProjectFolder.test.ts`
- Create: `electron/ipcMainHandlers/projectsExist.ts`, `electron/ipcMainHandlers/projectsExist.test.ts`
- Modify: `electron/ipcMainHandlers/loadProject.ts:108-118` and `:190-198`
- Modify: `electron/ipcMainHandlers/index.ts`, `electron/main.ts` (import list ending at line 39, registration block around line 219)

**Interfaces:**
- Consumes: nothing from Task 1. The main process keeps its own copy of the `settings.json` rule.
- Produces:
  - IPC `projects-exist`: `invoke('projects-exist', dirs: string[]) → Promise<string[]>`, the subset of `dirs` that contain `settings.json`, in input order. A non-array argument returns `[]`, and non-string items are skipped.
  - IPC `load-project`: `invoke('load-project', { directory: string })` skips the dialog. With no argument it behaves exactly as today.
  - `resolveProjectFolder(args: unknown, pick: () => Promise<string | null>): Promise<string | null>`
  - `existingProjectDirectories(dirs: unknown, exists?: (p: string) => boolean): string[]`

- [ ] **Step 1: Write the failing tests**

Create `electron/ipcMainHandlers/utils/resolveProjectFolder.test.ts`:

```ts
import { resolveProjectFolder } from './resolveProjectFolder';

describe('resolveProjectFolder', () => {
  it('returns args.directory without calling the picker', async () => {
    const pick = jest.fn(async () => '/picked');
    await expect(resolveProjectFolder({ directory: '/recent/A' }, pick)).resolves.toBe('/recent/A');
    expect(pick).not.toHaveBeenCalled();
  });

  it.each([[undefined], [null], [{}], [{ directory: '' }], [{ directory: '   ' }], [{ directory: 42 }], ['/x']])(
    'falls back to the picker for %p',
    async (args) => {
      const pick = jest.fn(async () => '/picked');
      await expect(resolveProjectFolder(args, pick)).resolves.toBe('/picked');
      expect(pick).toHaveBeenCalledTimes(1);
    }
  );

  it('passes a cancelled pick through as null', async () => {
    await expect(resolveProjectFolder(undefined, async () => null)).resolves.toBeNull();
  });
});
```

Create `electron/ipcMainHandlers/projectsExist.test.ts`:

```ts
import * as path from 'path';

const mockHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: any[]) => any) => {
      mockHandlers[channel] = fn;
    },
  },
}));

const mockExists = jest.fn();
jest.mock('fs', () => ({
  existsSync: (p: string) => mockExists(p),
}));

import { existingProjectDirectories, projectsExist } from './projectsExist';

describe('existingProjectDirectories', () => {
  it('keeps directories whose settings.json exists, in input order', () => {
    const present = new Set([path.join('/b', 'settings.json'), path.join('/a', 'settings.json')]);
    expect(existingProjectDirectories(['/a', '/gone', '/b'], (p) => present.has(p))).toEqual(['/a', '/b']);
  });

  it('returns [] for a non-array argument and skips non-strings', () => {
    const yes = () => true;
    expect(existingProjectDirectories(undefined, yes)).toEqual([]);
    expect(existingProjectDirectories('/a', yes)).toEqual([]);
    expect(existingProjectDirectories(['/a', 3, null, ''], yes)).toEqual(['/a']);
  });

  it('treats an exists() that throws as missing', () => {
    expect(
      existingProjectDirectories(['/a'], () => {
        throw new Error('EACCES');
      })
    ).toEqual([]);
  });
});

describe('projects-exist handler', () => {
  beforeAll(() => projectsExist());

  it('registers the channel and checks settings.json through fs.existsSync', async () => {
    mockExists.mockImplementation((p: string) => p === path.join('/keep', 'settings.json'));
    await expect(mockHandlers['projects-exist']({}, ['/keep', '/drop'])).resolves.toEqual(['/keep']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest electron/ipcMainHandlers/utils/resolveProjectFolder.test.ts electron/ipcMainHandlers/projectsExist.test.ts`
Expected: FAIL with "Cannot find module" for both.

- [ ] **Step 3: Write the implementation**

Create `electron/ipcMainHandlers/utils/resolveProjectFolder.ts`:

```ts
/**
 * Where load-project reads from: `args.directory` when Home's recent tiles pass
 * one (Phase 6f, amendment A14), otherwise whatever the folder picker returns.
 * The settings.json check that follows is the same for both paths, so a recent
 * project deleted since Home mounted fails exactly like a wrong pick does.
 */
export async function resolveProjectFolder(
  args: unknown,
  pick: () => Promise<string | null>
): Promise<string | null> {
  const directory =
    typeof args === 'object' && args !== null ? (args as { directory?: unknown }).directory : undefined;
  if (typeof directory === 'string' && directory.trim() !== '') return directory;
  return pick();
}
```

Create `electron/ipcMainHandlers/projectsExist.ts`:

```ts
import { ipcMain } from 'electron';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Read-only check behind Home's recent projects (Phase 6f, amendment A14): of
 * the directories the renderer remembers, which still hold a settings.json.
 * The renderer runs with contextIsolation and cannot touch the filesystem.
 */
export function existingProjectDirectories(
  dirs: unknown,
  exists: (p: string) => boolean = existsSync
): string[] {
  if (!Array.isArray(dirs)) return [];
  return dirs.filter((d): d is string => {
    if (typeof d !== 'string' || d === '') return false;
    try {
      return exists(join(d, 'settings.json'));
    } catch {
      return false;
    }
  });
}

function projectsExist() {
  ipcMain.handle('projects-exist', async (_event, dirs: unknown) => existingProjectDirectories(dirs));
}

export { projectsExist };
```

Note that the default parameter `exists = existsSync` is bound when the module loads, which is why the handler test's `jest.mock('fs', ...)` must sit above the import, as written.

Modify `electron/ipcMainHandlers/loadProject.ts`. Add the import at the top with the other local imports:

```ts
import { resolveProjectFolder } from './utils/resolveProjectFolder';
```

Replace the head of `handleLoadProject` (the signature through `const folderPath = result.filePaths[0];`) with:

```ts
async function handleLoadProject(
  PROJECT_CONFIG: ProjectConfig,
  options: Electron.OpenDialogOptions,
  win: BrowserWindow | null,
  args?: unknown
) {
  // A recent project passes its directory; otherwise ask with the picker.
  const folderPath = await resolveProjectFolder(args, async () => {
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });
  if (folderPath === null) return { success: false, message: 'No directory selected' };
```

Leave the rest of the function, from `const settingsPath = path.join(folderPath, 'settings.json');` down, unchanged. Replace the handler registration with:

```ts
  ipcMain.handle('load-project', async (event, args?: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    try {
      return await handleLoadProject(PROJECT_CONFIG, options, win, args);
    } catch (error: unknown) {
      console.error(error);
      return { success: false, message: (error as Error).message };
    }
  });
```

Register the handler. In `electron/ipcMainHandlers/index.ts`, add `import { projectsExist } from './projectsExist';` after the `pixelToRealWorld` import, and add `projectsExist,` to the export list after `pixelToRealWorld,` (the list is alphabetical). In `electron/main.ts`, add `projectsExist,` to the named import from `'./ipcMainHandlers/index.js'`, and call `projectsExist();` right after `loadResults();` in the registration block.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest electron/ipcMainHandlers/utils/resolveProjectFolder.test.ts electron/ipcMainHandlers/projectsExist.test.ts`
Expected: PASS, 13 tests (resolveProjectFolder 9, projectsExist 4).

Then confirm the registration with `grep -n "projectsExist" electron/main.ts electron/ipcMainHandlers/index.ts`. Expected: 2 lines in `main.ts` (import and call) and 2 in `index.ts` (import and export).

- [ ] **Step 5: Full verification and commit**

`npx jest 2>&1 | tail -4` → **73 suites / 776 tests**. tsc 64. lint 20.

```bash
git add electron/ipcMainHandlers/utils/resolveProjectFolder.ts electron/ipcMainHandlers/utils/resolveProjectFolder.test.ts electron/ipcMainHandlers/projectsExist.ts electron/ipcMainHandlers/projectsExist.test.ts electron/ipcMainHandlers/loadProject.ts electron/ipcMainHandlers/index.ts electron/main.ts
git commit -m "Task 2: Add projects-exist and let load-project take a directory"
```

---

### Task 3: Record projects on create and load

**Files:**
- Modify: `src/hooks/useProjectSlice.ts`, at `onInitProject` (around line 211, after `dispatch(setProjectDirectory(result.directory));`) and `onLoadProject` (line 356 signature, line 361 invoke, line 380 after `dispatch(setProjectDirectory(projectDirectory));`)
- Create: `src/helpers/homeRecentsLayout.test.ts`

**Interfaces:**
- Consumes: `recordRecentProject(storage, directory, type, now)` from Task 1, and the `load-project` `{ directory }` argument from Task 2.
- Produces: `onLoadProject(directory?: string): Promise<number | string>`. The return contract is unchanged: a step number on success, an error key string otherwise.

The hook has no Jest harness (it needs Redux and `window.ipcRenderer`). Its behaviour is pinned by source-text assertions, matching how this codebase tests JSX.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/homeRecentsLayout.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Source-text guards for Phase 6f (spec §4/6f, amendment A14). Jest runs with
 * no DOM here, so the hook, component and CSS wiring are pinned by reading
 * the files. Layout and colour are verified by the approved preview and the
 * three-theme walkthrough, not by this file.
 */
const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const hook = read('hooks', 'useProjectSlice.ts');

/** Body of `const <name> = async (...) => { ... };` up to the next `const on`. */
const fnBody = (src: string, name: string): string => {
  const start = src.indexOf(`const ${name} = async`);
  if (start === -1) return '';
  const next = src.indexOf('\n  const on', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
};

describe('useProjectSlice records recent projects', () => {
  it('canary: finds both functions', () => {
    expect(fnBody(hook, 'onInitProject')).toMatch(/init-project/);
    expect(fnBody(hook, 'onLoadProject')).toMatch(/load-project/);
  });

  it('imports recordRecentProject from the helper', () => {
    expect(hook).toMatch(/import \{[^}]*\brecordRecentProject\b[^}]*\} from '\.\.\/helpers\/recentProjects'/);
  });

  it('records a created project with its directory and footage type', () => {
    expect(fnBody(hook, 'onInitProject')).toMatch(
      /recordRecentProject\(localStorage, result\.directory, videoInput\.type, Date\.now\(\)\)/
    );
  });

  it('records a loaded project with its directory and footage type', () => {
    expect(fnBody(hook, 'onLoadProject')).toMatch(
      /recordRecentProject\(localStorage, projectDirectory, settings\.footage, Date\.now\(\)\)/
    );
  });

  it('onLoadProject takes an optional directory and passes it to load-project', () => {
    const body = fnBody(hook, 'onLoadProject');
    expect(body).toMatch(/const onLoadProject = async \(directory\?: string\)/);
    expect(body).toMatch(/invoke\('load-project', directory \? \{ directory \} : undefined\)/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/homeRecentsLayout.test.ts`
Expected: the canary PASSES, and the other 4 FAIL.

- [ ] **Step 3: Write the implementation**

In `src/hooks/useProjectSlice.ts`, add to the imports:

```ts
import { recordRecentProject } from '../helpers/recentProjects';
```

In `onInitProject`, directly after `dispatch(setProjectDirectory(result.directory));`:

```ts
      recordRecentProject(localStorage, result.directory, videoInput.type, Date.now());
```

Change `onLoadProject`'s signature and invoke:

```ts
  const onLoadProject = async (directory?: string) => {
    dispatch(setLoading(true));
    const ipcRenderer = window.ipcRenderer;

    try {
      const result = await ipcRenderer.invoke('load-project', directory ? { directory } : undefined);
```

And directly after `dispatch(setProjectType(settings.footage));` inside the `if (result.success)` branch:

```ts
        recordRecentProject(localStorage, projectDirectory, settings.footage, Date.now());
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/helpers/homeRecentsLayout.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Full verification and commit**

`npx jest 2>&1 | tail -4` → **74 suites / 781 tests**. tsc 64. lint 20. The existing `HomePage` call `onLoadProject()` still type-checks because the parameter is optional.

```bash
git add src/hooks/useProjectSlice.ts src/helpers/homeRecentsLayout.test.ts
git commit -m "Task 3: Record recent projects on create and load"
```

---

### Task 4: `RecentProjects` component, tile CSS and contrast floors

**Files:**
- Create: `src/components/RecentProjects.tsx`
- Modify: `src/components/index.ts` (add the export)
- Modify: `src/pages/pages.css` (append a new block at the end of the file)
- Modify: `src/helpers/themeStateContrast.test.ts` (append to `STATE_PAIRS`)
- Modify: `src/helpers/homeRecentsLayout.test.ts` (extend)

**Interfaces:**
- Consumes: Task 1's `readRecentProjects`, `writeRecentProjects`, `keepExisting`, `projectName`, `formatOpenedDate`, `FOOTAGE_LABELS`, `SHOWN_RECENT_PROJECTS` and `RecentProject`. Task 2's `projects-exist` channel.
- Produces: `<RecentProjects onOpen={(directory: string) => void} />`. It renders nothing when there are no recents.

Behaviour, in order of precedence:
1. On mount, read the stored list. If it is empty, render nothing and do not call IPC.
2. Call `projects-exist`. On success, write back `keepExisting(...)` and show its first three.
3. **On rejection, show the stored list's first three unvalidated and write nothing.** One failed IPC must not erase the history.
4. Ignore a result that arrives after unmount.

- [ ] **Step 1: Write the failing tests**

Append to `src/helpers/homeRecentsLayout.test.ts`:

```ts
const comp = read('components', 'RecentProjects.tsx');
const pagesCss = read('pages', 'pages.css');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Body of the first rule whose selector list is exactly `selector`. */
const ruleBody = (css: string, selector: string): string => {
  // The selector must follow the start of file, a closing brace or a closing
  // comment, so `.a` never matches inside `.b .a` or `.a:hover`.
  const m = css.match(new RegExp(`(?:^|\\}|\\*\\/)\\s*${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : '';
};

describe('RecentProjects component', () => {
  it('canary: the component file renders the tile class', () => {
    expect(comp).toMatch(/className="recent-tile"/);
  });

  it('validates through projects-exist and writes back only on success', () => {
    expect(comp).toMatch(/invoke\('projects-exist', stored\.map\(\(r\) => r\.directory\)\)/);
    const thenIdx = comp.indexOf('.then(');
    const catchIdx = comp.indexOf('.catch(');
    expect(thenIdx).toBeGreaterThan(-1);
    expect(catchIdx).toBeGreaterThan(thenIdx);
    expect(comp.slice(thenIdx, catchIdx)).toMatch(/writeRecentProjects\(localStorage, kept\)/);
    expect(comp.slice(catchIdx)).not.toMatch(/writeRecentProjects/);
  });

  it('skips IPC when nothing is stored, and ignores a late result after unmount', () => {
    expect(comp).toMatch(/if \(stored\.length === 0\) return;/);
    expect(comp).toMatch(/let cancelled = false;/);
    expect(comp).toMatch(/return \(\) => \{\s*cancelled = true;\s*\};/);
  });

  it('renders nothing when there are no recents', () => {
    expect(comp).toMatch(/if \(recents\.length === 0\) return null;/);
  });

  it('labels the section, and gives each tile its full path as tooltip', () => {
    expect(comp).toMatch(/<section className="recents" aria-labelledby="recent-projects-title">/);
    expect(comp).toMatch(/t\('MainPage\.recentProjects', \{ defaultValue: 'Recent projects' \}\)/);
    expect(comp).toMatch(/title=\{r\.directory\}/);
    expect(comp).toMatch(/t\('Step-2\.footageType\.' \+ r\.type, \{ defaultValue: FOOTAGE_LABELS\[r\.type\] \}\)/);
  });

  it('is exported from the components barrel', () => {
    const barrel = read('components', 'index.ts');
    expect(barrel).toMatch(/import \{ RecentProjects \} from '\.\/RecentProjects';/);
    expect(barrel).toMatch(/^\s*RecentProjects,$/m);
  });
});

describe('recent tile CSS', () => {
  it('canary: the Phase 6f block exists', () => {
    expect(pagesCss).toMatch(/HOME — RECENT PROJECTS & HALO \(Phase 6f\)/);
  });

  it('lays out three equal columns', () => {
    expect(ruleBody(pagesCss, '.recents-grid')).toMatch(/grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  });

  it('builds tile states from color-mix, never from a surface token', () => {
    const rest = ruleBody(pagesCss, '.recent-tile');
    const hover = ruleBody(pagesCss, '.recent-tile:hover');
    expect(rest).toMatch(/background:\s*color-mix\(in srgb, var\(--primary-text-color\) 7%, transparent\)/);
    expect(hover).toMatch(/background:\s*color-mix\(in srgb, var\(--primary-text-color\) 13%, transparent\)/);
    const block = pagesCss.slice(pagesCss.indexOf('HOME — RECENT PROJECTS & HALO (Phase 6f)'));
    expect(block).not.toMatch(/--surface-raised|--card-surface|--surface-field|--input-background/);
  });

  it('has a visible keyboard focus ring', () => {
    expect(ruleBody(pagesCss, '.recent-tile:focus-visible')).toMatch(/outline:\s*2px solid var\(--accent-color\)/);
  });

  it('truncates long names instead of wrapping', () => {
    const name = ruleBody(pagesCss, '.recent-tile-name');
    expect(name).toMatch(/text-overflow:\s*ellipsis/);
    expect(name).toMatch(/white-space:\s*nowrap/);
  });
});
```

Append these six pairs to the end of the `STATE_PAIRS` array in `src/helpers/themeStateContrast.test.ts`. Do not modify the existing pairs. The floors sit just under the worst-theme values measured on 2026-10-01 with this file's own helpers (worst theme in brackets):

```ts
  // Phase 6f — Home recents and halo. Home paints --background-color, not a
  // panel, so every 6f pair is measured against that.
  {
    label: '6f --wash-2 vs --background-color (Home halo, deliberately faint)',
    floor: 1.05, // 1.065 dracula; eyeballed visible in the approved preview
    ratio: (t) => contrastRatio(resolveRgb(t, '--wash-2'), resolveRgb(t, '--background-color')),
  },
  {
    label: '6f .recent-tile rest (text 7%) vs --background-color',
    floor: 1.1, // 1.120 dark
    ratio: (t) => {
      const bg = resolveRgb(t, '--background-color');
      return contrastRatio(mixOverBackdrop(resolveRgb(t, '--primary-text-color'), 0.07, bg), bg);
    },
  },
  {
    label: '6f .recent-tile hover (text 13%) vs rest (text 7%)',
    floor: 1.1, // 1.111 light
    ratio: (t) => {
      const bg = resolveRgb(t, '--background-color');
      const txt = resolveRgb(t, '--primary-text-color');
      return contrastRatio(mixOverBackdrop(txt, 0.13, bg), mixOverBackdrop(txt, 0.07, bg));
    },
  },
  {
    label: '6f .recent-tile-meta (--secondary-text-color) on a hovered tile',
    floor: 4.5, // 4.932 dracula
    ratio: (t) => {
      const bg = resolveRgb(t, '--background-color');
      return contrastRatio(
        resolveRgb(t, '--secondary-text-color'),
        mixOverBackdrop(resolveRgb(t, '--primary-text-color'), 0.13, bg)
      );
    },
  },
  {
    label: '6f .recent-tile-icon glyph (--secondary-text-color) on its box over a hovered tile',
    floor: 3.0, // 3.941 dracula; a non-text graphic, 3:1 floor
    ratio: (t) => {
      const bg = resolveRgb(t, '--background-color');
      const txt = resolveRgb(t, '--primary-text-color');
      return contrastRatio(
        resolveRgb(t, '--secondary-text-color'),
        mixOverBackdrop(txt, 0.08, mixOverBackdrop(txt, 0.13, bg))
      );
    },
  },
  {
    label: '6f .recent-tile focus ring (--accent-color) vs --background-color',
    floor: 3.0, // 4.438 dark
    ratio: (t) => contrastRatio(resolveRgb(t, '--accent-color'), resolveRgb(t, '--background-color')),
  },
```

The file runs one `it` per pair per theme (`for (const pair of STATE_PAIRS) for (const name of NAMES)`, around line 244), so these six pairs add **18 tests**.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/helpers/homeRecentsLayout.test.ts src/helpers/themeStateContrast.test.ts`
Expected: `homeRecentsLayout` fails, first with an ENOENT on `RecentProjects.tsx`, because `read()` runs at module load. The six new contrast pairs **pass already**: they measure tokens, not the new CSS. That is expected. They hold the floors from now on.

- [ ] **Step 3: Write the implementation**

Create `src/components/RecentProjects.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { drone, ipcam, oblique } from '../assets/icons/icons';
import {
  FOOTAGE_LABELS,
  SHOWN_RECENT_PROJECTS,
  type FootageType,
  type RecentProject,
  formatOpenedDate,
  keepExisting,
  projectName,
  readRecentProjects,
  writeRecentProjects,
} from '../helpers/recentProjects';

const FOOTAGE_ICONS: Record<FootageType, string> = { uav: drone, oblique: oblique, ipcam: ipcam };

/**
 * Home's recent projects (spec §4/6f, amendment A14): up to three tiles, each
 * reopening its project with no folder picker. The stored list is checked
 * against the disk on mount and projects that no longer exist are dropped.
 * If that check itself fails, the stored list is shown as-is and left alone:
 * one failed IPC must not erase the history.
 */
export const RecentProjects = ({ onOpen }: { onOpen: (directory: string) => void }) => {
  const { t, i18n } = useTranslation();
  const [recents, setRecents] = useState<RecentProject[]>([]);

  useEffect(() => {
    let cancelled = false;
    const stored = readRecentProjects(localStorage);
    if (stored.length === 0) return;
    window.ipcRenderer
      .invoke('projects-exist', stored.map((r) => r.directory))
      .then((existing: string[]) => {
        if (cancelled) return;
        const kept = keepExisting(stored, existing);
        writeRecentProjects(localStorage, kept);
        setRecents(kept.slice(0, SHOWN_RECENT_PROJECTS));
      })
      .catch(() => {
        if (!cancelled) setRecents(stored.slice(0, SHOWN_RECENT_PROJECTS));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (recents.length === 0) return null;

  const now = Date.now();
  return (
    <section className="recents" aria-labelledby="recent-projects-title">
      <h2 className="recents-title" id="recent-projects-title">
        {t('MainPage.recentProjects', { defaultValue: 'Recent projects' })}
      </h2>
      <ul className="recents-grid">
        {recents.map((r) => (
          <li key={r.directory}>
            <button type="button" className="recent-tile" title={r.directory} onClick={() => onOpen(r.directory)}>
              <span className="recent-tile-icon" aria-hidden="true">
                <Icon path={FOOTAGE_ICONS[r.type]} />
              </span>
              <span className="recent-tile-text">
                <span className="recent-tile-name">{projectName(r.directory)}</span>
                <span className="recent-tile-meta">
                  {t('Step-2.footageType.' + r.type, { defaultValue: FOOTAGE_LABELS[r.type] })} ·{' '}
                  {formatOpenedDate(r.openedAt, now, i18n.language)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
```

Add to `src/components/index.ts`, in its existing style (one `import { X } from './X';` per component at the top, then one `export { ... }` list). Add the import after `import { IpcamGrid } from './IpcamGrid';`:

```ts
import { RecentProjects } from './RecentProjects';
```

and add `RecentProjects,` on its own line inside the `export { ... }` list, in alphabetical position.

Append to the end of `src/pages/pages.css`:

```css
/* =============================================================================
   HOME — RECENT PROJECTS & HALO (Phase 6f)
   Spec §4/6f, amendment A14; ported from the approved preview
   docs/superpowers/previews/2026-10-01-phase-6f-home-recents-halo.html.
   Home paints --background-color with no panel, and --surface-raised equals
   --surface-panel in every theme, so tile states are colour-mixes of the
   text colour, never surface tokens. Floors: themeStateContrast.test.ts "6f".
   ============================================================================= */

.recents {
    width: 640px;
    margin-top: 40px;
}

.recents-title {
    font: 700 var(--text-section) / 1.2 var(--font-display);
    margin: 0 0 10px;
}

.recents-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.recent-tile {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    width: 100%;
    padding: 8px;
    border: 0;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--primary-text-color) 7%, transparent);
    color: var(--primary-text-color);
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: background-color var(--motion-fast) var(--motion-ease), transform var(--motion-fast) var(--motion-ease);
}

.recent-tile:hover {
    background: color-mix(in srgb, var(--primary-text-color) 13%, transparent);
}

.recent-tile:active {
    transform: scale(0.98);
}

.recent-tile:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
}

.recent-tile-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-sm);
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
    color: var(--secondary-text-color);
}

.recent-tile-icon svg {
    width: 24px;
    height: 24px;
    stroke-width: 1.5;
}

.recent-tile-text {
    min-width: 0;
}

.recent-tile-name {
    display: block;
    font-size: var(--text-body);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recent-tile-meta {
    display: block;
    font-size: var(--text-caption);
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
```

`ReactSVG` wraps the `<svg>` in `div`s. The `.recent-tile-icon svg` descendant selector reaches it through those wrappers, and the grid centres the wrapper. If the glyph renders off-centre in Task 7's walkthrough, add `.recent-tile-icon > div { display: grid; }`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/helpers/homeRecentsLayout.test.ts src/helpers/themeStateContrast.test.ts`
Expected: PASS. `homeRecentsLayout` is now at 16 tests (5 + 6 + 5).

- [ ] **Step 5: Full verification and commit**

`npx jest 2>&1 | tail -4` → 74 suites / **810 tests** (781 + 11 layout + 18 contrast). tsc 64. lint 20.

```bash
git add src/components/RecentProjects.tsx src/components/index.ts src/pages/pages.css src/helpers/homeRecentsLayout.test.ts src/helpers/themeStateContrast.test.ts
git commit -m "Task 4: Add RecentProjects tiles with contrast floors"
```

---

### Task 5: Home: halo, layout and the open flow

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/pages.css:18-32` (`.home-page-image`, `.home-page-buttons`) and the Phase 6f block
- Modify: `src/helpers/homeRecentsLayout.test.ts` (extend)

**Interfaces:**
- Consumes: `<RecentProjects onOpen>` from Task 4, and `onLoadProject(directory?)` from Task 3.
- Produces: nothing new for later tasks.

Opening a tile must behave exactly like Load: clear `home-load-project`, call `onLoadProject`, then `goToStep(step)` on a number or show the translated `MainPage.Errors.*` alert on a string. One function serves both paths.

- [ ] **Step 1: Write the failing tests**

Append to `src/helpers/homeRecentsLayout.test.ts`:

```ts
const home = read('pages', 'HomePage.tsx');

describe('Home wiring', () => {
  it('canary: HomePage still renders its toolbar', () => {
    expect(home).toMatch(/<div className="home-toolbar">/);
  });

  it('puts the halo modifier on Home only', () => {
    expect(home).toMatch(/<div className="default-app-container home-halo">/);
    expect(read('pages', 'FootageMode.tsx')).not.toMatch(/home-halo/);
    expect(read('App.tsx')).not.toMatch(/home-halo/);
  });

  it('opens recents and the Load button through one function', () => {
    expect(home).toMatch(/const openProject = async \(directory\?: string\)/);
    expect(home).toMatch(/await onLoadProject\(directory\)/);
    expect(home).toMatch(/<RecentProjects onOpen=\{openProject\} \/>/);
    expect(home).toMatch(/onClick=\{\(\) => openProject\(\)\}/);
  });

  it('renders recents after the buttons and before the alerts', () => {
    const buttons = home.indexOf('className="home-page-buttons"');
    const recents = home.indexOf('<RecentProjects');
    const alerts = home.indexOf('<StepAlertList />');
    expect(buttons).toBeGreaterThan(-1);
    expect(recents).toBeGreaterThan(buttons);
    expect(alerts).toBeGreaterThan(recents);
  });
});

describe('Home halo and layout CSS', () => {
  it('ends the halo on the page background, not a panel (A14.5)', () => {
    expect(ruleBody(pagesCss, '.default-app-container.home-halo')).toMatch(
      /background:\s*radial-gradient\(120% 70% at 50% 0%, var\(--wash-2\) 0%, var\(--background-color\) 60%\)/
    );
  });

  it('shrinks the logo and drops the dead left offset (A14.6)', () => {
    const logo = ruleBody(pagesCss, '.home-page-image');
    expect(logo).toMatch(/width:\s*420px/);
    expect(logo).toMatch(/margin-top:\s*15vh/);
    expect(logo).not.toMatch(/left:/);
  });

  it('puts the start buttons in a row (A14.6)', () => {
    const btns = ruleBody(pagesCss, '.home-page-buttons');
    expect(btns).toMatch(/flex-direction:\s*row/);
    expect(btns).toMatch(/gap:\s*12px/);
    expect(btns).not.toMatch(/min-height/);
  });
});
```

`ruleBody` matches only when the selector is the **whole** selector list, so `.default-app-container.home-halo` cannot be satisfied by `index.css`'s bare `.default-app-container` rule (which is in a different file anyway).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/helpers/homeRecentsLayout.test.ts`
Expected: the canary passes, and the other 6 new tests FAIL.

- [ ] **Step 3: Write the implementation**

Replace `src/pages/HomePage.tsx`'s click handler and JSX. Imports: add `RecentProjects` to the existing `'../components'` import (`import { VersionMessage, StepAlertList, RecentProjects } from '../components';`). The rest of the file (imports, `useEffect`, toolbar) stays.

```tsx
  const openProject = async (directory?: string) => {
    onClearStepAlert('home-load-project');
    const result = await onLoadProject(directory);
    if (typeof result === 'number') {
      goToStep(result);
    } else {
      onAddStepAlert(
        'home-load-project',
        'error',
        t('MainPage.Errors.' + result, {
          defaultValue: t('MainPage.Errors.default'),
        })
      );
    }
  };
```

Delete `handleNewProjectClick`. Then the JSX:

```tsx
    <div className="default-app-container home-halo">
      {showCalibration && <CameraCalibration onClose={() => setShowCalibration(false)} />}
      <img src={theme === 'light' ? imageLigtht : image} className="home-page-image" alt="RIVeR Logo" />
      <div className="home-page-buttons">
        <button className="btn btn-lg btn-primary" onClick={() => nextStep()} id="new-project">
          {t('MainPage.start')}
        </button>
        <button className="btn btn-lg btn-secondary" onClick={() => openProject()} id="load-project">
          {t('MainPage.loadProject')}
        </button>
      </div>
      <RecentProjects onOpen={openProject} />
      <StepAlertList />
      <div className="home-toolbar">
```

The rest of the toolbar is unchanged, so `homeToolbarLayout.test.ts` keeps passing. Keep the two `id`s: something outside this file may target them.

In `src/pages/pages.css`, edit the existing rules at the top of the file:

```css
.home-page-image {
    margin-top: 15vh;
    width: 420px;
    height: auto;
}

.home-page-buttons {
    margin-top: 32px;
    margin-bottom: auto;
    display: flex;
    flex-direction: row;
    gap: 12px;
}
```

Why `margin-bottom: auto` stays: Home's container is a centred flex column. `auto` on the buttons pushes everything after them (recents, alerts) up against the buttons, and leaves the free space above the absolutely positioned toolbar. With no recents this reproduces today's layout.

The `.recents` margin then needs to move the auto margin to itself, otherwise the recents section sinks to the bottom. Add this to the Phase 6f block:

```css
/* The buttons' margin-bottom: auto would push recents to the bottom of the
   window; when recents exist they take the auto margin instead, so they sit
   40px under the buttons and the free space stays above the toolbar. */
.home-page-buttons:has(+ .recents) {
    margin-bottom: 0;
}

.recents {
    margin-bottom: auto;
}

.default-app-container.home-halo {
    background: radial-gradient(120% 70% at 50% 0%, var(--wash-2) 0%, var(--background-color) 60%);
}
```

Merge `margin-bottom: auto;` into Task 4's existing `.recents` rule rather than writing a second `.recents` rule. The test's `ruleBody` reads the first match only, and two rules for one selector is the fragmentation this phase exists to remove. Electron's Chromium supports `:has()`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/helpers/homeRecentsLayout.test.ts src/helpers/homeToolbarLayout.test.ts`
Expected: PASS. `homeRecentsLayout` is at 23 tests and `homeToolbarLayout` is unchanged.

- [ ] **Step 5: Full verification and commit**

`npx jest 2>&1 | tail -4` → 74 suites, 74 suites / **817 tests** (810 + 7). tsc 64. lint 20. Note that deleting `handleNewProjectClick` removes its `React.MouseEvent` usage. If lint or tsc reports an unused import, remove it.

```bash
git add src/pages/HomePage.tsx src/pages/pages.css src/helpers/homeRecentsLayout.test.ts
git commit -m "Task 5: Add the Home halo, row layout and recent projects"
```

---

### Task 6: Results panel wash

**Files:**
- Modify: `src/components/Forms/form.css` (add a rule after `.form-container`)
- Modify: `src/pages/Results.tsx:22`
- Modify: `src/helpers/homeRecentsLayout.test.ts` (extend)

**Interfaces:** none.

The `.footer` inside the panel paints `--secondary-background-color` (≡ `--surface-panel`), which matches where the gradient ends at 26%. So no seam appears at the bottom.

- [ ] **Step 1: Write the failing test**

Append to `src/helpers/homeRecentsLayout.test.ts`:

```ts
describe('Results panel wash', () => {
  const formCss = read('components', 'Forms', 'form.css');

  it('canary: form.css still has .form-container', () => {
    expect(ruleBody(formCss, '.form-container')).toMatch(/background-color:\s*var\(--secondary-background-color\)/);
  });

  it('adds the linear wash as a modifier', () => {
    expect(ruleBody(formCss, '.form-container.results-wash')).toMatch(
      /background:\s*linear-gradient\(180deg, var\(--wash-2\) 0%, var\(--surface-panel\) 26%\)/
    );
  });

  it('applies it on Results only', () => {
    expect(read('pages', 'Results.tsx')).toMatch(/<div className="form-container results-wash">/);
    for (const page of ['Processing.tsx', 'CrossSections.tsx', 'VideoRange.tsx', 'CameraCalibration.tsx']) {
      expect(read('pages', page)).not.toMatch(/results-wash/);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/homeRecentsLayout.test.ts`
Expected: the canary passes, and the other 2 FAIL.

- [ ] **Step 3: Write the implementation**

In `src/components/Forms/form.css`, directly after the `.form-container { ... }` rule:

```css
/* Phase 6f: the audit's second use of the theme wash, a band at the top of
   the Results panel. It ends on --surface-panel at 26%, the same colour the
   .footer paints, so there is no seam. */
.form-container.results-wash {
    background: linear-gradient(180deg, var(--wash-2) 0%, var(--surface-panel) 26%);
}
```

In `src/pages/Results.tsx`, change `<div className="form-container">` to `<div className="form-container results-wash">`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/helpers/homeRecentsLayout.test.ts`
Expected: PASS, 26 tests.

- [ ] **Step 5: Full verification and commit**

`npx jest 2>&1 | tail -4` → 74 suites, 74 suites / **820 tests** (817 + 3). tsc 64. lint 20.

```bash
git add src/components/Forms/form.css src/pages/Results.tsx src/helpers/homeRecentsLayout.test.ts
git commit -m "Task 6: Add the theme wash to the Results panel"
```

---

### Task 7: Verification and three-theme walkthrough

**Files:** none, unless the walkthrough finds a defect. Fix it in its own commit, with a test where one is possible.

This is the check that Jest cannot do (no DOM). It is run in the real Electron app (`npm run dev`), by the executing agent where a GUI is available, and **by the product owner on their own machine** otherwise. The spec owes this walkthrough for every visual change.

- [ ] **Step 1: Full suite, tsc, lint**

`npx jest 2>&1 | tail -4` → 74 suites / 820 tests. `npx tsc --noEmit 2>&1 | grep -c "error TS"` → 64. `npm run lint` → 20 problems (17 errors, 3 warnings).

- [ ] **Step 2: Walk through Home in dark, light and dracula**, comparing against the approved preview:
  1. First launch: run `localStorage.removeItem('river-recent-projects')` in DevTools and reload. The recents section is absent. The logo, the row of buttons and the bloom match the preview's "first launch" frame.
  2. Create a project, return to Home: one tile, the right footage icon, the folder name, and "type · today's date".
  3. Load two more projects with the Load button: three tiles, newest first. Load the first one again: it moves to the front with no duplicate.
  4. Click a tile: the project opens at the same step Load would open it, with no folder picker.
  5. Quit the app, rename one project folder on disk, relaunch: that tile is gone, and the localStorage entry is gone too.
  6. Hover a tile and Tab to it: the hover fill and the focus ring are visible in all three themes.
  7. Resize the window to the 1150×700 minimum: the tiles clear the toolbar.
  8. The halo bloom is visible in all three themes. Dracula is the faintest (1.065:1), so judge it by eye.

- [ ] **Step 3: Walk through Results in all three themes.** The band at the top of the panel fades to the panel colour with no seam at the footer.

- [ ] **Step 4: Report.** State the totals and the walkthrough result per theme. Any walkthrough item that could not be performed must be reported as **not performed**, never as passed.
