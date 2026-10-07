import * as path from 'path';
import { VideoSpec } from '../../../commons/projectIssues';

/** The `video` block createFolderStructure writes into settings.json. */
export interface SettingsVideo {
  filepath?: string;
  name?: string;
  total_length?: number;
  fps?: number;
  resolution?: { width?: number; height?: number };
}

/** Spec §3: stands in for ffprobe when the video file is gone. Same shape as getVideoMetadata. */
export function videoMetadataFromSettings(video: SettingsVideo) {
  const filepath = video.filepath ?? '';
  return {
    width: video.resolution?.width ?? 0,
    height: video.resolution?.height ?? 0,
    fps: video.fps ?? 0,
    duration: video.total_length ?? 0,
    creation: '',
    name: video.name ?? path.basename(filepath),
    path: filepath,
  };
}

export function settingsVideoSpec(video: SettingsVideo): VideoSpec {
  return { width: video.resolution?.width ?? 0, height: video.resolution?.height ?? 0, fps: video.fps ?? 0 };
}

/** Frames, matrix and masks depend on these, so a located video must match them. */
export function videoMismatch(expected: VideoSpec, found: VideoSpec): boolean {
  return (
    expected.width !== found.width ||
    expected.height !== found.height ||
    Math.round(expected.fps) !== Math.round(found.fps)
  );
}
