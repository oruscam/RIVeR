// src/hooks/useVelocityColorRange.test.ts
//
// `hasResolvedData` is pure and doesn't touch Redux at all, but it lives in
// the same module as the `useVelocityColorRange` hook, which imports
// `useDataSlice`/`useProjectSlice`/`useSectionSlice` and the `../helpers`
// barrel — several of which read `import.meta.env` (Vite-only syntax) at
// module scope. That syntax can't be parsed by Jest's CommonJS runtime, so
// those modules are stubbed out below purely to let this file load; none of
// them are exercised by the tests, which call only the pure function.
jest.mock('./useDataSlice', () => ({ useDataSlice: jest.fn() }));
jest.mock('./useProjectSlice', () => ({ useProjectSlice: jest.fn() }));
jest.mock('./useSectionSlice', () => ({ useSectionSlice: jest.fn() }));
jest.mock('../helpers', () => ({ getEffectiveTechniqueData: jest.fn() }));

import { hasResolvedData } from './useVelocityColorRange';

describe('hasResolvedData', () => {
  it('is false when no section has data yet', () => {
    expect(hasResolvedData([null])).toBe(false);
  });

  it('is false when a section has data but every value is null (e.g. every station unchecked)', () => {
    expect(hasResolvedData([[null, null]])).toBe(false);
  });

  it('is true once at least one section has a resolved value, even if that value is 0', () => {
    expect(hasResolvedData([[null], [0, 1.2]])).toBe(true);
  });

  it('is true when the only section with data has a single 0 value (all-dry-bank cross-section)', () => {
    expect(hasResolvedData([[0, 0, 0]])).toBe(true);
  });
});
