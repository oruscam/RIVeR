# UI Design Refresh — Phase 5b (Footage tiles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three footage-type tiles' filled glyph icons (drone/oblique/ipcam) with line icons matching the rest of the app, and give each tile a visible name and one-line description instead of relying on an invisible `aria-label`, plus a check badge on the selected tile.

**Architecture:** `src/assets/icons/{drone,oblique,ipcam}.svg` are today three standalone filled-shape SVG files (`fill:#fff`/`fill:#000`, no `currentColor`), rendered via the existing `<Icon path={...} />` component (`react-svg`'s `ReactSVG`, which inlines the fetched SVG markup as-is into the DOM — no attribute rewriting). Task 1 replaces the *contents* of those three files with Lucide-style outline icons (`stroke="currentColor"`, `viewBox="0 0 24 24"`, matching the audit's own `i-drone`/`i-tripod`/`i-cctv` symbols) — the import paths, filenames and every call site stay exactly as they are, so no other file needs to change to pick this up. `src/pages/FootageMode.tsx` is the only in-app consumer; `src/components/Report/Header.tsx` also renders the same three icons (for the exported report's header banner) and needs no changes at all — its `#header-icon-container` CSS already declares `color: #FFFFFF` (report.css:44-46), a rule that is currently inert against the filled icons and becomes live the moment the icons switch to `currentColor`, so the report keeps its white-on-blue-gradient icon with zero edits. Task 2 is scoped to `FootageMode.tsx` alone: add a `description` field to the existing `footageTypes` array, render it plus the existing `label` as visible text (reusing the exact translation-key pattern the `aria-label` already uses, `t('Step-2.footageType.' + id, {defaultValue: label})`, with one new sibling key per tile for the description), and add an accent-coloured check badge shown only on the selected tile (reusing `Icons.Check`, the same component `ThemeToggle.tsx` already uses to mark a selected dropdown item). Hover vs. selected are already visually distinct in this codebase (`.footage-button-container:hover` uses a grey border + 1.04 scale; `.selected-footage-type` uses an accent border + shadow + 1.08 scale) — that part of the original audit finding no longer applies and is out of scope here; this plan is scoped to the two gaps that do still exist (filled icons, invisible name/description).

**Tech Stack:** React 18 + TypeScript, `react-svg` (existing dependency, unchanged), plain CSS with `[data-theme]` custom properties (`--secondary-text-color`, `--primary-text-color`, `--accent-color`, `--on-accent`, `--border-color` all already exist from Phase 2/3a — no new tokens), i18next (new keys use inline `defaultValue`, matching this branch's established convention — no `src/translations/*/global.json` edits), Jest 29 with ts-jest (`testEnvironment: "node"`, no DOM — source-text tests under `src/helpers/`, matching `src/helpers/techniqueRowCss.test.ts`'s established pattern).

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb (§ Rollout, Phase 5: *"…footage tiles…"*; § Screens → "Footage type": *"Every tile has a name and a line explaining when to choose it. Selected: accent ring and check badge. Hover only lightens the card. Line icons match the rest of the app."*; the mockup's three icons are Lucide `drone`, `tripod` (used here for RIVeR's "Oblique" footage type — a tripod or bank-mounted camera), and a CCTV/webcam glyph (used for RIVeR's "Fixed camera"/ipcam type), each `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="2"`, `fill="none"`). Scope decision made with the product owner on 2026-09-22: the hover/selected visual distinction the original audit finding described is already fixed in the current codebase (confirmed by reading `src/pages/pages.css`'s current `.footage-button-container:hover`/`.selected-footage-type` rules) — not re-implemented here, only the two gaps that remain (icon style, name/description visibility, check badge) are in scope.

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself, at Phase 5a's tip (`3a6adc3`). Never commit to `river-labs`/`main`.
- Commits: short imperative message, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`3a6adc3`): run `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, and `npm run lint` before Task 1 and record the counts. None of these three may get worse after either task. **Run project-wide `npm run lint` (not just the files a task touches) after every task.**
- No new i18n keys added to any `src/translations/*/global.json` file — new copy uses `t(key, {defaultValue})` only, matching every existing mode-hint/error/description call site in this codebase.
- `src/components/Report/Header.tsx` must not be modified by this plan — it needs no changes (see Architecture); if a task finds itself wanting to edit it, that is a signal something else has gone wrong and the task should stop and report BLOCKED rather than proceed.
- All paths below are relative to `gui/` unless prefixed with `/`.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `src/assets/icons/drone.svg` | Filled glyph → Lucide-style `drone` line icon |
| `src/assets/icons/oblique.svg` | Filled glyph → Lucide-style `tripod` line icon |
| `src/assets/icons/ipcam.svg` | Filled glyph → Lucide-style CCTV/webcam line icon |
| `src/helpers/footageTypeIconsLineStyle.test.ts` (create) | Source-text assertions for Task 1 |
| `src/pages/FootageMode.tsx` | Add `description` per footage type, render name+description, add check badge |
| `src/pages/pages.css` | Icon colour-by-state rules, name/description typography, check badge |
| `src/helpers/footageTileContent.test.ts` (create) | Source-text assertions for Task 2 |

---

## Task 1: Line icons for the three footage types

**Files:**
- Modify: `src/assets/icons/drone.svg`
- Modify: `src/assets/icons/oblique.svg`
- Modify: `src/assets/icons/ipcam.svg`
- Test: `src/helpers/footageTypeIconsLineStyle.test.ts` (create)

**Interfaces:**
- Produces: the same three files at the same paths, now containing `stroke="currentColor"` outline artwork instead of `fill:#fff`/`fill:#000` filled artwork. No import, filename, or call-site changes anywhere — `src/pages/FootageMode.tsx` and `src/components/Report/Header.tsx` both keep importing `drone`/`oblique`/`ipcam` from `../assets/icons/icons` exactly as they do today.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/footageTypeIconsLineStyle.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The three footage-type icons (drone/oblique/ipcam) were filled glyphs
 * (fill:#fff, stroke-width:0) — the only icons in the app not drawn as
 * currentColor line icons. See Phase 5b.
 */
const ASSETS = join(__dirname, '..', 'assets', 'icons');
const drone = readFileSync(join(ASSETS, 'drone.svg'), 'utf8');
const oblique = readFileSync(join(ASSETS, 'oblique.svg'), 'utf8');
const ipcam = readFileSync(join(ASSETS, 'ipcam.svg'), 'utf8');
const reportCss = readFileSync(join(__dirname, '..', 'components', 'Report', 'report.css'), 'utf8');

describe('footage-type icons are line icons, not filled glyphs', () => {
  it.each([
    ['drone.svg', drone],
    ['oblique.svg', oblique],
    ['ipcam.svg', ipcam],
  ])('%s uses a currentColor stroke with no fill', (_name, svg) => {
    expect(svg).toMatch(/stroke="currentColor"/);
    expect(svg).toMatch(/fill="none"/);
    expect(svg).not.toMatch(/fill:\s*#(fff|000)/i);
    expect(svg).not.toMatch(/<style>/);
  });

  it('all three keep a 0 0 24 24 viewBox, matching the rest of the app\'s line icons', () => {
    for (const svg of [drone, oblique, ipcam]) {
      expect(svg).toMatch(/viewBox="0 0 24 24"/);
    }
  });

  it('the report header banner already colours a currentColor icon white — confirms no report.css change is needed', () => {
    expect(reportCss).toMatch(/#header-icon-container\s*\{[^}]*color:\s*#FFFFFF/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/footageTypeIconsLineStyle.test.ts`
Expected: FAIL — the three SVG files still contain `fill:#fff`/`fill:#000` and no `stroke="currentColor"`.

- [ ] **Step 3: Replace `drone.svg`**

Replace the full contents of `src/assets/icons/drone.svg` with:

```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="5.5" cy="5.5" r="3"/>
  <circle cx="18.5" cy="5.5" r="3"/>
  <circle cx="5.5" cy="18.5" r="3"/>
  <circle cx="18.5" cy="18.5" r="3"/>
  <path d="M7.8 7.8l2.2 2.2M16.2 7.8 14 10M7.8 16.2l2.2-2.2M16.2 16.2 14 14"/>
  <rect x="9.5" y="9.5" width="5" height="5" rx="1.2"/>
</svg>
```

- [ ] **Step 4: Replace `oblique.svg`**

Replace the full contents of `src/assets/icons/oblique.svg` with:

```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="5" y="2.5" width="14" height="8.5" rx="1.8"/>
  <circle cx="12" cy="6.75" r="2.1"/>
  <path d="M12 11v3.2M12 14.2 6.5 21.5M12 14.2l5.5 7.3M12 14.2v7.3"/>
</svg>
```

- [ ] **Step 5: Replace `ipcam.svg`**

Replace the full contents of `src/assets/icons/ipcam.svg` with:

```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97"/>
  <path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z"/>
  <path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15"/>
  <path d="M2 21v-4"/>
  <path d="M7 9h.01"/>
</svg>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest src/helpers/footageTypeIconsLineStyle.test.ts`
Expected: PASS

- [ ] **Step 7: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; tsc error count and lint problem count match (or improve on) the baseline recorded in Global Constraints.

- [ ] **Step 8: Commit**

```bash
git add src/assets/icons/drone.svg src/assets/icons/oblique.svg src/assets/icons/ipcam.svg src/helpers/footageTypeIconsLineStyle.test.ts
git commit -m "$(cat <<'EOF'
Replace the footage-type icons with line icons

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Visible name, description and check badge on each footage tile

**Files:**
- Modify: `src/pages/FootageMode.tsx`
- Modify: `src/pages/pages.css`
- Test: `src/helpers/footageTileContent.test.ts` (create)

**Interfaces:**
- Consumes: `Icons.Check` from `src/components/CustomIcons/Icons.tsx` (existing, used the same way by `src/components/ThemeToggle.tsx`'s selected-item indicator).
- Consumes: Task 1's line-icon SVGs (unchanged import, `<Icon path={icon} />`).

- [ ] **Step 1: Write the failing test**

Create `src/helpers/footageTileContent.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const tsx = readFileSync(join(__dirname, '..', 'pages', 'FootageMode.tsx'), 'utf8');
const css = readFileSync(join(__dirname, '..', 'pages', 'pages.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('Footage type tiles show a name and description', () => {
  it('each tile renders a visible name and description, not just an aria-label', () => {
    expect(tsx).toMatch(/className="footage-type-name"/);
    expect(tsx).toMatch(/className="footage-type-description"/);
  });

  it('reuses the existing aria-label translation call for the name, and a new sibling key for the description', () => {
    expect(tsx).toMatch(/t\('Step-2\.footageType\.' \+ id, \{ defaultValue: label \}\)/);
    expect(tsx).toMatch(/t\('Step-2\.footageType\.' \+ id \+ 'Description', \{ defaultValue: description \}\)/);
  });

  it('footageTypes carries a description for every type', () => {
    expect(tsx).toMatch(/id:\s*'uav'[^}]*description:\s*'Top-down view from above'/);
    expect(tsx).toMatch(/id:\s*'oblique'[^}]*description:\s*'Tripod or camera on the bank'/);
    expect(tsx).toMatch(/id:\s*'ipcam'[^}]*description:\s*'IP or CCTV station'/);
  });

  it('shows a check badge only on the selected tile', () => {
    expect(tsx).toMatch(/\{footageType === id && \(/);
    expect(tsx).toMatch(/className="footage-check-badge"/);
    expect(tsx).toMatch(/Icons\.Check\('var\(--on-accent\)'\)/);
  });

  it('.footage-check-badge is a filled accent-coloured circle', () => {
    const body = ruleBody('.footage-check-badge');
    expect(body).toMatch(/border-radius:\s*50%/);
    expect(body).toMatch(/background:\s*var\(--accent-color\)/);
  });

  it('unselected tile icons are dimmer than the selected one', () => {
    expect(ruleBody('.footage-button-container svg')).toMatch(/color:\s*var\(--secondary-text-color\)/);
    expect(ruleBody('.selected-footage-type svg')).toMatch(/color:\s*var\(--primary-text-color\)/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/footageTileContent.test.ts`
Expected: FAIL — none of this markup/CSS exists yet.

- [ ] **Step 3: Add the `Icons` import and `description` field**

In `src/pages/FootageMode.tsx`, add this import alongside the existing ones (after the `Icon` import):

```ts
import { Icons } from '../components/CustomIcons/Icons';
```

Replace:

```ts
const footageTypes = [
  { id: 'uav', icon: drone, label: 'Drone' },
  { id: 'oblique', icon: oblique, label: 'Oblique' },
  { id: 'ipcam', icon: ipcam, label: 'Fixed camera' },
];
```

with:

```ts
const footageTypes = [
  { id: 'uav', icon: drone, label: 'Drone', description: 'Top-down view from above' },
  { id: 'oblique', icon: oblique, label: 'Oblique', description: 'Tripod or camera on the bank' },
  { id: 'ipcam', icon: ipcam, label: 'Fixed camera', description: 'IP or CCTV station' },
];
```

- [ ] **Step 4: Render the name, description and check badge**

Replace:

```tsx
          {footageTypes.map(({ id, icon, label }) => (
            <div
              key={id}
              className={`footage-button-container ${dragOver === id ? `drag-over-${id}` : ''} ${footageType === id ? 'selected-footage-type' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={footageType === id}
              aria-label={t('Step-2.footageType.' + id, { defaultValue: label })}
              onDragOver={(event) => handleDragOver(event, setDragOver, id)}
              onDragLeave={(event) => handleDragLeave(event, setDragOver, true)}
              onDrop={handleDrop(id)}
              onClick={() => setFootageType(id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFootageType(id);
                }
              }}
              id={id}
            >
              <Icon path={icon} />
            </div>
          ))}
```

with:

```tsx
          {footageTypes.map(({ id, icon, label, description }) => (
            <div
              key={id}
              className={`footage-button-container ${dragOver === id ? `drag-over-${id}` : ''} ${footageType === id ? 'selected-footage-type' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={footageType === id}
              aria-label={t('Step-2.footageType.' + id, { defaultValue: label })}
              onDragOver={(event) => handleDragOver(event, setDragOver, id)}
              onDragLeave={(event) => handleDragLeave(event, setDragOver, true)}
              onDrop={handleDrop(id)}
              onClick={() => setFootageType(id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFootageType(id);
                }
              }}
              id={id}
            >
              {footageType === id && (
                <span className="footage-check-badge" aria-hidden="true">
                  {Icons.Check('var(--on-accent)')}
                </span>
              )}
              <Icon path={icon} />
              <b className="footage-type-name">{t('Step-2.footageType.' + id, { defaultValue: label })}</b>
              <small className="footage-type-description">
                {t('Step-2.footageType.' + id + 'Description', { defaultValue: description })}
              </small>
            </div>
          ))}
```

- [ ] **Step 5: Add the supporting CSS**

In `src/pages/pages.css`, replace:

```css
.footage-button-container {
    padding-top: 30px;
    padding-bottom: 20px;
    width: 250px;
    height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.1s ease, box-shadow 0.1s ease;
}
```

with:

```css
.footage-button-container {
    position: relative;
    padding-top: 30px;
    padding-bottom: 20px;
    width: 250px;
    height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.1s ease, box-shadow 0.1s ease;
}

.footage-button-container svg {
    width: 40px;
    height: 40px;
    color: var(--secondary-text-color);
    transition: color 0.15s ease;
}

.selected-footage-type svg {
    color: var(--primary-text-color);
}

.footage-type-name {
    font-size: 16px;
    font-weight: 600;
}

.footage-type-description {
    font-size: 13px;
    color: var(--secondary-text-color);
    text-align: center;
    max-width: 180px;
}

.footage-check-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--accent-color);
    display: flex;
    align-items: center;
    justify-content: center;
}

.footage-check-badge svg {
    width: 14px;
    height: 14px;
    color: var(--on-accent);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest src/helpers/footageTileContent.test.ts`
Expected: PASS

- [ ] **Step 7: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; tsc error count and lint problem count match (or improve on) Task 1's counts.

- [ ] **Step 8: Commit**

```bash
git add src/pages/FootageMode.tsx src/pages/pages.css src/helpers/footageTileContent.test.ts
git commit -m "$(cat <<'EOF'
Give footage type tiles a visible name, description and check badge

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Deferred (not in this plan)

- The hover-vs-selected visual distinction the original audit finding described is already handled by the current `.footage-button-container:hover`/`.selected-footage-type` CSS (grey border + 1.04 scale vs. accent border/shadow + 1.08 scale) — confirmed by reading the current code, not re-touched here.
- `.footage-button-container`'s fixed `height: 200px` is not changed — the added name+description text fits comfortably within the existing padding/icon budget (~162px of content at typical font sizes), verified by arithmetic, not a live render.
- The manual three-theme Electron walkthrough this phase's visual change deserves is owed, same architectural gap as every prior phase (Electron-only renderer, no shell in this environment). If resumed where the real app can run, check: icon legibility (line-weight at 40px) in all three themes, the check badge's contrast against `--accent-color` in light theme, and description text wrapping at the tile's actual rendered width.
