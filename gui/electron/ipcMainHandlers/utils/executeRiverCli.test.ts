import { EventEmitter } from 'events';

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

const children: FakeChild[] = [];

jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    const child = new FakeChild();
    children.push(child);
    return child;
  }),
}));

jest.mock('./killProcessTree', () => ({ killProcessTree: jest.fn() }));

jest.mock('electron', () => ({
  app: { on: jest.fn(), exit: jest.fn() },
  ipcMain: { handle: jest.fn() },
  webContents: { getAllWebContents: () => [] },
}));

jest.mock('../../main', () => ({ PROJECT_CONFIG: { pythonPath: 'python' } }));

jest.mock('fs', () => ({ promises: { appendFile: jest.fn(() => Promise.resolve()) } }));

import { spawn } from 'child_process';
import { app } from 'electron';
import { executeRiverCli, killRiverCli } from './executeRiverCli';
import { killProcessTree } from './killProcessTree';

// Registered once, when the module loads.
const quit = (app.on as jest.Mock).mock.calls.find(([event]) => event === 'before-quit')![1];

const finish = (child: FakeChild) => {
  child.stdout.emit('data', '{"data": {}, "error": {}}');
  child.emit('close', 0);
};

describe('executeRiverCli process tracking', () => {
  beforeEach(() => {
    children.length = 0;
    jest.clearAllMocks();
  });

  it('lets Stop kill a tracked (analysis) call', async () => {
    const call = executeRiverCli(['analyze-all'], 'text', false, 'log');
    await killRiverCli();
    expect(killProcessTree).toHaveBeenCalledWith(children[0], false);
    children[0].emit('close', null);
    await call;
  });

  it('does not let Stop kill an untracked (status) call', async () => {
    const call = executeRiverCli(['stiv-status'], 'json', false, 'log', false);
    expect(await killRiverCli()).toBe(false);
    expect(killProcessTree).not.toHaveBeenCalled();
    finish(children[0]);
    await call;
  });

  it('does not kill a running analysis when a status call finishes', async () => {
    const analysis = executeRiverCli(['analyze-all'], 'text', false, 'log');
    const status = executeRiverCli(['iwave-defaults'], 'json', false, 'log', false);
    finish(children[1]);
    await status;
    expect(killProcessTree).not.toHaveBeenCalled();
    // Stop still reaches the analysis afterwards
    await killRiverCli();
    expect(killProcessTree).toHaveBeenCalledWith(children[0], false);
    children[0].emit('close', null);
    await analysis;
  });

  it('forgets a tracked call once it has finished', async () => {
    const call = executeRiverCli(['analyze-all'], 'text', false, 'log');
    finish(children[0]);
    await call;
    expect(await killRiverCli()).toBe(false);
  });

  it('starts only analysis calls in their own process group, so Stop can end the workers', async () => {
    const analysis = executeRiverCli(['analyze-all'], 'text', false, 'log');
    const status = executeRiverCli(['stiv-status'], 'json', false, 'log', false);

    const options = (spawn as jest.Mock).mock.calls.map((call) => call[2]);
    expect(options).toEqual([{ detached: process.platform !== 'win32' }, { detached: false }]);

    finish(children[0]);
    finish(children[1]);
    await Promise.all([analysis, status]);
  });

  it('reports a stopped run as killed, also when it exits with a code as on Windows', async () => {
    const call = executeRiverCli(['analyze-all'], 'text', false, 'log');
    await killRiverCli();
    children[0].emit('close', 1);

    expect((await call).error).toEqual({ message: 'Process was killed' });
  });

  it('kills the running analysis at once when the app quits', async () => {
    const call = executeRiverCli(['analyze-all'], 'text', false, 'log');
    await quit();

    expect(killProcessTree).toHaveBeenCalledWith(children[0], true);
    expect(app.exit).toHaveBeenCalled();
    children[0].emit('close', null);
    await call;
  });
});
