import { ipcamErrorGrade, IPCAM_ERROR_LIMITS } from './ipcamErrorGrade';

describe('ipcamErrorGrade', () => {
  test('limits from the spec', () => {
    expect(IPCAM_ERROR_LIMITS).toEqual({ GOOD: 5, FAIR: 10 });
  });
  test.each([
    [0, 'good'],
    [4.99, 'good'],
    [5, 'fair'],
    [10, 'fair'],
    [10.01, 'bad'],
    [250, 'bad'],
  ])('%p px is %s', (px, grade) => {
    expect(ipcamErrorGrade(px)).toBe(grade);
  });
  test('no value, no grade', () => {
    expect(ipcamErrorGrade(null)).toBeNull();
    expect(ipcamErrorGrade(undefined)).toBeNull();
    expect(ipcamErrorGrade(NaN)).toBeNull();
  });
});
