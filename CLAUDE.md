# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is RIVeR

RIVeR (Rectification of Image Velocity Results) is an open-source LSPIV (Large Scale Particle Image Velocimetry) toolkit for analyzing water-surface velocity and river discharge from video footage. It ships as a cross-platform Electron desktop app wrapping a Python computational backend.

## Commands

### Python backend

```bash
pip install -e .          # development install
ruff check river/         # lint
```

### GUI (Electron + React) — run from `gui/`

```bash
npm run dev               # start Vite dev server + Electron
npm run build             # production build (Vite + Electron)
npm run lint              # ESLint (zero warnings enforced)
npm run test              # Jest
npm run test:watch        # Jest watch mode
npm run build-cli         # package Python backend via PyInstaller
npm run build-linux       # .deb installer
npm run build-mac         # .dmg installer
npm run build-win         # .exe NSIS installer
```

### Dev environment setup

1. Install Python 3.12+ and run `pip install -e .` from repo root.
2. Install Node.js 18.18.0+ and run `npm install` in `gui/`.
3. Install FFmpeg system-wide (Linux/macOS) or place binaries in `gui/ffmpeg/` (Windows).
4. Create `gui/.env.development` — see `gui/.env.example` for required vars (python path, river-cli path, ffmpeg path).

## Architecture

### Two-process model

The app has two independent runtimes communicating over Electron IPC:

- **Python CLI** (`river/`): heavy computation (PIV, coordinate transforms, discharge).
- **Electron + React** (`gui/`): UI, file management, subprocess orchestration.

The renderer never calls Python directly. It calls `window.ipcRenderer.invoke(channel, args)` → Electron main process handler → `executeRiverCli()` spawns a Python subprocess → result returned as JSON.

### Python backend (`river/`)

| Layer | Purpose |
|---|---|
| `river/cli/commands/` | Click commands (entry points: `coordinate_transform`, `piv_pipeline`, `compute_section`, `define_roi_masks`, `video_to_frames`) |
| `river/core/` | Physics modules: `piv_fftmulti.py` + `piv_loop.py` (Numba JIT, performance-critical), `coordinate_transform.py`, `compute_section.py`, `image_preprocessing.py` |

All CLI commands can also be imported as Python modules.

### Electron main process (`gui/electron/`)

- `main.ts`: Creates BrowserWindow, registers IPC handlers on `app.ready`, manages dev vs production paths.
- `ipcMainHandlers/`: 20+ handlers, one per feature area (project init, frame extraction, PIV analysis, cross-sections, report export, etc.).
- `preload.ts`: Exposes a safe IPC bridge to the renderer via `contextBridge` (no direct Node access in renderer).
- `executeRiverCli.ts`: Spawns Python subprocess; in dev uses venv Python, in production uses bundled `river-cli/python/`.

### React renderer (`gui/src/`)

8-step wizard workflow:
1. **HomePage** → project selection/creation
2. **FootageMode** → video type (UAV / Oblique / IPCam)
3. **VideoRange** → frame extraction parameters
4. **Uav / Oblique / Ipcam** → control points + coordinate transform
5. **CrossSections** → interactive section drawing
6. **Processing** → PIV analysis execution
7. **Results** → quiver plots + velocity profiles (D3.js)
8. **Report** → HTML report export

**Redux store slices**: `ui`, `project`, `data`, `uav`, `oblique`, `ipcam`, `section`, `global`. There is no Redux persistence — project state is reloaded from disk via IPC on each load. Theme and language are stored in `localStorage`.

### Runtime file system

The app stores all project data under `~/River/` (created on first run). Each IPC handler receives a `PROJECT_CONFIG` object with the full set of paths (frames dir, results dir, transformation matrices, etc.).

### i18n

12 languages in `gui/src/translations/{lang}/global.json`. Adding a language means creating a new folder with `global.json` and opening a PR.

## Key constraints

- `piv_fftmulti.py` and `piv_loop.py` use Numba JIT — avoid changes that break Numba-compatible type signatures.
- `scipy < 1.14` is pinned; do not upgrade without checking compatibility.
- The GUI enforces zero ESLint warnings (`--max-warnings 0`). Fix all lint errors before committing.
- Windows builds require FFmpeg binaries placed in `gui/ffmpeg/` before running `build-win`.
