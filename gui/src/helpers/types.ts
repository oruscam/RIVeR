interface FormProcessing {
  artificialSeeding: boolean;
  clahe: boolean;
  clipLimit: number;
  epsilon: number;
  grayscale: boolean;
  heightRoi: number;
  medianTestFiltering: boolean;
  removeBackground: boolean;
  stdFiltering: boolean;
  step1: number;
  step2: number;
  thresholdMedianTestFiltering: number;
  thresholdStd: number;
}

interface Processing {
  test: boolean;
  form: FormProcessing;
}

interface DataState {
  processing: Processing;
}

export type { DataState, Processing, FormProcessing };
