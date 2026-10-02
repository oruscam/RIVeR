import type { ReportModel } from './reportModel';

const round2 = (v: number) => Math.round(v * 100) / 100;

export function frameBox(videoWidth: number, videoHeight: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
  return { width: round2(videoWidth * scale), height: round2(videoHeight * scale) };
}

/** Same meaning as the old Report.tsx factor: resized-frame pixels per box pixel. */
export function frameFactor(
  videoWidth: number,
  videoHeight: number,
  resizeFactor: number,
  box: { width: number; height: number }
) {
  return { x: (videoWidth * resizeFactor) / box.width, y: (videoHeight * resizeFactor) / box.height };
}

/** Up to 5 evenly spread frames of the processed range: index into images.paths, and time in seconds from the video start. */
export function snapshotFrames(frameCount: number, startTime: number, endTime: number) {
  if (frameCount <= 0) return [];
  const count = Math.min(5, frameCount);
  if (count === 1) return [{ index: 0, time: startTime }];
  return Array.from({ length: count }, (_, k) => {
    const index = Math.round((k * (frameCount - 1)) / (count - 1));
    // Time follows the frame actually shown, so rounding never mislabels it.
    const time = startTime + (index / (frameCount - 1)) * (endTime - startTime);
    return { index, time: round2(time) };
  });
}
