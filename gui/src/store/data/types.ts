import { Point } from '../../types';
import { Quiver } from '../../../commons/types';

interface FormProcessing {
  artificialSeeding: boolean;
  clahe: boolean;
  clipLimit: number;
  heightRoi: number;
  medianTestEpsilon: number;
  medianTestFiltering: boolean;
  medianTestThreshold: number;
  removeBackground: boolean;
  stdFiltering: boolean;
  stdThreshold: number;
  step1: number;
  step2: number;
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
  isBackendWorking: boolean;
  isDataLoaded: boolean;
  hasChanged: boolean;
  colorbarLimits: ColorbarLimits;
}

export type { DataState, Processing, FormProcessing, Quiver };
