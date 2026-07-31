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
  value: string | number;
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
  // Real-world Z range spanned by the project's control points — used to
  // reject a bathymetry file whose level values don't overlap it at all
  // (a strong signal the wrong file, or the wrong units, were selected).
  controlPointsZLimits?: { min: number; max: number };
  unitSistem?: string;
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
  factor,
  UpdatePixelSize,
  onGetBathimetryTypes,
};
