import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { VideoPlayerSeekBar } from './VideoPlayerSeekBar.js';
import { VideoPlayerTime } from './VideoPlayerTime.js';
import '../components.css';
import { PlayBtn } from '../CustomIcons/VideoPlayerIcons/PlayBtn.tsx';
import { FrameBtn } from '../CustomIcons/VideoPlayerIcons/FrameBtn.tsx';
import { SoundBtn } from '../CustomIcons/VideoPlayerIcons/SoundBtn.tsx';
import { useImageZoomPan } from '../../hooks';

interface VideoPlayerProps {
  fileURL: string;
  duration: number;
  /** Receives the current zoom scale so overlay controls (e.g. a confirm
   *  button) can counteract it and keep a constant on-screen size. */
  overlay?: (zoom: { scale: number }) => React.ReactNode;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ fileURL, duration, overlay }, ref) => {
    const internalRef = useRef<HTMLVideoElement>(null);
    const videoRef = (ref as React.RefObject<HTMLVideoElement> | null) ?? internalRef;
    const zoomContainerRef = useRef<HTMLDivElement>(null);
    const [zoomContainerSize, setZoomContainerSize] = useState({ width: 0, height: 0 });

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
    }, []);

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

    const [bufferAmount, setBufferAmount] = useState<number>(0);
    const [progressAmount, setProgressAmount] = useState<number>(0);
    const [control, setControl] = useState<{ play: boolean; volume: boolean }>({
      play: false,
      volume: true,
    });
    const [currentTime, setCurrentTime] = useState<number>(0);

    const onVideoProgress = () => {
      if (videoRef.current) {
        if (duration > 0) {
          for (let i = 0; i < videoRef.current.buffered.length; i++) {
            if (
              videoRef.current.buffered.start(videoRef.current.buffered.length - 1 + i) <
              (videoRef.current.currentTime || 0)
            ) {
              setBufferAmount(
                (videoRef.current.buffered.end(videoRef.current.buffered.length - 1 + i) * 100) / duration
              );
              break;
            }
          }
        }
      }
    };

    const onVideoTimeUpdate = () => {
      if (videoRef.current) {
        if (duration > 0) {
          setCurrentTime(videoRef.current.currentTime || 0);
          setProgressAmount(((videoRef.current.currentTime || 0) / duration) * 100);
        }
      }
    };

    const handleFrameStep = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setControl((prev) => ({ ...prev, play: false }));
      }
    };

    return (
      <>
        {fileURL && (
          <div className="video-player">
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <SoundBtn videoRef={videoRef} control={control} setControl={setControl} />
            </div>
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
                <video
                  className="video"
                  loop={true}
                  ref={videoRef}
                  src={fileURL}
                  autoPlay={false}
                  controls={false}
                  muted={control.volume}
                  onProgress={onVideoProgress}
                  onTimeUpdate={onVideoTimeUpdate}
                  id="video"
                ></video>
                {overlay?.({ scale })}
              </div>
            </div>

            <div className="video-controls">
              <VideoPlayerTime duration={duration} currentTime={currentTime} />
              <VideoPlayerSeekBar
                bufferAmount={bufferAmount}
                progressAmount={progressAmount}
                setProgressAmount={setProgressAmount}
                videoRef={videoRef}
                setControl={setControl}
                control={control}
              ></VideoPlayerSeekBar>
              <div className="row" style={{ width: '100%', justifyContent: 'space-between', paddingTop: '10px' }}>
                <FrameBtn videoRef={videoRef} direction="back" onClick={handleFrameStep} />

                <PlayBtn videoRef={videoRef} setControl={setControl} control={control} />

                <FrameBtn videoRef={videoRef} direction="next" onClick={handleFrameStep} />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
