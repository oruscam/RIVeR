import { defaultMeasurementDate } from './dateFunctions';

describe('defaultMeasurementDate', () => {
  const today = new Date('2026-10-08T12:00:00');

  it('prefers the date already saved with the project', () => {
    expect(defaultMeasurementDate('30/01/2020 12:22', '2019-05-01T10:00:00.000Z', today)).toEqual(
      new Date('2020-01-30T12:22:00')
    );
  });

  it('falls back to the footage creation time', () => {
    expect(defaultMeasurementDate('', '2019-05-01T10:00:00.000Z', today)).toEqual(
      new Date('2019-05-01T10:00:00.000Z')
    );
  });

  // A folder of frames, or a video that is missing, has no creation time: '' must not become an Invalid Date.
  it.each(['', undefined, 'not a date'])('falls back to today when the creation time is %p', (creation) => {
    expect(defaultMeasurementDate('', creation, today)).toBe(today);
  });
});
