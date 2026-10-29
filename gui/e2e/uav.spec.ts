import * as path from 'node:path';
import { test, expect, DATA_DIR } from './fixtures';
import { dragOnCanvas, mmss, next, readReference, sectionToResults, setField } from './flows';

// Raw bathymetry is uav/batimetría.ods; the reference's _modified.csv is the app's own rewrite of it.
const REFERENCE_RUN = 'Yanuncay_CS1/20261022T1222';

test('uav: full wizard reproduces the reference discharge', async ({ river }) => {
  const { page, dialogs } = river;
  const ref = readReference(REFERENCE_RUN);
  const { video_range: range, pixel_size: pixel } = ref.settings;

  await page.locator('#new-project').click();
  await page.locator('#uav').click();
  await dialogs.push([path.join(DATA_DIR, 'uav/Yanuncay_CS1.mp4')]);
  await page.getByRole('button', { name: 'Browse video' }).click();
  await next(page);

  await page.locator('#end').fill(mmss((range.end - range.start) / ref.settings.video.fps));
  await page.locator('#end').blur();
  await expect(page.locator('.panel-summary')).toContainText(`${range.end} frames`);
  await next(page);

  // Pixel size: a line of known length, with the exact reference pixels.
  await page.locator('#draw-line-pixel').click();
  await dragOnCanvas(page, [0.1, 0.6], [0.9, 0.6]);
  await page.getByText('Advanced settings').click();
  await setField(page, 'xPoint1', pixel.x1);
  await setField(page, 'yPoint1', pixel.y1);
  await setField(page, 'xPoint2', pixel.x2);
  await setField(page, 'yPoint2', pixel.y2);
  await setField(page, 'UAV-LINE_LENGTH', pixel.rw_length);
  await expect(page.locator('#UAV-PIXEL_SIZE')).toHaveValue(new RegExp(`^${pixel.size.toFixed(4)}`));
  await page.getByRole('button', { name: 'Solve' }).click();
  await next(page);

  await sectionToResults(river, ref, path.join(DATA_DIR, 'uav/batimetría.ods'), 'Yanuncay_CS1');
});
