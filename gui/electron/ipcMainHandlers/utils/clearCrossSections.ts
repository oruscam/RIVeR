import * as fs from 'fs';
import { sanitizeNonStandardJsonTokens } from './sanitizeJson';

async function clearCrossSections(filepath: string) {
  const xSectionsFile = await fs.promises.readFile(filepath, 'utf-8');
  // xsections.json can contain literal NaN/Infinity/-Infinity tokens (see
  // sanitizeNonStandardJsonTokens for why) once analyze-all has populated it with
  // results (e.g. displacement_x/y for the edge stations). Re-running Analize
  // after that — e.g. after visiting Results and coming back to Processing —
  // parses this same file again, so it needs the same sanitization as
  // loadResults.ts/setStivManualAngles.ts.
  const data = JSON.parse(sanitizeNonStandardJsonTokens(xSectionsFile));

  const basicKeys = [
    'bath',
    'rw_length',
    'level',
    'left_station',
    'east_l',
    'east_r',
    'north_l',
    'north_r',
    'xl',
    'yl',
    'xr',
    'yr',
    'dir_east_l',
    'dir_north_l',
    'dir_east_r',
    'dir_north_r',
    'dir_xl',
    'dir_yl',
    'dir_xr',
    'dir_yr',
    'num_stations',
    'alpha',
  ];

  const newJson = {};

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const section = data[key];
      const newSection = {};
      for (const basicKey of basicKeys) {
        newSection[basicKey] = section[basicKey];
      }
      newJson[key] = newSection;
    }
  }

  delete newJson.summary;
  await fs.promises.writeFile(filepath, JSON.stringify(newJson, null, 2), 'utf-8');
}

export { clearCrossSections };
