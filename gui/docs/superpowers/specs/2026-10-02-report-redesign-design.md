# Report redesign: Section Pages

Status: brief confirmed 2026-10-02. Structure chosen on the Impeccable decision page (seed 0892c1da, option "spreads").
Product context: `gui/PRODUCT.md`.

## 1. Job and audience

The exported HTML report is a Read-mode, print-first A4 document. Readers:
- agency / client: needs the discharge and a reason to trust it;
- the operator months later: audits or reruns the measurement;
- the campaign archive: compares dates at the same station.

The cover gives the answer and the following pages give the evidence.

## 2. Outcome and proof

Within 10 seconds a reader knows the discharge and its uncertainty, which technique produced each section, and what was done to the footage. With the report and the video, someone else can reproduce the run.

Rules:
- Show what was applied. No filler rows for corrections that were not used ("Lens correction: no").
- Always state the RIVeR version.

## 3. Structure

### Cover (page 1)
- River @ Site, measurement date and time, footage type (UAV / oblique / IP camera), RIVeR version.
- Total Q ± σ as the one large number; COV and % measured beside it.
- Section list: name, active technique, Q ± σ, seeded tag (LSPIV with artificial seeding).
- Sections without data are skipped and named here.
- Applied strip: lens model, stabilization (+ region count), frame step, resize factor.
- Summary table across sections (only with 2+ sections): mean / std / COV of width, area, Q, mean V, alpha, mean Vs, max depth, mean depth, % measured. Q and % measured come from the active techniques; the other rows come from the backend summary, and mean V, alpha and mean Vs are labelled LSPIV because the backend computes them from LSPIV.

### One A4 page per cross section (same layout every time)
- Header row: section name, active technique, Q ± σ, seeded flag.
- Frame crop with velocity vectors (red = left bank, green = right bank pins).
- Profile plot: bathymetry, velocity, unit discharge (the AllInOne data), on plain paper with print-safe ink.
- Technique comparison strip: Q (and σ where available) of the other computed techniques for this section, the active one marked.
- Station table: #, x, d, A, Vs, Q. Two columns side by side when long, continued onto a second page beyond that.
- Alpha, number of stations, measured / interpolated %.

### Calibration page (depends on footage type)
- UAV: the 2 points with real-world coordinates, the real distance, pixel size / GSD, rectified frame.
- Oblique: the 4 control points with real-world X/Y, the 6 distances as entered vs as solved, with residuals.
- IP camera: GCP table with X/Y/Z and per-point reprojection error, mean error, camera position, orthorectified view.

### Footage and parameters page
- Footage: file, resolution, fps, duration, video creation date, processed range, step, resize factor, lens model, stabilization regions drawn on the first frame.
- Snapshot strip: 5 frames spread evenly across the processed range, each with its time, to show changes in light, seeding or camera during the clip.
- One block per technique used. LSPIV now: pre-processing (grayscale, CLAHE + clip limit, background removal), window sizes, std filtering, median test, seeding. STIV and IWaVE blocks show what is stored; the IWaVE block arrives with its parameters.

### Colophon
RIVeR version, citation DOI (10.1016/j.cageo.2017.07.009), IWaVE credit to dataforwater, STIV weights DOI (10.5281/zenodo.22050810) when STIV was used, generation timestamp, GitHub link.

## 4. Scope and boundaries
- Replaces the report's look completely: no blue gradient header, no plots on blue gradients.
- Keeps: AllInOne plot data, station table, summary statistics, SI / imperial units.
- The app-side Report panel (FormReport) stays as it is.
- Nothing is interactive; everything is visible and prints as laid out.
- Fixed light document, independent of the app theme.

## 5. States and ranges
- 1 to about 8 sections; 1 to 3 techniques per section.
- Station tables of 5 to 50+ rows.
- Imperial unit system respected everywhere; values shown with at most 2 decimals.

## 6. Layout
- A4 portrait, `@page` margins; every section starts a new page.
- Page footer: "River @ Site · page n / N".
- On screen it reads as a stack of sheets.
- Techniques told apart by colour and by mark or label (not colour alone).

## 7. Constraints and open decisions
- The export stays one self-contained HTML file (inlined CSS, data-URI images).
- App version: already available in the renderer as `import.meta.env.VITE_APP_VERSION` (vite `define`).
- Found while planning: the old report reads `data.total_Q` (the LSPIV backend value) even when a section's active technique is STIV or IWaVE. The new report uses the live per-technique value (`getEffectiveTechniqueData`), the same as the Results screen.
- Found while planning: D3 plots read colours from the app root's `data-theme`, so in dark/dracula the report plots are drawn with dark-theme ink on white paper. The report must draw with its own fixed light palette.
- σ is only available for LSPIV (`total_q_std`). STIV and IWaVE show Q without ±σ.
- The report states the corrections actually applied to the frames on disk (`committed*` video parameters), not the pending form values.
- Oblique residuals are not stored: compute them from `rwCoordinates` against the entered distances.
- STIV / IWaVE parameters are not in the store yet: show what is stored.
- Raster resolution: images are exported today at WebP quality 0.1. Raise it for print; file-size budget to be decided.

## 8. Amendment 2026-10-02: compact layout

Decided by the user after seeing the first build in the app (too much blank space, images too large, the app's AllInOne plot does not fit a page). Approved mockups: `gui/docs/superpowers/previews/2026-10-02-report-compact.html` (single section, one page) and `2026-10-02-report-compact-sections.html` (half-width plot, three-column table). This section overrides §3 and §6 where they disagree.

- **Flow, not one sheet per part.** The report is a sequence of blocks packed onto A4 pages in order: header, one block per section (plus table-continuation blocks for very long sections), then the method blocks. A block never splits across pages; a block that does not fit the remaining space starts the next page. A single-section report usually fits on one page.
- **Header.** River @ Site, the footage type with its app icon (the same line icons as the footage picker), date and time, RIVeR version; Q ± σ as the large number with measured %, section count, technique(s) and station count beside it; one line of applied corrections. With 2+ sections: the section list and the across-sections summary table.
- **Section block.** One line: name, technique, Q ± σ, measured / interpolated %, stations, α; the technique comparison on the line below. Then the frame (300 px wide) and a profile plot drawn for the report (half width) side by side; then the station table across the full width in three columns.
- **Profile plot.** A report-specific SVG, not the app's AllInOne: three stacked panels on one x axis (discharge per station for the active technique, surface velocity for every computed technique, depth with water fill). Panel titles carry the units; no rotated labels. Techniques differ by colour and marker (LSPIV dot, STIV square, iWave triangle), interpolated stations are hollow markers, banks are marked L (red) and R (green) at the ends of the x axis. It ignores the Results-screen show/hide toggles.
- **Method blocks.** "How this was measured": calibration and footage side by side (each with a small image beside its text), the 5-frame snapshot strip, processing parameters in three columns (one per technique used).
- **Colophon.** One line: "Generated with RIVeR <version> on <timestamp> · github.com/oruscam/RIVeR". The citation DOI, authors and iWave credit are removed from the footer (user decision). The STIV weights DOI stays in the STIV processing block.
- **Page footer.** A small RIVeR logo (`src/assets/logo_footer.png`), "River @ Site · date", "page n / N".
- **Type.** Body 11 px, tables 9.5 px, plot labels 8 px (print document; user confirmed). No eyebrow/kicker labels.
