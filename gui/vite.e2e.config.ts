// Vite config used only by the Playwright E2E suite (see playwright.config.ts).
// Same as vite.config.ts, except that the Electron plugin only (re)builds
// dist-electron/ and does NOT launch Electron: Playwright launches it itself so
// it can control the window.
import { defineConfig, mergeConfig } from 'vite';
import path from 'node:path';
import electron from 'vite-plugin-electron/simple';
import react from '@vitejs/plugin-react';
import baseConfig from './vite.config';

const EXTERNAL_NATIVE = ['skia-canvas'];
const external = { build: { rollupOptions: { external: EXTERNAL_NATIVE } } };

export default mergeConfig(
  { ...baseConfig, plugins: [] },
  defineConfig({
    plugins: [
      react(),
      electron({
        main: { entry: 'electron/main.ts', onstart() {}, vite: external },
        preload: { input: path.join(__dirname, 'electron/preload.ts'), vite: external },
      }),
    ],
  })
);
