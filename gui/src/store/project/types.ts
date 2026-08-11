interface VideoData {
  name: string | null;
  path: string;
  width: number;
  height: number;
  fps: number;
  blob?: string | null;
  duration: number;
  creation: string;
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
}

export type { ProjectState, VideoData, VideoParameters, Video, ProjectDetails, StabilizationRegion };
