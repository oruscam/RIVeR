/**
 * Recent projects on Home (spec §4/6f, amendment A14).
 *
 * Stored in renderer localStorage, like `language` and `unitSystem`. Every
 * function here is pure apart from the Storage it is handed, so Jest can test
 * it without a DOM. Storage failures (private mode, quota) are swallowed:
 * recents are a convenience and must never break opening a project.
 */
export type FootageType = 'uav' | 'oblique' | 'ipcam';

export interface RecentProject {
  directory: string;
  type: FootageType;
  /** Epoch milliseconds of the last create or load. */
  openedAt: number;
}

export const RECENT_PROJECTS_KEY = 'river-recent-projects';
/** More are kept than shown, so dropping a moved project still leaves three. */
export const MAX_STORED_RECENT_PROJECTS = 6;
export const SHOWN_RECENT_PROJECTS = 3;

/** Same English copy as FootageMode's tiles; used as the t() defaultValue. */
export const FOOTAGE_LABELS: Record<FootageType, string> = {
  uav: 'Drone',
  oblique: 'Oblique',
  ipcam: 'Fixed camera',
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const isFootageType = (v: unknown): v is FootageType => v === 'uav' || v === 'oblique' || v === 'ipcam';

const isRecentProject = (v: unknown): v is RecentProject => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.directory === 'string' &&
    r.directory !== '' &&
    isFootageType(r.type) &&
    typeof r.openedAt === 'number' &&
    Number.isFinite(r.openedAt)
  );
};

export const parseRecentProjects = (raw: string | null): RecentProject[] => {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter(isRecentProject)
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, MAX_STORED_RECENT_PROJECTS);
};

export const readRecentProjects = (storage: StorageLike): RecentProject[] => {
  try {
    return parseRecentProjects(storage.getItem(RECENT_PROJECTS_KEY));
  } catch {
    return [];
  }
};

export const writeRecentProjects = (storage: StorageLike, list: readonly RecentProject[]): void => {
  try {
    storage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(list.slice(0, MAX_STORED_RECENT_PROJECTS)));
  } catch {
    // Storage full or blocked: recents are a convenience, not a requirement.
  }
};

export const withRecentProject = (list: readonly RecentProject[], entry: RecentProject): RecentProject[] =>
  [entry, ...list.filter((r) => r.directory !== entry.directory)].slice(0, MAX_STORED_RECENT_PROJECTS);

export const recordRecentProject = (storage: StorageLike, directory: string, type: string, now: number): void => {
  if (!directory || !isFootageType(type)) return;
  writeRecentProjects(storage, withRecentProject(readRecentProjects(storage), { directory, type, openedAt: now }));
};

export const keepExisting = (list: readonly RecentProject[], existing: readonly string[]): RecentProject[] => {
  const present = new Set(existing);
  return list.filter((r) => present.has(r.directory));
};

/** The folder name, for POSIX and Windows paths, ignoring a trailing separator. */
export const projectName = (directory: string): string => {
  const parts = directory.split(/[\\/]+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : directory;
};

/**
 * The parent folder's name. New projects live in <video name>/<YYYYMMDDTHHMM>,
 * so this names the footage the timestamped project was made from. '' when
 * the project sits at a root (or a drive letter) and has no meaningful parent.
 */
export const videoFolderName = (directory: string): string => {
  const parts = directory.split(/[\\/]+/).filter(Boolean);
  if (parts.length < 2) return '';
  const parent = parts[parts.length - 2];
  return /^[A-Za-z]:$/.test(parent) ? '' : parent;
};

/** "28 Jun" inside the current year, "3 Mar 2025" otherwise, in the UI language. */
export const formatOpenedDate = (openedAt: number, now: number, locale: string): string => {
  const sameYear = new Date(openedAt).getFullYear() === new Date(now).getFullYear();
  const options: Intl.DateTimeFormatOptions = sameYear
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  try {
    return new Intl.DateTimeFormat(locale, options).format(openedAt);
  } catch {
    return new Intl.DateTimeFormat('en', options).format(openedAt);
  }
};
