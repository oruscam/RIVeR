import type { TFunction } from 'i18next';
import { projectIssueAlerts } from './projectIssueAlerts';
import type { ProjectIssuesState } from '../store/project/types';

// Returns the key plus its options, so the test reads which copy and which values were used.
const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key} ${JSON.stringify(options)}` : key) as unknown as TFunction;

const missing: ProjectIssuesState = { videoMissing: true, missingInputs: [], videoMismatch: null };

describe('projectIssueAlerts for a frames project', () => {
  it('says the frames folder is missing, with the same Locate action', () => {
    const [alert] = projectIssueAlerts(missing, 'video', t, 'gauging', 'frames');

    expect(alert.text).toBe('ProjectIssues.framesMissing {"name":"gauging"}');
    expect(alert.action?.action).toBe('locate-video');
  });

  it('explains a refused folder by its frame count', () => {
    const issues: ProjectIssuesState = {
      ...missing,
      videoMismatch: {
        expected: { width: 1920, height: 1080, fps: 25, frameCount: 240 },
        found: { width: 1920, height: 1080, fps: 25, frameCount: 120 },
      },
    };

    const alerts = projectIssueAlerts(issues, 'video', t, 'gauging', 'frames');

    expect(alerts[1].text).toBe(
      'ProjectIssues.framesMismatch {"foundCount":120,"foundWidth":1920,"foundHeight":1080,"count":240,"width":1920,"height":1080}'
    );
  });

  it('keeps the video wording when no source is given', () => {
    const [alert] = projectIssueAlerts(missing, 'video', t, 'DJI_0083.MP4');

    expect(alert.text).toBe('ProjectIssues.videoMissing {"name":"DJI_0083.MP4"}');
  });
});
