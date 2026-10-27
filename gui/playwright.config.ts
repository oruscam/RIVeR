import { defineConfig } from '@playwright/test';

// E2E tests drive the real Electron app (renderer served by Vite, main process from
// dist-electron/, Python backend from ../venv). Opt-in: needs the field data on this machine.
//   npm run test:e2e
export const E2E_PORT = 5199;

export default defineConfig({
  testDir: './e2e',
  timeout: 10 * 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: `npx vite --config vite.e2e.config.ts --port ${E2E_PORT} --strictPort`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
