import { useEffect, useRef, useState, useCallback, useMemo, memo, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheckCircle } from 'react-icons/lu';
import { useAutoShrinkFont, useCalibrationSlice, useResizableCarousel } from '../hooks';
import { Icon, Loading, SuccessBanner } from '../components';
import { CalibrationHistogram } from '../components/Graphs';
import { DropHereText } from '../components/Forms/Components';
import { back, play } from '../assets/icons/icons';

// Backslash isn't a valid separator for the "cal-file" URL scheme (only special schemes
// like http/file get that WHATWG normalization), so Windows paths (C:\Users\...) must be
// converted to forward slashes with a leading "/" before the drive letter — mirrored on
// the main-process side in main.ts's cal-file protocol.handle.
const toCalFileUrl = (p: string) => {
  const normalized = p.replace(/\\/g, '/');
  return `cal-file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

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
      <img src={toCalFileUrl(thumbSrc)} alt="" loading="lazy" />
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

interface FrameCorners {
  detected: number[][];
  projected: number[][];
  rms: number;
}

interface UndistortedOverlayProps {
  src: string;
  corners: FrameCorners;
}

const UndistortedOverlay: FC<UndistortedOverlayProps> = ({ src, corners }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const iw = img.clientWidth;
    const ih = img.clientHeight;
    if (!iw || !ih) return;

    // Size canvas buffer to match the rendered image, then position it exactly over the image.
    canvas.width = iw;
    canvas.height = ih;
    canvas.style.width = `${iw}px`;
    canvas.style.height = `${ih}px`;
    canvas.style.left = `${img.offsetLeft}px`;
    canvas.style.top = `${img.offsetTop}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = iw / img.naturalWidth;
    const scaleY = ih / img.naturalHeight;

    ctx.clearRect(0, 0, iw, ih);

    corners.detected.forEach(([dx, dy], i) => {
      const px = [corners.projected[i][0] * scaleX, corners.projected[i][1] * scaleY];
      const dp = [dx * scaleX, dy * scaleY];

      ctx.strokeStyle = 'rgba(50, 180, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dp[0], dp[1]);
      ctx.lineTo(px[0], px[1]);
      ctx.stroke();

      ctx.fillStyle = 'rgb(240, 0, 0)';
      ctx.beginPath();
      ctx.arc(dp[0], dp[1], 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgb(240, 240, 240)';
      ctx.beginPath();
      ctx.arc(px[0], px[1], 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`RMS ${corners.rms.toFixed(3)} px`, 10, 22);
  }, [corners]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) {
      draw();
    } else {
      img.addEventListener('load', draw);
      return () => img.removeEventListener('load', draw);
    }
  }, [draw]);

  useEffect(() => {
    const obs = new ResizeObserver(draw);
    if (imgRef.current) obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [draw]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img ref={imgRef} className="cal-canvas-img" src={src} alt="Undistorted" />
      <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
    </div>
  );
};

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
    undistortedPaths,
    perFrameCorners,
    progressPercentage,
    progressTime,
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
  const heatmapButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);

  const { height: thumbHeight, onDragHandleMouseDown: onCalResizeDrag } = useResizableCarousel({
    storageKey: 'river-cal-carousel-height',
    defaultHeight: 90,
    minHeight: 50,
    maxHeight: 220,
    onDragProgress: (h) => {
      const w = Math.round(h * (56 / 42));
      calCarouselRef.current?.style.setProperty('--thumb-height', `${h}px`);
      calCarouselRef.current?.style.setProperty('--thumb-width', `${w}px`);
    },
  });
  const thumbWidth = Math.round(thumbHeight * (56 / 42));

  const scrollCalCarousel = useCallback((direction: 'backward' | 'forward') => {
    const el = calCarouselRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8 * (direction === 'backward' ? -1 : 1);
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

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

  // After solve, switch to undistorted (corrected view with canvas overlay) and reset selection to first used frame.
  useEffect(() => {
    if (status === 'solved') {
      setViewMode('undistorted');
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
      img.src = toCalFileUrl(p);
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
        <img className="cal-canvas-img" src={toCalFileUrl(images[selectedIdx])} alt={`Frame ${selectedIdx + 1}`} />
      );
    }

    if (viewMode === 'heatmap' && heatmapBase64) {
      return <img className="cal-canvas-img" src={`data:image/png;base64,${heatmapBase64}`} alt="Heatmap" />;
    }

    if (viewMode === 'overlay') {
      return (
        <img className="cal-canvas-img" src={toCalFileUrl(images[selectedIdx])} alt={`Frame ${selectedIdx + 1}`} />
      );
    }

    if (viewMode === 'undistorted') {
      const undistorted = getUndistortedForSelected();
      if (!undistorted) {
        return (
          <div className="cal-canvas-placeholder">
            <p>{t('Calibration.notUsed')}</p>
          </div>
        );
      }
      const selectedImg = images[selectedIdx];
      const usedIdx = selectedImg ? usedImages.indexOf(selectedImg) : -1;
      const corners = usedIdx >= 0 ? perFrameCorners[usedIdx] : undefined;
      if (corners) {
        return <UndistortedOverlay src={toCalFileUrl(undistorted)} corners={corners} />;
      }
      return <img className="cal-canvas-img" src={toCalFileUrl(undistorted)} alt="Undistorted" />;
    }

    return (
      <img className="cal-canvas-img" src={toCalFileUrl(images[selectedIdx])} alt={`Frame ${selectedIdx + 1}`} />
    );
  };

  const getUndistortedForSelected = () => {
    const selectedImg = images[selectedIdx];
    if (!selectedImg) return null;
    const usedIdx = usedImages.indexOf(selectedImg);
    if (usedIdx < 0) return null;
    return undistortedPaths[usedIdx] ?? null;
  };

  const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const remainingTimeLabel = t('Analizing.remainingTime');

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
          <button className="button-1" onClick={() => onOpenBoard()} disabled={status === 'solving'}>
            {t('Calibration.board')}
          </button>
          <button className="button-1" onClick={onOpenFolder} disabled={status === 'solving'}>
            {t('Calibration.import')}
          </button>
          <button className="button-1" onClick={onSolve} disabled={status === 'solving' || images.length === 0}>
            {t('Calibration.solve')}
          </button>
        </div>

        {status === 'solving' && (
          <div className="cal-solving-loader">
            <Loading
              percentage={progressPercentage}
              time={progressTime ? `${remainingTimeLabel}${progressTime}` : ''}
              size="big"
              isComplete={progressPercentage === '100%'}
            />
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

            {csvRows.length > 0 && (
              <div className="cal-histogram">
                <CalibrationHistogram rows={csvRows} />
              </div>
            )}
          </div>
        )}

        {images.length === 0 && (
          <DropHereText text={`${t('Calibration.dropZone')} ${t('Calibration.dropHint')}`} show={true} />
        )}

        {status === 'solved' && (
          <div className="cal-save-section">
            <div className="simple-input-container cal-combo">
              <label>{t('Calibration.cameraName')}</label>
              <input
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
            <div className="simple-input-container">
              <label>{t('Calibration.lensName')}</label>
              <input
                type="text"
                value={lensName}
                onChange={(e) => setLensName(e.target.value)}
                placeholder={t('Calibration.lensName')}
              />
            </div>
            <div className="simple-input-container">
              <label>{t('Calibration.resolution')}</label>
              <input
                type="text"
                value={imageResolution ? `${imageResolution.width} × ${imageResolution.height} px` : ''}
                readOnly
                tabIndex={-1}
                placeholder={t('Calibration.resolution')}
                style={{ background: 'var(--input-background-disabled)', cursor: 'default' }}
              />
            </div>
            {savedPath && (
              <SuccessBanner compact icon={LuCheckCircle} title={t('Calibration.savedTo')}>
                <button className="success-banner-link" onClick={() => onRevealPath(savedPath)}>
                  {savedPath}
                </button>
              </SuccessBanner>
            )}
            {saveError && <p className="cal-error-chip">{saveError}</p>}
          </div>
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
      progressPercentage,
      progressTime,
      remainingTimeLabel,
      errorMsg,
      cameraName,
      lensName,
      imageResolution,
      savedPath,
      saveError,
      cameraSuggestions,
      comboOpen,
      images.length,
      dragOver,
      handleDrop,
      onOpenBoard,
      onOpenFolder,
      onSolve,
      onSaveProfile,
      onRevealPath,
      onClose,
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

          {/* Carousel (resize handle, then view controls, then thumbnails — matching the
              real Carousel component's resize-handle → carousel-info → thumbnail-list order) */}
          {images.length > 0 && (
            <>
              <div className="cal-resize-handle" onMouseDown={onCalResizeDrag} />

              {status === 'solved' && (
                <div className="cal-view-controls">
                  <button
                    className={`wizard-button${viewMode !== 'heatmap' ? ' wizard-button-active' : ''}`}
                    onClick={() => setViewMode(viewMode === 'overlay' ? 'undistorted' : 'overlay')}
                  >
                    {viewMode === 'undistorted' ? t('Calibration.undistorted') : t('Calibration.overlay')}
                  </button>
                  {heatmapBase64 && (
                    <button
                      ref={heatmapButtonRef}
                      className={`wizard-button${viewMode === 'heatmap' ? ' wizard-button-active' : ''}`}
                      onClick={() => setViewMode(viewMode === 'heatmap' ? 'overlay' : 'heatmap')}
                    >
                      {t('Calibration.heatmap')}
                    </button>
                  )}
                  <div className="cal-carousel-counter">
                    <span>{selectedIdx + 1}</span>
                    <p> / {images.length}</p>
                  </div>
                </div>
              )}

              <div className="cal-carousel-row">
                <button className="video-button" onClick={() => scrollCalCarousel('backward')}>
                  <Icon path={back} />
                </button>
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
                <button className="video-button" onClick={() => scrollCalCarousel('forward')}>
                  <Icon path={play} />
                </button>
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
