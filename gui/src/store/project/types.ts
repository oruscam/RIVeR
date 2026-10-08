import type { ProjectIssues, VideoSpec } from '../../../commons/projectIssues';
import type { VideoSource } from '../../../commons/framesSource';

/** Missing inputs reported on load (spec §3–§4), plus the last refused video. */
interface ProjectIssuesState extends ProjectIssues {
  videoMismatch: { expected: VideoSpec; found: VideoSpec } | null;
}

interface VideoData {
  name: string | null;
  path: string;
  width: number;
  height: number;
  fps: number;
  blob?: string | null;
  duration: number;
  creation: string;
  /** 'frames' when the project was started from a folder of frames; absent or 'video' otherwise. */
  source?: VideoSource;
  /** Frames projects only: images in the source folder. */
  frameCount?: number;
  /** Frames projects only: the time between frames in ms, exactly as typed. */
  intervalMs?: number;
}

interface StabilizationRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VideoParameters {
  step: number;
  startTime: number;
  endTime: number;
  startFrame: number;
  endFrame: number;
  factor: number;
  lensCorrection: string | null;
  stabilization: boolean;
  stabilizationRegions: StabilizationRegion[];
  // The config actually used for the frames currently on disk — every field
  // is compared against its committed counterpart before re-extracting, so
  // toggling a setting and reverting it doesn't force a needless re-extraction.
  committedFactor: number;
  committedLensCorrection: string | null;
  committedStabilization: boolean;
  committedStabilizationRegions: StabilizationRegion[];
}

interface Video {
  data: VideoData;
  parameters: VideoParameters;
  /** "Advanced settings" expanded state for Video Range's footer toggle.
   *  Lives here (not component state) so it survives navigating away and
   *  back, matching Cross Sections/UAV/Oblique's own extraFields. */
  extraFields: boolean;
}

interface ProjectDetails {
  riverName: string;
  site: string;
  unitSistem: string;
  meditionDate: string;
}

interface ProjectState {
  projectDirectory: string;
  video: Video;
  type: 'uav' | 'ipcam' | 'oblique' | '';
  firstFramePath: string;
  projectDetails: ProjectDetails;
  stabilizationActiveRegionIndex: number | null;
  issues: ProjectIssuesState;
}

export type { ProjectIssuesState, ProjectState, VideoData, VideoParameters, Video, ProjectDetails, StabilizationRegion };
