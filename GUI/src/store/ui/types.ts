// * Archivo para almacenar los tipos e interfaces.


interface Point {
  x: number;
  y: number;
}

interface Bathimetry {
  bathimetryFile: string | false;
  level: number;
}


interface Section {
  name: string;
  drawLine: boolean;
  points: Point[];
  bathimetry: Bathimetry
}

interface ScreenSizes {
  width: number;
  height: number;
}

interface UIState {
  screenSizes: ScreenSizes;
  darkMode: boolean;
  video: VideoData | null;
  videoForm: VideoForm | false;
  error: string[];
  isLoading: boolean;
  sections: Section[];
  activeSection: number;
  seeAll: boolean;
}

export type { VideoData, Point, Section, ScreenSizes, UIState, Bathimetry, VideoForm };