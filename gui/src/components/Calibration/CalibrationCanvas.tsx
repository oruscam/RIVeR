import { FC, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toCalFileUrl } from '../../helpers/calFileUrl';
import type { CalibrationViewMode } from '../../helpers/calibrationView';
import type { CalibrationStatus, FrameCorners } from '../../store/calibration/types';

/** How much the detected-to-projected residual is stretched when drawn. */
const RESIDUAL_GAIN = 10;

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

    // Residuals are sub-pixel at a good calibration, so the detected and
    // projected points nearly coincide. Each mark gets a dark halo so it reads
    // over both the white and black squares of the board, the projected point
    // is a hollow ring so the detected dot inside it stays visible, and the
    // detected-to-projected vector is stretched so its direction can be seen.
    const HALO = 'rgba(0, 0, 0, 0.75)';
    ctx.lineCap = 'round';

    corners.detected.forEach(([dx, dy], i) => {
      const dp = [dx * scaleX, dy * scaleY];
      const pp = [corners.projected[i][0] * scaleX, corners.projected[i][1] * scaleY];
      const tip = [dp[0] + (pp[0] - dp[0]) * RESIDUAL_GAIN, dp[1] + (pp[1] - dp[1]) * RESIDUAL_GAIN];

      ctx.beginPath();
      ctx.moveTo(dp[0], dp[1]);
      ctx.lineTo(tip[0], tip[1]);
      ctx.strokeStyle = HALO;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = 'rgb(50, 190, 255)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pp[0], pp[1], 6, 0, Math.PI * 2);
      ctx.strokeStyle = HALO;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = 'rgb(245, 245, 245)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(dp[0], dp[1], 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(240, 0, 0)';
      ctx.fill();
      ctx.strokeStyle = HALO;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.font = 'bold 13px Inter, sans-serif';
    const label = `RMS ${corners.rms.toFixed(3)} px · residuals ×${RESIDUAL_GAIN}`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = HALO;
    ctx.strokeText(label, 10, 22);
    ctx.fillStyle = 'white';
    ctx.fillText(label, 10, 22);
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
    <div className="cal-undistorted-wrap">
      <img ref={imgRef} className="cal-canvas-img" src={src} alt="Undistorted" />
      <canvas ref={canvasRef} className="cal-corner-overlay" />
    </div>
  );
};

interface CalibrationCanvasProps {
  viewMode: CalibrationViewMode;
  status: CalibrationStatus;
  /** Path of the selected original photo; undefined when no photos are loaded. */
  image: string | undefined;
  /** Corrected image for the selected photo, or null when the solver didn't use it. */
  undistortedPath: string | null;
  corners: FrameCorners | undefined;
  heatmapBase64: string | null;
}

/**
 * What the calibration canvas shows for the current view (spec amendment A12).
 * The page guarantees viewMode is available (it falls back to 'original'
 * otherwise); the explicit status/heatmap checks below are belt-and-braces so
 * a stale mode can never render an empty canvas.
 */
export const CalibrationCanvas = ({
  viewMode,
  status,
  image,
  undistortedPath,
  corners,
  heatmapBase64,
}: CalibrationCanvasProps) => {
  const { t } = useTranslation();

  if (!image) {
    return (
      <div className="cal-canvas">
        <p className="cal-canvas-placeholder">{t('Calibration.noPhotos', { defaultValue: 'No photos yet' })}</p>
      </div>
    );
  }

  const original = <img className="cal-canvas-img" src={toCalFileUrl(image)} alt={image.split('/').pop()} />;

  if (status !== 'solved' || viewMode === 'original') {
    return <div className="cal-canvas">{original}</div>;
  }

  if (viewMode === 'heatmap') {
    return (
      <div className="cal-canvas">
        {heatmapBase64 ? (
          <img className="cal-canvas-img" src={`data:image/png;base64,${heatmapBase64}`} alt="Heatmap" />
        ) : (
          original
        )}
      </div>
    );
  }

  if (!undistortedPath) {
    return (
      <div className="cal-canvas">
        <p className="cal-canvas-placeholder">{t('Calibration.notUsed')}</p>
      </div>
    );
  }

  return (
    <div className="cal-canvas">
      {corners ? (
        <UndistortedOverlay src={toCalFileUrl(undistortedPath)} corners={corners} />
      ) : (
        <img className="cal-canvas-img" src={toCalFileUrl(undistortedPath)} alt="Undistorted" />
      )}
    </div>
  );
};
