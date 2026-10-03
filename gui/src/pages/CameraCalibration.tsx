import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCalibrationSlice } from '../hooks';
import { FormCalibration } from '../components/Forms';
import { CalibrationCanvas, CalibrationStrip, CalibrationViewControl } from '../components/Calibration';
import { toCalFileUrl } from '../helpers/calFileUrl';
import { viewAvailability, viewForKey, type CalibrationViewMode } from '../helpers/calibrationView';

interface Props {
  onClose: () => void;
}

/**
 * Camera calibration, a full-screen overlay launched from Home, laid out on
 * the same workspace as every wizard step (spec §4/6e, amendment A12): the
 * canvas and strip on the left, FormCalibration's panel and footer on the right.
 * This page owns selection, view mode, keyboard and drag-and-drop.
 */
export const CameraCalibration: React.FC<Props> = ({ onClose }) => {
  const {
    status,
    images,
    thumbs,
    usedImages,
    imageResolution,
    summary,
    csvRows,
    heatmapBase64,
    undistortedPaths,
    perFrameCorners,
    progressPercentage,
    progressTime,
    errorMsg,
    onDropFolder,
    onSolve,
    onSaveProfile,
    onRevealPath,
    onReset,
  } = useCalibrationSlice();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState<CalibrationViewMode>('original');
  const [dragOver, setDragOver] = useState(false);

  const usedSet = useMemo(() => new Set(usedImages), [usedImages]);
  const availability = useMemo(() => viewAvailability(status, Boolean(heatmapBase64)), [status, heatmapBase64]);

  // A new folder starts on its first photo (a shorter list must not leave the
  // selection pointing past its end).
  useEffect(() => {
    setSelectedIdx(0);
  }, [images]);

  // After a solve, show the corrected view on the first photo the solver used.
  useEffect(() => {
    if (status === 'solved') {
      setViewMode('corrected');
      const firstUsedIdx = images.findIndex((img) => usedSet.has(img));
      setSelectedIdx(firstUsedIdx >= 0 ? firstUsedIdx : 0);
    }
  }, [status, images, usedSet]);

  // A view that stops being available (a new import resets status to idle)
  // must not stay selected-but-disabled on the switch.
  useEffect(() => {
    if (availability[viewMode] !== null) setViewMode('original');
  }, [availability, viewMode]);

  // Preload neighbours so switching photos feels instant; decode() forces the
  // JPEG decode before the user gets there.
  useEffect(() => {
    const preload = (p: string) => {
      const img = new Image();
      img.src = toCalFileUrl(p);
      img.decode().catch(() => {});
    };
    for (let d = 1; d <= 3; d++) {
      if (images[selectedIdx - d]) preload(images[selectedIdx - d]);
      if (images[selectedIdx + d]) preload(images[selectedIdx + d]);
    }
  }, [selectedIdx, images]);

  // Keys: ←/→ photos, 1/2/H views, Esc leaves Heatmap or closes the screen.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        if (viewMode === 'heatmap') setViewMode('original');
        else onClose();
        return;
      }
      if (e.key === 'ArrowLeft') {
        setSelectedIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        setSelectedIdx((i) => Math.min(images.length - 1, i + 1));
        return;
      }
      const mode = viewForKey(e.key);
      if (mode && availability[mode] === null) setViewMode(mode);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, viewMode, availability, onClose]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const items = e.dataTransfer.items;
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry?.isDirectory) {
          const file = items[i].getAsFile();
          if (file) {
            await onDropFolder(window.webUtils.getPathForFile(file));
            return;
          }
        }
      }
      // Fallback: individual image files → use parent directory of first file
      const files = Array.from(e.dataTransfer.files);
      const first = files.find((f) => /\.(jpg|jpeg|png)$/i.test(f.name));
      if (first) {
        const p = window.webUtils.getPathForFile(first);
        await onDropFolder(p.substring(0, p.lastIndexOf('/')));
      }
    },
    [onDropFolder]
  );

  const selectedImg = images[selectedIdx];
  const usedIdx = selectedImg ? usedImages.indexOf(selectedImg) : -1;
  const undistortedPath = usedIdx >= 0 ? (undistortedPaths[usedIdx] ?? null) : null;
  const corners = usedIdx >= 0 ? perFrameCorners[usedIdx] : undefined;

  return (
    <div className="cal-overlay">
      <div className="regular-page">
        <div className="media-container">
          {images.length > 0 && (
            <CalibrationViewControl viewMode={viewMode} onSetViewMode={setViewMode} availability={availability} />
          )}
          <CalibrationCanvas
            viewMode={viewMode}
            status={status}
            image={selectedImg}
            undistortedPath={undistortedPath}
            corners={corners}
            heatmapBase64={heatmapBase64}
          />
          {images.length > 0 && (
            <CalibrationStrip
              images={images}
              thumbs={thumbs}
              selectedIdx={selectedIdx}
              onSelect={setSelectedIdx}
              usedSet={usedSet}
              showUnused={status === 'solved'}
            />
          )}
        </div>
        <div
          className={`form-container${dragOver ? ' drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDragEnd={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FormCalibration
            status={status}
            imageCount={images.length}
            summary={summary}
            csvRows={csvRows}
            imageResolution={imageResolution}
            progressPercentage={progressPercentage}
            progressTime={progressTime}
            errorMsg={errorMsg}
            onSolve={onSolve}
            onSaveProfile={onSaveProfile}
            onRevealPath={onRevealPath}
            onBack={onClose}
            onDone={() => {
              onReset();
              onClose();
            }}
            onCalibrateAnother={onReset}
          />
        </div>
      </div>
    </div>
  );
};
