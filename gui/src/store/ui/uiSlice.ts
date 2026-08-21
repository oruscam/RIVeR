import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, ScreenSizes, ThemeType } from './types';

const THEME_CYCLE: ThemeType[] = ['dark', 'light', 'dracula'];

const savedLanguage = localStorage.getItem('language') || 'en';
const savedTheme = (localStorage.getItem('theme') as ThemeType | null) || 'dark';

const initialState: UIState = {
  screenSizes: {
    width: window.innerWidth,
    height: window.innerHeight,
  },
  theme: THEME_CYCLE.includes(savedTheme) ? savedTheme : 'dark',
  error: [],
  info: [],
  warning: [],
  isLoading: false,
  seeAll: true,
  language: savedLanguage,
  isLatestVersion: undefined,
  hoveredStation: null,
  showInterrogationWindow: false,
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
    setErrorMessage: (state, action: PayloadAction<string[]>) => {
      const errorDiv = document.getElementById('error-message-div');
      if (errorDiv) {
        errorDiv.scrollIntoView({ behavior: 'smooth' });
      }
      state.error = action.payload;
    },
    clearErrorMessage: (state) => {
      state.error = [];
    },
    setInfoMessage: (state, action: PayloadAction<string[]>) => {
      const infoDiv = document.getElementById('info-message-div');
      if (infoDiv) {
        infoDiv.scrollIntoView({ behavior: 'smooth' });
      }
      state.info = action.payload;
    },
    clearInfoMessage: (state) => {
      state.info = [];
    },
    setWarningMessage: (state, action: PayloadAction<string[]>) => {
      state.warning = action.payload;
    },
    clearWarningMessage: (state) => {
      state.warning = [];
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
    setShowInterrogationWindow: (state, action: PayloadAction<boolean>) => {
      state.showInterrogationWindow = action.payload;
    },
  },
});

export const {
  changeTheme,
  setTheme,
  clearErrorMessage,
  clearInfoMessage,
  clearMessage,
  clearWarningMessage,
  setErrorMessage,
  setInfoMessage,
  setLoading,
  setWarningMessage,
  setMessage,
  setScreen,
  setSeeAll,
  setLanguage,
  setIsLastVersion,
  setHoveredStation,
  setShowInterrogationWindow,
} = uiSlice.actions;

export default uiSlice.reducer;
