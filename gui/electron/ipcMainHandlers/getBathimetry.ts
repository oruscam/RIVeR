import { dialog, ipcMain } from 'electron';
import { basename, extname, join } from 'path';
import { readFile, utils, set_fs } from 'xlsx';
import * as fs from 'fs';
import { EXTENSIONS, validateFile } from './utils/validateFile';
import { PROJECT_CONFIG } from '../main';
import { smartParseFloat } from './utils/parseDistancesData';

// Set the file system for xlsx library
set_fs(fs);

async function getBathimetry() {
  // Define options for the file dialog
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: [
      {
        name: 'Documents',
        extensions: EXTENSIONS,
      },
    ],
  };

  // Handle the 'get-bathimetry' IPC event
  ipcMain.handle('get-bathimetry', async (_event, args) => {
    const { path, zLimits, unitSistem } = args;
    const FT_TO_M = 0.3048;
    const isImperial = unitSistem === 'imperial';
    // If the file is dropped, the path is provided in args. But we need to validate it.
    let isValidPath = validateFile(path);

    if (isValidPath === false && path !== undefined) {
      return { error: new Error('invalidBathimetryFileFormat') };
    }

    // Set default files path
    options.defaultPath = PROJECT_CONFIG.defaultFilesPath;

    // If the file is not dropped, the path is undefined and we will show the open file dialog.
    try {
      let bathPath: string = path;

      // If no path is provided, show the open file dialog
      if (bathPath === undefined) {
        const result = await dialog.showOpenDialog(options);
        bathPath = result.filePaths[0];
        if (bathPath === undefined) {
          return { path: '' };
        }
      }

      // Get the name of the bathymetry file and extension
      const bathimetryName = basename(bathPath);
      const bathimetryExt = extname(bathPath);

      // Read the workbook from the file
      const workbook = readFile(bathPath);
      const sheetName = workbook.SheetNames[0];

      // Convert the sheet to JSON format
      let data: unknown[][] = [];
      let needsNormalization = false; // Track if the source format is non-standard
      if (bathimetryExt.toLowerCase() === '.csv') {
        const content = fs.readFileSync(bathPath, 'utf-8');
        const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
        data = lines.map((line) => {
          if (line.includes(';') || line.includes('\t')) {
            needsNormalization = true; // Non-standard separator detected
            return line.split(/[;\t]/);
          }
          const parts = line.split(',');
          if (parts.length === 3) {
            // Ambiguous comma case e.g., "0,1,765" -> "0" and "1.765"
            needsNormalization = true;
            return [parts[0], parts[1] + '.' + parts[2]];
          }
          if (parts.length === 4) {
            // Broken case: "1,501,1,632" -> "1.501" and "1.632"
            needsNormalization = true;
            return [parts[0] + '.' + parts[1], parts[2] + '.' + parts[3]];
          }
          return parts;
        });
      } else {
        const sheet = workbook.Sheets[sheetName];
        data = utils.sheet_to_json(sheet, { header: 1 });
      }

      let maxY = -Infinity;
      let maxYIndex = -1;

      // Filter out completely empty rows first
      const validRows = (data as unknown[][]).filter(
        (row) =>
          row.length > 0 && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
      );

      // Map the data to an array of objects with x and y properties
      let line = validRows
        .map((row: unknown[], index: number) => {
          let xRaw = row[0];
          let yRaw = row[1];

          if (row.length === 1 && typeof row[0] === 'string') {
            // Handle cases where SheetJS fails to split columns due to unusual delimiters
            const parts = (row[0] as string).split(/[;\t]/);
            if (parts.length >= 2) {
              xRaw = parts[0];
              yRaw = parts[1];
            } else {
              const spaceParts = (row[0] as string).trim().split(/\s+/);
              if (spaceParts.length >= 2) {
                xRaw = spaceParts[0];
                yRaw = spaceParts[1];
              } else {
                const commaParts = (row[0] as string).split(',');
                if (commaParts.length >= 2) {
                  // Fallback for cases like "1.5, 2.5"
                  xRaw = commaParts[0];
                  yRaw = commaParts[1];
                }
              }
            }
          }

          const x = smartParseFloat(xRaw);
          const y = smartParseFloat(yRaw);

          if ((isNaN(x) || isNaN(y)) && index !== 0) {
            throw new Error('invalidBathimetryFileFormat');
          }

          return { x, y };
        })
        .filter((row: any) => !isNaN(row.x) && !isNaN(row.y));

      // The Python backend's load_bathymetry() reads the profile with
      // `data.get_col(0)[1:]` — it discards the first row unconditionally, header or
      // not. Our own parse drops a header implicitly (it keeps only numeric rows), so
      // the count difference is how we know whether the source had one. Any file we
      // hand to the backend must carry a header row; otherwise the first real point —
      // typically the left water edge — is silently eaten, which shrinks the wetted
      // width and relocates every station.
      const hadHeaderRow = validRows.length > line.length;

      // Convert ft -> m when the user is working in imperial units.
      // The store and any file consumed by the Python backend must always be SI.
      if (isImperial) {
        line = line.map(({ x, y }) => ({ x: x * FT_TO_M, y: y * FT_TO_M }));
      }

      line.forEach((row, idx) => {
        if (row.y > maxY) {
          maxY = row.y;
          maxYIndex = idx;
        }
      });

      // Analyze the line to determine if it is decreced and if it represents depth
      const { isDecreced, isDepth } = analyzeLine(line, maxYIndex);

      // IPCam (3D) needs the bathymetry expressed as absolute elevation, in the same
      // reference frame as the camera solution's control points. Depth (relative to
      // whatever the water surface happens to be) can't be placed in that frame.
      if (isDepth && zLimits !== undefined) {
        throw new Error('invalidBathimetryDepthNotAllowed');
      }

      // A depth profile's banks are, by definition, at the water's edge (depth 0).
      // If the file doesn't already say so explicitly, anchor both ends at 0 so a
      // flat or near-flat profile (e.g. a rectangular channel given as just its
      // two bottom corners) still has real relief once inverted, instead of a
      // degenerate flat line.
      if (isDepth) {
        if (line[0].y !== 0) {
          line = [{ x: line[0].x, y: 0 }, ...line];
        }
        if (line[line.length - 1].y !== 0) {
          line = [...line, { x: line[line.length - 1].x, y: 0 }];
        }
      }

      // Transform the line if necessary
      const { newLine, changed } = transformLine(line, isDecreced, isDepth, maxY, zLimits?.min);

      // Write a normalized/converted CSV file if data was transformed, format was non-standard,
      // the user is working in imperial units, or the source isn't already plain CSV.
      // IMPORTANT: Always write as CSV regardless of source format.
      // tablib (used by river-cli) cannot parse ODS files generated by SheetJS, but reads CSV reliably.
      // Container formats like ODS/XLSX can store a locale-formatted display string (e.g. "0,542")
      // alongside the real numeric value; tablib reads the display string, which breaks float parsing
      // for any locale using comma as the decimal separator. Only a plain-text CSV we already parsed
      // and re-wrote ourselves is guaranteed to match what tablib will read.
      const isSourceCsv = bathimetryExt.toLowerCase() === '.csv';
      let newFilePath = bathPath;
      if (changed || needsNormalization || isImperial || !isSourceCsv || !hadHeaderRow) {
        // Generate a new file name with _modified.csv suffix (always CSV for Python compatibility)
        newFilePath = join(PROJECT_CONFIG.projectDirectory, basename(bathPath, bathimetryExt) + '_modified.csv');

        // Write as plain CSV: a header row followed by "x,y" data rows. The header is
        // required — the backend always skips the first row, so writing the data
        // headerless would cost us the first station (see hadHeaderRow above).
        const csvContent = [
          'station,stage',
          ...newLine.map((row: { x: number; y: number }) => `${row.x},${row.y}`),
        ].join('\n');
        await fs.promises.writeFile(newFilePath, csvContent, 'utf-8');

        console.log(`New CSV file created: ${newFilePath}`);
      }

      line = newLine;

      // Return the path, name, line data, and whether it was changed
      return {
        path: newFilePath,
        name: bathimetryName,
        line: line,
        changed: changed,
      };
    } catch (error) {
      console.log(error);
      return { error };
    }
  });
}

// Analyze the line to determine if it is decreced and if it represents depth
const analyzeLine = (line: { x: number; y: number }[], maxYIndex: number) => {
  const isDecreced = line[0].x > line[line.length - 1].x;

  // Compare the profile against the chord (straight line) connecting its two
  // endpoints, using the signed area between the curve and the chord.
  // A depth profile is "hill"-shaped: low at the banks (endpoints), high in
  // between, so it bulges above the chord (positive area).
  // An elevation/stage profile is already "valley"-shaped: high at the
  // banks, low in the channel, so it sits below the chord (negative area).
  // Unlike checking the position of the max point, this holds even when the
  // deepest point sits close to one bank, which is common in real, asymmetric
  // river channels.
  const first = line[0];
  const last = line[line.length - 1];
  const dx = last.x - first.x;

  if (dx === 0) {
    // Degenerate case (no horizontal spread): fall back to the old,
    // position-based check.
    const isDepth = !(maxYIndex === 0 || maxYIndex === line.length - 1);
    return { isDecreced, isDepth };
  }

  const chordY = (x: number) => first.y + ((x - first.x) / dx) * (last.y - first.y);

  let signedArea = 0;
  let prevDeviation = 0; // line[0].y - chordY(line[0].x) is 0 by construction
  for (let i = 1; i < line.length; i++) {
    const deviation = line[i].y - chordY(line[i].x);
    const segmentDx = Math.abs(line[i].x - line[i - 1].x);
    signedArea += ((prevDeviation + deviation) / 2) * segmentDx;
    prevDeviation = deviation;
  }

  // A perfectly flat profile (zero signed area, e.g. a rectangular channel
  // sampled with just its two bottom corners) has no relief either way, so it
  // can't be valid elevation data for a channel — a channel's middle must sit
  // lower than its banks. Depth has no such requirement (a uniform depth is a
  // normal, flat-bottomed channel), so ties default to depth.
  const isDepth = signedArea >= 0;
  return { isDecreced, isDepth };
};

// Transform the line to be in the correct order and convert depth bathymetry to level bathymetry if needed
const transformLine = (line, isDecreced: boolean, isDepth: boolean, maxY: number, zMin?: number) => {
  let newLine = [];

  // First transform the line as before
  if (isDecreced && isDepth) {
    for (let i = line.length - 1; i >= 0; i--) {
      newLine.push({ x: line[i].x, y: maxY - line[i].y });
    }
  } else if (isDecreced) {
    for (let i = line.length - 1; i >= 0; i--) {
      newLine.push(line[i]);
    }
  } else if (isDepth) {
    if (zMin !== undefined) {
      for (let i = 0; i < line.length; i++) {
        newLine.push({ x: line[i].x, y: maxY - line[i].y - maxY + zMin });
      }
    } else {
      for (let i = 0; i < line.length; i++) {
        newLine.push({ x: line[i].x, y: maxY - line[i].y });
      }
    }
  } else {
    return { newLine: line, changed: false };
  }

  // Now check the extremities and add an extra point if needed
  const firstPoint = newLine[0];
  const lastPoint = newLine[newLine.length - 1];

  if (firstPoint.y !== lastPoint.y) {
    // Determine which end is lower
    if (firstPoint.y < lastPoint.y) {
      // First point is lower, add a point at x=firstPoint.x with y=lastPoint.y
      newLine.unshift({ x: firstPoint.x, y: lastPoint.y });
    } else {
      // Last point is lower, add a point at x=lastPoint.x with y=firstPoint.y
      newLine.push({ x: lastPoint.x, y: firstPoint.y });
    }
  }

  return { newLine, changed: true };
};

export { getBathimetry, analyzeLine, transformLine };
