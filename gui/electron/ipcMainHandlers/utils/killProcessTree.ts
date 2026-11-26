import { ChildProcess, spawnSync } from 'child_process';

const FORCE_KILL_DELAY_MS = 3000;

/**
 * Ends a process together with every process it started, such as the PIV pool workers, which
 * would otherwise keep running. On macOS and Linux the child must have been spawned with
 * `detached: true`, so that it leads its own process group.
 *
 * @param child - The process to end.
 * @param force - Kill at once, for app quit, where no later follow-up can run. (default: false)
 */
function killProcessTree(child: ChildProcess, force: boolean = false): void {
  const { pid } = child;
  if (pid === undefined) return;

  if (process.platform === 'win32') {
    // /T includes the whole tree. Synchronous, so it also completes while the app quits.
    const { status } = spawnSync('taskkill', ['/pid', String(pid), '/T', '/F']);
    if (status !== 0) child.kill();
    return;
  }

  signalGroup(pid, force ? 'SIGKILL' : 'SIGTERM');
  if (!force) setTimeout(() => signalGroup(pid, 'SIGKILL'), FORCE_KILL_DELAY_MS).unref();
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    // A negative pid addresses the whole process group.
    process.kill(-pid, signal);
  } catch (error) {
    // ESRCH: nothing of the group is left. Anything else must not crash the main process.
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH')
      console.log(`Could not stop process group ${pid}:`, error);
  }
}

export { killProcessTree };
