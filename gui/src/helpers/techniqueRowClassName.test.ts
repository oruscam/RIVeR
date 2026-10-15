import { buildTechniqueRowClassName } from './techniqueRowClassName';

describe('buildTechniqueRowClassName', () => {
  it('returns just the base class when nothing else is set', () => {
    expect(buildTechniqueRowClassName({})).toBe('technique-row');
  });

  it('appends technique-row-active when active', () => {
    expect(buildTechniqueRowClassName({ active: true })).toBe('technique-row technique-row-active');
  });

  it('appends technique-row-hidden when hidden', () => {
    expect(buildTechniqueRowClassName({ hidden: true })).toBe('technique-row technique-row-hidden');
  });

  it('appends a caller-supplied extra class', () => {
    expect(buildTechniqueRowClassName({ className: 'technique-row-processing' })).toBe(
      'technique-row technique-row-processing'
    );
  });

  it('combines active, hidden and an extra class, in that order', () => {
    expect(buildTechniqueRowClassName({ active: true, hidden: true, className: 'technique-row-processing' })).toBe(
      'technique-row technique-row-active technique-row-hidden technique-row-processing'
    );
  });

  it('omits falsy active/hidden without leaving stray spaces', () => {
    expect(buildTechniqueRowClassName({ active: false, hidden: false, className: '' })).toBe('technique-row');
  });
});
