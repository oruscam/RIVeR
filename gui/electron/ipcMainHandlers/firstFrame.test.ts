import path from 'path';

/** The window that existed when the handlers were registered, closed since then. */
const closedWindow = {
  webContents: {
    send: jest.fn(() => {
      throw new TypeError('Object has been destroyed');
    }),
  },
};

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  BrowserWindow: { getAllWindows: jest.fn(() => [closedWindow]) },
}));

jest.mock('../main', () => ({
  PROJECT_CONFIG: {
    projectDirectory: '/project',
    videoPath: '/video.mp4',
    settingsPath: '/project/settings.json',
    logsPath: '/project/river.log',
    xsectionsPath: '',
    filePrefix: '',
  },
}));

jest.mock('./utils/extractFrames', () => ({
  extractFrames: jest.fn(() => Promise.resolve({ fileNames: ['0000000000.jpg', '0000000001.jpg'] })),
}));
jest.mock('./utils/clearResultsPiv', () => ({ clearResultsPiv: jest.fn() }));
jest.mock('./utils/clearCrossSections', () => ({ clearCrossSections: jest.fn() }));
jest.mock('fs', () => ({ existsSync: () => false, promises: { rm: jest.fn() } }));

import { ipcMain } from 'electron';
import { firstFrame } from './firstFrame';

describe('first-frame', () => {
  it('sends the frames to the window that asked, also after the first window was closed', async () => {
    firstFrame(jest.fn() as never);
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(([channel]) => channel === 'first-frame')![1];
    const sender = { send: jest.fn() };

    const result = await handler({ sender }, {});

    expect(sender.send).toHaveBeenCalledWith('all-frames', [
      path.join('/project/frames', '0000000000.jpg'),
      path.join('/project/frames', '0000000001.jpg'),
    ]);
    expect(result).toEqual({ initial_frame: path.join('/project/frames', '0000000000.jpg') });
  });
});
