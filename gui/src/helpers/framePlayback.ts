/** Index maths for the frame player: a folder of frames scrubbed like a video. */

export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(Math.round(index), 0), count - 1);
}

/** `fraction` is the pointer's position along the seek bar, 0 to 1. */
export function indexFromProgress(fraction: number, count: number): number {
  return clampIndex(fraction * (count - 1), count);
}

/** Percentage along the seek bar for a frame. */
export function progressFromIndex(index: number, count: number): number {
  return count > 1 ? (clampIndex(index, count) / (count - 1)) * 100 : 0;
}

// Decoding full-size stills faster than this stutters; playback is a preview, not a measurement.
const MIN_DELAY_MS = 40;

export function playbackDelay(fps: number): number {
  return fps > 0 ? Math.max(MIN_DELAY_MS, 1000 / fps) : MIN_DELAY_MS;
}

/** `#`, `?` and `%` in a file name would cut or corrupt the URL, so only those are escaped. */
export function frameUrl(filePrefix: string, filePath: string): string {
  return filePrefix + filePath.replace(/[%#?]/g, encodeURIComponent);
}

/**
 * The source images the player may show. None when the folder could not be read, or when it
 * no longer holds as many frames as the project was made from: the range would not fit them.
 */
export function playableFrames(
  result: { files: string[] } | { error: string },
  frameCount: number | undefined,
  filePrefix: string
): string[] {
  if ('error' in result) return [];
  if (frameCount !== undefined && result.files.length !== frameCount) return [];
  return result.files.map((file) => frameUrl(filePrefix, file));
}
