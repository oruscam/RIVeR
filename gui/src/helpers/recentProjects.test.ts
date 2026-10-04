import {
  FOOTAGE_LABELS,
  MAX_STORED_RECENT_PROJECTS,
  RECENT_PROJECTS_KEY,
  type RecentProject,
  formatOpenedDate,
  keepExisting,
  parseRecentProjects,
  projectName,
  readRecentProjects,
  recordRecentProject,
  videoFolderName,
  withRecentProject,
  writeRecentProjects,
} from './recentProjects';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};

const p = (directory: string, openedAt: number, type: RecentProject['type'] = 'uav'): RecentProject => ({
  directory,
  type,
  openedAt,
});

describe('parseRecentProjects', () => {
  it('returns [] for null, empty, non-JSON and non-array input', () => {
    expect(parseRecentProjects(null)).toEqual([]);
    expect(parseRecentProjects('')).toEqual([]);
    expect(parseRecentProjects('{not json')).toEqual([]);
    expect(parseRecentProjects('{"directory":"/a"}')).toEqual([]);
  });

  it('drops entries with a missing directory, unknown type or non-numeric date', () => {
    const raw = JSON.stringify([
      p('/ok', 3),
      { directory: '', type: 'uav', openedAt: 1 },
      { directory: '/t', type: 'satellite', openedAt: 1 },
      { directory: '/d', type: 'uav', openedAt: 'yesterday' },
      { directory: '/n', type: 'uav', openedAt: null },
      null,
      'string',
    ]);
    expect(parseRecentProjects(raw)).toEqual([p('/ok', 3)]);
  });

  it('sorts newest first and caps at MAX_STORED_RECENT_PROJECTS', () => {
    const many = Array.from({ length: 9 }, (_, i) => p(`/p${i}`, i));
    const out = parseRecentProjects(JSON.stringify(many));
    expect(out).toHaveLength(MAX_STORED_RECENT_PROJECTS);
    expect(out[0].directory).toBe('/p8');
  });
});

describe('withRecentProject', () => {
  it('puts the entry first and removes an older copy of the same directory', () => {
    const list = [p('/a', 2), p('/b', 1)];
    expect(withRecentProject(list, p('/b', 9, 'ipcam'))).toEqual([p('/b', 9, 'ipcam'), p('/a', 2)]);
  });

  it('caps the list', () => {
    const list = Array.from({ length: MAX_STORED_RECENT_PROJECTS }, (_, i) => p(`/p${i}`, 10 - i));
    const out = withRecentProject(list, p('/new', 99));
    expect(out).toHaveLength(MAX_STORED_RECENT_PROJECTS);
    expect(out[0].directory).toBe('/new');
  });
});

describe('storage round trip', () => {
  it('recordRecentProject writes under RECENT_PROJECTS_KEY and readRecentProjects reads it back', () => {
    const s = fakeStorage();
    recordRecentProject(s, '/x/Station_04', 'ipcam', 100);
    expect(JSON.parse(s.data[RECENT_PROJECTS_KEY])).toEqual([p('/x/Station_04', 100, 'ipcam')]);
    expect(readRecentProjects(s)).toEqual([p('/x/Station_04', 100, 'ipcam')]);
  });

  it('recordRecentProject ignores an empty directory or an unknown footage type', () => {
    const s = fakeStorage();
    recordRecentProject(s, '', 'uav', 1);
    recordRecentProject(s, '/a', 'satellite', 1);
    expect(s.data[RECENT_PROJECTS_KEY]).toBeUndefined();
  });

  it('readRecentProjects survives a storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readRecentProjects(throwing)).toEqual([]);
    expect(() => writeRecentProjects(throwing, [p('/a', 1)])).not.toThrow();
  });
});

describe('keepExisting', () => {
  it('keeps only directories reported as existing, in their original order', () => {
    const list = [p('/a', 3), p('/b', 2), p('/c', 1)];
    expect(keepExisting(list, ['/c', '/a'])).toEqual([p('/a', 3), p('/c', 1)]);
  });

  it('keeps nothing when nothing exists', () => {
    expect(keepExisting([p('/a', 1)], [])).toEqual([]);
  });
});

describe('projectName', () => {
  it.each([
    ['/Users/antoine/River/Yanuncay_CS1', 'Yanuncay_CS1'],
    ['/Users/antoine/River/Yanuncay_CS1/', 'Yanuncay_CS1'],
    ['C:\\Users\\x\\River\\Station_04', 'Station_04'],
    ['C:\\Users\\x\\River\\Station_04\\', 'Station_04'],
    ['Solo', 'Solo'],
  ])('%s -> %s', (dir, name) => {
    expect(projectName(dir)).toBe(name);
  });
});

describe('videoFolderName', () => {
  it.each([
    ['/Users/antoine/River/Yanuncay/20261004T1432', 'Yanuncay'],
    ['/Users/antoine/River/Yanuncay/20261004T1432/', 'Yanuncay'],
    ['C:\\Users\\x\\River\\Station_04\\20261004T1432', 'Station_04'],
    ['C:\\20261004T1432', ''],
    ['/20261004T1432', ''],
    ['Solo', ''],
  ])('%s -> %j', (dir, name) => {
    expect(videoFolderName(dir)).toBe(name);
  });
});

describe('formatOpenedDate', () => {
  const now = Date.UTC(2026, 9, 1, 12);

  it('omits the year inside the current year', () => {
    expect(formatOpenedDate(Date.UTC(2026, 5, 28, 12), now, 'en-GB')).toBe('28 Jun');
  });

  it('adds the year for an earlier year', () => {
    expect(formatOpenedDate(Date.UTC(2025, 2, 3, 12), now, 'en-GB')).toBe('3 Mar 2025');
  });

  it('localises', () => {
    expect(formatOpenedDate(Date.UTC(2026, 5, 28, 12), now, 'en-US')).toBe('Jun 28');
  });

  it('falls back to English for an invalid locale tag', () => {
    expect(() => formatOpenedDate(Date.UTC(2026, 5, 28, 12), now, '!!')).not.toThrow();
    expect(formatOpenedDate(Date.UTC(2026, 5, 28, 12), now, '!!')).toMatch(/28/);
  });
});

it('labels every footage type with the copy FootageMode uses', () => {
  expect(FOOTAGE_LABELS).toEqual({ uav: 'Drone', oblique: 'Oblique', ipcam: 'Fixed camera' });
});
