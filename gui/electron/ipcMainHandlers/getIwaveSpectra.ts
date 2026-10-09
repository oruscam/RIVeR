import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';

const SPECTRUM_FILENAME = /^spectrum_(\d+)\.png$/;

type SpectrumCurve = [number, number][];

/** One wavenumber-frequency plane of a station's spectrum (sidecar version 2). */
export interface IwaveSpectrumPlane {
  /** Wavenumber axis (rad/m), cell centres. */
  k: number[];
  /** Normalised spectrum, one row per frequency (lowest first), one column per k. */
  values: number[][];
  curves: { gravity: SpectrumCurve; turbulence: SpectrumCurve };
}

export interface IwaveSpectraStation {
  station: number;
  kx_min: number;
  kx_max: number;
  kt_min: number;
  kt_max: number;
  /** The ky = 0 curves against kx. */
  curves: { gravity: SpectrumCurve; turbulence: SpectrumCurve };
  // Everything below is version 2: absent for a project last run with an
  // older RIVeR, whose sidecar only describes the PNG.
  /** Frequency axis (rad/s), cell centres, shared by both planes. */
  kt?: number[];
  /** `kx` is the ky = 0 plane, `ky` the kx = 0 plane. */
  planes?: { kx: IwaveSpectrumPlane; ky: IwaveSpectrumPlane };
  /** A robust maximum for the colour scale, over both planes. */
  display_max?: number;
  fit?: { vx: number | null; vy: number | null; depth: number | null };
  /** Share (0..1) of the spectral energy within the fit band of each curve;
   *  `waves` is null when the fit did not model gravity waves. */
  energy?: { waves: number | null; advected: number | null };
}

export interface IwaveSpectraSidecar {
  version: number;
  stations: IwaveSpectraStation[];
}

/**
 * Lists the spectrum previews iWave wrote for one cross-section.
 *
 * iWave writes <project>/iwave_spectra/<section>/spectrum_<station_id>.png plus a
 * spectra.json sidecar on every spectra-enabled run. Returns an empty result (not
 * an error) when the folder is absent — that is the normal state before iWave has
 * ever run for this section. A missing or corrupt sidecar still yields the images,
 * so the viewer can show the spectrum without the dispersion curves.
 */
function getIwaveSpectra() {
  ipcMain.handle('get-iwave-spectra', async (_event, args) => {
    const { sectionName } = args ?? {};
    if (!sectionName) {
      return { stations: [], paths: [], sidecar: null };
    }
    const { projectDirectory, filePrefix } = PROJECT_CONFIG;
    const spectraDir = path.join(projectDirectory, 'iwave_spectra', sectionName);
    const prefix = filePrefix === undefined ? '' : filePrefix;

    let entries: { station: number; file: string }[];
    try {
      const files = await fs.readdir(spectraDir);
      entries = files
        .map((file) => {
          const match = SPECTRUM_FILENAME.exec(file);
          return match ? { station: parseInt(match[1], 10), file } : null;
        })
        .filter((entry): entry is { station: number; file: string } => entry !== null)
        // Numeric sort: a lexicographic sort would order spectrum_10 before spectrum_2.
        .sort((a, b) => a.station - b.station);
    } catch {
      return { stations: [], paths: [], sidecar: null };
    }

    let sidecar: IwaveSpectraSidecar | null = null;
    try {
      sidecar = JSON.parse(await fs.readFile(path.join(spectraDir, 'spectra.json'), 'utf-8'));
    } catch {
      sidecar = null;
    }

    return {
      stations: entries.map((entry) => entry.station),
      paths: entries.map((entry) => path.join(prefix, spectraDir, entry.file)),
      sidecar,
    };
  });
}

export { getIwaveSpectra };
