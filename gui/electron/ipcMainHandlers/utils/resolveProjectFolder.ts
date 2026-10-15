/**
 * Where load-project reads from: `args.directory` when Home's recent tiles pass
 * one (Phase 6f, amendment A14), otherwise whatever the folder picker returns.
 * The settings.json check that follows is the same for both paths, so a recent
 * project deleted since Home mounted fails exactly like a wrong pick does.
 */
export async function resolveProjectFolder(
  args: unknown,
  pick: () => Promise<string | null>
): Promise<string | null> {
  const directory =
    typeof args === 'object' && args !== null ? (args as { directory?: unknown }).directory : undefined;
  if (typeof directory === 'string' && directory.trim() !== '') return directory;
  return pick();
}
