import {
  _electron as electron,
  test as base,
  expect,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_PORT } from '../playwright.config';

const guiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DATA_DIR = process.env.RIVER_TEST_DATA ?? path.join(os.homedir(), 'Documents', 'Datos-River');
export const REFERENCE_DIR = process.env.RIVER_TEST_REFERENCE ?? path.join(os.homedir(), 'River');

export type River = { app: ElectronApplication; page: Page; workspace: string; dialogs: DialogQueue };

/** Answers for the native file dialogs, which Playwright cannot click: one entry per dialog, in order. */
export interface DialogQueue {
  push(...answers: string[][]): Promise<void>;
}

export const test = base.extend<{ river: River }>({
  river: async ({}, provide, testInfo) => {
    // The Vite dev server (started by Playwright) only serves files under the real home
    // directory, so the throwaway workspace has to live there too, never in ~/River.
    const root = fs.mkdtempSync(path.join(os.homedir(), '.river-e2e-'));
    const userData = path.join(root, 'userData');
    const workspace = path.join(root, 'RIVeR');
    fs.mkdirSync(userData, { recursive: true });
    fs.mkdirSync(workspace, { recursive: true });
    fs.writeFileSync(path.join(userData, 'river-config.json'), JSON.stringify({ riverPath: workspace }));

    const app = await electron.launch({
      args: ['.', `--user-data-dir=${userData}`],
      cwd: guiDir,
      // ELECTRON_RUN_AS_NODE (set by VS Code terminals) would make Electron behave as plain Node.
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: undefined,
        VITE_DEV_SERVER_URL: `http://localhost:${E2E_PORT}`,
      } as Record<string, string>,
    });
    const page = await app.firstWindow();
    await page.addInitScript(() => {
      localStorage.setItem('language', 'en');
      localStorage.setItem('unitSystem', 'si');
    });
    await page.reload();

    const dialogs: DialogQueue = {
      push: (...answers) =>
        app.evaluate(({ dialog }, queued) => {
          const g = globalThis as unknown as { __answers?: string[][] };
          g.__answers = [...(g.__answers ?? []), ...queued];
          // Replace every native open-dialog by one that answers from the queue.
          (dialog as any).showOpenDialog = async () => {
            const next = g.__answers?.shift();
            return next ? { canceled: false, filePaths: next } : { canceled: true, filePaths: [] };
          };
        }, answers),
    };

    await provide({ app, page, workspace, dialogs });

    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: testInfo.outputPath('final.png') }).catch(() => undefined);
    }
    await app.close();
    // RIVER_E2E_KEEP=1 keeps the throwaway workspace (under ~/.river-e2e-*) for inspection.
    if (process.env.RIVER_E2E_KEEP) console.log(`workspace kept at ${workspace}`);
    else fs.rmSync(root, { recursive: true, force: true });
  },
});

export { expect };
