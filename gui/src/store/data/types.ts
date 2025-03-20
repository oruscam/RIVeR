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
}

interface Images {
  paths: string[];
  active: number;
}

interface Quiver {
  x: number[];
  y: number[];
  u: number[][] | number[];
  v: number[][] | number[];
  typevector: number[];
  u_median?: number[];
  v_median?: number[];
  test: boolean;
}

interface DataState {
  processing: Processing;
  images: Images;
  quiver?: Quiver;
  isBackendWorking: boolean;
  isDataLoaded: boolean;
  hasChanged: boolean;
}

export type { DataState, Processing, FormProcessing, Quiver };
