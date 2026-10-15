import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const read = (relPath: string) => readFileSync(join(SRC, relPath), 'utf8');

const tsxFiles = (dir: string = SRC): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return full.endsWith('.tsx') ? [full] : [];
  });

describe('CalibrationViewControl', () => {
  const control = read('components/Calibration/CalibrationViewControl.tsx');

  it('is a tablist on .seg-float, the canvas-chrome variant of .seg', () => {
    expect(control).toMatch(/className=["']seg-float["']/);
    expect(control).toMatch(/role=["']tablist["']/);
  });

  it('renders one tab per mode from CALIBRATION_VIEW_MODES, selected via aria-selected', () => {
    expect(control).toMatch(/CALIBRATION_VIEW_MODES\.map\(/);
    expect(control).toMatch(/role=["']tab["']/);
    expect(control).toMatch(/aria-selected=\{viewMode === mode\}/);
  });

  it('gates an unavailable segment with aria-disabled plus a matching early-return guard', () => {
    expect(control).toMatch(/aria-disabled=\{availability\[mode\] !== null\}/);
    expect(control).toMatch(/if \(availability\[mode\] !== null\) return;/);
  });
});

describe('CalibrationCanvas', () => {
  const canvas = read('components/Calibration/CalibrationCanvas.tsx');

  it('owns the corrected view and its corner overlay', () => {
    expect(canvas).toMatch(/const UndistortedOverlay\b/);
    expect(canvas).toMatch(/className=["']cal-corner-overlay["']/);
    expect(canvas).toMatch(/import \{ toCalFileUrl \} from ['"]\.\.\/\.\.\/helpers\/calFileUrl['"]/);
  });

  it('positions nothing inline, so the canvas-chrome sweep has nothing to allow-list', () => {
    expect(canvas).not.toMatch(/position:\s*['"]absolute['"]/);
  });
});

describe('CalibrationStrip', () => {
  const strip = read('components/Calibration/CalibrationStrip.tsx');
  // .video-button lives in index.css, the rest in components.css.
  const sharedCss = read('components/components.css') + read('index.css');
  const pagesCss = read('pages/pages.css');

  // The strip deliberately copies the shared Carousel's look instead of using
  // the component (spec A12). These are the classes that make it look the
  // same; each must exist in the shared stylesheet AND be used here, so a
  // rename on either side fails this test instead of silently diverging.
  const SHARED = [
    'carousel-container',
    'carousel-resize-handle',
    'carousel-info',
    'carousel',
    'video-button',
    'img-carousel-container',
    'img-carousel',
    'img-carousel-active',
    'img-water-mark',
  ];

  it('uses every shared carousel class that gives the wizard strip its look', () => {
    for (const name of SHARED) {
      expect(sharedCss).toMatch(new RegExp(`\\.${name}[\\s{:,.]`));
      expect(strip).toMatch(new RegExp(`(?<![\\w-])${name}(?![\\w-])`));
    }
  });

  it('dims an unused photo with a selector that out-specifies the shared resting dim', () => {
    // Shared: .img-carousel:not(.img-carousel-active):not(.img-carousel-second) = (0,3,0).
    expect(pagesCss).toContain('.cal-strip .img-carousel.cal-strip-unused:not(.img-carousel-active) {');
    expect(strip).toMatch(/cal-strip-unused/);
  });

  it('keeps the strip height the user already saved', () => {
    expect(strip).toMatch(/storageKey:\s*['"]river-cal-carousel-height['"]/);
  });
});

describe('FormCalibration', () => {
  const form = read('components/Forms/FormCalibration.tsx');

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

  it('opens with the standard FormHeader, without the wizard stepper or section chips', () => {
    expect(form).toMatch(/<FormHeader[^>]*showProgress=\{false\}[^>]*showSections=\{false\}/s);
  });

  it('puts Back and the single Solve/Save action in the standard footer', () => {
    expect(form).toMatch(/className=["']footer["']/);
    expect(form).toMatch(/className=["']wizard-container["']/);
    expect(form).toMatch(/footerAction\(\{/);
    expect(form).toMatch(/aria-disabled=\{action\.blocker !== null\}/);
    expect(form).toMatch(/if \(action\.blocker !== null\) return;/);
  });

  it('renders ratings as .badge through badgeGrade, never as coloured text', () => {
    expect(form).toMatch(/badgeGrade\(/);
    expect(form).toMatch(/`badge badge-\$\{/);
    expect(form).not.toMatch(/cal-metric-|cal-grade-pill/);
  });

  it('merges the recommendations into one titled warning alert', () => {
    expect((form.match(/className=["']step-alert-title["']/g) ?? []).length).toBe(1);
    expect(form).toMatch(/stepAlertClassName\(['"]warning['"]\)/);
  });

  it('keeps the histogram in the panel and off every canvas-side component', () => {
    expect(form).toMatch(/<CalibrationHistogram\b/);
    for (const file of ['CalibrationCanvas', 'CalibrationStrip', 'CalibrationViewControl']) {
      expect(read(`components/Calibration/${file}.tsx`)).not.toMatch(/Histogram/);
    }
  });
});

describe('the calibration page', () => {
  const page = read('pages/CameraCalibration.tsx');
  const pagesCss = read('pages/pages.css');

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

  it('has no drop target outside Prepare, and swallows stray drops on the workspace', () => {
    expect(page).toMatch(/onDragOver=\{swallow\} onDrop=\{swallow\}/);
    expect(page.replace(/on(DragOver|Drop)=\{swallow\}/g, '')).not.toMatch(
      /onDrop=|onDragOver=|onDragLeave=|drag-over/
    );
  });

  it('sends Esc back to Prepare, never while a solve runs', () => {
    expect(page).toMatch(/else if \(status !== ['"]solving['"]\) setStage\(['"]prepare['"]\)/);
  });

  it('starts over on Prepare from the saved block, and closes from Done', () => {
    expect(page).toMatch(/onCalibrateAnother=\{\(\) => \{\s*onReset\(\);\s*setStage\(['"]prepare['"]\);/);
    expect(page).toMatch(/onDone=\{\(\) => \{\s*onReset\(\);\s*onClose\(\);/);
    expect(page).toMatch(/onBack=\{\(\) => setStage\(['"]prepare['"]\)\}/);
  });

  it('no longer carries the old private layout anywhere in src', () => {
    const OLD =
      /(?<![\w-])(?:cal-left|cal-right|cal-body|cal-carousel|cal-thumb|cal-view-controls|cal-panel-title|cal-results|drag-over-cal)(?![\w-])/;
    const offenders = tsxFiles().filter((f) => OLD.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  // Every class a pages.css rule names under the cal- prefix must still be
  // used by some .tsx, so a rule orphaned by a later edit fails here.
  const calClasses = (): string[] => [...new Set(pagesCss.match(/\.cal-[a-z-]+/g) ?? [])].map((c) => c.slice(1));
  const allTsx = (): string =>
    tsxFiles()
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');

  it('has no .cal-* rule that no component uses', () => {
    const names = calClasses();
    expect(names.length).toBeGreaterThanOrEqual(15); // canary: the sweep sees the block
    const tsx = allTsx();
    const unused = names.filter((n) => !new RegExp(`(?<![\\w-])${n}(?![\\w-])`).test(tsx));
    expect(unused).toEqual([]);
  });

  it('keeps every .cal-* rule inside the Phase 6e block, each commented or continuing its class family', () => {
    const start = pagesCss.indexOf('CAMERA CALIBRATION (Phase 6e');
    const end = pagesCss.indexOf('/* ── Lens correction settings rows', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    // Nothing calibration-specific may live outside the block (this is also
    // what proves the old block was deleted).
    const outside = pagesCss.slice(0, start) + pagesCss.slice(end);
    expect(outside.match(/\.cal-[a-z-]+/g) ?? []).toEqual([]);

    const block = pagesCss.slice(pagesCss.indexOf('*/', start) + 2, end);
    const rules = [...block.matchAll(/([^{}]*)\{[^{}]*\}/g)];
    expect(rules.length).toBeGreaterThanOrEqual(20); // canary: the sweep sees the block

    // A rule needs its own comment unless it continues the previous rule's
    // class (e.g. `.cal-kv dt` after `.cal-kv`), which that comment covers.
    const bare: string[] = [];
    let previousFirstClass: string | null = null;
    for (const [, prelude] of rules) {
      const commented = prelude.includes('*/');
      const selector = prelude.slice(prelude.lastIndexOf('*/') + 2).trim();
      const firstClass = selector.match(/^\.[a-z-]+/)?.[0] ?? null;
      if (!commented && firstClass !== previousFirstClass) bare.push(selector);
      previousFirstClass = firstClass;
    }
    expect(bare).toEqual([]);
  });

  it('routes view keys through viewForKey and only selects an available view', () => {
    expect(page).toMatch(/viewForKey\(e\.key\)/);
    expect(page).toMatch(/availability\[mode\] === null/);
  });

  it('falls back to Original when the selected view stops being available, and resets the photo on a new folder', () => {
    expect(page).toMatch(/if \(availability\[viewMode\] !== null\) setViewMode\(['"]original['"]\)/);
    expect(page).toMatch(/useEffect\(\(\) => \{\s*setSelectedIdx\(0\);\s*\}, \[images\]\)/);
  });
});

describe('useCalibrationSlice folder loaders', () => {
  const hook = read('hooks/useCalibrationSlice.ts');

  it('return the photo count so Prepare can report an empty folder', () => {
    expect(hook).toMatch(/const onOpenFolder = useCallback\(async \(\): Promise<number \| null> =>/);
    expect(hook).toMatch(/if \(!dir\) return null;/);
    expect(hook).toMatch(/const onDropFolder = useCallback\(\s*async \(dir: string\): Promise<number> =>/);
    expect(hook).toMatch(/return images\.length;/);
  });
});

describe('CalibrationPrepare', () => {
  const prepare = read('components/Calibration/CalibrationPrepare.tsx');
  const pagesCss = read('pages/pages.css');

  it('centres its steps like the footage screen and keeps Back/Solve pinned to the bottom', () => {
    expect(pagesCss).toMatch(/\.cal-prepare-title \{[^}]*margin-top: auto;/);
    expect(pagesCss).not.toMatch(/\.cal-prepare \.wizard-container/);
    expect(pagesCss).not.toMatch(/\.default-app-container\.cal-prepare \{[^}]*justify-content/);
    expect(prepare).toMatch(/className=["']cal-prepare-notes["']/);
  });

  it('sits on the footage screen frame with the standard Back/Solve row', () => {
    expect(prepare).toMatch(/className=["']default-app-container cal-prepare["']/);
    expect(prepare).toMatch(/className=["']wizard-container["']/);
  });

  it('gates Solve with aria-disabled, an early return and a reason', () => {
    expect(prepare).toMatch(/aria-disabled=\{!canSolve\}/);
    expect(prepare).toMatch(/if \(!canSolve\) return;/);
    expect(prepare).toMatch(
      /title=\{\s*canSolve\s*\?\s*undefined\s*:\s*scan === ['"]scanning['"]\s*\?\s*t\(['"]Calibration\.prepare\.reading['"]\)\s*:\s*t\(['"]Calibration\.importFirst['"]\)/
    );
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

  it('shows an error when the scan fails instead of silently resetting', () => {
    expect(prepare).toMatch(/setScan\(['"]failed['"]\)/);
    expect(prepare).toMatch(/Calibration\.errorGeneric/);
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
