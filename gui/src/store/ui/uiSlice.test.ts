import reducer, {
  setModeHint,
  clearModeHint,
  setFieldError,
  clearFieldError,
  clearAllFieldErrors,
  addStepAlert,
  clearStepAlert,
  clearAllStepAlerts,
  showToast,
  clearToast,
  setPinnedStation,
  toggleStationPin,
} from './uiSlice';
import { UIState } from './types';

const baseState = (overrides: Partial<UIState> = {}): UIState =>
  ({
    screenSizes: { width: 0, height: 0 },
    theme: 'dark',
    modeHint: null,
    fieldErrors: {},
    stepAlerts: [],
    toast: null,
    isLoading: false,
    seeAll: true,
    language: 'en',
    hoveredStation: null,
    pinnedStation: null,
    showInterrogationWindow: false,
    ...overrides,
  }) as UIState;

describe('modeHint', () => {
  it('sets text and optional meta', () => {
    const state = reducer(baseState(), setModeHint({ text: 'Editing regions', meta: '1 of 2 min.' }));
    expect(state.modeHint).toEqual({ text: 'Editing regions', meta: '1 of 2 min.' });
  });

  it('clears to null', () => {
    const withHint = baseState({ modeHint: { text: 'Drawing line' } });
    expect(reducer(withHint, clearModeHint()).modeHint).toBeNull();
  });
});

describe('fieldErrors', () => {
  it('sets one field by name without touching others', () => {
    const withOne = baseState({ fieldErrors: { start: 'Start is required' } });
    const state = reducer(withOne, setFieldError({ name: 'end', message: 'End must be later than Start' }));
    expect(state.fieldErrors).toEqual({ start: 'Start is required', end: 'End must be later than Start' });
  });

  it('clears one field by name, leaving others', () => {
    const withTwo = baseState({ fieldErrors: { start: 'a', end: 'b' } });
    expect(reducer(withTwo, clearFieldError('start')).fieldErrors).toEqual({ end: 'b' });
  });

  it('clears every field at once', () => {
    const withTwo = baseState({ fieldErrors: { start: 'a', end: 'b' } });
    expect(reducer(withTwo, clearAllFieldErrors()).fieldErrors).toEqual({});
  });
});

describe('stepAlerts', () => {
  it('appends an alert', () => {
    const state = reducer(baseState(), addStepAlert({ id: 'a', level: 'error', text: 'Bad thing' }));
    expect(state.stepAlerts).toEqual([{ id: 'a', level: 'error', text: 'Bad thing' }]);
  });

  it('replaces an existing alert with the same id instead of duplicating it', () => {
    const withOne = baseState({ stepAlerts: [{ id: 'a', level: 'warning', text: 'old' }] });
    const state = reducer(withOne, addStepAlert({ id: 'a', level: 'error', text: 'new' }));
    expect(state.stepAlerts).toEqual([{ id: 'a', level: 'error', text: 'new' }]);
  });

  it('clears one alert by id, leaving others', () => {
    const withTwo = baseState({
      stepAlerts: [
        { id: 'a', level: 'error', text: 'A' },
        { id: 'b', level: 'warning', text: 'B' },
      ],
    });
    expect(reducer(withTwo, clearStepAlert('a')).stepAlerts).toEqual([{ id: 'b', level: 'warning', text: 'B' }]);
  });

  it('clears every alert at once', () => {
    const withTwo = baseState({
      stepAlerts: [
        { id: 'a', level: 'error', text: 'A' },
        { id: 'b', level: 'warning', text: 'B' },
      ],
    });
    expect(reducer(withTwo, clearAllStepAlerts()).stepAlerts).toEqual([]);
  });
});

describe('toast', () => {
  it('shows a toast, with an optional action label', () => {
    const state = reducer(baseState(), showToast({ text: 'Table copied to clipboard' }));
    expect(state.toast).toEqual({ text: 'Table copied to clipboard', actionLabel: undefined });
  });

  it('replaces any toast already showing (one at a time)', () => {
    const withOne = baseState({ toast: { text: 'first' } });
    const state = reducer(withOne, showToast({ text: 'second', actionLabel: 'Undo' }));
    expect(state.toast).toEqual({ text: 'second', actionLabel: 'Undo' });
  });

  it('clears to null', () => {
    const withOne = baseState({ toast: { text: 'first' } });
    expect(reducer(withOne, clearToast()).toast).toBeNull();
  });
});

describe('pinnedStation', () => {
  it('pins a station from null', () => {
    const state = reducer(baseState(), toggleStationPin(3));
    expect(state.pinnedStation).toBe(3);
  });

  it('unpins when the same station is toggled again', () => {
    const pinned = baseState({ pinnedStation: 3 });
    expect(reducer(pinned, toggleStationPin(3)).pinnedStation).toBeNull();
  });

  it('switches the pin to a different station', () => {
    const pinned = baseState({ pinnedStation: 3 });
    expect(reducer(pinned, toggleStationPin(7)).pinnedStation).toBe(7);
  });

  it('setPinnedStation(null) always clears, regardless of toggle parity', () => {
    const pinned = baseState({ pinnedStation: 3 });
    expect(reducer(pinned, setPinnedStation(null)).pinnedStation).toBeNull();
  });
});
