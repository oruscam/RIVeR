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
        d23: number,
        d34: number,
        d41: number,
        d13: number,
        d24: number,
    },
}

interface MatrixState {
    pixelSize: pixelSize;
    controlPoints: controlPoints;
    hasChanged: boolean;
}


export type {
    MatrixState,
    pixelSize,
    controlPoints
}