interface Point {
    x: number;
    y: number;
}


interface Limits {
    max: number;
    min: number;
}

interface CanvasPoint {
    points: Point[];
    factor: number;
    index: number | null
    mode?: string;
}

interface FormPoint {
    point: string | number;
    position: string;
}

interface FormDistance {
    distance: number;
    position: string;
}

export type {
    Point,
    Limits,
    CanvasPoint,
    FormPoint,
    FormDistance
}