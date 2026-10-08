import * as path from 'path';
import { intervalFromSettings } from '../../../commons/framesSource';
import { VideoSpec } from '../../../commons/projectIssues';

/** The `video` block createFolderStructure writes into settings.json. */
export interface SettingsVideo {
  filepath?: string;
  name?: string;
  total_length?: number;
  fps?: number;
  resolution?: { width?: number; height?: number };
  /** 'frames' for a project made from a folder of frames; absent for a video. */
  source?: string;
  frame_count?: number;
  time_between_frames?: number;
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
    source: video.source === 'frames' ? ('frames' as const) : ('video' as const),
    frameCount: video.frame_count ?? 0,
    intervalMs: intervalFromSettings(video),
  };
}

export function settingsVideoSpec(video: SettingsVideo): VideoSpec {
  const spec: VideoSpec = {
    width: video.resolution?.width ?? 0,
    height: video.resolution?.height ?? 0,
    fps: video.fps ?? 0,
  };
  if (video.source === 'frames') spec.frameCount = video.frame_count ?? 0;
  return spec;
}

/** Frames, matrix and masks depend on these, so a located video or frames folder must match them. */
export function videoMismatch(expected: VideoSpec, found: VideoSpec): boolean {
  return (
    expected.width !== found.width ||
    expected.height !== found.height ||
    Math.round(expected.fps) !== Math.round(found.fps) ||
    (expected.frameCount ?? 0) !== (found.frameCount ?? 0)
  );
}
