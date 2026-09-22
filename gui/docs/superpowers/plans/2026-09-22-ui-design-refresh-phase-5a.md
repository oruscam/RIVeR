# UI Design Refresh — Phase 5a (Home tool bar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Home screen's two separately-positioned corner clusters (a bare unlabelled calibration icon bottom-left, a bare Folder/Units/Language/Theme icon row bottom-right) and its two-line version readout with the audit's single bottom bar: a labelled "Camera calibration" button, one version-status line with a status dot, and the settings icons grouped with a divider before the preferences trio.

**Architecture:** `VersionMessage.tsx` currently renders only once `isLatestVersion !== undefined`, and the raw version string is a separate `<p>` in `HomePage.tsx`. Task 1 moves the version number into `VersionMessage` itself (rendered unconditionally) and adds a small status dot next to it, so the whole thing is one self-contained "version status" unit `HomePage.tsx` can drop into a row without knowing about `isLatestVersion`. Task 2 replaces `HomePage.tsx`'s two absolutely-positioned corner `<div>`/`<button>` clusters with one `.home-toolbar` flex row (calibration button · `VersionMessage` · settings group), reusing Phase 3a's existing `.btn`/`.btn-tertiary` classes for the calibration button (its second consumer, after `WizzardButtons.tsx`) instead of inventing new button CSS.

**Tech Stack:** React 18 + TypeScript, plain CSS with `[data-theme]` custom properties (`--status-good`/`--status-bad`, `--border-color`, `--secondary-text-color` already exist from Phase 2 — no new tokens), i18next (`Calibration.title` and `MainPage.Version.*` keys already exist — no translation file edits), Jest 29 with ts-jest (`testEnvironment: "node"`, no DOM — every test in this codebase parses source/CSS text or calls pure functions; this plan's two tasks each get a source-text test under `src/helpers/`, matching `src/helpers/techniqueRowCss.test.ts`'s established pattern for checking JSX/CSS that has no pure logic to extract).

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb (§ Rollout, Phase 5: *"Home tool bar, footage tiles, filmstrip badges, the colour bar before analysis, the type scale everywhere, and optionally recent projects."*; § Screens → "Home": mockup shows one row, `left:24px; right:24px; bottom:22px`, `justify-content: space-between`, containing a `.btn.btn-tertiary` "Camera calibration" button, a centred version line reading "v3.7.0 · up to date" with a status dot, and a settings group — Folder icon, a 1px divider, then Units/Language/Theme icons). Scope decision made with the product owner on 2026-09-22: the AGPL source-code link (`#source-offer`, legally required to stay reachable) is kept as a small second line under the version-status line rather than folded into the single line the mockup shows, since the mockup's crop doesn't include it. `New project`/`Load project` stay `.button-1` — their migration to `.btn`/`.btn-primary` remains out of scope, same as Phase 3a deferred it.

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself, at Phase 4d's tip (`16bca8b`). Never commit to `river-labs`/`main`.
- Commits: short imperative message, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`16bca8b`): run `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, and `npm run lint` before Task 1 and record the counts. None of these three may get worse after either task. **Run project-wide `npm run lint` (not just the files a task touches) after every task.**
- No new i18n keys — `Calibration.title` and `MainPage.Version.source`/`.experimental` already exist in every locale file; do not touch `src/translations/*/global.json`.
- All paths below are relative to `gui/` unless prefixed with `/`.
- This plan is pure layout/markup + CSS. It must not change what `isLatestVersion`, `onCheckVersion`, `onLoadProject`, or the calibration modal do — only where and how their existing output renders.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `src/components/VersionMessage.tsx` | Owns the whole version-status line: version number, status dot, latest/update text, AGPL source link |
| `src/components/components.css` | `#version-block`/`#version-message`/`#version-number`/`#version-dot`/`#source-offer` rules restyled for the merged single line |
| `src/helpers/versionMessageLayout.test.ts` (create) | Source-text assertions for Task 1 |
| `src/pages/HomePage.tsx` | Replace the two absolute corner clusters with one `.home-toolbar` row |
| `src/pages/pages.css` | Add `.home-toolbar`, `.home-toolbar-group`, `.home-toolbar-divider` rules |
| `src/helpers/homeToolbarLayout.test.ts` (create) | Source-text assertions for Task 2 |

---

## Task 1: `VersionMessage` — one line, with a status dot

**Files:**
- Modify: `src/components/VersionMessage.tsx`
- Modify: `src/components/components.css:8-52`
- Test: `src/helpers/versionMessageLayout.test.ts` (create)

**Interfaces:**
- Produces: `<VersionMessage />` — no props, safe to render unconditionally (it now handles the "still checking" state internally instead of requiring callers to gate on `isLatestVersion !== undefined`).

- [ ] **Step 1: Write the failing test**

Create `src/helpers/versionMessageLayout.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * VersionMessage now owns the whole version-status line (number + dot +
 * latest/update text), so HomePage can render it unconditionally instead of
 * gating on isLatestVersion !== undefined. See Phase 5a.
 */
const tsx = readFileSync(join(__dirname, '..', 'components', 'VersionMessage.tsx'), 'utf8');
const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('VersionMessage single-line layout', () => {
  it('renders the version number inside #version-message, not as a standalone element', () => {
    expect(tsx).toMatch(/<span id="version-number">\{import\.meta\.env\.VITE_APP_VERSION\}<\/span>/);
  });

  it('renders a status dot only once the version check has resolved', () => {
    expect(tsx).toMatch(/isLatestVersion !== undefined/);
    expect(tsx).toMatch(/id="version-dot"/);
    expect(tsx).toMatch(/data-status=\{isLatestVersion \? 'ok' : 'update'\}/);
  });

  it('keeps the AGPL source-code link reachable', () => {
    expect(tsx).toMatch(/id="source-offer"/);
    expect(tsx).toMatch(/MainPage\.Version\.source/);
  });

  it('#version-message lays version number, dot and text out on one row', () => {
    expect(ruleBody('#version-message')).toMatch(/display:\s*flex/);
  });

  it('colours the status dot by data-status', () => {
    expect(ruleBody('#version-dot')).toMatch(/background:\s*var\(--status-good\)/);
    expect(ruleBody('#version-dot\\[data-status="update"\\]')).toMatch(/background:\s*var\(--status-bad\)/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/versionMessageLayout.test.ts`
Expected: FAIL — none of the new markup/CSS exists yet (`#version-dot` is not in `VersionMessage.tsx`, `#version-number` is not inside it either).

- [ ] **Step 3: Rewrite `VersionMessage.tsx`**

Replace the full contents of `src/components/VersionMessage.tsx` with:

```tsx
import { useUiSlice } from '../hooks';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/constants';

const SOURCE_URL = 'https://github.com/oruscam/RIVeR';

export const VersionMessage = () => {
  const { isLatestVersion, latestVersion } = useUiSlice();
  const { t } = useTranslation();

  const latestLink = `https://github.com/oruscam/RIVeR/releases/tag/v${latestVersion}`;
  const versionMessage = isLatestVersion ? 'latest' : 'update';

  return (
    <div id="version-block">
      <div id="version-message">
        <span id="version-number">{import.meta.env.VITE_APP_VERSION}</span>
        {isLatestVersion !== undefined && (
          <>
            <span id="version-dot" data-status={isLatestVersion ? 'ok' : 'update'} aria-hidden="true" />
            <p style={{ color: isLatestVersion === false ? COLORS.RED : '' }}>
              {t(`MainPage.Version.${versionMessage}`)}
            </p>
            {isLatestVersion === false && (
              <a href={latestLink} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.RED }}>
                {' '}
                {latestVersion}{' '}
              </a>
            )}
          </>
        )}
      </div>
      {/* AGPL-3.0 requires that recipients of a binary can reach the
          corresponding source. Keep this link reachable from the app. */}
      <a id="source-offer" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
        {t('MainPage.Version.source')}
      </a>
    </div>
  );
};
```

- [ ] **Step 4: Replace the version CSS**

In `src/components/components.css`, replace lines 8-52 (from `#version-number {` through the closing `}` of `#version-message a`) with:

```css
#version-block {
    display: flex;
    flex-direction: column;
    align-items: center;
}

#version-message {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--secondary-text-color);
    font-size: 13px;
    font-weight: bold;
}

#version-number {
    font-weight: bold;
}

#version-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status-good);
}

#version-dot[data-status="update"] {
    background: var(--status-bad);
}

#source-offer {
    margin-top: 4px;
    color: var(--secondary-text-color);
    font-size: 12px;
    font-weight: normal;
    text-decoration: underline;
    cursor: pointer;
    opacity: 0.75;
}

#source-offer:hover {
    opacity: 1;
}

#version-message p {
    margin: 0 5px 0 0;
}

#version-message a {
    color: var(--secondary-text-color);
    text-decoration: underline;
    cursor: pointer;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/helpers/versionMessageLayout.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; tsc error count and lint problem count match (or improve on) the baseline recorded in Global Constraints.

- [ ] **Step 7: Commit**

```bash
git add src/components/VersionMessage.tsx src/components/components.css src/helpers/versionMessageLayout.test.ts
git commit -m "Merge the version number and status into one VersionMessage line"
```

---

## Task 2: `HomePage` — one bottom tool bar

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/pages.css`
- Test: `src/helpers/homeToolbarLayout.test.ts` (create)

**Interfaces:**
- Consumes: `<VersionMessage />` from Task 1 (no props, safe unconditionally).
- Consumes: `.btn`, `.btn-tertiary` from `src/index.css` (Phase 3a).

- [ ] **Step 1: Write the failing test**

Create `src/helpers/homeToolbarLayout.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const tsx = readFileSync(join(__dirname, '..', 'pages', 'HomePage.tsx'), 'utf8');
const css = readFileSync(join(__dirname, '..', 'pages', 'pages.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('Home screen bottom toolbar', () => {
  it('groups the calibration button, version status and settings into one row', () => {
    expect(tsx).toMatch(/<div className="home-toolbar">/);
  });

  it('labels the calibration button instead of using a bare icon', () => {
    expect(tsx).toMatch(/className="btn btn-tertiary"[\s\S]{0,120}onClick=\{\(\) => setShowCalibration\(true\)\}/);
    expect(tsx).toMatch(/\{t\('Calibration\.title'\)\}/);
  });

  it('groups Folder, Units, Language and Theme with a divider before the settings trio', () => {
    expect(tsx).toMatch(
      /<div className="home-toolbar-group">\s*<FolderBtn \/>\s*<span className="home-toolbar-divider" \/>\s*<UnitBtn \/>\s*<LangBtn \/>\s*<ThemeToggle \/>/
    );
  });

  it('no longer positions the calibration button and settings row as separate absolute corners', () => {
    expect(tsx).not.toMatch(/bottom: '30px', right: '50px'/);
    expect(tsx).not.toMatch(/bottom: '30px', left: '50px'/);
  });

  it('drops the now-unused isLatestVersion destructure', () => {
    expect(tsx).not.toMatch(/isLatestVersion/);
  });

  it('.home-toolbar spans the bottom of the screen as one row', () => {
    const body = ruleBody('.home-toolbar');
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/justify-content:\s*space-between/);
  });

  it('.home-toolbar-divider is a thin vertical rule', () => {
    const body = ruleBody('.home-toolbar-divider');
    expect(body).toMatch(/width:\s*1px/);
    expect(body).toMatch(/background:\s*var\(--border-color\)/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/homeToolbarLayout.test.ts`
Expected: FAIL — `HomePage.tsx` still has the two separate absolute corners and no `.home-toolbar` class.

- [ ] **Step 3: Rewrite `HomePage.tsx`**

Replace the full contents of `src/pages/HomePage.tsx` with:

```tsx
import { useTranslation } from 'react-i18next';
import { useWizard } from 'react-use-wizard';
import { LangBtn } from '../components/CustomIcons/LanguageSelector';
import { FolderBtn, UnitBtn } from '../components/CustomIcons/UnitSelector';
import image from '../assets/logo.png';
import imageLigtht from '../assets/logo_light.png';
import './pages.css';
import { Icons } from '../components/CustomIcons/Icons';
import { useProjectSlice, useUiSlice } from '../hooks';
import { useEffect, useState } from 'react';
import { VersionMessage, StepAlertList } from '../components';
import { ThemeToggle } from '../components/ThemeToggle';
import { CameraCalibration } from './CameraCalibration';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { nextStep, goToStep } = useWizard();
  const { onLoadProject } = useProjectSlice();
  const { onAddStepAlert, onClearStepAlert, onCheckVersion, theme } = useUiSlice();
  const [showCalibration, setShowCalibration] = useState(false);

  const handleNewProjectClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.currentTarget.id === 'new-project') {
      nextStep();
    } else {
      onClearStepAlert('home-load-project');
      const result = await onLoadProject();
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
    }
  };

  useEffect(() => {
    onCheckVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="default-app-container">
      {showCalibration && <CameraCalibration onClose={() => setShowCalibration(false)} />}
      <img src={theme === 'light' ? imageLigtht : image} className="home-page-image" alt="RIVeR Logo" />
      <div className="home-page-buttons">
        <button className="button-1" onClick={handleNewProjectClick} id="new-project">
          {t('MainPage.start')}
        </button>
        <button className="button-1" onClick={handleNewProjectClick} id="load-project">
          {t('MainPage.loadProject')}
        </button>
      </div>
      <StepAlertList />
      <div className="home-toolbar">
        <button className="btn btn-tertiary" onClick={() => setShowCalibration(true)}>
          {Icons.Camera('currentColor')}
          {t('Calibration.title')}
        </button>
        <VersionMessage />
        <div className="home-toolbar-group">
          <FolderBtn />
          <span className="home-toolbar-divider" />
          <UnitBtn />
          <LangBtn />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Add the toolbar CSS**

Append to `src/pages/pages.css`:

```css
.home-toolbar {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.home-toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
}

.home-toolbar-divider {
    width: 1px;
    height: 18px;
    background: var(--border-color);
    margin: 0 6px;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/helpers/homeToolbarLayout.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; tsc error count and lint problem count match (or improve on) Task 1's counts.

- [ ] **Step 7: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/pages.css src/helpers/homeToolbarLayout.test.ts
git commit -m "Group the Home screen's calibration button and settings into one tool bar"
```

---

## Deferred (not in this plan)

- `New project`/`Load project` staying on `.button-1` instead of `.btn`/`.btn-primary` — same deferral Phase 3a made; a full `.button-1`/`.wizard-button`/`.danger-button` migration is its own future pass, not scoped to any lettered Phase 5 sub-plan.
- `MainPage.Version.latest`/`MainPage.Version.update` translation keys were not found in `src/translations/en/global.json` during this plan's research (only `.experimental` and `.source` exist there) — `VersionMessage`'s existing `t(\`MainPage.Version.${versionMessage}\`)` call predates this plan and is left exactly as-is; whether that renders a missing-key fallback in practice is a pre-existing question outside this plan's scope, not introduced or worsened here.
- The manual three-theme Electron walkthrough this plan's visual change deserves is owed, same architectural gap as every prior phase (Electron-only renderer, no shell in this environment). If resumed where the real app can run, check: the status dot's colour in all three themes, the calibration button's `currentColor` icon against `.btn-tertiary`'s text colour, and the divider's visibility against `--border-color` in light theme.
