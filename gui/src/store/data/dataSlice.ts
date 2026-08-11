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
  visibleMaskIndices: [] as number[],
};

const initialState: DataState = {
  processing: defaultProcessing,
  images: {
    paths: [],
    active: 0,
  },
  quiver: null,
  fullQuiver: null,
  isBackendWorking: false,
  isDataLoaded: false,
  hasChanged: false,
  colorbarLimits: {
    min: null,
    max: null,
    default: true,
  },
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    updateProcessingForm: (state, action: PayloadAction<FormProcessing>) => {
      state.processing.form = action.payload;
      state.hasChanged = true;
      state.quiver = null;
      state.fullQuiver = null;
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
      const incoming = action.payload.quiver;
      state.quiver = incoming;
      if (incoming?.test) {
        // A "Test" run only affects the single tested frame pair, it must
        // never overwrite the persisted full-analize result.
        state.hasChanged = true;
      } else {
        // Either a full "Analize" result (test: false) or an explicit clear
        // (null) coming from a parameter/mask change: both are authoritative
        // over the full-analize result, so keep them in sync.
        state.hasChanged = false;
        state.fullQuiver = incoming;
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
      const newIndex = state.processing.masks.length - 1;
      state.processing.activeMaskIndex = newIndex;
      // Auto-show the new mask
      if (!state.processing.visibleMaskIndices.includes(newIndex)) {
        state.processing.visibleMaskIndices.push(newIndex);
      }
    },
    deleteMask: (state, action: PayloadAction<number>) => {
      if (state.processing.masks) {
        const deletedIndex = action.payload;
        state.processing.masks.splice(deletedIndex, 1);

        // Only clear/shift the active mask if it's the one that got deleted or
        // sits after it — never force-select a different mask (e.g. index 0)
        // when nothing was being edited, or when editing a mask untouched by
        // this deletion.
        const current = state.processing.activeMaskIndex;
        if (current === deletedIndex) {
          state.processing.activeMaskIndex = null;
        } else if (current !== null && current > deletedIndex) {
          state.processing.activeMaskIndex = current - 1;
        }

        // Rebuild visible indices: remove deleted, shift down higher indices
        state.processing.visibleMaskIndices = state.processing.visibleMaskIndices
          .filter((i) => i !== deletedIndex)
          .map((i) => (i > deletedIndex ? i - 1 : i));
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
      // All loaded masks start as visible
      state.processing.visibleMaskIndices = action.payload.map((_, i) => i);
    },
    toggleMaskVisibility: (state, action: PayloadAction<number>) => {
      const idx = action.payload;
      const visible = state.processing.visibleMaskIndices;
      const pos = visible.indexOf(idx);
      if (pos === -1) {
        visible.push(idx);
      } else {
        visible.splice(pos, 1);
      }
    },
    setColorbarLimits: (
      state,
      action: PayloadAction<{ min: number | null; max: number | null; default: boolean }>
    ) => {
      state.colorbarLimits.min = action.payload.min;
      state.colorbarLimits.max = action.payload.max;
      state.colorbarLimits.default = action.payload.default;
    },
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
  setColorbarLimits,
  toggleMaskVisibility,
} = dataSlice.actions;

export default dataSlice.reducer;
