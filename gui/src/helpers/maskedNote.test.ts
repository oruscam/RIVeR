import { maskedNote } from './maskedNote';

describe('maskedNote', () => {
  it('says nothing when no station is masked', () => {
    expect(maskedNote([false, false])).toEqual({ key: 'none', count: 0 });
    expect(maskedNote([])).toEqual({ key: 'none', count: 0 });
  });
  it('counts masked stations', () => {
    expect(maskedNote([false, true, true])).toEqual({ key: 'some', count: 2 });
  });
  it('flags a technique that would compute nothing', () => {
    expect(maskedNote([true, true])).toEqual({ key: 'all', count: 2 });
  });
});
