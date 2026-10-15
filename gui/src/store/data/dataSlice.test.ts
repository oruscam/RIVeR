import reducer, { toggleProcessingExtraFields, setDefaultDataState } from './dataSlice';
import { DataState } from './types';

const baseState = (overrides: Partial<DataState> = {}): DataState =>
  ({
    processing: {
      form: {} as DataState['processing']['form'],
      parImages: [],
      maskPath: '',
      masks: [],
      activeMaskIndex: null,
      visibleMaskIndices: [],
      extraFields: false,
    },
    images: { paths: [], active: 0 },
    quiver: null,
    fullQuiver: null,
    isBackendWorking: false,
    isDataLoaded: false,
    hasChanged: false,
    colorbarLimits: { min: null, max: null, default: true },
    ...overrides,
  }) as DataState;

describe('toggleProcessingExtraFields', () => {
  it('turns advanced mode on from false', () => {
    const state = reducer(baseState(), toggleProcessingExtraFields());
    expect(state.processing.extraFields).toBe(true);
  });

  it('turns advanced mode off from true', () => {
    const state = baseState({
      processing: { ...baseState().processing, extraFields: true },
    });
    expect(reducer(state, toggleProcessingExtraFields()).processing.extraFields).toBe(false);
  });

  it('does not touch any other processing field', () => {
    const state = baseState({
      processing: { ...baseState().processing, maskPath: 'foo.png', extraFields: false },
    });
    const next = reducer(state, toggleProcessingExtraFields());
    expect(next.processing.maskPath).toBe('foo.png');
  });
});

describe('setDefaultDataState', () => {
  it('resets extraFields to false along with the rest of processing', () => {
    const state = baseState({
      processing: { ...baseState().processing, extraFields: true },
    });
    expect(reducer(state, setDefaultDataState()).processing.extraFields).toBe(false);
  });
});
