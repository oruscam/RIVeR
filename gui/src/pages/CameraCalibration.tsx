import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalibrationSlice } from '../hooks';
import camCalIcon from '../assets/cam_calibration.svg';

type ViewMode = 'snapshot' | 'overlay' | 'undistorted' | 'heatmap';

interface Props {
  onClose: () => void;
}

export const CameraCalibration: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation();
  const {
    status,
    images,
    usedImages,
    summary,
    csvRows,
    heatmapBase64,
    overlayPaths,
    profilePath,
    progressMsg,
    errorMsg,
    onOpenFolder,
    onOpenBoard,
    onSolve,
    onSaveProfile,
    onRevealPath,
  } = useCalibrationSlice();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('snapshot');
  const [profileName, setProfileName] = useState('calibration_profile');
  const [saveConfirm, setSaveConfirm] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  const isUsed = (imgPath: string) => usedImages.includes(imgPath);

  // After solve, switch to overlay and reset selection to first used frame.
  useEffect(() => {
    if (status === 'solved') {
      setViewMode('overlay');
      const firstUsedIdx = images.findIndex((img) => usedImages.includes(img));
      setSelectedIdx(firstUsedIdx >= 0 ? firstUsedIdx : 0);
    }
  }, [status, images, usedImages]);

  // Keyboard navigation.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const items = e.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        const file = items[i].getAsFile();
        if (file) {
          const dirPath = window.webUtils.getPathForFile(file);
          const parentDir = dirPath.substring(0, dirPath.lastIndexOf('/'));
          await window.ipcRenderer.invoke('calibration-scan-images', { dir: parentDir });
        }
      }
    }
  }, []);

  const handleSave = async () => {
    const dest = await onSaveProfile(profileName);
    if (dest) {
      setSaveConfirm(typeof dest === 'string' ? dest : '');
      setTimeout(() => setSaveConfirm(''), 4000);
    }
  };

  const getCanvasContent = () => {
    if (status === 'error' || images.length === 0) return null;

    if (status === 'idle') {
      return (
        <img className="cal-canvas-img" src={`cal-file://${images[selectedIdx]}`} alt={`Frame ${selectedIdx + 1}`} />
      );
    }

    if (status === 'solving') {
      return (
        <div className="cal-canvas-overlay">
          <div className="loader-little" />
          <p className="cal-progress-text">{progressMsg || t('Calibration.solving')}</p>
        </div>
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
      return (
        <div className="cal-canvas-placeholder">
          <p>{t('Calibration.undistortedHint')}</p>
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

  const gradeColor = (grade: string) => {
    if (grade === 'good') return 'cal-badge-good';
    if (grade === 'fair') return 'cal-badge-fair';
    return 'cal-badge-bad';
  };

  const metricTint = (value: number, goodThresh: number, badThresh: number, higherIsBetter = true) => {
    if (higherIsBetter) {
      if (value >= goodThresh) return 'cal-metric-good';
      if (value >= badThresh) return 'cal-metric-fair';
      return 'cal-metric-bad';
    } else {
      if (value <= goodThresh) return 'cal-metric-good';
      if (value <= badThresh) return 'cal-metric-fair';
      return 'cal-metric-bad';
    }
  };

  const maxCsvCount = csvRows.length > 0 ? Math.max(...csvRows.map((r) => r.count)) : 1;

  return (
    <div className="cal-overlay" ref={overlayRef}>
      {/* ── Header bar ── */}
      <div className="cal-header">
        <div className="cal-header-left">
          <img src={camCalIcon} className="cal-header-icon" alt="" />
          <span className="cal-header-title">{t('Calibration.title')}</span>
        </div>
        <button className="cal-close-btn" onClick={onClose} aria-label={t('Calibration.close')}>
          ✕
        </button>
      </div>

      <div className="cal-body">
        {/* ══════════════ LEFT PANEL ══════════════ */}
        <div className="cal-left" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          {/* Canvas */}
          <div className="cal-canvas">
            {images.length === 0 ? (
              <div className="cal-drop-zone">
                <p className="cal-drop-text">{t('Calibration.dropZone')}</p>
                <p className="cal-drop-hint">{t('Calibration.dropHint')}</p>
              </div>
            ) : (
              <>
                {getCanvasContent()}
                {status === 'solved' && viewMode !== 'heatmap' && (
                  <div className="cal-view-tabs">
                    <button
                      className={`cal-view-tab ${viewMode === 'overlay' ? 'active' : ''}`}
                      onClick={() => setViewMode('overlay')}
                    >
                      1 {t('Calibration.overlay')}
                    </button>
                    <button
                      className={`cal-view-tab ${viewMode === 'undistorted' ? 'active' : ''}`}
                      onClick={() => setViewMode('undistorted')}
                    >
                      2 {t('Calibration.undistorted')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Carousel */}
          {images.length > 0 && (
            <div className="cal-carousel">
              {images.map((img, idx) => {
                const used = isUsed(img);
                const active = idx === selectedIdx;
                return (
                  <button
                    key={img}
                    className={`cal-thumb ${active ? 'active' : ''} ${status === 'solved' && !used ? 'unused' : ''}`}
                    onClick={() => setSelectedIdx(idx)}
                    title={status === 'solved' && !used ? t('Calibration.notUsed') : img.split('/').pop()}
                  >
                    <img src={`cal-file://${img}`} alt="" />
                    {status === 'solved' && <span className={`cal-thumb-dot ${used ? 'used' : 'unused'}`} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Heatmap pill */}
          {status === 'solved' && heatmapBase64 && (
            <button
              className={`cal-heatmap-pill ${viewMode === 'heatmap' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'heatmap' ? 'overlay' : 'heatmap')}
            >
              ▣ {t('Calibration.heatmap')}
            </button>
          )}
        </div>

        {/* ══════════════ RIGHT PANEL ══════════════ */}
        <div className="cal-right">
          {/* Buttons */}
          <div className="cal-actions">
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
            <button
              className={`button-1 cal-action-btn ${status === 'solving' ? 'button-with-loader-active' : ''}`}
              onClick={onSolve}
              disabled={status === 'solving' || images.length === 0}
            >
              {status === 'solving' ? (
                <span className="cal-solving-label">
                  <span className="loader-little cal-btn-spinner" />
                  {t('Calibration.solving')}
                </span>
              ) : (
                t('Calibration.solve')
              )}
            </button>
          </div>

          {/* Streaming status */}
          {status === 'solving' && progressMsg && <p className="cal-stream-msg">{progressMsg}</p>}

          {/* Error chip */}
          {(status === 'error' || errorMsg) && (
            <div className="cal-error-chip">⚠ {errorMsg || t('Calibration.errorGeneric')}</div>
          )}

          {/* ── Solved state ── */}
          {status === 'solved' && summary && (
            <div className="cal-results">
              {/* Overall badge */}
              <div className={`cal-badge ${gradeColor(summary.verdict?.grade_overall ?? '')}`}>
                {(summary.verdict?.grade_overall ?? '').toUpperCase()}
              </div>

              {/* Metrics grid */}
              <div className="cal-metrics-grid">
                <div className="cal-metric">
                  <span className="cal-metric-label">{t('Calibration.metrics.medianRms')}</span>
                  <span className={`cal-metric-value ${metricTint(summary.median_rms, 0.5, 1.0, false)}`}>
                    {summary.median_rms?.toFixed(3)} px
                  </span>
                </div>
                <div className="cal-metric">
                  <span className="cal-metric-label">{t('Calibration.metrics.p90Rms')}</span>
                  <span
                    className={`cal-metric-value ${metricTint(summary.verdict?.p90_rms ?? 0, 0.8, 1.5, false)}`}
                  >
                    {summary.verdict?.p90_rms?.toFixed(3)} px
                  </span>
                </div>
                <div className="cal-metric">
                  <span className="cal-metric-label">{t('Calibration.metrics.coverage')}</span>
                  <span className={`cal-metric-value ${metricTint(summary.coverage_percent, 60, 40, true)}`}>
                    {summary.coverage_percent?.toFixed(1)} %
                  </span>
                </div>
                <div className="cal-metric">
                  <span className="cal-metric-label">{t('Calibration.metrics.edgeReach')}</span>
                  <span className={`cal-metric-value ${metricTint(summary.edge_reach_median, 0.7, 0.5, true)}`}>
                    {summary.edge_reach_median?.toFixed(3)}
                  </span>
                </div>
                <div className="cal-metric">
                  <span className="cal-metric-label">{t('Calibration.metrics.poseSpread')}</span>
                  <span className={`cal-metric-value ${metricTint(summary.pose_spread_median_deg, 20, 10, true)}`}>
                    {summary.pose_spread_median_deg?.toFixed(1)} °
                  </span>
                </div>
                <div className="cal-metric">
                  <span className="cal-metric-label">{t('Calibration.metrics.centerOffset')}</span>
                  <span
                    className={`cal-metric-value ${metricTint(summary.verdict?.center_offset_max_pct ?? 0, 5, 10, false)}`}
                  >
                    {summary.verdict?.center_offset_max_pct?.toFixed(1)} %
                  </span>
                </div>
              </div>

              {/* Recommendations */}
              {summary.verdict?.actions?.length > 0 && (
                <div className="cal-recommendations">
                  <p className="cal-rec-title">{t('Calibration.recommendations')}</p>
                  <ul>
                    {summary.verdict.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <hr className="cal-divider" />

              {/* Per-view RMS histogram */}
              {csvRows.length > 0 && (
                <div className="cal-histogram">
                  <p className="cal-section-label">{t('Calibration.histogram')}</p>
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
              )}

              {/* Save profile */}
              <div className="cal-save-row">
                <input
                  className="input-field cal-name-input"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder={t('Calibration.profileName')}
                />
                <button className="button-1 cal-save-btn" onClick={handleSave}>
                  {t('Calibration.saveProfile')}
                </button>
              </div>
              {saveConfirm && (
                <p className="cal-save-confirm">
                  ✓ {t('Calibration.savedTo')}{' '}
                  <button className="cal-link" onClick={() => onRevealPath(saveConfirm)}>
                    {saveConfirm}
                  </button>
                </p>
              )}

              {/* Validation card */}
              <div className="cal-validation-card">
                <p className="cal-section-label">{t('Calibration.outputs')}</p>
                {summary.overlays_dir && (
                  <button className="cal-link" onClick={() => onRevealPath(summary.overlays_dir)}>
                    {t('Calibration.overlaysDir')}
                  </button>
                )}
                {summary.undistorted_dir && (
                  <button className="cal-link" onClick={() => onRevealPath(summary.undistorted_dir)}>
                    {t('Calibration.undistortedDir')}
                  </button>
                )}
                {profilePath && (
                  <button className="cal-link" onClick={() => onRevealPath(profilePath)}>
                    {t('Calibration.profileJson')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty/ready state hint */}
          {status === 'idle' && images.length > 0 && (
            <p className="cal-ready-hint">{t('Calibration.readyToSolve')}</p>
          )}
          {status === 'idle' && images.length === 0 && (
            <p className="cal-ready-hint">{t('Calibration.emptyHint')}</p>
          )}
        </div>
      </div>
    </div>
  );
};
