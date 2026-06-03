import { defineConfig } from 'vite';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import electron from 'vite-plugin-electron/simple';
import react from '@vitejs/plugin-react';
import * as os from 'os';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

const EXTERNAL_NATIVE = ['skia-canvas'];

export default defineConfig({
  server: {
    fs: {
      // ! PROVISIONAL
      allow: [os.homedir()],
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        // si el plugin tiene opciones de build/vite para main, podemos también pasar externals ahí:
        vite: {
          build: {
            rollupOptions: {
              external: EXTERNAL_NATIVE,
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            rollupOptions: {
              external: EXTERNAL_NATIVE,
            },
          },
        },
      },
      // Renderer stay default (no node native here)
      renderer:
        process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
  // Evita que Vite pre-bundlee canvas en dev (esbuild prebundle)
  optimizeDeps: {
    exclude: EXTERNAL_NATIVE,
  },
  // Evita que Vite lo incluya en el bundle SSR
  ssr: {
    external: EXTERNAL_NATIVE,
  },
  build: {
    rollupOptions: {
      external: EXTERNAL_NATIVE,
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
    'process.env': process.env,
  },
});