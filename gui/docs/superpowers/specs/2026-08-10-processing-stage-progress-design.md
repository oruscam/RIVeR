# Processing Step — Multi-Technique Analize Progress Indicator

## 1. Problem

`AnalyzingProgress.tsx` shows one wheel (percentage + remaining time), fed by whatever `tqdm`
progress line the backend last printed to stderr. That was fine when Analize only ran LSPIV. Now a
single Analize run walks through up to three independent stages in `orchestrator.py`
(`run_full_analysis`) — the LSPIV field computation, STIV, and iWave — each with its own `tqdm`
counter starting back at 0. The UI has no concept of "stage," so:

- The wheel silently resets to 0% when STIV or iWave starts, with no indication *why* — it reads as
  broken, not as "a new stage began."
- There's a real quiet gap before STIV's first tick (`load_models()` loading the checkpoint, before
  the `tqdm` context even opens) during which no stderr is produced at all — today the UI just shows
  a stale value from the previous stage.
- STIV/iWave only tick once per completed station (not per sub-step), so even once ticking starts, a
  15-station run updates roughly every tens of seconds — and the very first tick has no remaining-time
  estimate (`tqdm` shows `[00:00<?]` until one full interval has elapsed), which reads as broken too.
- Confirmed by reproducing: `tqdm`'s default bar format is
  `{desc}: {percentage:3.0f}%|{bar}| {n}/{total} [{elapsed}<{remaining}, {rate}]` — the `desc` field
  (`"Processing image pairs"`, `"LSPIV profiles"`, `"STIV"`, `"iWave"`) is already present in every
  line but currently discarded; only the number before the first `|` is read
  (`helpers/parseCliProgress.ts`).

## 2. Goals

- Always show which of the enabled techniques is currently running, as plain text, visible for the
  entire multi-stage run (not just a flash between stages).
- Keep the wheel showing each stage's own real percentage/remaining-time — no invented global
  percentage. Validated live (prototype run at localhost against RIVeR's real CSS/fonts) and chosen
  over a weighted single bar, whose weights would be guesses.
- Make the STIV/iWave quiet gap and coarse per-station cadence legible instead of looking frozen:
  name the gap, show `Station X / Y`, and show "Estimating…" instead of a blank line before the
  first real remaining-time estimate exists.
- No change to `.loader-*` CSS, the spinner, or its sizes — reuse as-is.

## 3. Non-goals

- No finer-than-per-station progress inside STIV/iWave (would require changes to
  `stiv_pipeline.py`/`iwave_pipeline.py` internals — out of scope for this pass; per-station ticking
  from `tqdm`, surfaced better, is enough).
- No global/blended 0–100% bar across stages.
- No surfacing of `data.errors` (per-technique failure detail) from the final `analyze-all` result —
  a failed stage is simply treated as "done" for progress purposes (see §6). Surfacing failure detail
  is a separate concern.
- No changes to `parseCliProgress.ts` or its behavior — `useCalibrationSlice.ts` depends on it for an
  unrelated flow and must be unaffected.

## 4. Backend — one marker added

`river/core/orchestrator.py`, Stage 3 (STIV): add `_log("STIV: loading models")` immediately before
`models = load_models()` (`orchestrator.py:113`), mirroring the `_log("iWave: warping frames onto
ortho grid")` line that already exists before iWave's setup (`orchestrator.py:144`). This is the only
backend change — it names a gap that already exists; it does not add new progress mechanics.

The existing `_log` calls this design reads (all already present, none added except the one above):
- `"PIV: computing displacement field"` / `"PIV: parameters unchanged, reusing existing piv_results.json"`
  (`orchestrator.py:87,90`)
- `"STIV: loading models"` (new, above)
- `"iWave: warping frames onto ortho grid"` (`orchestrator.py:144`)
- `"STIV failed, continuing without it: {err}"` / `"iWave failed, continuing without it: {err}"`
  (`orchestrator.py:137,168`)

## 5. Electron — stop throttling stage transitions

`executeRiverCli.ts`'s stderr handler already exempts phase lines from its 500ms/2-msg throttle so
they can't be dropped (`phaseLine`, currently matching lines starting with `Extracting`/`Stabilizing`,
`executeRiverCli.ts:51-54`). Extend that same predicate to also exempt:
- Lines starting with `PIV:`, `STIV:`, or `iWave:` (the markers from §4).
- The first `tqdm` line of a new `desc` (i.e. whenever the parsed `desc` differs from the previous
  line's `desc`) — guarantees the stage-transition line and its initial 0%/`?` tick always reach the
  renderer, even mid-throttle-window.

## 6. Frontend

### 6.1 New helper — `helpers/parseAnalyzeStage.ts`

Deliberately separate from `parseCliProgress.ts` (untouched, per §3). Parses one stderr line into:

```ts
interface AnalyzeStageUpdate {
  stage: 'lspiv' | 'stiv' | 'iwave' | null; // null = line carried no stage info
  percentage: number | null;
  station: [current: number, total: number] | null; // null for the LSPIV field stage
  remaining: string | null; // null = not yet known ("Estimating…")
  note: string | null; // set on a quiet-gap marker (e.g. "Loading STIV models…"); null on an ordinary tqdm tick
}
```

Recognizes two line shapes:
1. **`tqdm` lines** — regex on `{desc}: {pct}%|...| {n}/{total} [{elapsed}<{remaining}, ...]`.
   `desc` maps to stage: `"Processing image pairs"` and `"LSPIV profiles"` → `lspiv`; `"STIV"` →
   `stiv`; `"iWave"` → `iwave`. `station` is `[n, total]` for `stiv`/`iwave` only (the LSPIV field
   stage has no station concept — `total` there is frame-pair count, not stations). `remaining` is
   `null` when `tqdm`'s remaining field is `?` (first tick of a stage). Note `total` here is
   `total_stiv_stations`/`total_iwave_stations` — summed across **all** cross-sections in the project
   (`orchestrator.py:115,149`), not just the active one; a multi-section project with e.g. 15 + 10
   stations shows `Station X / 25`. This is a faithful read of what the backend actually counts, not
   a bug to work around.
2. **Plain markers** — the `_log` lines from §4, matched by prefix, each producing `{ stage,
   percentage: null, station: null, remaining: null, note: <text> }` — a note about that stage, not a
   tick. This includes `"STIV: loading models"` / `"iWave: warping frames…"` (name the quiet gap) and
   also `"PIV: parameters unchanged…"` and the `"<stage> failed, continuing…"` lines — all of these
   name their own stage (not the next one: e.g. `"STIV failed…"` is still stage `stiv`), because in
   every case a further real signal for what happens next arrives on its own: after a PIV skip,
   `"LSPIV profiles"` ticks start immediately (Stage 2 always reruns, skip or not — see §7); after a
   STIV failure, either `"iWave: warping frames…"` or the run simply ends. No explicit
   "advance to the next stage" step is needed — see §6.2.

### 6.2 `AnalyzingProgress.tsx`

- `enabledStages: StageKey[]` derived from `processing.form.stiv`/`iwave` (`lspiv` always included) —
  known synchronously when the component mounts, so the breadcrumb renders immediately with `lspiv`
  active, before any backend output arrives.
- Replace the current `percentage`/`time` strings with one state object:
  `{ stage, percentage, station, remaining, note }`, updated via `parseAnalyzeStage` on every
  `river-cli-message`, by one rule: **when the incoming line names a different stage than the current
  one, switch to it** (fresh `percentage`/`station`/`remaining` from that line); when it names the
  *same* stage, merge the new fields over the existing ones (a field the line didn't carry keeps its
  previous value). This one rule is sufficient for every transition — LSPIV → STIV happens the moment
  either `"STIV: loading models"` or STIV's first tick names a new stage; STIV → iWave the same way;
  no separate "is this stage done" bookkeeping is needed.
- Render order inside the existing `.analize-output` block (wheel markup/CSS untouched):
  1. **Breadcrumb** — `LSPIV → STIV → iWave` (only `enabledStages`), current stage bold via
     `var(--primary-text-color)`, others `var(--secondary-text-color)` — plain text, no new CSS
     component, matches the chosen preview variant.
  2. Wheel, fed this stage's `percentage`.
  3. Headline — new i18n keys `Analizing.stage.lspiv|stiv|iwave` (e.g. "Computing STIV velocities").
  4. Note line — `state.note` when set (e.g. "Loading STIV models…"), replaced by the `Station X / Y`
     line once real ticks start arriving for that stage.
  5. `Station X / Y` line, shown only when `station` is set.
  6. Remaining-time line: real value when known; `t('Analizing.estimating')` ("Estimating…") once a
     stage has started but no estimate exists yet; blank before anything starts.
- `resetProgress` (Stop button) clears the whole state object instead of the two separate strings.

### 6.3 i18n

New keys needed in all 12 locale files: `Analizing.stage.lspiv`, `Analizing.stage.stiv`,
`Analizing.stage.iwave`, `Analizing.estimating`. Non-English locales carry the English string as a
placeholder, consistent with how new keys were handled in the prior Processing-panel round.

## 7. Edge cases

- **PIV field skipped** (hash match — reruns with unchanged parameters): Stage 2 ("LSPIV profiles")
  always reruns regardless of the skip (`orchestrator.py:95-108` is unconditional), so the breadcrumb
  correctly stays on `LSPIV` — it just shows that stage's fast profiles tick instead of the (skipped)
  slower field-computation tick, rather than freezing on a stale percentage from before the skip.
- **STIV or iWave disabled via toggle**: absent from `enabledStages` — breadcrumb never mentions it,
  matches current toggle semantics.
- **STIV/iWave engine failure** (caught in Python, run continues — `orchestrator.py:134-137,165-168`):
  the `"<stage> failed, continuing without it"` line names its *own* stage, so it doesn't itself move
  the breadcrumb — the next real stage's own first signal does that (e.g. iWave's own marker/tick, or
  simply the run ending). No error state is shown here (§3 non-goal); a failure followed immediately
  by the run ending may leave the wheel briefly on the failed stage's last percentage until the
  existing "backend finished" effect forces it to 100%.
- **Only LSPIV enabled**: breadcrumb shows just `LSPIV` (a single-item breadcrumb — acceptable, still
  correct, no special-casing needed).

## 8. Testing

This project has no React component test infrastructure (`jest.config` runs `testEnvironment:
"node"`, used for pure functions and Electron IPC handlers only — see prior spec's §8) — UI
verification for `AnalyzingProgress.tsx` is manual, consistent with that existing pattern.

**Unit-tested** (pure function, exactly the kind of silent-failure-prone logic this project does
cover): `parseAnalyzeStage.test.ts`, table-driven over real line shapes —
- Each stage's `tqdm` line shape, including the first-tick `[00:00<?]` case (`remaining: null`).
- Each plain marker (piv-skipped, STIV loading, iWave warping, each `failed, continuing` line).
- An unrelated stderr line (e.g. the resource-tracker warning already seen in `river.log`) → `stage:
  null`, ignored.

**Manual verification must cover:**
- A full run with all three techniques enabled: breadcrumb starts on LSPIV immediately on click,
  advances through STIV and iWave in order, wheel resets per-stage without looking broken.
- STIV-only and iWave-only combinations, and LSPIV-only (no STIV/iWave) — breadcrumb reflects exactly
  the enabled set.
- A rerun where PIV is skipped (unchanged parameters) — breadcrumb skips past LSPIV immediately.
- Stop mid-run — state clears cleanly, no stale stage/percentage on the next Analize.
- All three themes (dark/light/dracula) — breadcrumb text colors use existing `var(--*)` tokens only.

## 9. Open questions

None — the breadcrumb-vs-stepper choice and copy were validated visually before writing this spec
(live prototype at localhost, reusing RIVeR's real CSS/spinner/fonts); text breadcrumb was the
chosen direction.
