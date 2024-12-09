import { Point } from "../../types";

interface pixelSize {
    drawLine: boolean,
    pixelPoints: [Point, Point],
    rwPoints: [Point, Point],
    pixelSize: number,
    rwLength: number,
}

interface controlPoints {
    drawPoints: boolean,
    coordinates: Point[],
    isNotDefaultCoordinates: boolean,
    distances: {
        d12: number,
        d13: number,
        d14: number,
        d23: number,
        d24: number,
        d34: number,
    },
}

interface MatrixState {
    pixelSize: pixelSize;
    controlPoints: controlPoints;
}


export type {
    MatrixState,
    pixelSize,
    controlPoints
}