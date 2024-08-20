interface Point {
    x: number;
    y: number;
}

interface Bathimetry {
    blob?: Blob;
    path: string;
    level: number;
    name: string;
    type: string;
}

interface PixelSize {
    size: number;
    rw_length: number;
}

interface Section {
    name: string;
    drawLine: boolean;
    points: Point[];
    bathimetry: Bathimetry
    pixelSize: PixelSize
    realWorld: Point[];
}

interface Processing {
    par: string[];
    maskPath?: string;
    step1: number;
    heightRoi: number;
    grayscale: boolean;
    removeBackground: boolean;
    clahe: boolean;
    clipLimit: number;
    stdFiltering: boolean;
    threshold1: number;
    medianTest: boolean;
    epsilon: number;
    threshold2: number;
    test: boolean;
    artificialSeeding: boolean
}

interface SectionState {
    sections: Section[];
    activeSection: number;
}

export type { SectionState, Section, Point, Bathimetry, PixelSize, Processing }