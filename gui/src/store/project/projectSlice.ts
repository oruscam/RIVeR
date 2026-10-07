import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ProjectIssues, VideoSpec } from '../../../commons/projectIssues';
import { ProjectDetails, ProjectState, VideoData, VideoParameters } from './types';

const noIssues = () => ({ videoMissing: false, missingInputs: [], videoMismatch: null });

const defaultVideo = {
  data: {
    name: '',
    path: '',
    width: 0,
    height: 0,
    fps: 0,
    duration: 0,
    creation: '',
  },
  parameters: {
    step: 1,
    startTime: 0,
    endTime: 0,
    startFrame: 0,
    endFrame: 0,
    factor: 1,
    lensCorrection: null,
    stabilization: false,
    stabilizationRegions: [],
    committedFactor: 1,
    committedLensCorrection: null,
    committedStabilization: false,
    committedStabilizationRegions: [],
  },
  extraFields: false,
};

const savedUnitSystem = typeof localStorage !== 'undefined' ? localStorage.getItem('unitSystem') || 'si' : 'si';

const initialState: ProjectState = {
  projectDirectory: '',
  video: defaultVideo,
  type: '',
  firstFramePath: '',
  projectDetails: {
    riverName: '',
    site: '',
    unitSistem: savedUnitSystem,
    meditionDate: '',
  },
  stabilizationActiveRegionIndex: null,
  issues: noIssues(),
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProjectDirectory: (state, action: PayloadAction<string>) => {
      state.projectDirectory = action.payload;
    },
    setVideoData: (state, action: PayloadAction<VideoData>) => {
      state.video.data = action.payload;
    },
    setProjectType: (state, action: PayloadAction<'uav' | 'ipcam' | 'oblique'>) => {
      state.type = action.payload;
    },
    setVideoParameters: (state, action: PayloadAction<VideoParameters>) => {
      state.video.parameters = action.payload;
    },
    setFirstFramePath: (state, action: PayloadAction<string>) => {
      state.firstFramePath = action.payload;
    },
    setProjectDetails: (state, action: PayloadAction<ProjectDetails>) => {
      state.projectDetails = action.payload;
    },
    setStabilizationActiveRegionIndex: (state, action: PayloadAction<number | null>) => {
      state.stabilizationActiveRegionIndex = action.payload;
    },
    toggleVideoExtraFields: (state) => {
      state.video.extraFields = !state.video.extraFields;
    },
    setDefaultProjectState: (state) => {
      const preservedUnitSystem =
        typeof localStorage !== 'undefined' ? localStorage.getItem('unitSystem') || 'si' : 'si';
      state.projectDirectory = '';
      state.video = defaultVideo;
      state.type = '';
      state.firstFramePath = '';
      state.stabilizationActiveRegionIndex = null;
      state.issues = noIssues();
      state.projectDetails = {
        riverName: '',
        site: '',
        unitSistem: preservedUnitSystem,
        meditionDate: '',
      };
    },
    setProjectIssues: (state, action: PayloadAction<ProjectIssues>) => {
      state.issues = { ...action.payload, videoMismatch: null };
    },
    setVideoMismatch: (state, action: PayloadAction<{ expected: VideoSpec; found: VideoSpec } | null>) => {
      state.issues.videoMismatch = action.payload;
    },
    resolveVideoMissing: (state) => {
      state.issues.videoMissing = false;
      state.issues.videoMismatch = null;
    },
    /** Locating one file fixes every section that pointed at it. */
    resolveBathymetry: (state, action: PayloadAction<string>) => {
      state.issues.missingInputs = state.issues.missingInputs.filter(
        (input) => !(input.kind === 'bathymetry' && input.path === action.payload)
      );
    },
    resolveIpcamImages: (state) => {
      state.issues.missingInputs = state.issues.missingInputs.filter((input) => input.kind !== 'ipcamImages');
    },
  },
});

export const {
  setFirstFramePath,
  setProjectDetails,
  setProjectDirectory,
  setProjectType,
  setVideoData,
  setVideoParameters,
  setDefaultProjectState,
  setStabilizationActiveRegionIndex,
  toggleVideoExtraFields,
  setProjectIssues,
  setVideoMismatch,
  resolveVideoMissing,
  resolveBathymetry,
  resolveIpcamImages,
} = projectSlice.actions;

export default projectSlice.reducer;
