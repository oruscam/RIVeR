import { BaseSyntheticEvent } from 'react';
import { FieldValues } from 'react-hook-form';

type Point = {
  x: number;
  y: number;
};

type Limits = {
  max: number;
  min: number;
};

type CanvasPoint = {
  points: Point[];
  factor: number;
  index: number | null;
  mode?: string;
};

type FormPoint = {
  point: string | number;
  position: string;
};

type FormDistance = {
  distance: number;
  position: string;
};

type FormChild = {
  onSubmit: (e?: BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
  onError: (error: FieldValues) => void;
};

type onGetBathimetryTypes = {
  bathimetryPath?: string;
  cameraMatrix?: number[][];
  zLimits?: { min: number; max: number };
};

interface factor {
  x: number;
  y: number;
}

interface UpdatePixelSize {
  drawLine?: boolean;
  length?: number;
  pixelSize?: number;
  imageWidth?: number;
  imageHeight?: number;
  extraFields?: boolean;
}

export type {
  Point,
  Limits,
  CanvasPoint,
  FormPoint,
  FormDistance,
  FormChild,
  ellipse,
  factor,
  UpdatePixelSize,
  onGetBathimetryTypes,
};
