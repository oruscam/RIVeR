import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../store/store';
import {
  resolveBathymetry,
  resolveIpcamImages,
  resolveVideoMissing,
  setVideoData,
  setVideoMismatch,
} from '../store/project/projectSlice';
import { setBathimetry } from '../store/section/sectionSlice';
import { addStepAlert, clearStepAlert } from '../store/ui/uiSlice';
import { IssueStep, projectIssueAlerts } from '../helpers/projectIssueAlerts';
import { hasMissingBathymetry, locatedBathymetryUpdates } from '../helpers/locatedBathymetry';
import { useIpcamSlice } from './useIpcamSlice';

/** The project-issue cards for one step, and what their Locate… buttons do (spec §4). */
export const useProjectIssues = (step: IssueStep) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { issues, video, type, projectDetails } = useSelector((state: RootState) => state.project);
  const { sections } = useSelector((state: RootState) => state.section);
  const { onGetImages } = useIpcamSlice();
  const filePrefix = import.meta.env.VITE_FILE_PREFIX ?? '';

  const alerts = useMemo(
    () => projectIssueAlerts(issues, step, t, video.data.name ?? ''),
    [issues, step, t, video.data.name]
  );

  const locateVideo = async () => {
    dispatch(clearStepAlert('locate-video-error'));
    const result = await window.ipcRenderer.invoke('locate-video');
    if (result.status === 'mismatch') {
      dispatch(setVideoMismatch({ expected: result.expected, found: result.found }));
    } else if (result.status === 'error') {
      dispatch(addStepAlert({ id: 'locate-video-error', level: 'error', text: result.message }));
    } else if (result.status === 'ok') {
      const { metadata } = result;
      dispatch(
        setVideoData({
          ...video.data,
          path: filePrefix + metadata.path,
          name: metadata.name,
          creation: metadata.creation,
        })
      );
      dispatch(resolveVideoMissing());
    }
  };

  const locateBathymetry = async (section: string) => {
    dispatch(clearStepAlert('bathymetry-import-error'));
    const result = await window.ipcRenderer.invoke('locate-bathymetry', {
      section,
      unitSistem: projectDetails.unitSistem,
      // IPCam bathymetry must be elevation, not depth; any zLimits turns on that check.
      zLimits: type === 'ipcam' ? { min: 0, max: 0 } : undefined,
    });
    if (result.status === 'error') {
      dispatch(
        addStepAlert({
          id: 'bathymetry-import-error',
          level: 'error',
          text: t('CrossSections.Errors.' + result.message),
        })
      );
      return;
    }
    if (result.status !== 'ok') return;

    // Every section that used the missing file now points at the located one, in the
    // store as on disk, even when its saved level does not cross the new profile.
    const { updates, error } = locatedBathymetryUpdates(sections, issues.missingInputs, result);
    for (const { index, bathimetry } of updates) dispatch(setBathimetry({ bathimetry, index }));
    if (error) {
      dispatch(
        addStepAlert({
          id: 'bathymetry-import-error',
          level: 'error',
          text: t('CrossSections.Errors.' + error.message, { level: error.value }),
        })
      );
    }
    dispatch(resolveBathymetry(result.replaced));
  };

  const locateIpcamImages = async () => {
    dispatch(clearStepAlert('ipcam-import-images'));
    try {
      if (await onGetImages(undefined)) dispatch(resolveIpcamImages());
    } catch (error) {
      dispatch(addStepAlert({ id: 'ipcam-import-images', level: 'error', text: (error as Error).message }));
    }
  };

  const onAction = async (action: string) => {
    if (action === 'locate-video') return locateVideo();
    if (action === 'locate-ipcam-images') return locateIpcamImages();
    if (action.startsWith('locate-bathymetry:'))
      return locateBathymetry(action.slice('locate-bathymetry:'.length));
  };

  return {
    alerts,
    onAction,
    videoMissing: issues.videoMissing,
    bathymetryMissing: hasMissingBathymetry(issues),
  };
};
