/** Where a project's frames come from: a video file, or a folder of already-extracted frames. */
export type VideoSource = 'video' | 'frames';

/** The `video` block settings.json holds for a frames project. */
export interface FramesVideoBlock {
  source: 'frames';
  filepath: string;
  name: string;
  frame_count: number;
  total_length: number;
  time_between_frames: number;
  fps: number;
  resolution: { width: number; height: number };
}

// Seconds are stored to the microsecond, which hides float noise (40 / 1000 * 240).
const round6 = (value: number) => Number(value.toFixed(6));
// The interval itself is stored to the nanosecond: anything a user types in ms (16.6667) reads back unchanged.
const round9 = (value: number) => Number(value.toFixed(9));

/** The typed time between frames in ms, or null. A decimal comma is a decimal point. */
export function parseInterval(text: string): number | null {
  const normalised = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalised)) return null;
  const value = Number(normalised);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function fpsFromInterval(intervalMs: number): number {
  return 1000 / intervalMs;
}

/**
 * How many frames the backend writes for [startFrame, endFrame) and a step: it keeps the
 * source indices that are multiples of the step (river/core/frames_to_frames.selected_indices).
 */
export function selectedFrameCount(startFrame: number, endFrame: number, step: number): number {
  if (!Number.isInteger(step) || step < 1 || !(endFrame > startFrame)) return 0;
  return Math.max(0, Math.ceil(endFrame / step) - Math.ceil(Math.max(startFrame, 0) / step));
}

/**
 * The frame count the Video Range summary shows for the Start and End being typed (1-based,
 * End included). Text that is not a plain frame number counts nothing, as an unreadable time
 * does for a video, and End stops at the folder's last frame.
 */
export function summaryFrameCount(startText: string, endText: string, step: number, frameCount: number): number {
  const isDigits = (text: string) => /^\d+$/.test(text.trim());
  if (!isDigits(String(startText)) || !isDigits(String(endText))) return 0;
  const start = Number(startText);
  if (start < 1) return 0;
  return selectedFrameCount(start - 1, Math.min(Number(endText), frameCount), Number(step));
}

/** `start` and `end` are the 1-based frame numbers the form shows; `end` is included. */
export function frameRangeValid(start: number, end: number, count: number): boolean {
  return Number.isInteger(start) && Number.isInteger(end) && start >= 1 && start < end && end <= count;
}

export function frameRange(start: number, end: number, fps: number) {
  const startFrame = start - 1;
  const endFrame = end;
  return { startFrame, endFrame, startTime: round6(startFrame / fps), endTime: round6(endFrame / fps) };
}

export function withInterval<T extends { frame_count?: number }>(video: T, intervalMs: number) {
  return {
    ...video,
    fps: fpsFromInterval(intervalMs),
    time_between_frames: round9(intervalMs / 1000),
    total_length: round6(((video.frame_count ?? 0) * intervalMs) / 1000),
  };
}

export function framesVideoBlock(input: {
  folder: string;
  name: string;
  count: number;
  width: number;
  height: number;
  intervalMs: number;
}): FramesVideoBlock {
  const { folder, name, count, width, height, intervalMs } = input;
  const timing = withInterval({ frame_count: count }, intervalMs);
  return {
    source: 'frames',
    filepath: folder,
    name,
    frame_count: count,
    total_length: timing.total_length,
    time_between_frames: timing.time_between_frames,
    fps: timing.fps,
    resolution: { width, height },
  };
}

/** The interval in ms as the user typed it, read back from a settings `video` block. */
export function intervalFromSettings(video: { time_between_frames?: number; fps?: number }): number {
  if (video.time_between_frames) return round6(video.time_between_frames * 1000);
  return video.fps ? round6(1000 / video.fps) : 0;
}

export function extractionCommand(source?: string): 'video-to-frames' | 'frames-to-frames' {
  return source === 'frames' ? 'frames-to-frames' : 'video-to-frames';
}
