// * Archivo para almacenar los tipos e interfaces.

type ThemeType = 'dark' | 'light' | 'dracula';

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
  theme: ThemeType;
  error: string[];
  info: string[];
  warning: string[];
  isLoading: boolean;
  seeAll: boolean;
  message?: string;
  language: string;
  isLatestVersion?: boolean;
  latestVersion?: string;
  hoveredStation: number | null;
  /** Interrogation-window size preview on the Processing image. Off by default —
   *  it's a reference overlay, not something needed on every frame. */
  showInterrogationWindow: boolean;
}

export type { ScreenSizes, UIState, ThemeType };
