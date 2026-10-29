import * as path from 'path';
import { relocateOwnedPaths } from './relocateProject';

const OLD = '/Users/a/river/DJI_0083/20261006T1837';
const NEW = '/Users/a/Documents/river_cases/DJI_0083/20261006T1837';

const storedSettings = () => ({
  video: { filepath: '/videos/DJI_0083.MP4' },
  xsections: `${OLD}/xsections.json`,
  piv_results: `${OLD}/piv_results.json`,
  transformation: { matrix: `${OLD}/transformation_matrix.json`, other: 1 },
  stabilization_regions_path: `${OLD}/stabilization_regions.json`,
  camera_solution_3d: `${OLD}/camera_solution_3d.json`,
  grp_3d: `${OLD}/grp_3d.json`,
  rectification_3d_images: '/images/cam1',
});

describe('relocateOwnedPaths', () => {
  it('points every project-owned key into the opened folder', () => {
    const { settings, changed, movedFrom } = relocateOwnedPaths(NEW, storedSettings());
    expect(changed).toBe(true);
    expect(movedFrom).toBe(OLD);
    expect(settings.xsections).toBe(path.join(NEW, 'xsections.json'));
    expect(settings.piv_results).toBe(path.join(NEW, 'piv_results.json'));
    expect(settings.transformation.matrix).toBe(path.join(NEW, 'transformation_matrix.json'));
    expect(settings.transformation.other).toBe(1);
    expect(settings.stabilization_regions_path).toBe(path.join(NEW, 'stabilization_regions.json'));
    expect(settings.camera_solution_3d).toBe(path.join(NEW, 'camera_solution_3d.json'));
    expect(settings.grp_3d).toBe(path.join(NEW, 'grp_3d.json'));
  });

  it('leaves external inputs alone (video, fixed-camera images)', () => {
    const { settings } = relocateOwnedPaths(NEW, storedSettings());
    expect(settings.video.filepath).toBe('/videos/DJI_0083.MP4');
    expect(settings.rectification_3d_images).toBe('/images/cam1');
  });

  it('reports no change for a project that was not moved', () => {
    const stored = relocateOwnedPaths(OLD, storedSettings()).settings;
    const again = relocateOwnedPaths(OLD, stored);
    expect(again.changed).toBe(false);
    expect(again.movedFrom).toBeUndefined();
    expect(again.settings).toEqual(stored);
  });

  it('never keeps the old path, even when the old folder still exists (copied project)', () => {
    // relocateOwnedPaths does not look at the disk at all: the old folder existing
    // or not makes no difference, the opened folder always wins.
    const { settings } = relocateOwnedPaths(NEW, storedSettings());
    expect(settings.xsections.startsWith(OLD)).toBe(false);
  });

  it('keeps unset keys unset', () => {
    const { settings, changed } = relocateOwnedPaths(NEW, {
      video: { filepath: '/v.mp4' },
      xsections: null,
      transformation: {},
    });
    expect(changed).toBe(false);
    expect(settings.xsections).toBeNull();
    expect(settings.piv_results).toBeUndefined();
    expect(settings.transformation.matrix).toBeUndefined();
  });

  it('does not mutate its input', () => {
    const input = storedSettings();
    relocateOwnedPaths(NEW, input);
    expect(input.xsections).toBe(`${OLD}/xsections.json`);
  });

  it('keeps a stored path the samePath predicate says is the opened file', () => {
    // e.g. /Users/a/River/... stored, /Users/a/river/... opened on a case-insensitive disk
    const stored = { xsections: '/Users/a/River/case/xsections.json', piv_results: '/elsewhere/piv_results.json' };
    const samePath = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
    const { settings, changed, movedFrom } = relocateOwnedPaths('/Users/a/river/case', stored, samePath);
    expect(settings.xsections).toBe('/Users/a/River/case/xsections.json');
    expect(settings.piv_results).toBe(path.join('/Users/a/river/case', 'piv_results.json'));
    expect(changed).toBe(true);
    expect(movedFrom).toBe('/elsewhere');

    const caseOnly = relocateOwnedPaths('/Users/a/river/case', { xsections: stored.xsections }, samePath);
    expect(caseOnly.changed).toBe(false);
    expect(caseOnly.movedFrom).toBeUndefined();
  });

  it('relocates paths saved on Windows', () => {
    const WIN = 'C:\\Users\\leand\\River\\case\\20261027T1017';
    const stored = {
      xsections: `${WIN}\\xsections.json`,
      piv_results: `${WIN}\\piv_results.json`,
      transformation: { matrix: `${WIN}\\transformation_matrix.json` },
      stabilization_regions_path: `${WIN}\\stabilization_regions.json`,
      camera_solution_3d: `${WIN}\\camera_solution_3d.json`,
      grp_3d: `${WIN}\\grp_3d.json`,
    };
    const { settings, changed, movedFrom } = relocateOwnedPaths(NEW, stored);
    expect(changed).toBe(true);
    expect(movedFrom).toBe(WIN);
    expect(settings.xsections).toBe(path.join(NEW, 'xsections.json'));
    expect(settings.piv_results).toBe(path.join(NEW, 'piv_results.json'));
    expect(settings.transformation.matrix).toBe(path.join(NEW, 'transformation_matrix.json'));
    expect(settings.stabilization_regions_path).toBe(path.join(NEW, 'stabilization_regions.json'));
    expect(settings.camera_solution_3d).toBe(path.join(NEW, 'camera_solution_3d.json'));
    expect(settings.grp_3d).toBe(path.join(NEW, 'grp_3d.json'));
  });

  it('repairs a Windows path an older version joined onto the project folder', () => {
    const WIN = 'C:\\Users\\leand\\River\\case\\20261027T1017';
    const stored = { xsections: `/Users/a/old/20261027T1017/${WIN}\\xsections.json` };
    const { settings, movedFrom } = relocateOwnedPaths(NEW, stored);
    expect(settings.xsections).toBe(path.join(NEW, 'xsections.json'));
    expect(movedFrom).toBe(WIN);
  });
});
