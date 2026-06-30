import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CalibrationState, CalibrationStatus, CalibrationSummary, CsvRow, FrameCorners } from './types';

const initialState: CalibrationState = {
  status: 'idle',
  imageDir: '',
  images: [],
  thumbs: [],
  imageResolution: null,
  usedImages: [],
  summary: null,
  csvRows: [],
  heatmapBase64: null,
  overlayPaths: [],
  undistortedPaths: [],
  perFrameCorners: [],
  profilePath: '',
  progressMsg: '',
  errorMsg: '',
};

const calibrationSlice = createSlice({
  name: 'calibration',
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<CalibrationStatus>) => {
      state.status = action.payload;
    },
    setImageDir: (state, action: PayloadAction<string>) => {
      state.imageDir = action.payload;
      state.images = [];
      state.thumbs = [];
      state.imageResolution = null;
      state.usedImages = [];
      state.summary = null;
      state.csvRows = [];
      state.heatmapBase64 = null;
      state.overlayPaths = [];
      state.profilePath = '';
      state.progressMsg = '';
      state.errorMsg = '';
      state.status = 'idle';
    },
    setImages: (
      state,
      action: PayloadAction<{
        images: string[];
        thumbs: string[];
        imageResolution?: { width: number; height: number } | null;
      }>
    ) => {
      state.images = action.payload.images;
      state.thumbs = action.payload.thumbs;
      state.imageResolution = action.payload.imageResolution ?? null;
    },
    setSolveResult: (
      state,
      action: PayloadAction<{
        usedImages: string[];
        profilePath: string;
        summary: CalibrationSummary | null;
        csvRows: CsvRow[];
        heatmapBase64: string | null;
        overlayPaths: string[];
        undistortedPaths: string[];
        perFrameCorners: FrameCorners[];
      }>
    ) => {
      state.usedImages = action.payload.usedImages;
      state.profilePath = action.payload.profilePath;
      state.summary = action.payload.summary;
      state.csvRows = action.payload.csvRows;
      state.heatmapBase64 = action.payload.heatmapBase64;
      state.overlayPaths = action.payload.overlayPaths;
      state.undistortedPaths = action.payload.undistortedPaths;
      state.perFrameCorners = action.payload.perFrameCorners;
      state.status = 'solved';
    },
    setProgressMsg: (state, action: PayloadAction<string>) => {
      state.progressMsg = action.payload;
    },
    setErrorMsg: (state, action: PayloadAction<string>) => {
      state.errorMsg = action.payload;
      state.status = 'error';
    },
    resetCalibration: () => initialState,
  },
});

export const { setStatus, setImageDir, setImages, setSolveResult, setProgressMsg, setErrorMsg, resetCalibration } =
  calibrationSlice.actions;

export default calibrationSlice.reducer;
