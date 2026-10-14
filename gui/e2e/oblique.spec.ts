import * as path from 'node:path';
import { test, expect, DATA_DIR } from './fixtures';
import { dragOnCanvas, mmss, next, readReference, sectionToResults, setField } from './flows';

const REFERENCE_RUN = 'P1060716/20260805T1224';

test('oblique: full wizard reproduces the reference discharge', async ({ river }) => {
  const { page, dialogs } = river;
  const ref = readReference(REFERENCE_RUN);
  const { video_range: range, control_points: control } = ref.settings;

  // 1. Footage type + video
  await page.locator('#new-project').click();
  await page.locator('#oblique').click();
  await dialogs.push([path.join(DATA_DIR, 'oblique/P1060716.mp4')]);
  await page.getByRole('button', { name: 'Browse video' }).click();
  await next(page);

  // 2. Video range: the reference used frames 0-25 (1 s at 25 fps)
  await page.locator('#end').fill(mmss((range.end - range.start) / ref.settings.video.fps));
  await page.locator('#end').blur();
  await expect(page.locator('.panel-summary')).toContainText(`${range.end} frames`);
  await next(page);

  // 3. Control points: draw the square, then set the exact reference pixels and distances
  await page.locator('#draw-coordinates').click();
  await dragOnCanvas(page, [0.1, 0.8], [0.9, 0.3]);
  await page.getByText('Advanced settings').click();
  for (const i of [1, 2, 3, 4]) {
    await setField(page, `xPoint${i}`, control.coordinates[`x${i}`]);
    await setField(page, `yPoint${i}`, control.coordinates[`y${i}`]);
  }
  for (const key of ['12', '23', '34', '41', '13', '24'])
    await setField(page, `distance${key}`, control.distances[`d${key}`]);
  await page.locator('#solve-oblique').click();
  await expect(page.locator('#wizard-next')).toBeEnabled({ timeout: 60_000 });
  await next(page);

  // 4-6. Cross section, processing and results
  await sectionToResults(river, ref, path.join(DATA_DIR, 'oblique/bathymetry.csv'), 'P1060716');
});
