// * Archivo para almacenar los tipos e interfaces.

interface ScreenSizes {
  width: number;
  height: number;
}

interface UIState {
  screenSizes: ScreenSizes;
  darkMode: boolean;
  error: string[];
  isLoading: boolean;
  seeAll: boolean;
}

export type { ScreenSizes, UIState };