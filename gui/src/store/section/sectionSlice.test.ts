import reducer, { clearResults, setSectionData, setSummary } from './sectionSlice';
import { SectionData, SectionState, Summary } from './types';

/**
 * Editing a cross-section's geometry invalidates every result derived from it.
 * These tests pin the invalidation, because the failure mode is silent: stale
 * results simply keep rendering as if they still described the new geometry.
 */

const sectionData = (overrides: Partial<SectionData> = {}) =>
  ({
    num_stations: 3,
    east: [1, 2, 3],
    north: [4, 5, 6],
    ...overrides,
  }) as unknown as SectionData;

const stateWith = (sectionCount: number, summary?: Summary): SectionState => {
  const sections = Array.from({ length: sectionCount }, (_, i) => ({
    name: `CS_${i}`,
    data: sectionData(),
    numStations: 3,
    alpha: 0.85,
  })) as unknown as SectionState['sections'];

  return {
    sections,
    summary,
    activeSection: 0,
    sectionsCounter: sectionCount,
    transformationMatrix: [],
    isSectionWorking: false,
    isDraggingPoint: false,
  } as unknown as SectionState;
};

describe('clearResults', () => {
  it('clears data on EVERY section, including the first', () => {
    // The first section is the regression guard: the dead onCleanSectionsData
    // this replaces skipped index 0, which would leave CS_0 showing results
    // computed for geometry the user has since moved.
    const state = stateWith(3);

    const next = reducer(state, clearResults());

    expect(next.sections.map((s) => s.data)).toEqual([undefined, undefined, undefined]);
  });

  it('clears the summary, so no stale total discharge survives', () => {
    const summary = { mean: { total_Q: 42 } } as unknown as Summary;
    const state = stateWith(2, summary);

    const next = reducer(state, clearResults());

    expect(next.summary).toBeUndefined();
  });

  it('preserves user-chosen settings that are not results', () => {
    // numStations and alpha are user inputs that happen to be echoed back by
    // the backend. Wiping them would discard the user's configuration.
    const state = stateWith(1);

    const next = reducer(state, clearResults());

    expect(next.sections[0].numStations).toBe(3);
    expect(next.sections[0].alpha).toBe(0.85);
    expect(next.sections[0].name).toBe('CS_0');
  });

  it('is safe to call when there is nothing to clear', () => {
    const state = stateWith(2);
    const already = reducer(state, clearResults());

    const next = reducer(already, clearResults());

    expect(next.sections.every((s) => s.data === undefined)).toBe(true);
    expect(next.summary).toBeUndefined();
  });
});

describe('setSectionData then clearResults', () => {
  it('round-trips: results land, then a geometry edit removes them', () => {
    const state = stateWith(2);
    const withData = reducer(
      state,
      setSectionData({ sectionIndex: 1, sectionData: sectionData({ num_stations: 7 }) })
    );
    expect(withData.sections[1].data).toBeDefined();
    expect(withData.sections[1].numStations).toBe(7);

    const cleared = reducer(withData, clearResults());

    expect(cleared.sections[1].data).toBeUndefined();
  });

  it('drops the summary set by a previous run', () => {
    const state = stateWith(1);
    const withSummary = reducer(state, setSummary({ mean: { total_Q: 9 } } as unknown as Summary));
    expect(withSummary.summary).toBeDefined();

    const cleared = reducer(withSummary, clearResults());

    expect(cleared.summary).toBeUndefined();
  });
});
