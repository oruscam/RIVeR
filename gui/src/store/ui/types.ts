// * Archivo para almacenar los tipos e interfaces.

interface ScreenSizes {
  width: number;
  height: number;
  imageWidth?: number;
  imageHeight?: number;
  aspectRatio?: number;
  factor?: number;
  vertical?: boolean;

  heightReduced?: number;
  widthReduced?: number;
  factorReduced?: number;
}

interface UIState {
  screenSizes: ScreenSizes;
  darkMode: boolean;
  error: string[];
  isLoading: boolean;
  seeAll: boolean;
  message?: string;
  language: string;
  isLatestVersion?: boolean;
  latestVersion?: string 
}

export type { ScreenSizes, UIState };
