# Processing Stage Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single percentage/remaining-time readout in the Processing step's Analize
progress indicator with a stage-aware one — a text breadcrumb (`LSPIV → STIV → iWave`) that always
shows which technique is currently running, plus per-stage `Station X / Y` and a friendly
"Estimating…" placeholder during the real quiet gap before STIV/iWave's first tick.

**Architecture:** A new pure parser (`parseAnalyzeStage.ts`) reads the `desc` field `tqdm` already
prints (previously discarded) plus a couple of existing/new plain-text `_log` markers, and maps each
stderr line to `{ stage, percentage, station, remaining, note }`. `AnalyzingProgress.tsx` keeps one
state object built by a single rule — switch stage when the incoming line names a different one,
otherwise merge fields onto the current stage — and renders the breadcrumb + existing wheel + text
around it. One backend log line and one Electron throttle-bypass rule ensure the stage-transition
line is never silently dropped.

**Tech Stack:** TypeScript/React (Vite, Electron main+renderer), Python 3.11 (river.core), Jest
(`testEnvironment: "node"`), pytest.

## Global Constraints

- No changes to `.loader-*` CSS or the `Loading` component's existing props/behavior — the wheel
  itself is reused exactly as-is.
- `parseCliProgress.ts` stays untouched (`useCalibrationSlice.ts` depends on it for an unrelated flow).
- New i18n keys go in all 12 locale files under `src/translations/*/global.json`; non-English locales
  carry the same English string as a placeholder (no translation work in this plan).
- This project has no React component test infrastructure (`jest.config.ts` → `testEnvironment:
  "node"`) — `AnalyzingProgress.tsx` and the Electron wiring in `executeRiverCli.ts` are verified
  manually; only pure-function logic (`parseAnalyzeStage.ts`, `detectPhaseTransition.ts`, the Python
  marker) gets automated tests.
- Python tests run with `venv/bin/python -m pytest <path> -q` from the repo root
  (`/Users/antoine/river`). JS/TS tests run with `npx jest <path>` from `gui/`.
- Commit after each task; do not bundle unrelated changes into a commit.

---

### Task 1: Backend — name the STIV model-loading gap

**Files:**
- Modify: `river/core/orchestrator.py:113` (insert one line before it)
- Test: `tests/test_orchestrator.py`

**Interfaces:**
- Consumes: nothing new — uses the existing `_log(msg: str) -> None` helper already defined at
  `orchestrator.py:49-50`.
- Produces: a new stderr line, `"STIV: loading models"`, printed once at the start of Stage 3 when
  `stiv=True`, before `load_models()` runs. Task 4 (`parseAnalyzeStage.ts`) matches this exact string
  as a prefix — do not change its wording without updating that task.

- [ ] **Step 1: Write the failing tests**

Open `tests/test_orchestrator.py`. It already has a `fake_project` fixture and a `_run(tmp_path,
**kw)` helper (calls `run_full_analysis`) — reuse both. Add, after `test_engines_off_strip_columns`:

```python
def test_stiv_logs_loading_models_marker(fake_project, capsys):
	tmp_path, calls = fake_project
	_run(tmp_path)
	captured = capsys.readouterr()
	assert "STIV: loading models" in captured.err


def test_stiv_disabled_no_loading_models_marker(fake_project, capsys):
	tmp_path, calls = fake_project
	_run(tmp_path, stiv=False)
	captured = capsys.readouterr()
	assert "STIV: loading models" not in captured.err
```

Note: this file uses tabs for indentation (matching the rest of `test_orchestrator.py`) — match the
surrounding style exactly.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `venv/bin/python -m pytest tests/test_orchestrator.py -k loading_models -v`
Expected: `test_stiv_logs_loading_models_marker` FAILS (assertion: `"STIV: loading models" in
captured.err` is False). `test_stiv_disabled_no_loading_models_marker` PASSES trivially (the string
isn't printed at all yet) — that's expected at this point, it'll stay passing after Step 3 too.

- [ ] **Step 3: Add the log line**

In `river/core/orchestrator.py`, Stage 3, change:

```python
	if stiv:
		try:
			models = load_models()
```

to:

```python
	if stiv:
		try:
			_log("STIV: loading models")
			models = load_models()
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `venv/bin/python -m pytest tests/test_orchestrator.py -v`
Expected: all tests PASS, including the two new ones and the 5 pre-existing ones.

- [ ] **Step 5: Commit**

```bash
cd /Users/antoine/river
git add river/core/orchestrator.py tests/test_orchestrator.py
git commit -m "Log a marker before STIV loads its models

Names the real quiet gap that exists today before STIV's first tqdm
tick — the GUI's progress parser (added in a later commit) uses this
to show 'Loading STIV models...' instead of a stale/blank readout."
```

---

### Task 2: Electron — pure stage-transition detector + tests

**Files:**
- Create: `gui/electron/ipcMainHandlers/utils/detectPhaseTransition.ts`
- Test: `gui/electron/ipcMainHandlers/utils/detectPhaseTransition.test.ts`

**Interfaces:**
- Consumes: nothing (pure function, no imports beyond none needed).
- Produces:
  ```ts
  export function detectPhaseTransition(
    message: string,
    previousDesc: string
  ): { phaseLine: string | null; desc: string }
  ```
  Task 3 imports `detectPhaseTransition` from this file to replace the inline `phaseLine` detection
  in `executeRiverCli.ts`.

This function decides which stderr lines must bypass `executeRiverCli.ts`'s 500ms throttle so a
stage transition is never silently dropped. It recognizes two things in a chunk of stderr text
(which may contain multiple newline-separated lines):
1. A line starting with `Extracting`, `Stabilizing`, `PIV:`, `STIV:`, or `iWave:` (existing +
   new plain-text markers — these carry no `tqdm` progress, just a phase name).
2. A `tqdm` line (`{desc}: {pct}%|...`) whose `desc` differs from `previousDesc` — the first tick of
   a new stage.

It returns the first matching line found (or `null` if none), and the `desc` to remember for the
*next* call (only updated by a `tqdm` line — plain markers don't change the running `desc`).

- [ ] **Step 1: Write the failing tests**

Create `gui/electron/ipcMainHandlers/utils/detectPhaseTransition.test.ts`:

```ts
import { detectPhaseTransition } from './detectPhaseTransition';

describe('detectPhaseTransition', () => {
  it('flags the first tqdm line of a new stage and updates desc', () => {
    const line = 'Processing image pairs:   0%|          | 0/20 [00:00<?, ?it/s]';
    expect(detectPhaseTransition(line, '')).toEqual({ phaseLine: line, desc: 'Processing image pairs' });
  });

  it('does not flag a tqdm line whose desc matches the running desc', () => {
    const line = 'Processing image pairs:  45%|████      | 9/20 [00:12<00:15,  1.29it/s]';
    expect(detectPhaseTransition(line, 'Processing image pairs')).toEqual({
      phaseLine: null,
      desc: 'Processing image pairs',
    });
  });

  it('flags a tqdm line whose desc differs from the running desc, and updates desc', () => {
    const line = 'STIV:   0%|          | 0/15 [00:00<?, ?it/s]';
    expect(detectPhaseTransition(line, 'Processing image pairs')).toEqual({ phaseLine: line, desc: 'STIV' });
  });

  it('flags a plain STIV/iWave/PIV marker line without changing desc', () => {
    expect(detectPhaseTransition('STIV: loading models', 'Processing image pairs')).toEqual({
      phaseLine: 'STIV: loading models',
      desc: 'Processing image pairs',
    });
    expect(detectPhaseTransition('iWave: warping frames onto ortho grid', 'STIV')).toEqual({
      phaseLine: 'iWave: warping frames onto ortho grid',
      desc: 'STIV',
    });
  });

  it('still flags the existing Extracting/Stabilizing markers', () => {
    expect(detectPhaseTransition('Extracting frame 120/500', '')).toEqual({
      phaseLine: 'Extracting frame 120/500',
      desc: '',
    });
    expect(detectPhaseTransition('Stabilizing frame 12/500', '')).toEqual({
      phaseLine: 'Stabilizing frame 12/500',
      desc: '',
    });
  });

  it('ignores unrelated stderr text', () => {
    const line = "UserWarning: resource_tracker: There appear to be 1 leaked semaphore objects";
    expect(detectPhaseTransition(line, 'STIV')).toEqual({ phaseLine: null, desc: 'STIV' });
  });

  it('finds the transition inside a multi-line chunk and keeps scanning past a same-desc line', () => {
    const chunk = [
      'Processing image pairs: 100%|██████████| 20/20 [00:20<00:00,  1.00it/s]',
      'STIV:   0%|          | 0/15 [00:00<?, ?it/s]',
    ].join('\n');
    expect(detectPhaseTransition(chunk, 'Processing image pairs')).toEqual({
      phaseLine: 'STIV:   0%|          | 0/15 [00:00<?, ?it/s]',
      desc: 'STIV',
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `gui/`): `npx jest electron/ipcMainHandlers/utils/detectPhaseTransition.test.ts`
Expected: FAIL — `Cannot find module './detectPhaseTransition'`.

- [ ] **Step 3: Implement `detectPhaseTransition.ts`**

Create `gui/electron/ipcMainHandlers/utils/detectPhaseTransition.ts`:

```ts
const PLAIN_MARKER_PREFIXES = ['Extracting', 'Stabilizing', 'PIV:', 'STIV:', 'iWave:'];

/**
 * Decides which stderr lines from a river-cli run must bypass the caller's
 * output throttle so a stage/phase transition is never silently dropped.
 * Recognizes the plain-text phase markers (Extracting/Stabilizing frames,
 * and the PIV:/STIV:/iWave: markers from orchestrator.py's _log calls) and
 * the first tqdm line of a new `desc` (tqdm's own bar label, e.g. "STIV").
 *
 * `message` may contain multiple newline-separated lines (a single stderr
 * chunk). Returns the first matching line, and the `desc` to pass as
 * `previousDesc` on the next call (unchanged by plain markers — only a
 * tqdm line updates it).
 */
export function detectPhaseTransition(
  message: string,
  previousDesc: string
): { phaseLine: string | null; desc: string } {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let desc = previousDesc;
  let phaseLine: string | null = null;

  for (const line of lines) {
    if (PLAIN_MARKER_PREFIXES.some((prefix) => line.startsWith(prefix))) {
      if (phaseLine === null) phaseLine = line;
      continue;
    }

    const tqdmMatch = line.match(/^([^:|]+):\s*\d+%\|/);
    if (tqdmMatch) {
      const lineDesc = tqdmMatch[1].trim();
      if (lineDesc !== desc) {
        if (phaseLine === null) phaseLine = line;
        desc = lineDesc;
      }
    }
  }

  return { phaseLine, desc };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `gui/`): `npx jest electron/ipcMainHandlers/utils/detectPhaseTransition.test.ts`
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/antoine/river
git add gui/electron/ipcMainHandlers/utils/detectPhaseTransition.ts gui/electron/ipcMainHandlers/utils/detectPhaseTransition.test.ts
git commit -m "Add detectPhaseTransition: identify stage-transition stderr lines

Pure function backing the executeRiverCli throttle-bypass rule added
next: a river-cli-message must reach the renderer immediately whenever
it marks a new stage, not get dropped by the 500ms output throttle."
```

---

### Task 3: Electron — wire `detectPhaseTransition` into `executeRiverCli.ts`

**Files:**
- Modify: `gui/electron/ipcMainHandlers/utils/executeRiverCli.ts:33-73`

**Interfaces:**
- Consumes: `detectPhaseTransition(message, previousDesc)` from Task 2.
- Produces: no new exports — this task only changes `executeRiverCli`'s internal stderr handling.

No automated test for this step (matches this file's existing untested status — it's process-spawn
wiring, not pure logic). Verified manually in Task 8's end-to-end pass.

- [ ] **Step 1: Read the current stderr handler**

Open `gui/electron/ipcMainHandlers/utils/executeRiverCli.ts`. Locate the `python.stdout`/`stderr`
handlers inside `executeRiverCli` (around lines 33-73). The relevant block is:

```ts
    python.stderr.on('data', (data) => {
      const message = data.toString();
      stderrData = message;
      console.log('stderr', message);

      // Guardar el último mensaje
      lastStderrMessage = message;

      // Output con throttling
      if (output === true) {
        // Phase-transition markers ("Extracting frames..." / "Stabilizing frames...")
        // must always reach the renderer, even under throttling — with a long video
        // a burst of frame-progress lines can otherwise overwrite this one-off line
        // before the 500ms window opens, silently dropping the phase change.
        const phaseLine = message
          .split('\n')
          .map((line: string) => line.trim())
          .find((line: string) => line.startsWith('Extracting') || line.startsWith('Stabilizing'));

        if (phaseLine) {
          webContents.getAllWebContents().forEach((contents) => {
            contents.send('river-cli-message', phaseLine);
          });
          lastSentTime = Date.now();
        } else {
          const currentTime = Date.now();
          const timeSinceLastSent = currentTime - lastSentTime;

          if (timeSinceLastSent >= THROTTLE_INTERVAL) {
            webContents.getAllWebContents().forEach((contents) => {
              contents.send('river-cli-message', message);
            });
            lastSentTime = currentTime;
          }
        }
      }
    });
```

- [ ] **Step 2: Add the import and a per-invocation `desc` tracker**

At the top of the file, add the import:

```ts
import { detectPhaseTransition } from './detectPhaseTransition';
```

Inside `executeRiverCli`, alongside the existing `let stdoutData = '';` / `let stderrData = '';`
declarations (just inside the `new Promise` executor, so it resets on every call), add:

```ts
    let lastDesc = '';
```

- [ ] **Step 3: Replace the inline `phaseLine` detection**

Replace the block from Step 1 with:

```ts
    python.stderr.on('data', (data) => {
      const message = data.toString();
      stderrData = message;
      console.log('stderr', message);

      // Guardar el último mensaje
      lastStderrMessage = message;

      // Output con throttling
      if (output === true) {
        // Phase/stage-transition lines ("Extracting frames...", "Stabilizing frames...", the
        // PIV:/STIV:/iWave: markers, and the first tqdm tick of a new stage) must always reach
        // the renderer, even under throttling — with a long video or a multi-stage analyze-all
        // run, a burst of progress lines can otherwise overwrite a one-off transition line
        // before the 500ms window opens, silently dropping it.
        const { phaseLine, desc } = detectPhaseTransition(message, lastDesc);
        lastDesc = desc;

        if (phaseLine) {
          webContents.getAllWebContents().forEach((contents) => {
            contents.send('river-cli-message', phaseLine);
          });
          lastSentTime = Date.now();
        } else {
          const currentTime = Date.now();
          const timeSinceLastSent = currentTime - lastSentTime;

          if (timeSinceLastSent >= THROTTLE_INTERVAL) {
            webContents.getAllWebContents().forEach((contents) => {
              contents.send('river-cli-message', message);
            });
            lastSentTime = currentTime;
          }
        }
      }
    });
```

- [ ] **Step 4: Type-check**

Run (from `gui/`): `npx tsc --noEmit` (the single root `tsconfig.json` covers both `src` and
`electron`).
Expected: no type errors.

- [ ] **Step 5: Run the full JS/TS test suite to confirm nothing else broke**

Run (from `gui/`): `npx jest`
Expected: all suites pass (same count as before this task, plus Task 2's new 7 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/antoine/river
git add gui/electron/ipcMainHandlers/utils/executeRiverCli.ts
git commit -m "Bypass output throttle for stage-transition lines in executeRiverCli

Uses detectPhaseTransition so PIV:/STIV:/iWave: markers and the first
tqdm tick of a new stage always reach the renderer immediately."
```

---

### Task 4: Frontend — `parseAnalyzeStage.ts` pure parser + tests

**Files:**
- Create: `gui/src/helpers/parseAnalyzeStage.ts`
- Test: `gui/src/helpers/parseAnalyzeStage.test.ts`

**Interfaces:**
- Consumes: nothing (pure function).
- Produces:
  ```ts
  export type StageKey = 'lspiv' | 'stiv' | 'iwave';

  export interface AnalyzeStageUpdate {
    stage: StageKey | null;
    percentage: number | null;
    station: [number, number] | null;
    remaining: string | null;
    note: string | null;
  }

  export function parseAnalyzeStage(text: string): AnalyzeStageUpdate
  ```
  Task 6 (`AnalyzingProgress.tsx`) imports `StageKey`, `AnalyzeStageUpdate`, and
  `parseAnalyzeStage` from this file.

- [ ] **Step 1: Write the failing tests**

Create `gui/src/helpers/parseAnalyzeStage.test.ts`:

```ts
import { parseAnalyzeStage } from './parseAnalyzeStage';

const NO_MATCH = { stage: null, percentage: null, station: null, remaining: null, note: null };

describe('parseAnalyzeStage', () => {
  it('parses the PIV field tqdm line (first tick, unknown remaining)', () => {
    const line = 'Processing image pairs:   0%|          | 0/20 [00:00<?, ?it/s]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'lspiv',
      percentage: 0,
      station: null,
      remaining: null,
      note: null,
    });
  });

  it('parses the PIV field tqdm line mid-run, with a real remaining estimate', () => {
    const line = 'Processing image pairs:  45%|████████████            | 9/20 [00:12<00:15,  1.29it/s]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'lspiv',
      percentage: 45,
      station: null,
      remaining: '00:15',
      note: null,
    });
  });

  it('maps the "LSPIV profiles" tqdm desc to lspiv too', () => {
    const line = 'LSPIV profiles: 100%|██████████| 1/1 [00:00<00:00, 43.48it/s]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'lspiv',
      percentage: 100,
      station: null,
      remaining: '00:00',
      note: null,
    });
  });

  it('parses a STIV tqdm line with station counts', () => {
    const line = 'STIV:  27%|##7       | 4/15 [00:12<00:33,  3.05s/it]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'stiv',
      percentage: 27,
      station: [4, 15],
      remaining: '00:33',
      note: null,
    });
  });

  it('parses an iWave tqdm line with station counts', () => {
    const line = 'iWave:  40%|####      | 6/15 [00:20<00:24,  2.50s/it]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'iwave',
      percentage: 40,
      station: [6, 15],
      remaining: '00:24',
      note: null,
    });
  });

  it('returns remaining: null for the first STIV tick (unknown remaining)', () => {
    const line = 'STIV:   0%|          | 0/15 [00:00<?, ?it/s]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'stiv',
      percentage: 0,
      station: [0, 15],
      remaining: null,
      note: null,
    });
  });

  it('parses the "PIV: computing" marker as a lspiv note', () => {
    expect(parseAnalyzeStage('PIV: computing displacement field')).toEqual({
      stage: 'lspiv',
      percentage: null,
      station: null,
      remaining: null,
      note: 'PIV: computing displacement field',
    });
  });

  it('parses the "PIV: parameters unchanged" marker as a lspiv note', () => {
    const line = 'PIV: parameters unchanged, reusing existing piv_results.json';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'lspiv',
      percentage: null,
      station: null,
      remaining: null,
      note: line,
    });
  });

  it('parses the "STIV: loading models" marker as a stiv note', () => {
    expect(parseAnalyzeStage('STIV: loading models')).toEqual({
      stage: 'stiv',
      percentage: null,
      station: null,
      remaining: null,
      note: 'STIV: loading models',
    });
  });

  it('parses the "iWave: warping frames" marker as an iwave note', () => {
    const line = 'iWave: warping frames onto ortho grid';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'iwave',
      percentage: null,
      station: null,
      remaining: null,
      note: line,
    });
  });

  it('parses a "STIV failed, continuing" line as a stiv note', () => {
    const line = 'STIV failed, continuing without it: boom';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'stiv',
      percentage: null,
      station: null,
      remaining: null,
      note: line,
    });
  });

  it('parses an "iWave failed, continuing" line as an iwave note', () => {
    const line = 'iWave failed, continuing without it: boom';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'iwave',
      percentage: null,
      station: null,
      remaining: null,
      note: line,
    });
  });

  it('ignores an unrelated stderr line', () => {
    const line = 'UserWarning: resource_tracker: There appear to be 1 leaked semaphore objects';
    expect(parseAnalyzeStage(line)).toEqual(NO_MATCH);
  });

  it('ignores an empty/whitespace-only line', () => {
    expect(parseAnalyzeStage('   ')).toEqual(NO_MATCH);
    expect(parseAnalyzeStage('')).toEqual(NO_MATCH);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `gui/`): `npx jest src/helpers/parseAnalyzeStage.test.ts`
Expected: FAIL — `Cannot find module './parseAnalyzeStage'`.

- [ ] **Step 3: Implement `parseAnalyzeStage.ts`**

Create `gui/src/helpers/parseAnalyzeStage.ts`:

```ts
export type StageKey = 'lspiv' | 'stiv' | 'iwave';

export interface AnalyzeStageUpdate {
  stage: StageKey | null;
  percentage: number | null;
  station: [number, number] | null;
  remaining: string | null;
  note: string | null;
}

const NO_MATCH: AnalyzeStageUpdate = {
  stage: null,
  percentage: null,
  station: null,
  remaining: null,
  note: null,
};

const STAGE_BY_TQDM_DESC: Record<string, StageKey> = {
  'Processing image pairs': 'lspiv',
  'LSPIV profiles': 'lspiv',
  STIV: 'stiv',
  iWave: 'iwave',
};

// Order matters only in that longer/more-specific prefixes should be checked before shorter
// ones if they could ever collide — they don't here, all five are disjoint.
const MARKER_PREFIXES: { prefix: string; stage: StageKey }[] = [
  { prefix: 'PIV: computing', stage: 'lspiv' },
  { prefix: 'PIV: parameters unchanged', stage: 'lspiv' },
  { prefix: 'STIV: loading models', stage: 'stiv' },
  { prefix: 'STIV failed, continuing', stage: 'stiv' },
  { prefix: 'iWave: warping frames', stage: 'iwave' },
  { prefix: 'iWave failed, continuing', stage: 'iwave' },
];

/**
 * Parses one river-cli stderr line from an analyze-all run into a stage update.
 * Recognizes two shapes: a tqdm progress line (desc + %|n/total [elapsed<remaining]),
 * and the plain-text _log markers orchestrator.py prints around each stage
 * (see river/core/orchestrator.py). Any other line returns an all-null "no match".
 */
export function parseAnalyzeStage(text: string): AnalyzeStageUpdate {
  const trimmed = text.trim();
  if (trimmed === '') return NO_MATCH;

  for (const marker of MARKER_PREFIXES) {
    if (trimmed.startsWith(marker.prefix)) {
      return { stage: marker.stage, percentage: null, station: null, remaining: null, note: trimmed };
    }
  }

  const descMatch = trimmed.match(/^([^:|]+):\s*(\d+)%\|/);
  if (!descMatch) return NO_MATCH;

  const stage = STAGE_BY_TQDM_DESC[descMatch[1].trim()];
  if (!stage) return NO_MATCH;

  const percentage = parseInt(descMatch[2], 10);

  const countMatch = trimmed.match(/\|\s*(\d+)\/(\d+)\s*\[/);
  const station: [number, number] | null =
    stage !== 'lspiv' && countMatch ? [parseInt(countMatch[1], 10), parseInt(countMatch[2], 10)] : null;

  const remainingMatch = trimmed.match(/\[(\d{2}:\d{2})<(\d{2}:\d{2})/);
  const remaining = remainingMatch ? remainingMatch[2] : null;

  return { stage, percentage, station, remaining, note: null };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `gui/`): `npx jest src/helpers/parseAnalyzeStage.test.ts`
Expected: all 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/antoine/river
git add gui/src/helpers/parseAnalyzeStage.ts gui/src/helpers/parseAnalyzeStage.test.ts
git commit -m "Add parseAnalyzeStage: stage-aware CLI progress parser

Reads tqdm's desc field (previously discarded by parseCliProgress) to
tell LSPIV/STIV/iWave ticks apart, plus the plain-text stage markers.
Kept separate from parseCliProgress.ts, which useCalibrationSlice still
depends on for an unrelated flow."
```

---

### Task 5: i18n — add stage/estimating keys to all 12 locales

**Files:**
- Modify: `gui/src/translations/en/global.json`
- Modify: `gui/src/translations/{ar,de,es,fr,hi,it,ja,ko,pt,ru,zh}/global.json` (11 files)

**Interfaces:**
- Produces: translation keys `Analizing.stage.lspiv`, `Analizing.stage.stiv`,
  `Analizing.stage.iwave`, `Analizing.estimating`, consumed by Task 6 via
  `t('Analizing.stage.lspiv')` etc.

Every file gets the exact same English text inserted (per spec §6.3 — non-English locales carry the
English string as a placeholder). No test for this task — it's static JSON content; Task 6's manual
verification pass covers rendering.

- [ ] **Step 1: Add the keys to `en/global.json`**

Find (line ~193):
```json
  "Analizing": {
    "title": "Analizing",
    "analize": "Analize",
    "stop": "Stop",
    "remainingTime": "Remaining Time: "
  },
```
Replace with:
```json
  "Analizing": {
    "title": "Analizing",
    "analize": "Analize",
    "stop": "Stop",
    "remainingTime": "Remaining Time: ",
    "estimating": "Estimating…",
    "stage": {
      "lspiv": "Computing LSPIV velocity field",
      "stiv": "Computing STIV velocities",
      "iwave": "Computing iWave velocities"
    }
  },
```

- [ ] **Step 2: Add the same keys (same English values) to the other 11 locale files**

For each of `ar`, `de`, `es`, `fr`, `hi`, `it`, `ja`, `ko`, `pt`, `ru`, `zh`, open
`gui/src/translations/<locale>/global.json` and find its `"Analizing"` block (each has the same 5
keys as `en`, just with translated *values* for `title`/`analize`/`stop`/`remainingTime` — only the
last line, `"remainingTime": "..."`, differs per file). Add `"estimating"` and `"stage"` right after
`remainingTime`, using the **English** text (placeholder, not translated) exactly as in Step 1. For
example, in `de/global.json`:
```json
  "Analizing": {
    "title": "Analyse",
    "analize": "Analysieren",
    "stop": "Stopp",
    "remainingTime": "Verbleibende Zeit: ",
    "estimating": "Estimating…",
    "stage": {
      "lspiv": "Computing LSPIV velocity field",
      "stiv": "Computing STIV velocities",
      "iwave": "Computing iWave velocities"
    }
  },
```
Repeat for the other 10 files, changing only the file/leaving `title`/`analize`/`stop`/`remainingTime`
untouched (their existing translated values) and inserting the same new `estimating`/`stage` block
(English placeholder) after `remainingTime` in every one.

- [ ] **Step 3: Validate all 12 files are still valid JSON**

Run (from `gui/`):
```bash
node -e "['ar','de','en','es','fr','hi','it','ja','ko','pt','ru','zh'].forEach(l => { JSON.parse(require('fs').readFileSync('src/translations/'+l+'/global.json','utf-8')); console.log(l, 'OK'); })"
```
Expected: 12 lines, each `<locale> OK`. Any `SyntaxError` means a trailing-comma or bracket mistake
in that file — fix it before continuing.

- [ ] **Step 4: Commit**

```bash
cd /Users/antoine/river
git add gui/src/translations/*/global.json
git commit -m "Add Analizing.stage.* and Analizing.estimating i18n keys

Non-English locales carry the English string as a placeholder, same
convention used for new keys in the prior Processing-panel round."
```

---

### Task 6: `AnalyzingProgress.tsx` — stage-aware state + breadcrumb rendering

**Files:**
- Modify: `gui/src/components/Forms/Components/AnalyzingProgress.tsx` (full rewrite of the file body)
- Modify: `gui/src/index.css` (new breadcrumb rules, appended near `.loader-remaining-time`)

**Interfaces:**
- Consumes: `parseAnalyzeStage`, `StageKey`, `AnalyzeStageUpdate` from
  `../../../helpers/parseAnalyzeStage` (Task 4); `processing.form.stiv`/`processing.form.iwave` from
  `useDataSlice()` (existing, `gui/src/hooks/useDataSlice.ts:36`); the existing `Loading` component
  from `../../Loading` (props: `percentage?: string`, `time?: string`, `size?: string`,
  `isComplete?: boolean` — unchanged, see `gui/src/components/Loading.tsx:5-10`).
- Produces: no new exports — `AnalyzingProgress`'s own props (`{ resetProgress: boolean }`) are
  unchanged, so `FormProcessing.tsx`'s existing usage (`<AnalyzingProgress resetProgress={resetProgress}
  />`) needs no changes.

No automated test for this component (no React test infra, per Global Constraints) — manual
verification happens in Task 8.

- [ ] **Step 1: Add the breadcrumb CSS**

In `gui/src/index.css`, right after the `.loader-remaining-time` rule (search for it — it's near the
`BIG`/`MID` loader rules, roughly line 752), add:

```css
.analize-stage-breadcrumb {
  text-align: center;
  color: var(--secondary-text-color);
  font-size: 0.85em;
  margin-bottom: 8px;
}

.analize-stage-breadcrumb-active {
  color: var(--primary-text-color);
  font-weight: 600;
}
```

- [ ] **Step 2: Rewrite `AnalyzingProgress.tsx`**

Replace the full contents of `gui/src/components/Forms/Components/AnalyzingProgress.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataSlice } from '../../../hooks';
import { Loading } from '../../Loading';
import { parseAnalyzeStage, StageKey } from '../../../helpers/parseAnalyzeStage';

const STAGE_ORDER: StageKey[] = ['lspiv', 'stiv', 'iwave'];

interface StageState {
  stage: StageKey;
  percentage: number | null;
  station: [number, number] | null;
  remaining: string | null;
  note: string | null;
}

const initialState = (): StageState => ({
  stage: 'lspiv',
  percentage: null,
  station: null,
  remaining: null,
  note: null,
});

export const AnalyzingProgress = ({ resetProgress }: { resetProgress: boolean }) => {
  const { t } = useTranslation();
  const { isBackendWorking, quiver, processing } = useDataSlice();
  const { stiv, iwave } = processing.form;
  const [state, setState] = useState<StageState>(initialState());

  // Known synchronously on mount (before any backend output arrives), so the breadcrumb can
  // show the full run plan immediately.
  const enabledStages = useMemo<StageKey[]>(
    () => STAGE_ORDER.filter((s) => s === 'lspiv' || (s === 'stiv' && stiv) || (s === 'iwave' && iwave)),
    [stiv, iwave]
  );

  useEffect(() => {
    const handleRiverCliMessage = (_event: unknown, text: string) => {
      const update = parseAnalyzeStage(text);
      if (update.stage === null) return;

      setState((prev) => {
        // A line naming a different stage than the current one switches to it, with fresh
        // fields from that line. A line naming the same stage merges its fields onto the
        // existing state, keeping whatever the new line didn't carry.
        if (update.stage !== prev.stage) {
          return {
            stage: update.stage as StageKey,
            percentage: update.percentage,
            station: update.station,
            remaining: update.remaining,
            note: update.note,
          };
        }
        return {
          stage: prev.stage,
          percentage: update.percentage ?? prev.percentage,
          station: update.station ?? prev.station,
          remaining: update.remaining,
          note: update.note,
        };
      });
    };

    window.ipcRenderer.on('river-cli-message', handleRiverCliMessage);
    return () => {
      window.ipcRenderer.removeListener('river-cli-message', handleRiverCliMessage);
    };
  }, []);

  useEffect(() => {
    if (resetProgress) {
      setState(initialState());
    }
  }, [resetProgress]);

  useEffect(() => {
    if (isBackendWorking === false && quiver !== null) {
      setState((prev) => ({ ...prev, percentage: 100, remaining: '00:00', note: null }));
    }
  }, [isBackendWorking, quiver]);

  const percentageStr = state.percentage !== null ? `${state.percentage}%` : '';
  const remainingStr = state.remaining ? `${t('Analizing.remainingTime')}${state.remaining}` : '';

  return (
    <div className="analize-output mt-2">
      <p className="analize-stage-breadcrumb">
        {enabledStages.map((s, i) => (
          <span key={s} className={s === state.stage ? 'analize-stage-breadcrumb-active' : ''}>
            {i > 0 ? '  →  ' : ''}
            {t(`Analizing.stage.${s}`).replace(/^Computing /, '').replace(/ velocit(y field|ies)$/, '')}
          </span>
        ))}
      </p>
      {percentageStr !== '' && <Loading percentage={percentageStr} size={'big'} isComplete={state.percentage === 100} />}
      <p style={{ textAlign: 'center', fontWeight: 600, marginTop: '10px', marginBottom: '2px' }}>
        {t(`Analizing.stage.${state.stage}`)}
      </p>
      {state.station ? (
        <p style={{ textAlign: 'center' }}>
          {state.station[0]} / {state.station[1]}
        </p>
      ) : (
        state.note && <p style={{ textAlign: 'center' }}>{state.note}</p>
      )}
      {percentageStr !== '' && (
        <p className="loader-remaining-time" style={{ textAlign: 'center' }}>
          {remainingStr || t('Analizing.estimating')}
        </p>
      )}
    </div>
  );
};
```

Notes on this rewrite, for the implementer:
- The breadcrumb's per-item label strips "Computing "/" velocity field"/" velocities" from the
  headline translation via a small regex rather than duplicating three more i18n keys — this keeps a
  single source of truth (`Analizing.stage.*`) for both the headline and the short breadcrumb label
  (e.g. `"Computing STIV velocities"` → `"STIV"`). If this feels fragile in review, an acceptable
  alternative is adding three more explicit short-label keys (`Analizing.stageShort.lspiv` etc.) — a
  reviewer call, not a correctness issue either way.
- `percentageStr !== ''` (rather than checking `state.stage`) gates whether the wheel/remaining-time
  render at all — mirrors the original component's `percentage !== ''` gate, so nothing shows before
  the first real tick of the run arrives (the breadcrumb alone shows immediately on mount, per §6.2).

- [ ] **Step 3: Run the full JS/TS test suite**

Run (from `gui/`): `npx jest`
Expected: all suites pass (unchanged count from Task 5, since this task adds no new test files).

- [ ] **Step 4: Type-check and lint**

Run (from `gui/`):
```bash
npx tsc --noEmit
npx eslint src/components/Forms/Components/AnalyzingProgress.tsx src/index.css
```
Expected: no errors. (ESLint doesn't lint `.css` — if it errors on that argument, just lint the
`.tsx` file: `npx eslint src/components/Forms/Components/AnalyzingProgress.tsx`.)

- [ ] **Step 5: Commit**

```bash
cd /Users/antoine/river
git add gui/src/components/Forms/Components/AnalyzingProgress.tsx gui/src/index.css
git commit -m "Show a stage breadcrumb + station/estimating text in Analize progress

Replaces the flat percentage/remaining-time readout with stage-aware
state: a text breadcrumb (LSPIV -> STIV -> iWave) that's visible for
the whole run, Station X/Y during STIV/iWave, and 'Estimating...'
instead of a blank line before the first real remaining-time tick."
```

---

### Task 7: Manual verification

No code changes — this task runs the app and confirms the feature end-to-end, since
`AnalyzingProgress.tsx` and the Electron wiring have no automated coverage (Global Constraints).

**Files:** none.

- [ ] **Step 1: Build and launch the app**

Run (from `gui/`): `npm run dev`
Wait for the Electron window to open with an existing or new RIVeR project loaded through to the
Processing step.

- [ ] **Step 2: Full run, all three techniques enabled**

Toggle STIV and iWave on, click Analize. Confirm:
- The breadcrumb appears immediately on click, before any wheel/percentage shows, with LSPIV
  highlighted.
- The wheel shows real percentage/remaining-time ticking during the LSPIV field computation.
- When STIV starts: breadcrumb switches to STIV: highlighted; a brief "STIV: loading models" (or
  similar) note appears before the first tick; then the wheel resets to a fresh 0-100% for STIV with
  `Station X / Y` visible and "Estimating…" shown until the first real remaining-time estimate lands.
- Same for the iWave stage.
- Nothing crashes or throws in the DevTools console (`Cmd+Option+I` in the Electron window) during
  the whole run.

- [ ] **Step 3: STIV-only, then iWave-only, then LSPIV-only**

Rerun with only STIV enabled — breadcrumb shows `LSPIV → STIV` only, never mentions iWave. Rerun with
only iWave enabled — breadcrumb shows `LSPIV → iWave` only. Rerun with both off — breadcrumb shows
just `LSPIV`.

- [ ] **Step 4: PIV-skip rerun**

Run Analize twice in a row without changing any processing parameters. On the second run, confirm the
breadcrumb stays on LSPIV (does not incorrectly jump ahead) and the wheel still ticks (from the fast
"LSPIV profiles" stage) rather than freezing or showing a stale percentage from the first run.

- [ ] **Step 5: Stop mid-run**

Click Stop partway through STIV. Confirm the progress area clears (no stale stage/percentage). Click
Analize again immediately — confirm it starts clean from LSPIV with no leftover state from the
stopped run.

- [ ] **Step 6: Original bug regression check**

This is also a chance to confirm the earlier `clearCrossSections` NaN-parsing fix (already merged)
still holds: run Analize, click Next into Results, click Back to Processing, click Analize again —
should succeed without the "Something went wrong" error.

- [ ] **Step 7: Theme check**

Switch through all three themes (dark/light/dracula, via the app's theme toggle) and confirm the
breadcrumb text uses the right contrast in each (it uses `var(--secondary-text-color)` /
`var(--primary-text-color)` only, so this should be automatic — just confirm visually).

- [ ] **Step 8: Report results**

Summarize what was verified and any deviations found. If something doesn't match the expected
behavior above, stop and report it rather than proceeding — do not mark this task done with known
issues outstanding.

---

## Plan self-review notes

- **Spec coverage:** §4 (backend marker) → Task 1. §5 (Electron throttle) → Tasks 2-3. §6.1 (parser)
  → Task 4. §6.2 (component) → Task 6. §6.3 (i18n) → Task 5. §7 (edge cases) → verified in Task 7
  Steps 3-4 (technique toggles, PIV-skip) and by construction in Task 6 (failure-marker handling
  needs no dedicated step — it falls out of the same-stage-merge rule already implemented and unit
  tested in Task 4). §8 (testing) → Tasks 1, 2, 4 (automated) + Task 7 (manual checklist, matches the
  spec's manual list almost verbatim).
- **Type consistency:** `StageKey`/`AnalyzeStageUpdate` defined once in Task 4, imported unchanged in
  Task 6. `detectPhaseTransition`'s `{ phaseLine, desc }` shape defined once in Task 2, used unchanged
  in Task 3. No renamed fields between definition and use.
- **No placeholders:** every step has literal code/commands; the one open call flagged for the
  implementer (breadcrumb short-label derivation, Task 6 Step 2 notes) is an explicit reviewer
  decision point, not a TBD.
