import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  setImageDir,
  setImages,
  setStatus,
  setSolveResult,
  setProgressMsg,
  setErrorMsg,
  resetCalibration,
} from '../store/calibration/calibrationSlice';

export const useCalibrationSlice = () => {
  const state = useSelector((s: RootState) => s.calibration);
  const dispatch = useDispatch();

  const onOpenFolder = useCallback(async () => {
    const dir: string | null = await window.ipcRenderer.invoke('calibration-open-folder');
    if (!dir) return;

    dispatch(setImageDir(dir));

    const files: string[] = await window.ipcRenderer.invoke('calibration-scan-images', { dir });
    dispatch(setImages(files ?? []));
  }, [dispatch]);

  const onOpenBoard = useCallback(async (board = '20x15') => {
    await window.ipcRenderer.invoke('calibration-write-board', { board });
  }, []);

  const onSolve = useCallback(async () => {
    if (!state.imageDir) return;

    dispatch(setStatus('solving'));
    dispatch(setProgressMsg(''));

    const reportDir = `${state.imageDir}/out/report`;
    const undistortedDir = `${state.imageDir}/out/undistorted`;
    const profilePath = `${state.imageDir}/calibration_profile.json`;

    const handleMsg = (_evt: unknown, msg: string) => {
      dispatch(setProgressMsg(msg.trim()));
    };
    window.ipcRenderer.on('river-cli-message', handleMsg);

    try {
      const result = await window.ipcRenderer.invoke('calibration-solve', {
        dir: state.imageDir,
        profilePath,
        reportDir,
        undistortedDir,
      });

      if (result?.error?.message) {
        dispatch(setErrorMsg(result.error.message));
        return;
      }

      const data = result?.data ?? result;

      const report = await window.ipcRenderer.invoke('calibration-read-results', { reportDir });

      dispatch(
        setSolveResult({
          usedImages: data?.used_images ?? [],
          profilePath: data?.profile_path ?? profilePath,
          summary: report?.summary ?? null,
          csvRows: report?.csvRows ?? [],
          heatmapBase64: report?.heatmapBase64 ?? null,
          overlayPaths: report?.overlayPaths ?? [],
          undistortedPaths: report?.undistortedPaths ?? [],
        })
      );
    } catch (err) {
      dispatch(setErrorMsg(String(err)));
    } finally {
      window.ipcRenderer.removeListener('river-cli-message', handleMsg);
    }
  }, [dispatch, state.imageDir]);

  const onSaveProfile = useCallback(
    async (name: string): Promise<string | false> => {
      if (!state.profilePath || !name.trim()) return false;
      const dest = `${state.imageDir}/${name.trim()}.json`;
      const result = await window.ipcRenderer.invoke('calibration-copy-file', {
        src: state.profilePath,
        dest,
      });
      return result?.success ? dest : false;
    },
    [state.profilePath, state.imageDir]
  );

  const onRevealPath = useCallback((targetPath: string) => {
    window.ipcRenderer.invoke('calibration-reveal-path', { targetPath });
  }, []);

  const onReset = useCallback(() => dispatch(resetCalibration()), [dispatch]);

  return {
    ...state,
    onOpenFolder,
    onOpenBoard,
    onSolve,
    onSaveProfile,
    onRevealPath,
    onReset,
  };
};
