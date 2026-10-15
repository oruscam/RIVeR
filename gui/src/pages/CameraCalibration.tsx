import { useEffect, useMemo, useState } from 'react';
import { useCalibrationSlice } from '../hooks';
import { FormCalibration } from '../components/Forms';
import {
  CalibrationCanvas,
  CalibrationPrepare,
  CalibrationStrip,
  CalibrationViewControl,
} from '../components/Calibration';
import { toCalFileUrl } from '../helpers/calFileUrl';
import {
  initialStage,
  viewAvailability,
  viewForKey,
  type CalibrationStage,
  type CalibrationViewMode,
} from '../helpers/calibrationView';

// Electron opens a file dropped on an unhandled area; the workspace is not a drop target, so a drop does nothing.
const swallow = (e: React.DragEvent) => e.preventDefault();

interface Props {
  onClose: () => void;
}

/**
 * Camera calibration, a full-screen overlay launched from Home. It opens on the
 * Prepare screen (show the board, import photos); Solve moves to the standard
 * workspace (canvas and strip left, FormCalibration right). This page owns the
 * stage, selection, view mode and keyboard.
 */
export const CameraCalibration: React.FC<Props> = ({ onClose }) => {
  const {
    status,
    imageDir,
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
    onOpenBoard,
    onOpenFolder,
    onDropFolder,
    onSolve,
    onSaveProfile,
    onRevealPath,
    onReset,
  } = useCalibrationSlice();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState<CalibrationViewMode>('original');
  const [stage, setStage] = useState<CalibrationStage>(() => initialStage(status));

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

  // Keys: on Prepare, Esc closes. On the workspace, Esc leaves Heatmap first, otherwise
  // returns to Prepare (never while a solve runs); arrows step photos; view keys pick an available view.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (stage === 'prepare') {
        if (e.key === 'Escape') onClose();
        return;
      }
      if (e.key === 'Escape') {
        if (viewMode === 'heatmap') setViewMode('original');
        else if (status !== 'solving') setStage('prepare');
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
  }, [stage, status, images.length, viewMode, availability, onClose]);

  const selectedImg = images[selectedIdx];
  const usedIdx = selectedImg ? usedImages.indexOf(selectedImg) : -1;
  const undistortedPath = usedIdx >= 0 ? (undistortedPaths[usedIdx] ?? null) : null;
  const corners = usedIdx >= 0 ? perFrameCorners[usedIdx] : undefined;

  if (stage === 'prepare') {
    return (
      <div className="cal-overlay">
        <CalibrationPrepare
          imageDir={imageDir}
          imageCount={images.length}
          imageResolution={imageResolution}
          onOpenBoard={() => void onOpenBoard()}
          onOpenFolder={onOpenFolder}
          onDropFolder={onDropFolder}
          onSolve={() => {
            setStage('workspace');
            void onSolve();
          }}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div className="cal-overlay" onDragOver={swallow} onDrop={swallow}>
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
        <div className="form-container">
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
            onBack={() => setStage('prepare')}
            onDone={() => {
              onReset();
              onClose();
            }}
            onCalibrateAnother={() => {
              onReset();
              setStage('prepare');
            }}
          />
        </div>
      </div>
    </div>
  );
};
