import type { OverlayVisibility } from '../../helpers/overlayLayers';
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

/** Which per-technique preview the Processing left panel is showing. */
type PreviewMode = 'frames' | 'sti' | 'iwave';

/** One card in the panel's step-alert list — persists until whatever caused it clears. */
interface StepAlert {
  /** Stable id so a caller can clear exactly the alert it raised, e.g. `'stabilization-min-regions'`. */
  id: string;
  level: 'info' | 'warning' | 'error';
  text: string;
}

interface UIState {
  screenSizes: ScreenSizes;
  theme: ThemeType;
  modeHint: { text: string; meta?: string } | null;
  fieldErrors: Record<string, string>;
  stepAlerts: StepAlert[];
  toast: { text: string; actionLabel?: string } | null;
  isLoading: boolean;
  seeAll: boolean;
  message?: string;
  language: string;
  isLatestVersion?: boolean;
  latestVersion?: string;
  hoveredStation: number | null;
  /** Set by clicking a station (canvas chevron, chart position, or Grid row) —
   *  survives the pointer moving away so a user can toggle technique layers
   *  without losing the detail view. Clicking the same station again, or the
   *  station tag's own pin button, clears it. */
  pinnedStation: number | null;
  /** Interrogation-window size preview on the Processing image. Off by default —
   *  it's a reference overlay, not something needed on every frame. */
  showInterrogationWindow: boolean;
  /** Which per-technique preview Processing's canvas is showing: Frames,
   *  Space-time (STIV) or Spectrum (iWave). Lives here rather than as
   *  component-local state because it's a user-visible view mode the
   *  segmented control on the canvas both reads and writes (Phase 6d). */
  previewMode: PreviewMode;
  /** Which overlays Processing's Frames canvas draws (section, STIV search lines, vectors). */
  overlayVisibility: OverlayVisibility;
}

export type { ScreenSizes, UIState, ThemeType, PreviewMode, StepAlert };
