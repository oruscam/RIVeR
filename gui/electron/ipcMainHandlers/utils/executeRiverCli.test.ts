import { EventEmitter } from 'events';

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = jest.fn();
}

const children: FakeChild[] = [];

jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    const child = new FakeChild();
    children.push(child);
    return child;
  }),
}));

jest.mock('electron', () => ({
  app: { on: jest.fn(), exit: jest.fn() },
  ipcMain: { handle: jest.fn() },
  webContents: { getAllWebContents: () => [] },
}));

jest.mock('../../main', () => ({ PROJECT_CONFIG: { pythonPath: 'python' } }));

jest.mock('fs', () => ({ promises: { appendFile: jest.fn(() => Promise.resolve()) } }));

import { executeRiverCli, killRiverCli } from './executeRiverCli';

const finish = (child: FakeChild) => {
  child.stdout.emit('data', '{"data": {}, "error": {}}');
  child.emit('close', 0);
};

describe('executeRiverCli process tracking', () => {
  beforeEach(() => {
    children.length = 0;
  });

  it('lets Stop kill a tracked (analysis) call', async () => {
    const call = executeRiverCli(['analyze-all'], 'text', false, 'log');
    await killRiverCli();
    expect(children[0].kill).toHaveBeenCalled();
    children[0].emit('close', null);
    await call;
  });

  it('does not let Stop kill an untracked (status) call', async () => {
    const call = executeRiverCli(['stiv-status'], 'json', false, 'log', false);
    expect(await killRiverCli()).toBe(false);
    expect(children[0].kill).not.toHaveBeenCalled();
    finish(children[0]);
    await call;
  });

  it('does not kill a running analysis when a status call finishes', async () => {
    const analysis = executeRiverCli(['analyze-all'], 'text', false, 'log');
    const status = executeRiverCli(['iwave-defaults'], 'json', false, 'log', false);
    finish(children[1]);
    await status;
    expect(children[0].kill).not.toHaveBeenCalled();
    // Stop still reaches the analysis afterwards
    await killRiverCli();
    expect(children[0].kill).toHaveBeenCalled();
    children[0].emit('close', null);
    await analysis;
  });

  it('forgets a tracked call once it has finished', async () => {
    const call = executeRiverCli(['analyze-all'], 'text', false, 'log');
    finish(children[0]);
    await call;
    expect(await killRiverCli()).toBe(false);
  });
});
