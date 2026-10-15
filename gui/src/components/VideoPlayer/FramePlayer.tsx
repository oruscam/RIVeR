import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../components.css';
import { Icons } from '../CustomIcons/Icons';
import { useRipple } from '../CustomIcons/useRipple';
import { useImageZoomPan } from '../../hooks';
import { clampIndex, indexFromProgress, playbackDelay, progressFromIndex } from '../../helpers/framePlayback';

interface FramePlayerProps {
  /** Image URLs in import order. */
  frames: string[];
  fps: number;
  /** 0-based index of the frame on screen; owned by the page so the form can read it. */
  currentFrame: number;
  onFrameChange: (index: number) => void;
  /** Same contract as VideoPlayer's overlay, so StabilizationCanvas works unchanged. */
  overlay?: (zoom: { scale: number; position: { x: number; y: number } }) => React.ReactNode;
}

/** How many frames ahead are decoded while playing or stepping. */
const LOOK_AHEAD = 3;

/** VideoPlayer's counterpart for a project made from a folder of frames. */
export const FramePlayer = ({ frames, fps, currentFrame, onFrameChange, overlay }: FramePlayerProps) => {
  const count = frames.length;
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const seekBar = useRef<HTMLDivElement>(null);
  const [zoomContainerSize, setZoomContainerSize] = useState({ width: 0, height: 0 });
  const [playing, setPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [backRipple, fireBack] = useRipple();
  const [playRipple, firePlay] = useRipple();
  const [nextRipple, fireNext] = useRipple();

  useEffect(() => {
    const el = zoomContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setZoomContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
    // The container only exists once frames have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count > 0]);

  const {
    scale,
    position,
    handleWheel,
    handleMouseDown: handleZoomMouseDown,
    handleMouseMove: handleZoomMouseMove,
    handleMouseUp: handleZoomMouseUp,
    handleDoubleClick: handleZoomDoubleClick,
    handleDragStart: handleZoomDragStart,
  } = useImageZoomPan({
    containerWidth: zoomContainerSize.width,
    containerHeight: zoomContainerSize.height,
    minScale: 1,
    maxScale: 5,
    zoomSpeed: 0.0015,
  });

  // Playback: advance one frame per tick and loop, like the video element does.
  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = window.setInterval(() => {
      onFrameChange(currentFrame + 1 >= count ? 0 : currentFrame + 1);
    }, playbackDelay(fps));
    return () => window.clearInterval(timer);
  }, [playing, count, fps, currentFrame, onFrameChange]);

  // Decode the next few frames so stepping and playback do not flash an empty image.
  useEffect(() => {
    for (let ahead = 1; ahead <= LOOK_AHEAD; ahead++) {
      const src = frames[currentFrame + ahead];
      if (src) new Image().src = src;
    }
  }, [frames, currentFrame]);

  const seek = useCallback(
    (clientX: number) => {
      if (!seekBar.current) return;
      const rect = seekBar.current.getBoundingClientRect();
      const fraction = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      onFrameChange(indexFromProgress(fraction, count));
    },
    [count, onFrameChange]
  );

  useEffect(() => {
    if (!scrubbing) return;
    const onMove = (event: MouseEvent) => seek(event.clientX);
    const onUp = () => setScrubbing(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [scrubbing, seek]);

  const step = (direction: -1 | 1) => {
    setPlaying(false);
    // The frame buttons move by the form's Step, as they do for a video.
    const stepInput = document.getElementById('input-step') as HTMLInputElement | null;
    const size = stepInput ? parseFloat(stepInput.value) || 1 : 1;
    onFrameChange(clampIndex(currentFrame + direction * size, count));
  };

  if (count === 0) return null;

  const progress = `${progressFromIndex(currentFrame, count)}%`;

  return (
    <div className="video-player">
      <div
        className="video"
        ref={zoomContainerRef}
        style={{ position: 'relative', overflow: 'hidden' }}
        onWheel={handleWheel}
        onMouseDown={handleZoomMouseDown}
        onMouseMove={handleZoomMouseMove}
        onMouseUp={handleZoomMouseUp}
        onMouseLeave={handleZoomMouseUp}
        onDoubleClick={handleZoomDoubleClick}
        onDragStart={handleZoomDragStart}
      >
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '50% 50%',
            willChange: 'transform',
          }}
        >
          <img className="video" src={frames[clampIndex(currentFrame, count)]} alt="" draggable={false} />
          {overlay?.({ scale, position })}
        </div>
      </div>

      <div className="video-controls">
        <div className="video-player-time">
          {clampIndex(currentFrame, count) + 1} / {count}
        </div>
        <div
          className="video-player-seekbar"
          ref={seekBar}
          onMouseDown={(event) => {
            setPlaying(false);
            setScrubbing(true);
            seek(event.clientX);
          }}
        >
          <span id="background-track"></span>
          <span id="progress-track" style={{ '--progress': progress } as React.CSSProperties}></span>
          <span id="thumb" style={{ '--progress': progress } as React.CSSProperties}></span>
        </div>
        <div className="row" style={{ width: '100%', justifyContent: 'space-between', paddingTop: '10px' }}>
          <button
            type="button"
            className="ibtn"
            onClick={() => {
              fireBack('var(--primary-text-color, #888)');
              step(-1);
            }}
          >
            {backRipple}
            <span className="cl show">{Icons.FrameBack('currentColor')}</span>
          </button>
          <button
            type="button"
            className="ibtn"
            onClick={() => {
              firePlay('var(--primary-text-color, #888)');
              setPlaying((value) => !value);
            }}
          >
            {playRipple}
            <span className="cl show">{playing ? Icons.Pause('currentColor') : Icons.Play('currentColor')}</span>
          </button>
          <button
            type="button"
            className="ibtn"
            onClick={() => {
              fireNext('var(--primary-text-color, #888)');
              step(1);
            }}
          >
            {nextRipple}
            <span className="cl show">{Icons.FrameNext('currentColor')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
