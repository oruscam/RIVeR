const mockHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: any[]) => any) => {
      mockHandlers[channel] = fn;
    },
  },
}));

jest.mock('../main', () => ({
  PROJECT_CONFIG: {
    framesPath: '/p/frames',
    xsectionsPath: '/p/xsections.json',
    matrixPath: '/p/transformation_matrix.json',
    bboxPath: '/p/bbox.json',
    settingsPath: '/p/settings.json',
    logsPath: '/p/river.log',
  },
}));

jest.mock('fs', () => ({
  existsSync: () => true,
  promises: {
    readFile: jest.fn(() => Promise.resolve(JSON.stringify({ video: { fps: 30 }, video_range: { step: 2 } }))),
  },
}));

import { getIwaveDefaults } from './getIwaveDefaults';

describe('get-iwave-defaults', () => {
  it('calls iwave-defaults untracked and maps the answer', async () => {
    const riverCli = jest.fn(() =>
      Promise.resolve({
        data: {
          window_size: 2.2,
          smax: 3,
          flow_type: 'waves',
          estimated_from: 'none',
          clip_s: 4,
          iwave_s: 4,
          short_clip: true,
        },
        error: {},
      })
    );
    getIwaveDefaults(riverCli);
    const result = await mockHandlers['get-iwave-defaults']({});
    expect(riverCli).toHaveBeenCalledWith(
      [
        'iwave-defaults',
        '--step',
        2,
        '--fps',
        30,
        '--bbox',
        '/p/bbox.json',
        '/p/frames',
        '/p/xsections.json',
        '/p/transformation_matrix.json',
      ],
      'json',
      false,
      '/p/river.log',
      false
    );
    expect(result).toEqual({
      windowSize: 2.2,
      smax: 3,
      flowType: 'waves',
      estimatedFrom: 'none',
      clipS: 4,
      iwaveS: 4,
      shortClip: true,
      isFallback: false,
    });
  });

  it('returns null when the CLI reports an error', async () => {
    const riverCli = jest.fn(() => Promise.resolve({ data: {}, error: { message: 'No frames' } }));
    getIwaveDefaults(riverCli);
    expect(await mockHandlers['get-iwave-defaults']({})).toBeNull();
  });

  it('returns null when the call throws', async () => {
    const riverCli = jest.fn(() => Promise.reject(new Error('spawn failed')));
    getIwaveDefaults(riverCli);
    expect(await mockHandlers['get-iwave-defaults']({})).toBeNull();
  });
});
