import { useEffect, useState } from 'react';
import { useProjectSlice } from './useProjectSlice';
import { playableFrames } from '../helpers/framePlayback';

/**
 * The open frames project's source images, in import order, ready for <img src>.
 * Empty while the folder is being read, when it cannot be read or no longer matches the
 * project's frame count, and when the project is not a frames project.
 */
export const useSourceFrames = (enabled: boolean): string[] => {
  const { onInspectFramesFolder, video } = useProjectSlice();
  const [frames, setFrames] = useState<string[]>([]);

  let filePrefix = import.meta.env.VITE_FILE_PREFIX;
  filePrefix = filePrefix === undefined ? '' : filePrefix;

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setFrames([]);
      return;
    }
    onInspectFramesFolder().then((result) => {
      if (cancelled) return;
      setFrames(playableFrames(result, video.data.frameCount, filePrefix));
    });
    return () => {
      cancelled = true;
    };
    // video.data.path changes when a moved folder is located: read the new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, video.data.path]);

  return frames;
};
