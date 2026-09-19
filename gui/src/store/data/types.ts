import { Point } from '../../types';
import { Quiver } from '../../../commons/types';

interface FormProcessing {
  artificialSeeding: boolean;
  clahe: boolean;
  clipLimit: number;
  heightRoi: number;
  iwave: boolean;
  medianTestEpsilon: number;
  medianTestFiltering: boolean;
  medianTestThreshold: number;
  removeBackground: boolean;
  stdFiltering: boolean;
  stdThreshold: number;
  step1: number;
  step2: number;
  stiv: boolean;
}

interface Processing {
  form: FormProcessing;
  parImages: string[];
  maskPath: string;
  bbox?: number[];
  masks: Point[][];
  activeMaskIndex: number | null;
  /** Indices of masks that are currently visible as static overlays */
  visibleMaskIndices: number[];
  /** "Advanced settings" expanded state for this screen's footer toggle.
   *  Lives here (not component state) so it survives navigating away and
   *  back, matching Cross Sections/UAV/Oblique's own extraFields. */
  extraFields: boolean;
}

interface Images {
  paths: string[];
  active: number;
}

interface ColorbarLimits {
  min: number | null;
  max: number | null;
  default: boolean;
}

interface DataState {
  processing: Processing;
  images: Images;
  quiver: Quiver | null;
  fullQuiver: Quiver | null;
  isBackendWorking: boolean;
  isDataLoaded: boolean;
  hasChanged: boolean;
  colorbarLimits: ColorbarLimits;
}

export type { ColorbarLimits, DataState, Processing, FormProcessing, Quiver };
