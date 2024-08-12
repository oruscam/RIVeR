interface FormProcessing {
    artificialSeeding: boolean;
    clahe: boolean;
    clipLimit: number;
    grayscale: boolean;
    heightRoi: number
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
    test: boolean;
    form: FormProcessing;
    parImages: string[];
    maskPath: string;
}

interface Images {
    paths: string[];
    active: number;
}

interface Quiver {
    x: number[];
    y: number[];
    u: [[number]];
    v: [[number]];
    typevector: number[];
    median_u?: [[number]];
    median_v?: [[number]];
}

interface DataState {
    processing: Processing;
    images: Images;
    quiver?: Quiver;
    analizing: boolean
}

export type { DataState, Processing, FormProcessing, Quiver }