import { test, expect } from './fixtures';

test('the app opens on the home page', async ({ river }) => {
  const { page } = river;
  await expect(page.locator('#new-project')).toBeVisible();
  await expect(page.locator('#load-project')).toBeVisible();
  await page.screenshot({ path: 'e2e-results/home.png' });
});
