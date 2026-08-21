jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

jest.mock('../main', () => ({
  PROJECT_CONFIG: { xsectionsPath: '/fake/xsections.json' },
}));

jest.mock('fs');

import { applyManualAngles } from './setStivManualAngles';

describe('applyManualAngles', () => {
  const parsed = () => ({
    CS_default_1: { num_stations: 3, stiv_angle_profile: [10, 20, 30] },
    CS_default_2: { num_stations: 3 },
    summary: { mean: {} },
  });

  it('writes the array onto the named section only', () => {
    const out = applyManualAngles(parsed(), 'CS_default_1', [null, 45, null]);
    expect(out.CS_default_1.stiv_angle_manual_profile).toEqual([null, 45, null]);
    expect(out.CS_default_2.stiv_angle_manual_profile).toBeUndefined();
  });

  it('leaves every other key on the section untouched', () => {
    const out = applyManualAngles(parsed(), 'CS_default_1', [null, 45, null]);
    expect(out.CS_default_1.stiv_angle_profile).toEqual([10, 20, 30]);
    expect(out.CS_default_1.num_stations).toBe(3);
  });

  it('removes the key entirely when no station is tuned', () => {
    const withOverride = applyManualAngles(parsed(), 'CS_default_1', [null, 45, null]);
    const cleared = applyManualAngles(withOverride, 'CS_default_1', [null, null, null]);
    expect('stiv_angle_manual_profile' in cleared.CS_default_1).toBe(false);
  });

  it('is a no-op for an unknown section name', () => {
    const out = applyManualAngles(parsed(), 'nope', [null, 45, null]);
    expect(out.CS_default_1.stiv_angle_manual_profile).toBeUndefined();
  });

  it('is a no-op for a prototype-chain property that is not an own key', () => {
    const out = applyManualAngles(parsed(), '__proto__', [45]);
    expect((Object.prototype as Record<string, unknown>).stiv_angle_manual_profile).toBeUndefined();
    expect(out.CS_default_1.stiv_angle_manual_profile).toBeUndefined();
  });

  it('never touches summary', () => {
    const out = applyManualAngles(parsed(), 'summary', [null, 45, null]);
    expect((out.summary as Record<string, unknown>).stiv_angle_manual_profile).toBeUndefined();
  });
});
