import { BaseSyntheticEvent } from "react";
import { FieldValues } from "react-hook-form";

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

interface FormChild {
    onSubmit: (e?: BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>,
    onError: (error: FieldValues) => void,
}

export type {
    Point,
    Limits,
    CanvasPoint,
    FormPoint,
    FormDistance,
    FormChild
}

