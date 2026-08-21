const PLAIN_MARKER_PREFIXES = ['Extracting', 'Stabilizing', 'PIV:', 'STIV:', 'iWave:'];

/**
 * Decides which stderr lines from a river-cli run must bypass the caller's
 * output throttle so a stage/phase transition is never silently dropped.
 * Recognizes the plain-text phase markers (Extracting/Stabilizing frames,
 * and the PIV:/STIV:/iWave: markers from orchestrator.py's _log calls) and
 * the first tqdm line of a new `desc` (tqdm's own bar label, e.g. "STIV").
 *
 * `message` may contain multiple lines from a single stderr chunk. tqdm
 * overwrites its progress line in place using '\r', so several progress-bar
 * updates (and a following plain marker) can arrive packed into one chunk
 * separated by carriage returns rather than newlines — both are split as
 * line boundaries. Returns every matching line found in the chunk, in
 * document order (not just the first), and the `desc` to pass as
 * `previousDesc` on the next call (unchanged by plain markers — only a
 * tqdm line updates it).
 */
export function detectPhaseTransition(
  message: string,
  previousDesc: string
): { phaseLines: string[]; desc: string } {
  const lines = message
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let desc = previousDesc;
  const phaseLines: string[] = [];

  for (const line of lines) {
    // Check for tqdm format first (has percentage and progress bar)
    const tqdmMatch = line.match(/^([^:|]+):\s*\d+%\|/);
    if (tqdmMatch) {
      const lineDesc = tqdmMatch[1].trim();
      if (lineDesc !== desc) {
        phaseLines.push(line);
        desc = lineDesc;
      }
      continue;
    }

    // Check for plain text markers (no tqdm progress bar)
    if (PLAIN_MARKER_PREFIXES.some((prefix) => line.startsWith(prefix))) {
      phaseLines.push(line);
      continue;
    }
  }

  return { phaseLines, desc };
}
