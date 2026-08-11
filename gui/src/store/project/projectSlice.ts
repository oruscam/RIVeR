import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ProjectDetails, ProjectState, VideoData, VideoParameters } from './types';

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
};

const savedUnitSystem = localStorage.getItem('unitSystem') || 'si';

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
    setDefaultProjectState: (state) => {
      const preservedUnitSystem = localStorage.getItem('unitSystem') || 'si';
      state.projectDirectory = '';
      state.video = defaultVideo;
      state.type = '';
      state.firstFramePath = '';
      state.stabilizationActiveRegionIndex = null;
      state.projectDetails = {
        riverName: '',
        site: '',
        unitSistem: preservedUnitSystem,
        meditionDate: '',
      };
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
} = projectSlice.actions;

export default projectSlice.reducer;
