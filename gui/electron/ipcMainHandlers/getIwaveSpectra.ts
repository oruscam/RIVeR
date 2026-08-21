import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';

const SPECTRUM_FILENAME = /^spectrum_(\d+)\.png$/;

export interface IwaveSpectraSidecar {
  version: number;
  stations: {
    station: number;
    kx_min: number;
    kx_max: number;
    kt_min: number;
    kt_max: number;
    curves: { gravity: [number, number][]; turbulence: [number, number][] };
  }[];
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
