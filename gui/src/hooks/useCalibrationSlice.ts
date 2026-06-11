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

    const result: { images: string[]; thumbs: string[]; imageSize: { width: number; height: number } | null } =
      await window.ipcRenderer.invoke('calibration-scan-images', { dir });
    dispatch(
      setImages({
        images: result?.images ?? [],
        thumbs: result?.thumbs ?? [],
        imageResolution: result?.imageSize ?? null,
      })
    );
  }, [dispatch]);

  const onDropFolder = useCallback(
    async (dir: string) => {
      dispatch(setImageDir(dir));
      const result: { images: string[]; thumbs: string[]; imageSize: { width: number; height: number } | null } =
        await window.ipcRenderer.invoke('calibration-scan-images', { dir });
      dispatch(
        setImages({
          images: result?.images ?? [],
          thumbs: result?.thumbs ?? [],
          imageResolution: result?.imageSize ?? null,
        })
      );
    },
    [dispatch]
  );

  const onOpenBoard = useCallback(async (board = '20x15') => {
    await window.ipcRenderer.invoke('calibration-write-board', { board });
  }, []);

  const onSolve = useCallback(async () => {
    if (!state.imageDir) return;

    dispatch(setStatus('solving'));
    dispatch(setProgressMsg(''));

    const reportDir = `${state.imageDir}/out/report`;
    const undistortedDir = `${state.imageDir}/out/undistorted`;

    const handleMsg = (_evt: unknown, msg: string) => {
      dispatch(setProgressMsg(msg.trim()));
    };
    window.ipcRenderer.on('river-cli-message', handleMsg);

    try {
      const result = await window.ipcRenderer.invoke('calibration-solve', {
        dir: state.imageDir,
        reportDir,
        undistortedDir,
      });

      if (result?.error?.message) {
        dispatch(setErrorMsg(result.error.message));
        return;
      }

      const data = result?.data ?? result;
      const tempProfilePath: string = result?.tempProfilePath ?? data?.profile_path ?? '';

      const report = await window.ipcRenderer.invoke('calibration-read-results', { reportDir });

      dispatch(
        setSolveResult({
          usedImages: data?.used_images ?? [],
          profilePath: tempProfilePath,
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
    async (cameraName: string, lensName: string): Promise<string | false> => {
      if (!state.profilePath || !cameraName.trim() || !lensName.trim()) return false;
      const result = await window.ipcRenderer.invoke('calibration-save-profile', {
        cameraName: cameraName.trim(),
        lensName: lensName.trim(),
        profileSrc: state.profilePath,
        reportSrc: `${state.imageDir}/out/report`,
        undistortedSrc: `${state.imageDir}/out/undistorted`,
      });
      return result?.success ? result.savedProfilePath : false;
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
    onDropFolder,
    onOpenBoard,
    onSolve,
    onSaveProfile,
    onRevealPath,
    onReset,
  };
};
