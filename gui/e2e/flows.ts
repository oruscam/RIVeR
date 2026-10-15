import { expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { REFERENCE_DIR, type River } from './fixtures';

/** The backend writes NaN into some JSON files; the app sanitizes them the same way. */
export const readJson = (file: string) =>
  JSON.parse(
    fs
      .readFileSync(file, 'utf-8')
      .replace(/\bNaN\b/g, 'null')
      .replace(/-?\bInfinity\b/g, 'null')
  );

/** Settings.json of a reference run (the same one the Python regression suite replays). */
export const readReference = (run: string) => {
  const dir = path.join(REFERENCE_DIR, run);
  return {
    dir,
    settings: readJson(path.join(dir, 'settings.json')),
    xsections: readJson(path.join(dir, 'xsections.json')),
  };
};

export const firstSection = (xsections: Record<string, any>) =>
  Object.entries(xsections).find(([key]) => key !== 'summary')![1];

/** Latest project folder created in the workspace (RIVeR/<video name>/<timestamp>). */
export const latestRun = (workspace: string, project: string) => {
  const root = path.join(workspace, project);
  const runs = fs.readdirSync(root).sort();
  return path.join(root, runs[runs.length - 1]);
};

export const next = async (page: Page) => {
  const button = page.locator('#wizard-next');
  await button.waitFor();
  await page.waitForFunction(
    () => !(document.getElementById('wizard-next') as HTMLButtonElement | null)?.disabled,
    null,
    {
      timeout: 120_000,
    }
  );
  await button.click();
};

/** Seconds -> "mm:ss" as the Video Range fields expect. */
export const mmss = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/**
 * Press-drag on the image canvas. Coordinates are fractions of the canvas box. The pauses give
 * React time to re-attach the d3 listeners between mousedown, mousemove and mouseup.
 */
export const dragOnCanvas = async (
  page: Page,
  from: [number, number],
  to: [number, number],
  selector = '.image-with-data-container svg, .media-container svg'
) => {
  const box = (await page.locator(selector).first().boundingBox())!;
  const at = ([fx, fy]: [number, number]) => [box.x + box.width * fx, box.y + box.height * fy] as const;
  await page.mouse.move(...at(from));
  await page.mouse.down();
  await page.waitForTimeout(300);
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(...at([from[0] + ((to[0] - from[0]) * i) / 10, from[1] + ((to[1] - from[1]) * i) / 10]));
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
};

export const setField = async (page: Page, id: string, value: number | string) => {
  const input = page.locator('#' + id);
  await input.fill(String(value));
  await input.blur();
};

/**
 * Cross Sections -> Processing -> Results, replaying a reference run: draws the section
 * direction, imports the bathymetry, types the reference pixels, runs LSPIV only and checks
 * both the written xsections.json and the discharge shown on screen against the reference.
 */
export const sectionToResults = async (
  { page, dialogs, workspace }: River,
  ref: ReturnType<typeof readReference>,
  bathymetry: string,
  project: string,
  /**
   * Relative tolerance against the reference discharge (the exact runs reproduce it to ~1e-6).
   * null when the run uses fewer frames than the reference: only the geometry is compared then.
   */
  tolerance: number | null = 1e-4,
  /** IPCam only enables "Draw Direction" once the bathymetry gave it a water level. */
  bathFirst = false
) => {
  const refSection = firstSection(ref.xsections);

  const drawDirection = async () => {
    await page.getByRole('button', { name: 'Draw Direction' }).click();
    await dragOnCanvas(page, [0.15, 0.78], [0.85, 0.55]);
  };
  const importBathymetry = async () => {
    await dialogs.push([bathymetry]);
    await page.getByRole('button', { name: 'Import bath' }).click();
  };
  if (bathFirst) {
    await importBathymetry();
    await drawDirection();
  } else {
    await drawDirection();
    await importBathymetry();
  }
  await expect(page.locator('#LEVEL')).toHaveValue(String(refSection.level));
  await page.getByText('Advanced settings').click();
  await setField(page, 'xPoint1', refSection.dir_xl);
  await setField(page, 'yPoint1', refSection.dir_yl);
  await setField(page, 'xPoint2', refSection.dir_xr);
  await setField(page, 'yPoint2', refSection.dir_yr);
  await expect(page.locator('#CS_LENGTH')).toHaveValue(refSection.rw_length.toFixed(2));
  await next(page);

  // Processing: LSPIV only, like the reference run. The STIV / iWave rows each end in a
  // switch (label.switch) that starts on.
  for (const technique of ['stiv', 'iwave']) {
    await page.locator(`.technique-row:has(.technique-swatch-${technique}) label.switch`).click();
    await expect(
      page.locator(`.technique-row:has(.technique-swatch-${technique}) input[type=checkbox]`)
    ).not.toBeChecked();
  }
  await expect(page.locator('#stations-number')).toHaveValue(String(refSection.num_stations));
  await page.locator('#analize-button').click();
  await expect(page.locator('#wizard-next')).toBeEnabled({ timeout: 180_000 });

  // The analysis wrote its results into the project folder.
  const actual = firstSection(readJson(path.join(latestRun(workspace, project), 'xsections.json')));
  const close = (key: string, tol: number) =>
    expect
      .soft(
        Math.abs(actual[key] - refSection[key]) / Math.abs(refSection[key]),
        `${key}: ${actual[key]} vs reference ${refSection[key]}`
      )
      .toBeLessThanOrEqual(tol);
  for (const key of ['total_W', 'max_depth', 'level', 'rw_length']) close(key, 1e-4);
  if (tolerance !== null) for (const key of ['total_A', 'mean_V', 'total_Q']) close(key, tolerance);

  // Results: the screen recomputes discharge client-side (a TypeScript port of the Python
  // calculation) and starts without interpolating. With "Interpolate Profile" on, it has to
  // land on the discharge the backend computed with --interpolate.
  await next(page);
  const shown = async () => parseFloat((await page.locator('#result-number').innerText()).replace(',', '.'));
  await expect(page.locator('#result-number')).toBeVisible();
  const withoutInterpolation = await shown();
  await page.getByRole('button', { name: 'Interpolate Profile' }).click();
  // ...and the on-screen figure has to equal the discharge the backend wrote for this very run.
  await expect.poll(shown).toBeCloseTo(actual.total_Q, 1);
  expect(withoutInterpolation).toBeLessThan(actual.total_Q);
  await page.screenshot({ path: `e2e-results/${project}-results.png` });
};
