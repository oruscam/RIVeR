jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

jest.mock('../main', () => ({
  PROJECT_CONFIG: { xsectionsPath: '/fake/xsections.json' },
}));

// Automock (`jest.mock('fs')`) doesn't reach the `fs.promises` getter, so the
// registered-handler tests below need `readFile`/`writeFile` as real jest.fn()s.
jest.mock('fs', () => ({
  promises: { readFile: jest.fn(), writeFile: jest.fn() },
}));

import { ipcMain } from 'electron';
import * as fs from 'fs';
import { applyManualAngles, setStivManualAngles } from './setStivManualAngles';

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

describe('the registered set-stiv-manual-angles handler', () => {
  // Capture the handler setStivManualAngles() registers, the same way the mocked
  // ipcMain.handle call receives it — this exercises the real read/parse/write
  // path, not just the pure applyManualAngles merge.
  const getHandler = () => {
    setStivManualAngles();
    const call = (ipcMain.handle as jest.Mock).mock.calls.find(
      ([channel]) => channel === 'set-stiv-manual-angles'
    );
    return call[1];
  };

  it('parses xsections.json even when it contains literal NaN tokens', async () => {
    const withNaN = JSON.stringify({
      CS_default_1: { num_stations: 1, displacement_x: [1] },
    }).replace('[1]', '[NaN]');
    (fs.promises.readFile as jest.Mock).mockResolvedValue(withNaN);
    const written: string[] = [];
    (fs.promises.writeFile as jest.Mock).mockImplementation((_path, content) => {
      written.push(content as string);
      return Promise.resolve();
    });

    const handler = getHandler();
    await expect(handler(null, { sectionName: 'CS_default_1', angles: [45] })).resolves.toBeUndefined();

    expect(written).toHaveLength(1);
    const result = JSON.parse(written[0]);
    expect(result.CS_default_1.stiv_angle_manual_profile).toEqual([45]);
    // The pre-existing NaN in an unrelated field must survive the round trip as
    // `null` — JS's native JSON.stringify (unlike Python's json.dumps) has no
    // literal-NaN output, so `null` is the correct, non-corrupted result. This
    // confirms the sanitized field wasn't dropped or otherwise mangled.
    expect(result.CS_default_1.displacement_x).toEqual([null]);
  });
});
