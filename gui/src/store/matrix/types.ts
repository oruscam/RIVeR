import { Point } from "../../types";

interface pixelSize {
    drawLine: boolean,
    pixelPoints: [Point, Point],
    rwPoints: [Point, Point],
    pixelSize: number,
    rwLength: number,
}

interface obliquePoints {
    drawPoints: boolean,
    coordinates: Point[],
    iswDefaultCoordinates: boolean,
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
    obliquePoints: obliquePoints;
    hasChanged: boolean;
}


export type {
    MatrixState,
    pixelSize,
    obliquePoints
}