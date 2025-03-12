import { BaseSyntheticEvent } from "react";
import { FieldValues } from "react-hook-form";

type Point {
    x: number;
    y: number;
}

type Limits {
    max: number;
    min: number;
}

type CanvasPoint {
    points: Point[];
    factor: number;
    index: number | null
    mode?: string;
}

type FormPoint {
    point: string | number;
    position: string;
}

type FormDistance {
    distance: number;
    position: string;
}

type FormChild {
    onSubmit: (e?: BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>,
    onError: (error: FieldValues) => void,
}

type ellipse { 
    center: number[],
    width: number,
    height: number,
    angle: number
}

interface cameraSolution {
    orthoImagePath: string,
    orthoExtent: number[],
    reprojectionErrors: number[],
    meanError: number,
    cameraPosition: number[],
    cameraMatrix: number[][],
    type: string,
    uncertaintyEllipses?: ellipse[],
    projectedPoints?: [number, number],
    pointIndices?: number[],
    numPoints?: number
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
    ellipse: ellipse | undefined,
    projectedPoint: [number, number] | undefined,
}

interface factor {
    x: number,
    y: number
}

interface UpdatePixelSize {
    drawLine?: boolean,
    length?: number,
    pixelSize?: number,
    imageWidth?: number,
    imageHeight?: number
    extraFields?: boolean
}

export type {
    Point,
    Limits,
    CanvasPoint,
    FormPoint,
    FormDistance,
    FormChild,
    cameraSolution,
    ellipse,
    importedPoint,
    factor,
    UpdatePixelSize
}

