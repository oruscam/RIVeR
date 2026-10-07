import type { TFunction } from 'i18next';
import type { ProjectIssuesState } from '../store/project/types';
import type { StepAlert } from '../store/ui/types';

export type IssueStep = 'video' | 'sections' | 'processing' | 'results' | 'ipcam';

const fileName = (filePath: string) => filePath.split(/[\\/]/).pop() ?? filePath;

/**
 * The cards a step shows for the project's missing inputs (spec §4). Derived, never
 * stored: the global step-alert list is not cleared on navigation, these must only
 * appear on their own steps.
 */
export function projectIssueAlerts(
  issues: ProjectIssuesState,
  step: IssueStep,
  t: TFunction,
  videoName: string
): StepAlert[] {
  const locate = t('ProjectIssues.locate');
  const alerts: StepAlert[] = [];

  if (step === 'video' && issues.videoMissing) {
    alerts.push({
      id: 'issue-video-missing',
      level: 'warning',
      text: t('ProjectIssues.videoMissing', { name: videoName }),
      action: { label: locate, action: 'locate-video' },
    });
    if (issues.videoMismatch) {
      const { expected, found } = issues.videoMismatch;
      alerts.push({
        id: 'issue-video-mismatch',
        level: 'error',
        text: t('ProjectIssues.videoMismatch', {
          foundWidth: found.width,
          foundHeight: found.height,
          foundFps: found.fps,
          width: expected.width,
          height: expected.height,
          fps: expected.fps,
        }),
      });
    }
  }

  for (const input of issues.missingInputs) {
    if (input.kind === 'bathymetry' && (step === 'sections' || step === 'processing' || step === 'results')) {
      alerts.push({
        id: `issue-bathymetry-${input.section}`,
        level: 'warning',
        text: t('ProjectIssues.bathymetryMissing', { section: input.section, file: fileName(input.path) }),
        action: { label: locate, action: `locate-bathymetry:${input.section}` },
      });
    }
    if (input.kind === 'ipcamImages' && step === 'ipcam') {
      alerts.push({
        id: 'issue-ipcam-images',
        level: 'warning',
        text: t('ProjectIssues.ipcamImagesMissing', { folder: input.path }),
        action: { label: locate, action: 'locate-ipcam-images' },
      });
    }
  }

  return alerts;
}
