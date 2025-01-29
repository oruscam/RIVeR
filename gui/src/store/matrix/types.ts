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
    isDefaultCoordinates: boolean,
    distances: {
        d12: number,
        d23: number,
        d34: number,
        d41: number,
        d13: number,
        d24: number,
    },
    isDistancesLoaded: boolean
}

interface importedPoint {
    label: string, // Point Name
    X: number, // Real World X
    Y: number, // Real World Y
    Z: number, // Real World Z
    x: number, // Pixel x
    y: number, // Pixel y
    selected: boolean,
    wasEstablished: boolean,
    image: undefined | number,
}

interface ipcam {
    pointsPath: string | undefined,
    imagesPath: string | undefined,
    importedPoints: importedPoint[] | undefined,
    importedImages: string[] | undefined,
    activeImage: number | undefined,
    activePoint: number | undefined,
}

interface setIpcamPointsInterface {
    points: importedPoint[],
    path: string | undefined
}

interface setIpcamImagesInterface {
    images: string[],
    path: string
}

interface setIpcamCustomPoint {
    point: importedPoint,
    index: number
}

interface MatrixState {
    pixelSize: pixelSize;
    obliquePoints: obliquePoints;
    ipcam: ipcam
    hasChanged: boolean;
}


export type {
    MatrixState,
    pixelSize,
    obliquePoints,
    ipcam,
    importedPoint,
    setIpcamPointsInterface,
    setIpcamImagesInterface,
    setIpcamCustomPoint
}