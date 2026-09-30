import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, ScreenSizes, ThemeType, StepAlert } from './types';
import { setActiveSection, addSection, deleteSection } from '../section/sectionSlice';

const THEME_CYCLE: ThemeType[] = ['dark', 'light', 'dracula'];

const savedLanguage = typeof localStorage !== 'undefined' ? localStorage.getItem('language') || 'en' : 'en';
const savedTheme =
  typeof localStorage !== 'undefined' ? (localStorage.getItem('theme') as ThemeType | null) || 'dark' : 'dark';

const initialState: UIState = {
  screenSizes: {
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  },
  theme: THEME_CYCLE.includes(savedTheme) ? savedTheme : 'dark',
  modeHint: null,
  fieldErrors: {},
  stepAlerts: [],
  toast: null,
  isLoading: false,
  seeAll: true,
  language: savedLanguage,
  isLatestVersion: undefined,
  hoveredStation: null,
  pinnedStation: null,
  showInterrogationWindow: false,
  previewMode: 'frames',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    changeTheme: (state) => {
      const currentIndex = THEME_CYCLE.indexOf(state.theme);
      state.theme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];
      localStorage.setItem('theme', state.theme);
    },
    setTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    setModeHint: (state, action: PayloadAction<{ text: string; meta?: string }>) => {
      state.modeHint = action.payload;
    },
    clearModeHint: (state) => {
      state.modeHint = null;
    },
    setFieldError: (state, action: PayloadAction<{ name: string; message: string }>) => {
      state.fieldErrors[action.payload.name] = action.payload.message;
    },
    clearFieldError: (state, action: PayloadAction<string>) => {
      delete state.fieldErrors[action.payload];
    },
    clearAllFieldErrors: (state) => {
      state.fieldErrors = {};
    },
    addStepAlert: (state, action: PayloadAction<StepAlert>) => {
      const existingIndex = state.stepAlerts.findIndex((a) => a.id === action.payload.id);
      if (existingIndex === -1) {
        state.stepAlerts.push(action.payload);
      } else {
        state.stepAlerts[existingIndex] = action.payload;
      }
    },
    clearStepAlert: (state, action: PayloadAction<string>) => {
      state.stepAlerts = state.stepAlerts.filter((a) => a.id !== action.payload);
    },
    clearAllStepAlerts: (state) => {
      state.stepAlerts = [];
    },
    showToast: (state, action: PayloadAction<{ text: string; actionLabel?: string }>) => {
      state.toast = action.payload;
    },
    clearToast: (state) => {
      state.toast = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setScreen: (state, action: PayloadAction<ScreenSizes>) => {
      state.screenSizes = action.payload;
    },
    setSeeAll: (state, action: PayloadAction<boolean | undefined>) => {
      state.seeAll = action.payload !== undefined ? action.payload : !state.seeAll;
    },
    setMessage: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
    },
    clearMessage: (state) => {
      state.message = undefined;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      if (action.payload === undefined) return;
      state.language = action.payload;
    },
    setIsLastVersion: (state, action: PayloadAction<{ isLatest: boolean; latest: string }>) => {
      state.isLatestVersion = action.payload.isLatest;
      state.latestVersion = action.payload.latest;
    },
    setHoveredStation: (state, action: PayloadAction<number | null>) => {
      state.hoveredStation = action.payload;
    },
    setPinnedStation: (state, action: PayloadAction<number | null>) => {
      state.pinnedStation = action.payload;
    },
    toggleStationPin: (state, action: PayloadAction<number>) => {
      state.pinnedStation = state.pinnedStation === action.payload ? null : action.payload;
    },
    setShowInterrogationWindow: (state, action: PayloadAction<boolean>) => {
      state.showInterrogationWindow = action.payload;
    },
    setPreviewMode: (state, action: PayloadAction<UIState['previewMode']>) => {
      state.previewMode = action.payload;
    },
  },
  // A hovered/pinned station number is only meaningful for the section it was
  // set on — switching which section is active (chip click, adding/removing a
  // section) must not leave a stale index silently retargeting to a different
  // section's station of the same number.
  extraReducers: (builder) => {
    builder
      .addCase(setActiveSection, (state) => {
        state.hoveredStation = null;
        state.pinnedStation = null;
      })
      .addCase(addSection, (state) => {
        state.hoveredStation = null;
        state.pinnedStation = null;
      })
      .addCase(deleteSection, (state) => {
        state.hoveredStation = null;
        state.pinnedStation = null;
      });
  },
});

export const {
  changeTheme,
  setTheme,
  setModeHint,
  clearModeHint,
  setFieldError,
  clearFieldError,
  clearAllFieldErrors,
  addStepAlert,
  clearStepAlert,
  clearAllStepAlerts,
  showToast,
  clearToast,
  clearMessage,
  setLoading,
  setMessage,
  setScreen,
  setSeeAll,
  setLanguage,
  setIsLastVersion,
  setHoveredStation,
  setPinnedStation,
  toggleStationPin,
  setShowInterrogationWindow,
  setPreviewMode,
} = uiSlice.actions;

export default uiSlice.reducer;
