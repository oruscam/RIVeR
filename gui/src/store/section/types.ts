interface Point {
    x: number;
    y: number;
}

interface Bathimetry {
    path: string;
    level: number;
    name: string;
    leftBank?: number; 
    line?: Point[];
    width?: number;
}

interface PixelSize {
    size: number;
    rw_length: number;
}

interface SectionData {
    num_stations: number;
    alpha: number;
    id: number[];
    east?: number[];
    north?: number[];
    distance: number[];
    x: number[];
    y: number[];
    displacement_x: number[];
    displacement_y: number[];
    displacement_east?: number[];
    displacement_north?: number[];
    streamwise_east?: number[];
    streamwise_north?: number[];
    crosswise_east?: number[];
    crosswise_north?: number[];
    streamwise_magnitude: number[];
    depth: number[];
    check: boolean[];
    W?: number[];
    A: number[];
    Q: number[];
    Q_portion: number[];
    minus_std: number[];
    plus_std: number[];
    percentile_5th: number[];
    percentile_95th: number[];
    total_Q: number;
    measured_Q: number;
    interpolated_Q: number;
    total_A: number;
    total_W: number;
    max_depth: number;
    average_depth: number;
    mean_V: number;
    mean_Vs: number;
    displacement_x_streamwise: number[];
    displacement_y_streamwise: number[];
    filled_streamwise_magnitude: number[];
    filled_streamwise_east: number[];
    filled_streamwise_north: number[];
    filled_crosswise_east: number[];
    filled_crosswise_north: number[];
    Q_minus_std: number[];
    Q_plus_std: number[];
    total_q_std: number;
    showVelocityStd: boolean;
    show95Percentile: boolean;
    showInterpolateProfile: boolean;
}



interface Section {
    name: string;
    drawLine: boolean;
    points: Point[];
    bathimetry: Bathimetry
    pixelSize: PixelSize
    realWorld: Point[];
    extraFields: boolean;
    alpha: number;
    numStations: number;
    interpolated: boolean;
    data?: SectionData;

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

export type { SectionState, Section, Point, Bathimetry, PixelSize, Processing, SectionData }