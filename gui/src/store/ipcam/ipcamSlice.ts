import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CameraSolution, Ipcam, SetCustomPointPayload, SetImagesPayload, SetPointsPayload } from './types';

const initialState: Ipcam = {
  pointsPath: null,
  points: null,
  imagesPath: null,
  importedImages: null,
  activeImage: null,
  activePoint: null,
  cameraSolution: null,
  selectedCounter: 0,
  zLimits: {
    min: 0,
    max: 0,
  },
};

const ipcamSlice = createSlice({
  name: 'ipcam',
  initialState,
  reducers: {
    setPoints: (state, action: PayloadAction<SetPointsPayload>) => {
      state.points = action.payload.points;
      state.selectedCounter = action.payload.counter;
      if (action.payload.zLimits) {
        state.zLimits = action.payload.zLimits;
      }
      if (action.payload.path) {
        state.pointsPath = action.payload.path;
      }
    },
    setImages: (state, action: PayloadAction<SetImagesPayload>) => {
      state.importedImages = action.payload.images;
      state.imagesPath = action.payload.path;
    },
    setCustomPoint: (state, action: PayloadAction<SetCustomPointPayload>) => {
      if (state.points && state.points.length > action.payload.index) {
        state.points[action.payload.index] = action.payload.point;
        state.activePoint = action.payload.index;
      }
    },
    setActiveImage: (state, action: PayloadAction<number>) => {
      state.activeImage = action.payload;
    },
    setCameraSolution: (state, action: PayloadAction<CameraSolution | null>) => {
      state.cameraSolution = action.payload;
    },
    setDefaultIpcamState: () => {
      return initialState;
    },
  },
});

export const { setPoints, setImages, setCustomPoint, setCameraSolution, setActiveImage, setDefaultIpcamState } =
  ipcamSlice.actions;

export default ipcamSlice.reducer;
