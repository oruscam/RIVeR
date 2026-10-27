import * as path from 'node:path';
import { test, expect, DATA_DIR, type River } from './fixtures';
import { dragOnCanvas, latestRun, mmss, next, readJson, readReference, sectionToResults } from './flows';

// IPCam is the 3D mode: GRPs (3D points + pixels) and field photos give the camera solution.
// Reference: the 840-frame run of the same video. Here only 1 s is extracted, so the camera
// solution and the section geometry are compared, not the discharge.
const REFERENCE_RUN = 'JUNCAL20260108T1440/20260808T1530';
const PROJECT = 'JUNCAL20260108T1440';
const DIR_3D = path.join(DATA_DIR, '3d', 'JUNCAL');
const FT = 0.3048;

const solveCamera = async ({ page, dialogs }: River, points: string) => {
  await page.locator('#new-project').click();
  await page.locator('#ipcam').click();
  await dialogs.push([path.join(DIR_3D, 'JUNCAL20260108T1440.mp4')]);
  await page.getByRole('button', { name: 'Browse video' }).click();
  await next(page);

  await page.locator('#end').fill(mmss(1));
  await page.locator('#end').blur();
  await next(page);

  await dialogs.push([path.join(DIR_3D, points)]);
  await page.locator('#import-points').click();
  await dialogs.push([path.join(DIR_3D, 'GRPs')]);
  await page.locator('#import-images').click();
  await expect(page.locator('.cp-hint, .cp-result')).toHaveCount(0);
  await page.locator('#solve-ipcam').click();
  await expect(page.locator('.cp-result')).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('#wizard-next')).toBeEnabled();
};

test('ipcam: GRP points + images solve the camera like the reference', async ({ river }) => {
  const { page, workspace } = river;
  const ref = readReference(REFERENCE_RUN);

  await solveCamera(river, 'GRP.csv');
  await expect(page.locator('.cp-result')).toContainText('45 of 45');

  const solution = readJson(path.join(latestRun(workspace, PROJECT), 'camera_solution_3d.json'));
  const refSolution = readJson(path.join(ref.dir, 'camera_solution_3d.json'));
  expect(solution.error).toBeCloseTo(refSolution.error, 1);
  refSolution.camera_position.forEach((v: number, i: number) =>
    expect(solution.camera_position[i]).toBeCloseTo(v, 0)
  );
  expect(solution.reprojection_errors).toHaveLength(45);
});

test('ipcam: full wizard up to results with the metric GRP and bathymetry', async ({ river }) => {
  const ref = readReference(REFERENCE_RUN);
  await solveCamera(river, 'GRP.csv');
  await next(river.page);
  await sectionToResults(river, ref, path.join(DIR_3D, 'CS3_Bath.csv'), PROJECT, null, true);
});

test('ipcam: imperial GRP gives the same camera as metric', async ({ river }) => {
  const { page, workspace } = river;
  await page.locator('.lwrap:has(.litem:has-text("Imperial")) .menu-trigger').click();
  await page.locator('.litem', { hasText: 'Imperial' }).click();

  await solveCamera(river, 'GRP_imperial.csv');
  // The imperial CSV is rounded to 0.01 ft, so the solution moves slightly.
  const solution = readJson(path.join(latestRun(workspace, PROJECT), 'camera_solution_3d.json'));
  const refSolution = readJson(path.join(readReference(REFERENCE_RUN).dir, 'camera_solution_3d.json'));
  refSolution.camera_position.forEach((v: number, i: number) =>
    expect(Math.abs(solution.camera_position[i] - v)).toBeLessThan(0.5)
  );
  expect(solution.error).toBeCloseTo(refSolution.error, 0);

  // Camera height is shown in feet.
  const heightFt = refSolution.camera_position[2] / FT;
  const shown = await page.locator('.cp-result').innerText();
  expect(shown).toContain('ft');
  expect(parseFloat(/Camera height\s*([\d.]+)/.exec(shown.replace(/\n/g, ''))![1])).toBeCloseTo(heightFt, -1);
});

test('ipcam: imperial bathymetry gives the same section width as metric', async ({ river }) => {
  const { page, dialogs } = river;
  await page.locator('.lwrap:has(.litem:has-text("Imperial")) .menu-trigger').click();
  await page.locator('.litem', { hasText: 'Imperial' }).click();
  await solveCamera(river, 'GRP_imperial.csv');
  await next(page);

  await dialogs.push([path.join(DIR_3D, 'batimetria_3d_imperial.csv')]);
  await page.getByRole('button', { name: 'Import bath' }).click();
  await expect(page.locator('#LEVEL')).not.toHaveValue('0');
  await page.getByRole('button', { name: 'Draw Direction' }).click();
  await dragOnCanvas(page, [0.15, 0.78], [0.85, 0.55]);
  await page.getByText('Advanced settings').click();
  const refSection = Object.values(readReference(REFERENCE_RUN).xsections)[0] as any;
  for (const [id, key] of [
    ['xPoint1', 'dir_xl'],
    ['yPoint1', 'dir_yl'],
    ['xPoint2', 'dir_xr'],
    ['yPoint2', 'dir_yr'],
  ])
    await page.locator('#' + id).fill(String(refSection[key])), await page.locator('#' + id).blur();
  await expect(page.locator('.unit-label, .field-row-label').filter({ hasText: 'ft' }).first()).toBeVisible();
  const width = parseFloat(await page.locator('#CS_LENGTH').inputValue());
  expect(width).toBeCloseTo(refSection.rw_length / FT, 0);
  await expect(page.locator('#wizard-next')).toBeEnabled();
});
