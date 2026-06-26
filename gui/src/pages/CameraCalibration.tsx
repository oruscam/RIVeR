import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalibrationSlice, useResizableCarousel } from '../hooks';

interface ThumbProps {
  img: string;
  thumbSrc: string;
  idx: number;
  active: boolean;
  unused: boolean;
  notUsedLabel: string;
  onSelect: React.Dispatch<React.SetStateAction<number>>;
}

const CalThumb = memo(({ img, thumbSrc, idx, active, unused, notUsedLabel, onSelect }: ThumbProps) => {
  const handleClick = useCallback(() => onSelect(idx), [onSelect, idx]);
  return (
    <button
      className={`cal-thumb ${active ? 'active' : ''} ${unused ? 'unused' : ''}`}
      onClick={handleClick}
      title={unused ? notUsedLabel : img.split('/').pop()}
    >
      <img src={`cal-file://${thumbSrc}`} alt="" loading="lazy" />
    </button>
  );
});

const ACTION_KEY_MAP: Record<string, string> = {
  'Add frames hitting edges/corners; vary angle & distance.': 'Calibration.actions.addFrames',
  'Push board nearer sensor edges; allow some marker clipping.': 'Calibration.actions.pushBoard',
  'Increase sharpness (more light, lower ISO), reduce screen moiré (resize board).':
    'Calibration.actions.increaseSharpness',
  'Capture from varied viewpoints (tilt/pan/roll) and distances.': 'Calibration.actions.varyViewpoints',
  'Ensure corners appear across the whole sensor; avoid heavy cropping.': 'Calibration.actions.ensureCorners',
  'Re-shoot with better coverage; if persists, inspect image readout/metadata.': 'Calibration.actions.reshoot',
};

type ViewMode = 'snapshot' | 'overlay' | 'undistorted' | 'heatmap';

interface Props {
  onClose: () => void;
}

export const CameraCalibration: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation();
  const {
    status,
    images,
    thumbs,
    usedImages,
    imageResolution,
    summary,
    csvRows,
    heatmapBase64,
    overlayPaths,
    undistortedPaths,
    progressMsg,
    errorMsg,
    onOpenFolder,
    onDropFolder,
    onOpenBoard,
    onSolve,
    onSaveProfile,
    onRevealPath,
  } = useCalibrationSlice();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('snapshot');
  const [dragOver, setDragOver] = useState(false);
  const [cameraName, setCameraName] = useState('');
  const [lensName, setLensName] = useState('');
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [existingCameras, setExistingCameras] = useState<string[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const calCarouselRef = useRef<HTMLDivElement>(null);

  const { height: thumbHeight, onDragHandleMouseDown: onCalResizeDrag } = useResizableCarousel({
    storageKey: 'river-cal-carousel-height',
    defaultHeight: 42,
    minHeight: 28,
    maxHeight: 120,
    onDragProgress: (h) => {
      const w = Math.round(h * (56 / 42));
      calCarouselRef.current?.style.setProperty('--thumb-height', `${h}px`);
      calCarouselRef.current?.style.setProperty('--thumb-width', `${w}px`);
    },
  });
  const thumbWidth = Math.round(thumbHeight * (56 / 42));

  // O(1) membership check instead of O(n) Array.includes on every thumb.
  const usedSet = useMemo(() => new Set(usedImages), [usedImages]);

  // Fetch existing camera names for combobox autocomplete.
  useEffect(() => {
    window.ipcRenderer
      .invoke('calibration-list-profiles')
      .then((result: { camera: string }[]) => {
        setExistingCameras((result ?? []).map((g) => g.camera));
      })
      .catch(() => {});
  }, []);

  const cameraSuggestions = useMemo(
    () =>
      cameraName.trim().length > 0
        ? existingCameras.filter((c) => c.toLowerCase().includes(cameraName.toLowerCase()) && c !== cameraName)
        : [],
    [cameraName, existingCameras]
  );

  // After solve, switch to overlay and reset selection to first used frame.
  useEffect(() => {
    if (status === 'solved') {
      setViewMode('overlay');
      const firstUsedIdx = images.findIndex((img) => usedSet.has(img));
      setSelectedIdx(firstUsedIdx >= 0 ? firstUsedIdx : 0);
      setSavedPath(null);
      setSaveError(null);
    }
  }, [status, images, usedSet]);

  // Preload neighbours so canvas swap feels instant.
  // img.decode() forces eager JPEG decode so the bitmap is ready before the user switches.
  useEffect(() => {
    const preload = (p: string) => {
      const img = new Image();
      img.src = `cal-file://${p}`;
      img.decode().catch(() => {});
    };
    for (let d = 1; d <= 3; d++) {
      if (images[selectedIdx - d]) preload(images[selectedIdx - d]);
      if (images[selectedIdx + d]) preload(images[selectedIdx + d]);
    }
  }, [selectedIdx, images]);

  // Keyboard navigation.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        if (viewMode === 'heatmap') {
          setViewMode('overlay');
        } else {
          onClose();
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedIdx((i) => Math.min(images.length - 1, i + 1));
      } else if (e.key === '1') {
        setViewMode('overlay');
      } else if (e.key === '2') {
        setViewMode('undistorted');
      } else if (e.key === 'h' || e.key === 'H') {
        if (status === 'solved') setViewMode('heatmap');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, viewMode, status, onClose]);

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

  const getCanvasContent = () => {
    if (status === 'error' || images.length === 0) return null;

    if (status === 'idle') {
      return (
        <img
          className="cal-canvas-img"
          src={`cal-file://${images[selectedIdx]}`}
          alt={`Frame ${selectedIdx + 1}`}
        />
      );
    }

    if (viewMode === 'heatmap' && heatmapBase64) {
      return <img className="cal-canvas-img" src={`data:image/png;base64,${heatmapBase64}`} alt="Heatmap" />;
    }

    if (viewMode === 'overlay' && overlayPaths.length > 0) {
      const overlayForSelected = getOverlayForSelected();
      if (overlayForSelected) {
        return <img className="cal-canvas-img" src={`cal-file://${overlayForSelected}`} alt="Overlay" />;
      }
    }

    if (viewMode === 'undistorted') {
      const undistorted = getUndistortedForSelected();
      if (undistorted) {
        return <img className="cal-canvas-img" src={`cal-file://${undistorted}`} alt="Undistorted" />;
      }
      return (
        <div className="cal-canvas-placeholder">
          <p>{t('Calibration.notUsed')}</p>
        </div>
      );
    }

    return (
      <img className="cal-canvas-img" src={`cal-file://${images[selectedIdx]}`} alt={`Frame ${selectedIdx + 1}`} />
    );
  };

  const getOverlayForSelected = () => {
    const selectedImg = images[selectedIdx];
    if (!selectedImg) return null;
    const usedIdx = usedImages.indexOf(selectedImg);
    if (usedIdx < 0) return null;
    return overlayPaths[usedIdx] ?? null;
  };

  const getUndistortedForSelected = () => {
    const selectedImg = images[selectedIdx];
    if (!selectedImg) return null;
    const usedIdx = usedImages.indexOf(selectedImg);
    if (usedIdx < 0) return null;
    return undistortedPaths[usedIdx] ?? null;
  };

  const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const maxCsvCount = useMemo(
    () => (csvRows.length > 0 ? Math.max(...csvRows.map((r) => r.count)) : 1),
    [csvRows]
  );

  const rightPanel = useMemo(
    () => (
      <div
        className={`cal-right${dragOver ? ' drag-over-cal' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDragEnd={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <h1 className="cal-panel-title">{t('Calibration.title')}</h1>

        <div className="cal-actions">
          <div className="cal-actions-row">
            <button
              className="button-1 cal-action-btn"
              onClick={() => onOpenBoard()}
              disabled={status === 'solving'}
            >
              {t('Calibration.board')}
            </button>
            <button className="button-1 cal-action-btn" onClick={onOpenFolder} disabled={status === 'solving'}>
              {t('Calibration.import')}
            </button>
          </div>
          <button
            className="button-1 cal-action-btn"
            onClick={onSolve}
            disabled={status === 'solving' || images.length === 0}
          >
            {t('Calibration.solve')}
          </button>
        </div>

        {status === 'solving' && (
          <div className="cal-solving-loader">
            <div className="loader-wrapper-big">
              <div className="loader-big" />
            </div>
            {progressMsg && <p className="cal-progress-text">{progressMsg}</p>}
          </div>
        )}

        {(status === 'error' || errorMsg) && (
          <div className="cal-error-chip">⚠ {errorMsg || t('Calibration.errorGeneric')}</div>
        )}

        {status === 'solved' && summary && (
          <div className="cal-results">
            <div className="cal-overall-row">
              <span className="cal-overall-text">Overall</span>
              <span className={`cal-grade-pill ${summary.verdict?.grade_overall ?? ''}`}>
                {capitalize(summary.verdict?.grade_overall ?? '')}
              </span>
            </div>

            <div className="cal-metrics-list">
              {[
                { label: t('Calibration.metrics.medianRms'), grade: summary.verdict?.grades?.median_rms },
                { label: t('Calibration.metrics.p90Rms'), grade: summary.verdict?.grades?.p90_rms },
                { label: t('Calibration.metrics.coverage'), grade: summary.verdict?.grades?.coverage },
                { label: t('Calibration.metrics.edgeReach'), grade: summary.verdict?.grades?.edge_reach },
                { label: t('Calibration.metrics.poseSpread'), grade: summary.verdict?.grades?.pose_spread },
                { label: t('Calibration.metrics.centerOffset'), grade: summary.verdict?.grades?.center_offset },
              ].map(({ label, grade }) => (
                <div key={label} className="cal-metric-row">
                  <span className="cal-metric-label">{label}</span>
                  <span className={`cal-metric-grade cal-metric-${grade ?? 'bad'}`}>
                    {capitalize(grade ?? '')}
                  </span>
                </div>
              ))}
            </div>

            {summary.verdict?.actions?.length > 0 && (
              <ul className="cal-rec-list">
                {summary.verdict.actions.map((a, i) => (
                  <li key={i} className="cal-rec-item">
                    {t(ACTION_KEY_MAP[a] ?? a, a)}
                  </li>
                ))}
              </ul>
            )}

            <hr className="cal-divider" />

            {csvRows.length > 0 && (
              <div className="cal-histogram">
                <p className="cal-section-label">{t('Calibration.histogram')}</p>
                <div className="cal-histogram-wrapper">
                  <div className="cal-histogram-yaxis">
                    <span className="cal-yaxis-label">Count</span>
                  </div>
                  <div className="cal-histogram-inner">
                    <div className="cal-histogram-chart">
                      {csvRows.map((row, i) => (
                        <div key={i} className="cal-bar-col">
                          <div
                            className="cal-bar"
                            style={{ height: `${(row.count / maxCsvCount) * 100}%` }}
                            title={`${row.bin_center_px.toFixed(3)} px: ${row.count}`}
                          />
                          {i % 4 === 0 && <span className="cal-bar-label">{row.bin_center_px.toFixed(2)}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="cal-histogram-axes">
                      <span>{t('Calibration.histogramX')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'idle' && images.length > 0 && (
          <p className="cal-ready-hint">{t('Calibration.readyToSolve')}</p>
        )}
        {status === 'idle' && images.length === 0 && (
          <p className="cal-ready-hint">{t('Calibration.emptyHint')}</p>
        )}

        {status === 'solved' && (
          <>
            <hr className="cal-divider" />
            <div className="cal-save-section">
              <div className="cal-combo">
                <input
                  className="input-field-oblique"
                  type="text"
                  value={cameraName}
                  onChange={(e) => {
                    setCameraName(e.target.value);
                    setComboOpen(true);
                  }}
                  onFocus={() => setComboOpen(true)}
                  onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                  placeholder={t('Calibration.cameraName')}
                />
                {comboOpen && cameraSuggestions.length > 0 && (
                  <ul className="cal-combo-list">
                    {cameraSuggestions.map((c) => (
                      <li
                        key={c}
                        onMouseDown={() => {
                          setCameraName(c);
                          setComboOpen(false);
                        }}
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                className="input-field-oblique mt-1"
                type="text"
                value={lensName}
                onChange={(e) => setLensName(e.target.value)}
                placeholder={t('Calibration.lensName')}
              />
              <input
                className="input-field-oblique mt-1"
                type="text"
                value={imageResolution ? `${imageResolution.width} × ${imageResolution.height} px` : ''}
                readOnly
                tabIndex={-1}
                placeholder={t('Calibration.resolution')}
                style={{ background: 'var(--input-background-disabled)', cursor: 'default' }}
              />
              {savedPath && (
                <div className="cal-save-confirm-box">
                  <span className="cal-confirm-title">✓ {t('Calibration.savedTo')}</span>
                  <button className="cal-confirm-link" onClick={() => onRevealPath(savedPath)}>
                    {savedPath}
                  </button>
                </div>
              )}
              {saveError && <p className="cal-error-chip">{saveError}</p>}
            </div>
          </>
        )}

        <div className="cal-back-section">
          <button className="wizard-button button-1" onClick={onClose}>
            {t('Wizard.back')}
          </button>
          {status === 'solved' && (
            <button
              className="wizard-button button-1"
              onClick={async () => {
                setSaveError(null);
                const result = await onSaveProfile(cameraName, lensName);
                if (result) {
                  setSavedPath(result);
                  setCameraName('');
                  setLensName('');
                } else {
                  setSaveError(t('Calibration.errorGeneric'));
                }
              }}
              disabled={!cameraName.trim() || !lensName.trim()}
            >
              {t('Calibration.saveProfile')}
            </button>
          )}
        </div>
      </div>
    ),
    [
      status,
      summary,
      csvRows,
      maxCsvCount,
      progressMsg,
      errorMsg,
      cameraName,
      lensName,
      imageResolution,
      savedPath,
      saveError,
      cameraSuggestions,
      comboOpen,
      images.length,
      onOpenBoard,
      onOpenFolder,
      onSolve,
      onSaveProfile,
      onRevealPath,
      onClose,
      dragOver,
      handleDrop,
      t,
    ]
  );

  return (
    <div className="cal-overlay" ref={overlayRef}>
      <div className="cal-body">
        {/* ══════════════ LEFT PANEL ══════════════ */}
        <div className="cal-left">
          {/* Canvas */}
          <div className="cal-canvas">{images.length > 0 && getCanvasContent()}</div>

          {/* View controls */}
          {status === 'solved' && (
            <div className="cal-view-controls">
              <button
                className={`button-1 cal-view-btn${viewMode !== 'heatmap' ? ' cal-view-btn--active' : ''}`}
                onClick={() => setViewMode(viewMode === 'overlay' ? 'undistorted' : 'overlay')}
              >
                {viewMode === 'undistorted' ? t('Calibration.undistorted') : t('Calibration.overlay')}
              </button>
              {heatmapBase64 && (
                <button
                  className={`button-1 cal-view-btn${viewMode === 'heatmap' ? ' cal-view-btn--active' : ''}`}
                  onClick={() => setViewMode(viewMode === 'heatmap' ? 'overlay' : 'heatmap')}
                >
                  {t('Calibration.heatmap')}
                </button>
              )}
            </div>
          )}

          {/* Carousel */}
          {images.length > 0 && (
            <>
              <div className="cal-resize-handle" onMouseDown={onCalResizeDrag} />
              <div
                ref={calCarouselRef}
                className="cal-carousel"
                style={
                  {
                    '--thumb-height': `${thumbHeight}px`,
                    '--thumb-width': `${thumbWidth}px`,
                  } as React.CSSProperties
                }
              >
                {images.map((img, idx) => (
                  <CalThumb
                    key={img}
                    img={img}
                    thumbSrc={thumbs[idx] ?? img}
                    idx={idx}
                    active={idx === selectedIdx}
                    unused={status === 'solved' && !usedSet.has(img)}
                    notUsedLabel={t('Calibration.notUsed')}
                    onSelect={setSelectedIdx}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ══════════════ RIGHT PANEL ══════════════ */}
        {rightPanel}
      </div>
    </div>
  );
};
