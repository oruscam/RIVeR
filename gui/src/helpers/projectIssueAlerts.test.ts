import { projectIssueAlerts } from './projectIssueAlerts';

// Echoes the key and its values so the test reads what each card says.
const t = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key} ${JSON.stringify(values)}` : key) as any;

const issues = {
  videoMissing: true,
  videoMismatch: null,
  missingInputs: [
    { kind: 'bathymetry' as const, section: 'CS_default_1', path: '/gone/dir/bathy.csv' },
    { kind: 'bathymetry' as const, section: 'CS_default_2', path: '/gone/dir/bathy.csv' },
    { kind: 'ipcamImages' as const, path: '/gone/cam1' },
  ],
};

describe('projectIssueAlerts', () => {
  it('shows the missing video only on the video step, with a Locate action', () => {
    expect(projectIssueAlerts(issues, 'video', t, 'DJI_0083.MP4')).toEqual([
      {
        id: 'issue-video-missing',
        level: 'warning',
        text: 'ProjectIssues.videoMissing {"name":"DJI_0083.MP4"}',
        action: { label: 'ProjectIssues.locate', action: 'locate-video' },
      },
    ]);
    expect(projectIssueAlerts(issues, 'processing', t, 'DJI_0083.MP4').some((a) => a.id === 'issue-video-missing')).toBe(
      false
    );
  });

  it('adds the refused-video card under the video card', () => {
    const withMismatch = {
      ...issues,
      videoMismatch: { expected: { width: 4096, height: 2160, fps: 30 }, found: { width: 1920, height: 1080, fps: 25 } },
    };
    const alerts = projectIssueAlerts(withMismatch, 'video', t, 'DJI_0083.MP4');
    expect(alerts[1]).toEqual({
      id: 'issue-video-mismatch',
      level: 'error',
      text: 'ProjectIssues.videoMismatch {"foundWidth":1920,"foundHeight":1080,"foundFps":25,"width":4096,"height":2160,"fps":30}',
    });
  });

  it('shows one bathymetry card per section on the sections, processing and results steps', () => {
    for (const step of ['sections', 'processing', 'results'] as const) {
      expect(projectIssueAlerts(issues, step, t, '')).toEqual([
        {
          id: 'issue-bathymetry-CS_default_1',
          level: 'warning',
          text: 'ProjectIssues.bathymetryMissing {"section":"CS_default_1","file":"bathy.csv"}',
          action: { label: 'ProjectIssues.locate', action: 'locate-bathymetry:CS_default_1' },
        },
        {
          id: 'issue-bathymetry-CS_default_2',
          level: 'warning',
          text: 'ProjectIssues.bathymetryMissing {"section":"CS_default_2","file":"bathy.csv"}',
          action: { label: 'ProjectIssues.locate', action: 'locate-bathymetry:CS_default_2' },
        },
      ]);
    }
  });

  it('shows the missing image folder on the 3D step only', () => {
    expect(projectIssueAlerts(issues, 'ipcam', t, '')).toEqual([
      {
        id: 'issue-ipcam-images',
        level: 'warning',
        text: 'ProjectIssues.ipcamImagesMissing {"folder":"/gone/cam1"}',
        action: { label: 'ProjectIssues.locate', action: 'locate-ipcam-images' },
      },
    ]);
  });

  it('shows nothing for a healthy project', () => {
    const healthy = { videoMissing: false, videoMismatch: null, missingInputs: [] };
    for (const step of ['video', 'sections', 'processing', 'results', 'ipcam'] as const) {
      expect(projectIssueAlerts(healthy, step, t, 'x.mp4')).toEqual([]);
    }
  });
});
