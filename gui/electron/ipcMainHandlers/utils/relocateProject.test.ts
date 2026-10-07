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
});
