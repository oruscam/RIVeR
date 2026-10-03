import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuAlertTriangle, LuCheck, LuFolder, LuFrame, LuMonitor, LuScan } from 'react-icons/lu';
import { handleDragLeave, handleDragOver } from '../../helpers';
import { folderName, MIN_RECOMMENDED_PHOTOS, parentDir, photoCountAdvice } from '../../helpers/calibrationView';

type ScanState = 'idle' | 'scanning' | 'empty';

interface CalibrationPrepareProps {
  imageDir: string;
  imageCount: number;
  imageResolution: { width: number; height: number } | null;
  onOpenBoard: () => void;
  onOpenFolder: () => Promise<number | null>;
  onDropFolder: (dir: string) => Promise<number>;
  onSolve: () => void;
  onClose: () => void;
}

/** A dropped folder, or the folder of the first dropped photo; null if neither. */
const droppedFolder = (data: DataTransfer): string | null => {
  for (let i = 0; i < data.items.length; i++) {
    const entry = data.items[i].webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      const file = data.items[i].getAsFile();
      if (file) return window.webUtils.getPathForFile(file);
    }
  }
  const first = Array.from(data.files).find((f) => /\.(jpg|jpeg|png)$/i.test(f.name));
  return first ? parentDir(window.webUtils.getPathForFile(first)) : null;
};

/** Electron opens a file dropped on an unhandled area; outside the box a drop does nothing. */
const swallow = (e: React.DragEvent) => e.preventDefault();

/**
 * Camera calibration's first screen (spec 2026-10-03): two numbered steps,
 * Show the board and Import your photos, on the footage screen's frame. The
 * dashed box is the only drop target in calibration.
 */
export const CalibrationPrepare = ({
  imageDir,
  imageCount,
  imageResolution,
  onOpenBoard,
  onOpenFolder,
  onDropFolder,
  onSolve,
  onClose,
}: CalibrationPrepareProps) => {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [scan, setScan] = useState<ScanState>('idle');

  const hasPhotos = imageCount > 0;
  const advice = photoCountAdvice(imageCount);
  const canSolve = hasPhotos && scan !== 'scanning';

  // null means the dialog was cancelled: whatever was loaded stays, with no error.
  const load = async (run: () => Promise<number | null>) => {
    if (scan === 'scanning') return;
    setScan('scanning');
    try {
      const count = await run();
      setScan(count === 0 ? 'empty' : 'idle');
    } catch {
      setScan('idle');
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (scan === 'scanning') return;
    const dir = droppedFolder(e.dataTransfer);
    if (dir === null) {
      setScan('empty');
      return;
    }
    await load(() => onDropFolder(dir));
  };

  return (
    <div className="default-app-container cal-prepare" onDragOver={swallow} onDrop={swallow}>
      <h2 className="cal-prepare-title">{t('Calibration.title')}</h2>
      <p className="cal-prepare-lede">{t('Calibration.prepare.lede')}</p>

      <div className="cal-prepare-steps">
        <section>
          <h3 className="cal-prepare-step-head">
            <span className="cal-prepare-num" aria-hidden="true">
              1
            </span>
            {t('Calibration.prepare.boardTitle')}
          </h3>
          <p className="cal-prepare-text">{t('Calibration.prepare.boardText')}</p>
          <ul className="cal-prepare-tips">
            <li>
              <LuMonitor size={18} aria-hidden="true" />
              <span>{t('Calibration.prepare.tipFlat')}</span>
            </li>
            <li>
              <LuScan size={18} aria-hidden="true" />
              <span>{t('Calibration.prepare.tipAngles')}</span>
            </li>
            <li>
              <LuFrame size={18} aria-hidden="true" />
              <span>{t('Calibration.prepare.tipCorners')}</span>
            </li>
          </ul>
          <button type="button" className="btn btn-lg btn-secondary" onClick={onOpenBoard}>
            {t('Calibration.board')}
          </button>
          <p className="cal-prepare-skip">{t('Calibration.prepare.skip')}</p>
        </section>

        <section>
          <h3 className="cal-prepare-step-head">
            <span className={`cal-prepare-num${hasPhotos ? ' done' : ''}`} aria-hidden="true">
              {hasPhotos ? <LuCheck size={14} strokeWidth={3} /> : '2'}
            </span>
            {t('Calibration.prepare.photosTitle')}
          </h3>
          <p className="cal-prepare-text">{t('Calibration.prepare.photosText')}</p>
          <div
            className={`cal-prepare-drop${hasPhotos ? ' loaded' : ''}${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, setDragOver)}
            onDragLeave={(e) => handleDragLeave(e, setDragOver, false)}
            onDrop={handleDrop}
            aria-busy={scan === 'scanning' ? true : undefined}
          >
            {scan === 'scanning' ? (
              <p className="cal-prepare-hint">{t('Calibration.prepare.reading')}</p>
            ) : hasPhotos ? (
              <>
                <p className="cal-prepare-folder" title={imageDir}>
                  <LuFolder size={18} aria-hidden="true" />
                  <span>{folderName(imageDir)}</span>
                </p>
                <p className="cal-prepare-count">
                  {t('Calibration.prepare.photoCount', { count: imageCount })}
                  {imageResolution ? ` · ${imageResolution.width} × ${imageResolution.height} px` : ''}
                </p>
                <button type="button" className="btn btn-tertiary" onClick={() => void load(onOpenFolder)}>
                  {t('Calibration.prepare.changeFolder')}
                </button>
              </>
            ) : (
              <>
                <p className="cal-prepare-hint">{t('Calibration.prepare.dropHint')}</p>
                <button type="button" className="btn btn-lg btn-secondary" onClick={() => void load(onOpenFolder)}>
                  {t('Calibration.prepare.openFolder')}
                </button>
              </>
            )}
          </div>
          {advice === 'tooFew' && scan !== 'scanning' && (
            <p className="cal-prepare-note">
              <LuAlertTriangle size={16} className="cal-prepare-warn-icon" aria-hidden="true" />
              <span>{t('Calibration.prepare.tooFew', { count: imageCount, min: MIN_RECOMMENDED_PHOTOS })}</span>
            </p>
          )}
          {scan === 'empty' && !hasPhotos && (
            <p className="cal-prepare-note" role="alert">
              <LuAlertTriangle size={16} className="cal-prepare-error-icon" aria-hidden="true" />
              <span>{t('Errors.imagesFolderEmpty')}</span>
            </p>
          )}
        </section>
      </div>

      <div className="wizard-container">
        <button type="button" className="btn btn-lg btn-tertiary" onClick={onClose}>
          {t('Wizard.back')}
        </button>
        <button
          type="button"
          className="btn btn-lg btn-primary"
          aria-disabled={!canSolve}
          title={canSolve ? undefined : t('Calibration.importFirst')}
          onClick={() => {
            if (!canSolve) return;
            onSolve();
          }}
        >
          {t('Calibration.solve')}
        </button>
      </div>
    </div>
  );
};
