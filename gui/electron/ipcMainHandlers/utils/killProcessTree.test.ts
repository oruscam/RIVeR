import { ChildProcess, spawn, spawnSync } from 'child_process';
import { killProcessTree } from './killProcessTree';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  spawnSync: jest.fn(() => ({ status: 0 })),
}));

const IDLE = 'setInterval(() => {}, 1000);';
const IGNORES_SIGTERM = `process.on('SIGTERM', () => {}); process.stdout.write('ready'); ${IDLE}`;
const spawned: number[] = [];

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitUntilGone = async (pid: number, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (isAlive(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
  return !isAlive(pid);
};

/** A parent that starts one worker, like analyze-all and its pool, and reports the worker's pid. */
const spawnTree = (workerCode: string) =>
  new Promise<{ parent: ChildProcess; worker: number }>((resolve) => {
    const parentCode = `
      const { spawn } = require('child_process');
      const worker = spawn(process.execPath, ['-e', ${JSON.stringify(workerCode)}], { stdio: ['ignore', 'pipe', 'ignore'] });
      const report = () => process.stdout.write(String(worker.pid));
      ${workerCode === IDLE ? 'report();' : "worker.stdout.once('data', report);"}
      ${IDLE}`;
    const parent = spawn(process.execPath, ['-e', parentCode], { detached: true });
    parent.stdout!.once('data', (data) => {
      const worker = Number(data.toString());
      spawned.push(parent.pid!, worker);
      resolve({ parent, worker });
    });
  });

const describeUnix = process.platform === 'win32' ? describe.skip : describe;

describeUnix('killProcessTree on macOS and Linux', () => {
  afterEach(() => {
    spawned
      .splice(0)
      .filter(isAlive)
      .forEach((pid) => process.kill(pid, 'SIGKILL'));
  });

  it('ends the process and the workers it started', async () => {
    const { parent, worker } = await spawnTree(IDLE);

    killProcessTree(parent);

    expect(await waitUntilGone(parent.pid!, 2000)).toBe(true);
    expect(await waitUntilGone(worker, 2000)).toBe(true);
  });

  it('force kills a worker that ignores the first signal', async () => {
    const { parent, worker } = await spawnTree(IGNORES_SIGTERM);

    killProcessTree(parent);

    expect(await waitUntilGone(worker, 6000)).toBe(true);
  }, 10000);

  it('kills at once when forced, as on app quit', async () => {
    const { parent, worker } = await spawnTree(IGNORES_SIGTERM);

    killProcessTree(parent, true);

    expect(await waitUntilGone(worker, 1000)).toBe(true);
  });

  it('does nothing when the process has already ended', async () => {
    const { parent, worker } = await spawnTree(IDLE);
    killProcessTree(parent, true);
    await waitUntilGone(worker, 2000);
    await waitUntilGone(parent.pid!, 2000);

    expect(() => killProcessTree(parent, true)).not.toThrow();
  });
});

describe('killProcessTree on Windows', () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
  beforeAll(() => Object.defineProperty(process, 'platform', { value: 'win32' }));
  afterAll(() => Object.defineProperty(process, 'platform', platform));

  it('asks taskkill to end the whole tree', () => {
    const child = { pid: 4321, kill: jest.fn() } as unknown as ChildProcess;

    killProcessTree(child);

    expect(spawnSync).toHaveBeenCalledWith('taskkill', ['/pid', '4321', '/T', '/F']);
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('still kills the process itself if taskkill fails', () => {
    (spawnSync as jest.Mock).mockReturnValueOnce({ status: 1 });
    const child = { pid: 4321, kill: jest.fn() } as unknown as ChildProcess;

    killProcessTree(child);

    expect(child.kill).toHaveBeenCalled();
  });
});
