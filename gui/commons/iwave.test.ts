import {
  IWAVE_FALLBACK_DEFAULTS,
  buildIwaveArgs,
  freezeIwaveManual,
  fromSettingsIwaveManual,
  getShownIwaveValues,
  hasIwaveValueChanged,
  isIwaveWindowStale,
  parseIwaveDefaults,
  parseIwaveNumber,
  toSettingsIwaveManual,
  type IwaveDefaults,
  type IwaveManual,
} from './iwave';

const defaults: IwaveDefaults = {
  windowSize: 2.4857,
  smax: 3.2,
  flowType: 'waves',
  estimatedFrom: 'lspiv+stiv',
  clipS: 18,
  iwaveS: 17.07,
  shortClip: false,
  isFallback: false,
};
const manual: IwaveManual = { flowType: 'no-waves', windowSize: 4, smax: 2 };

describe('parseIwaveDefaults', () => {
  it('maps the CLI payload', () => {
    expect(
      parseIwaveDefaults({
        window_size: 2.5,
        smax: 4,
        flow_type: 'no-waves',
        estimated_from: 'stiv',
        clip_s: 3.2,
        iwave_s: 3.2,
        short_clip: true,
      })
    ).toEqual({
      windowSize: 2.5,
      smax: 4,
      flowType: 'no-waves',
      estimatedFrom: 'stiv',
      clipS: 3.2,
      iwaveS: 3.2,
      shortClip: true,
      isFallback: false,
    });
  });

  it('falls back on missing or malformed fields', () => {
    expect(parseIwaveDefaults(null)).toEqual(IWAVE_FALLBACK_DEFAULTS);
    expect(parseIwaveDefaults({ window_size: 'x', flow_type: 'fast' })).toEqual(IWAVE_FALLBACK_DEFAULTS);
  });
});

describe('buildIwaveArgs', () => {
  it('sends nothing in automatic mode', () => {
    expect(buildIwaveArgs(true, null)).toEqual([]);
  });
  it('sends all three values in manual mode', () => {
    expect(buildIwaveArgs(true, manual)).toEqual([
      '--iwave-flow-type',
      'no-waves',
      '--iwave-window-size',
      4,
      '--iwave-smax',
      2,
    ]);
  });
  it('sends nothing when IWaVE is off', () => {
    expect(buildIwaveArgs(false, manual)).toEqual([]);
  });
});

describe('parseIwaveNumber', () => {
  it('accepts positive finite numbers', () => {
    expect(parseIwaveNumber('windowSize', ' 3.5 ')).toBe(3.5);
    expect(parseIwaveNumber('smax', '10')).toBe(10);
  });
  it('refuses empty, non-numeric, non-positive and non-finite input', () => {
    for (const raw of ['', 'abc', '0', '-1', 'NaN', 'Infinity']) {
      expect(parseIwaveNumber('windowSize', raw)).toBeNull();
    }
  });
  it('caps max velocity at 10 m/s', () => {
    expect(parseIwaveNumber('smax', '10.01')).toBeNull();
    expect(parseIwaveNumber('windowSize', '12')).toBe(12);
  });
});

describe('hasIwaveValueChanged', () => {
  it('ignores a value that is only the 2-decimal display of the current one', () => {
    expect(hasIwaveValueChanged(2.49, 2.4857)).toBe(false);
  });
  it('detects a real edit', () => {
    expect(hasIwaveValueChanged(2.5, 2.4857)).toBe(true);
  });
});

describe('getShownIwaveValues and freezeIwaveManual', () => {
  it('shows the defaults in automatic mode and the manual values otherwise', () => {
    expect(getShownIwaveValues(null, defaults)).toEqual({ flowType: 'waves', windowSize: 2.4857, smax: 3.2 });
    expect(getShownIwaveValues(manual, defaults)).toEqual(manual);
  });
  it('freezes all three shown values when one is edited in automatic mode', () => {
    expect(freezeIwaveManual(null, defaults, { smax: 6 })).toEqual({
      flowType: 'waves',
      windowSize: 2.4857,
      smax: 6,
    });
  });
  it('keeps the other manual values when editing in manual mode', () => {
    expect(freezeIwaveManual(manual, defaults, { flowType: 'waves' })).toEqual({ ...manual, flowType: 'waves' });
  });
});

describe('isIwaveWindowStale', () => {
  it('is never stale in automatic mode', () => {
    expect(isIwaveWindowStale(null, defaults)).toBe(false);
  });
  it('flags a frozen window more than 20 % away from the automatic one', () => {
    const d = { ...defaults, windowSize: 2 };
    expect(isIwaveWindowStale({ ...manual, windowSize: 2.39 }, d)).toBe(false);
    expect(isIwaveWindowStale({ ...manual, windowSize: 2.41 }, d)).toBe(true);
    expect(isIwaveWindowStale({ ...manual, windowSize: 1.59 }, d)).toBe(true);
  });
  it('never flags stale against the untouched fallback (no real fetch yet, or the fetch failed)', () => {
    // The fallback's 2.5 m window is not a real automatic value for this project; comparing
    // against it would fire on every mount (before the IPC answers) and forever on failure.
    expect(isIwaveWindowStale({ ...manual, windowSize: 0.5 }, IWAVE_FALLBACK_DEFAULTS)).toBe(false);
  });
});

describe('settings round trip', () => {
  it('writes snake_case and reads it back', () => {
    const saved = toSettingsIwaveManual(manual);
    expect(saved).toEqual({ flow_type: 'no-waves', window_size: 4, smax: 2 });
    expect(fromSettingsIwaveManual(saved)).toEqual(manual);
  });
  it('treats missing or null as automatic', () => {
    expect(toSettingsIwaveManual(null)).toBeNull();
    expect(fromSettingsIwaveManual(undefined)).toBeNull();
    expect(fromSettingsIwaveManual(null)).toBeNull();
  });
  it('treats corrupt values as automatic', () => {
    expect(fromSettingsIwaveManual('manual')).toBeNull();
    expect(fromSettingsIwaveManual({ flow_type: 'fast', window_size: 2, smax: 2 })).toBeNull();
    expect(fromSettingsIwaveManual({ flow_type: 'waves', window_size: -1, smax: 2 })).toBeNull();
    expect(fromSettingsIwaveManual({ flow_type: 'waves', window_size: 2, smax: 11 })).toBeNull();
  });
});
