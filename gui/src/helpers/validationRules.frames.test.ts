import { getFrameValidationRules } from './validationRules';

const t = (key: string) => key;
const rules = (values: Record<string, string>) => getFrameValidationRules(t, (name: string) => values[name], 240);

describe('getFrameValidationRules', () => {
  it('accepts a range inside the folder', () => {
    const r = rules({ start: '1', end: '240' });
    expect(r.start.validate('1')).toBe(true);
    expect(r.end.validate('240')).toBe(true);
  });

  it.each([
    ['0', '10'],
    ['10', '10'],
    ['12', '10'],
    ['1', '241'],
    ['1.5', '10'],
    ['abc', '10'],
  ])('refuses start %s end %s on the End field', (start, end) => {
    expect(rules({ start, end }).end.validate(end)).toBe('VideoRange.Errors.frameRange');
  });

  it('reports a bad Start on the Start field only when Start itself is unusable', () => {
    expect(rules({ start: '0', end: '10' }).start.validate('0')).toBe('VideoRange.Errors.frameRange');
    expect(rules({ start: '12', end: '10' }).start.validate('12')).toBe(true);
  });

  it('refuses Start and End that Number() and parseInt() would read differently', () => {
    expect(rules({ start: '1e1', end: '20' }).start.validate('1e1')).toBe('VideoRange.Errors.frameRange');
    expect(rules({ start: '0x10', end: '20' }).start.validate('0x10')).toBe('VideoRange.Errors.frameRange');
    expect(rules({ start: '1', end: '1e2' }).end.validate('1e2')).toBe('VideoRange.Errors.frameRange');
    expect(rules({ start: '1', end: '0x10' }).end.validate('0x10')).toBe('VideoRange.Errors.frameRange');
    expect(rules({ start: '1e1', end: '20' }).end.validate('20')).toBe('VideoRange.Errors.frameRange');
    expect(rules({ start: ' 5 ', end: '10' }).start.validate(' 5 ')).toBe(true);
  });

  it('accepts a decimal comma in the interval and refuses zero', () => {
    const r = rules({});
    expect(r.interval.validate('33,3')).toBe(true);
    expect(r.interval.validate('0')).toBe('VideoRange.Errors.interval');
    expect(r.interval.validate('')).toBe('VideoRange.Errors.interval');
  });

  it('keeps the video rule for Step', () => {
    expect(rules({}).step.pattern.value.test('2')).toBe(true);
    expect(rules({}).step.pattern.value.test('0')).toBe(false);
  });
});
