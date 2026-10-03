import {
  badgeGrade,
  CALIBRATION_VIEW_MODES,
  folderName,
  footerAction,
  initialStage,
  MIN_RECOMMENDED_PHOTOS,
  parentDir,
  photoCountAdvice,
  profileDisplayPath,
  viewAvailability,
  viewForKey,
} from './calibrationView';
import type { CalibrationStatus } from '../store/calibration/types';

describe('viewAvailability', () => {
  it('offers only Original before solving', () => {
    const unsolved: CalibrationStatus[] = ['idle', 'solving', 'error'];
    for (const status of unsolved) {
      expect(viewAvailability(status, true)).toEqual({
        original: null,
        corrected: 'notSolved',
        heatmap: 'notSolved',
      });
    }
  });

  it('offers every view once solved with a heatmap', () => {
    expect(viewAvailability('solved', true)).toEqual({ original: null, corrected: null, heatmap: null });
  });

  it('keeps Heatmap unavailable when the solver produced none', () => {
    expect(viewAvailability('solved', false).heatmap).toBe('noHeatmap');
    expect(viewAvailability('solved', false).corrected).toBeNull();
  });

  it('lists the modes in display order', () => {
    expect(CALIBRATION_VIEW_MODES).toEqual(['original', 'corrected', 'heatmap']);
  });
});

describe('viewForKey', () => {
  it('maps 1, 2 and H in either case to views', () => {
    expect(viewForKey('1')).toBe('original');
    expect(viewForKey('2')).toBe('corrected');
    expect(viewForKey('h')).toBe('heatmap');
    expect(viewForKey('H')).toBe('heatmap');
  });

  it('ignores every other key', () => {
    for (const key of ['3', 'x', 'Escape', 'ArrowLeft', '']) {
      expect(viewForKey(key)).toBeNull();
    }
  });
});

describe('badgeGrade', () => {
  it('passes the three known grades through', () => {
    expect(badgeGrade('good')).toBe('good');
    expect(badgeGrade('fair')).toBe('fair');
    expect(badgeGrade('bad')).toBe('bad');
  });

  it('returns null for a missing or unknown grade instead of guessing one', () => {
    expect(badgeGrade(undefined)).toBeNull();
    expect(badgeGrade(null)).toBeNull();
    expect(badgeGrade('')).toBeNull();
    expect(badgeGrade('excellent')).toBeNull();
  });
});

describe('footerAction', () => {
  const base = { cameraName: '', lensName: '' };

  it('asks for photos before the first solve', () => {
    expect(footerAction({ ...base, status: 'idle', imageCount: 0 })).toEqual({
      kind: 'solve',
      blocker: 'noPhotos',
      busy: false,
    });
  });

  it('lets Solve run once photos exist, including to retry after an error', () => {
    expect(footerAction({ ...base, status: 'idle', imageCount: 3 })).toEqual({
      kind: 'solve',
      blocker: null,
      busy: false,
    });
    expect(footerAction({ ...base, status: 'error', imageCount: 3 })).toEqual({
      kind: 'solve',
      blocker: null,
      busy: false,
    });
    expect(footerAction({ ...base, status: 'error', imageCount: 0 }).blocker).toBe('noPhotos');
  });

  it('shows Solve as busy while solving', () => {
    expect(footerAction({ ...base, status: 'solving', imageCount: 3 })).toEqual({
      kind: 'solve',
      blocker: 'solving',
      busy: true,
    });
  });

  it('names whichever profile name is missing after solving, treating whitespace as missing', () => {
    const solved = { status: 'solved' as const, imageCount: 3 };
    expect(footerAction({ ...solved, cameraName: '', lensName: '' }).blocker).toBe('nameCameraAndLens');
    expect(footerAction({ ...solved, cameraName: '   ', lensName: '24 mm' }).blocker).toBe('nameCamera');
    expect(footerAction({ ...solved, cameraName: 'DJI Mini 3', lensName: ' ' }).blocker).toBe('nameLens');
    expect(footerAction({ ...solved, cameraName: 'DJI Mini 3', lensName: '' }).kind).toBe('save');
  });

  it('enables Save once both names are filled', () => {
    expect(footerAction({ status: 'solved', imageCount: 3, cameraName: 'DJI Mini 3', lensName: '24 mm' })).toEqual(
      {
        kind: 'save',
        blocker: null,
        busy: false,
      }
    );
  });
});

describe('photoCountAdvice', () => {
  it('says nothing before any photo is loaded', () => {
    expect(photoCountAdvice(0)).toBe('none');
  });

  it('warns below the recommended minimum', () => {
    expect(MIN_RECOMMENDED_PHOTOS).toBe(15);
    expect(photoCountAdvice(1)).toBe('tooFew');
    expect(photoCountAdvice(14)).toBe('tooFew');
  });

  it('is satisfied from the minimum up', () => {
    expect(photoCountAdvice(15)).toBe('ok');
    expect(photoCountAdvice(30)).toBe('ok');
  });
});

describe('initialStage', () => {
  it('opens Prepare unless a solve is running or finished', () => {
    expect(initialStage('idle')).toBe('prepare');
    expect(initialStage('error')).toBe('prepare');
    expect(initialStage('solving')).toBe('workspace');
    expect(initialStage('solved')).toBe('workspace');
  });
});

describe('footerAction after a save', () => {
  it('becomes Done, with nothing blocking it, whatever the name fields hold', () => {
    expect(footerAction({ status: 'solved', imageCount: 20, cameraName: '', lensName: '', saved: true })).toEqual({
      kind: 'done',
      blocker: null,
      busy: false,
    });
  });

  it('stays Save profile while not saved', () => {
    expect(
      footerAction({ status: 'solved', imageCount: 20, cameraName: 'A', lensName: 'B', saved: false }).kind
    ).toBe('save');
  });
});

describe('parentDir', () => {
  it('drops the file name with either separator', () => {
    expect(parentDir('/Users/a/calib/IMG_01.jpg')).toBe('/Users/a/calib');
    expect(parentDir('C:\\Users\\a\\calib\\IMG_01.jpg')).toBe('C:\\Users\\a\\calib');
  });
});

describe('folderName', () => {
  it('returns the last segment with either separator, ignoring a trailing one', () => {
    expect(folderName('/Users/a/gopro11_wide')).toBe('gopro11_wide');
    expect(folderName('/Users/a/gopro11_wide/')).toBe('gopro11_wide');
    expect(folderName('C:\\calib\\gopro11_wide')).toBe('gopro11_wide');
  });

  it('returns an empty string for no folder', () => {
    expect(folderName('')).toBe('');
  });
});

describe('profileDisplayPath', () => {
  it('starts the path at calibration_profiles', () => {
    expect(profileDisplayPath('/Users/a/RIVeR/calibration_profiles/GoPro/Wide/profile.json')).toBe(
      'calibration_profiles/GoPro/Wide/profile.json'
    );
    expect(profileDisplayPath('C:\\RIVeR\\calibration_profiles\\GoPro\\Wide\\profile.json')).toBe(
      'calibration_profiles\\GoPro\\Wide\\profile.json'
    );
  });

  it('keeps any other path whole', () => {
    expect(profileDisplayPath('/tmp/profile.json')).toBe('/tmp/profile.json');
  });
});
