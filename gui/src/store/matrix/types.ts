import { importedPoint, Point } from "../../types";

interface obliqueSolution {
    orthoImage: string,
    extent: number[],
    resolution: number,
    roi: number[],
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
    solution?: obliqueSolution
}

interface cameraSolution {
    orthoImagePath: string,
    orthoExtent: number[],
    reprojectionErrors: number[],
    meanError: number,
    cameraPosition: number[],
    cameraMatrix: number[][],
    mode: string,
    numPoints?: number,
    pointIndices?: number[],
}

interface ipcam {
    pointsPath: string | undefined,
    imagesPath: string | undefined,
    importedPoints: importedPoint[] | undefined,
    importedImages: string[] | undefined,
    activeImage: number | undefined,
    activePoint: number | undefined,
    cameraSolution: cameraSolution | undefined,
    hemisphere: 'southern-hemisphere' | 'northern-hemisphere',
    selectedCounter: number,
}

interface pixelSolution {
    orthoImage: string,
    extent: number[],
    resolution: number, 
}

interface pixelSize {
    drawLine: boolean;
    dirPoints: Point[];
    rwPoints: Point[];
    size: number,
    rwLength: number
    extraFields: boolean,
    solution?: pixelSolution,
}

interface setIpcamPointsInterface {
    points: importedPoint[],
    path: string | undefined,
    counter: number
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
    obliquePoints: obliquePoints;
    ipcam: ipcam
    hasChanged: boolean;
    pixelSize: pixelSize;
    isBackendWorking: boolean;
}

export type {
    cameraSolution,
    importedPoint,
    ipcam,
    MatrixState,
    obliquePoints,
    obliqueSolution,
    pixelSize,
    setIpcamCustomPoint,
    setIpcamImagesInterface,
    setIpcamPointsInterface,
}