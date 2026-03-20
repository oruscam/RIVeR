import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DataState, FormProcessing, Quiver } from './types';
import { Point } from '../../types';

const defaultFormProcessing = {
  artificialSeeding: false,
  clahe: true,
  clipLimit: 5,
  heightRoi: 0,
  medianTestEpsilon: 0.02,
  medianTestFiltering: true,
  medianTestThreshold: 2,
  removeBackground: false,
  stdFiltering: true,
  stdThreshold: 4,
  step1: 128,
  step2: 64,
};

const defaultProcessing = {
  form: defaultFormProcessing,
  parImages: ['', '1', '', '2'],
  maskPath: '',
  masks: [],
  activeMaskIndex: null,
};

const initialState: DataState = {
  processing: defaultProcessing,
  images: {
    paths: [],
    active: 0,
  },
  quiver: null,
  isBackendWorking: false,
  isDataLoaded: false,
  hasChanged: false,
  colorbarLimits: {
    min: null,
    max: null,
    default: true
  }
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    updateProcessingForm: (state, action: PayloadAction<FormProcessing>) => {
      state.processing.form = action.payload;
      state.hasChanged = true;
      state.quiver = null;
    },
    updateProcessingPar: (state, action: PayloadAction<string[]>) => {
      state.processing.parImages = action.payload;
    },
    setBackendWorking: (state, action: PayloadAction<boolean>) => {
      state.isBackendWorking = action.payload;
    },
    setProcessingMask: (state, action: PayloadAction<{ mask: string; bbox: number[] }>) => {
      state.processing.maskPath = action.payload.mask + `?t=${new Date().getTime()}`;
      state.processing.bbox = action.payload.bbox;
    },
    setImages: (state, action: PayloadAction<{ paths: string[] }>) => {
      state.images.paths = action.payload.paths;
    },
    setActiveImage: (state, action: PayloadAction<number>) => {
      state.images.active = action.payload;

    },
    setQuiver: (state, action: PayloadAction<{ quiver: Quiver | null }>) => {
      state.quiver = action.payload.quiver;
      if (action.payload.quiver?.test) {
        state.hasChanged = true;
      } else {
        state.hasChanged = false;
      }
      state.processing.activeMaskIndex = null;
    },
    setDataLoaded: (state, action: PayloadAction<boolean>) => {
      state.isDataLoaded = action.payload;
    },
    setDefaultDataState: (state) => {
      state.images.paths = [];
      state.images.active = 0;
      state.processing = defaultProcessing;
      state.isBackendWorking = false;
      state.isDataLoaded = false;
    },

    addMask: (state, action: PayloadAction<Point[]>) => {
      if (!state.processing.masks) {
        state.processing.masks = [];
      }
      state.processing.masks.push(action.payload);
      state.processing.activeMaskIndex = state.processing.masks.length - 1;
    },
    deleteMask: (state, action: PayloadAction<number>) => {
      if (state.processing.masks) {
        state.processing.masks.splice(action.payload, 1);
        state.processing.activeMaskIndex = 0;
      }
    },
    updateMask: (state, action: PayloadAction<{ index: number; points?: Point[] } | null>) => {
      if (action.payload && action.payload.points) {
        state.processing.masks![action.payload.index] = action.payload.points;
      } else if (action.payload) {
        state.processing.activeMaskIndex = action.payload.index;
      }
      if (action.payload === null) {
        state.processing.activeMaskIndex = null;
      }
    },
    loadMasks: (state, action: PayloadAction<Point[][]>) => {
      state.processing.masks = action.payload;
      state.processing.activeMaskIndex = null;
    },
    setColorbarLimits: (state, action: PayloadAction<{ min: number | null; max: number | null; default: boolean }>) => {
      state.colorbarLimits.min = action.payload.min;
      state.colorbarLimits.max = action.payload.max;
      state.colorbarLimits.default = action.payload.default;
    }
  },
});

export const {
  setDefaultDataState,
  setActiveImage,
  setBackendWorking,
  setDataLoaded,
  setImages,
  setProcessingMask,
  setQuiver,
  updateProcessingForm,
  updateProcessingPar,
  addMask,
  deleteMask,
  updateMask,
  loadMasks,
  setColorbarLimits
} = dataSlice.actions;

export default dataSlice.reducer;
